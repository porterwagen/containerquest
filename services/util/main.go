// Container Quest — utility service
//
// Go, standard library only. Zero dependencies: no framework, no router, no
// JSON library beyond encoding/json. That is why Go runs so much of cloud
// infrastructure (Docker, Kubernetes, Terraform, etcd are all Go) — a static
// binary with no runtime to install and no dependency tree to audit.
//
// Its job in the fleet is health aggregation: it fans out to the other
// services concurrently and reports what it finds. Goroutines make that
// roughly five lines of code.
package main

import (
	"context"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"sync"
	"sync/atomic"
	"time"
)

var (
	start        = time.Now()
	requests     atomic.Uint64
	unreadyUntil atomic.Int64
	slowUntil    atomic.Int64
)

func env(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

// nullable renders "" as JSON null, so podName is absent under Docker and
// present under Kubernetes — the same distinction the C service makes by hand.
func nullable(s string) *string {
	if s == "" {
		return nil
	}
	return &s
}

type serviceMeta struct {
	Service   string  `json:"service"`
	Language  string  `json:"language"`
	Version   string  `json:"version"`
	GitSha    string  `json:"gitSha"`
	BuildTime string  `json:"buildTime"`
	Hostname  string  `json:"hostname"`
	PodName   *string `json:"podName"`
	NodeName  *string `json:"nodeName"`
	Namespace *string `json:"namespace"`
	UptimeSec int64   `json:"uptimeSec"`
	Requests  uint64  `json:"requests"`
	Pid       int     `json:"pid"`
}

type probeResult struct {
	OK     bool            `json:"ok"`
	Checks map[string]bool `json:"checks"`
	Detail string          `json:"detail,omitempty"`
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}

// instrument counts requests, honours the "slow" chaos action, and logs
// timing — the Go equivalent of middleware, without a framework.
func instrument(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		requests.Add(1)
		if time.Now().UnixMilli() < slowUntil.Load() {
			time.Sleep(2 * time.Second)
		}
		t0 := time.Now()
		next(w, r)
		log.Printf("%s %s %v", r.Method, r.URL.Path, time.Since(t0).Round(time.Millisecond))
	}
}

func main() {
	hostname, _ := os.Hostname()
	port := env("PORT", "8080")

	mux := http.NewServeMux()

	// Liveness: am I running? Nothing more. Checking dependencies here would
	// turn one slow database into a fleet-wide restart storm.
	mux.HandleFunc("GET /healthz", instrument(func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, 200, probeResult{OK: true, Checks: map[string]bool{}})
	}))

	// Readiness: should I receive traffic? Here dependency checks belong.
	mux.HandleFunc("GET /readyz", instrument(func(w http.ResponseWriter, r *http.Request) {
		if time.Now().UnixMilli() < unreadyUntil.Load() {
			writeJSON(w, 503, probeResult{
				OK:     false,
				Checks: map[string]bool{"self": false},
				Detail: "chaos: unready",
			})
			return
		}
		checks := fanOutHealth(r.Context())
		ok := true
		for _, healthy := range checks {
			if !healthy {
				ok = false
			}
		}
		checks["self"] = true
		status := 200
		if !ok {
			status = 503
		}
		writeJSON(w, status, probeResult{OK: ok, Checks: checks})
	}))

	mux.HandleFunc("GET /meta", instrument(func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, 200, serviceMeta{
			Service:   "util",
			Language:  "go",
			Version:   env("SERVICE_VERSION", "1.0.0"),
			GitSha:    env("GIT_SHA", "dev"),
			BuildTime: env("BUILD_TIME", "unknown"),
			Hostname:  hostname,
			PodName:   nullable(os.Getenv("POD_NAME")),
			NodeName:  nullable(os.Getenv("NODE_NAME")),
			Namespace: nullable(os.Getenv("POD_NAMESPACE")),
			UptimeSec: int64(time.Since(start).Seconds()),
			Requests:  requests.Load(),
			Pid:       os.Getpid(),
		})
	}))

	// The aggregation endpoint: every downstream service's /meta, gathered
	// concurrently. One goroutine per service, bounded by a shared timeout.
	mux.HandleFunc("GET /aggregate", instrument(func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 3*time.Second)
		defer cancel()

		targets := strings.Split(env("PEERS", "ai:8000,compute:9000"), ",")
		results := make(map[string]json.RawMessage, len(targets))
		var mu sync.Mutex
		var wg sync.WaitGroup

		for _, target := range targets {
			target = strings.TrimSpace(target)
			if target == "" {
				continue
			}
			wg.Add(1)
			go func(addr string) {
				defer wg.Done()
				body := fetch(ctx, "http://"+addr+"/meta")
				mu.Lock()
				defer mu.Unlock()
				name, _, _ := strings.Cut(addr, ":")
				if body == nil {
					results[name] = json.RawMessage(`{"error":"unreachable"}`)
					return
				}
				results[name] = body
			}(target)
		}
		wg.Wait()
		writeJSON(w, 200, results)
	}))

	mux.HandleFunc("POST /chaos", instrument(func(w http.ResponseWriter, r *http.Request) {
		var req struct {
			Action     string `json:"action"`
			DurationMs int64  `json:"durationMs"`
		}
		_ = json.NewDecoder(r.Body).Decode(&req)
		if req.DurationMs <= 0 {
			req.DurationMs = 15_000
		}
		deadline := time.Now().UnixMilli() + req.DurationMs

		switch req.Action {
		case "crash":
			// os.Exit(1) skips every deferred function and graceful shutdown —
			// exactly what a real crash looks like to the supervisor.
			writeJSON(w, 200, map[string]any{"ok": true, "action": "crash"})
			log.Println("chaos: crash requested, exiting 1")
			go func() { time.Sleep(50 * time.Millisecond); os.Exit(1) }()
			return
		case "unready":
			unreadyUntil.Store(deadline)
		case "slow":
			slowUntil.Store(deadline)
		case "hang":
			unreadyUntil.Store(deadline)
			slowUntil.Store(deadline)
		}
		writeJSON(w, 200, map[string]any{"ok": true, "action": req.Action})
	}))

	srv := &http.Server{
		Addr:              ":" + port,
		Handler:           mux,
		ReadHeaderTimeout: 5 * time.Second,
	}
	log.Printf("util (go) listening on :%s pid=%d", port, os.Getpid())
	log.Fatal(srv.ListenAndServe())
}

func fanOutHealth(ctx context.Context) map[string]bool {
	ctx, cancel := context.WithTimeout(ctx, 2*time.Second)
	defer cancel()

	targets := strings.Split(env("PEERS", "ai:8000,compute:9000"), ",")
	out := make(map[string]bool, len(targets))
	var mu sync.Mutex
	var wg sync.WaitGroup

	for _, target := range targets {
		target = strings.TrimSpace(target)
		if target == "" {
			continue
		}
		wg.Add(1)
		go func(addr string) {
			defer wg.Done()
			name, _, _ := strings.Cut(addr, ":")
			healthy := fetch(ctx, "http://"+addr+"/healthz") != nil
			mu.Lock()
			out[name] = healthy
			mu.Unlock()
		}(target)
	}
	wg.Wait()
	return out
}

var client = &http.Client{Timeout: 3 * time.Second}

func fetch(ctx context.Context, url string) json.RawMessage {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil
	}
	resp, err := client.Do(req)
	if err != nil {
		return nil
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		return nil
	}
	// Bound the read: a peer that streams forever must not exhaust our memory.
	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return nil
	}
	return json.RawMessage(body)
}
