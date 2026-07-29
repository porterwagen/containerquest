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
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
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

// traceKey is the context key carrying the trace id down to fetch().
// An empty struct type rather than a string, so it cannot collide with a key
// set by any other package — the standard Go idiom for context keys.
type traceKey struct{}

// targetName turns "http://ai:8000/meta" into "ai" for span labelling.
func targetName(rawURL string) string {
	u, err := url.Parse(rawURL)
	if err != nil {
		return "unknown"
	}
	host, _, _ := strings.Cut(u.Host, ":")
	return host
}

// instrument counts requests, honours the "slow" chaos action, propagates the
// trace id, and logs timing — the Go equivalent of middleware, without a
// framework. A handler is just a function, so wrapping one is just a closure.
func instrument(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// The dashboard polls /meta constantly to draw its cards. Counting
		// those would mean this number measures the monitoring, not the
		// traffic — so probes announce themselves and are excluded.
		if r.Header.Get("X-Quest-Probe") == "" {
			requests.Add(1)
		}
		if time.Now().UnixMilli() < slowUntil.Load() {
			time.Sleep(2 * time.Second)
		}

		// Accept an inbound trace id, or start a new trace if we are the entry
		// point. Either way every downstream call inherits it.
		traceID := r.Header.Get(traceHeader)
		if traceID == "" {
			traceID = fmt.Sprintf("%d-util", time.Now().UnixNano())
		}
		r = r.WithContext(context.WithValue(r.Context(), traceKey{}, traceID))

		t0 := time.Now()
		next(w, r)
		log.Printf("%s %s %v trace=%s", r.Method, r.URL.Path, time.Since(t0).Round(time.Millisecond), traceID)
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
			// Marked as a probe: this service checks its peers' health
			// constantly, and those checks must not look like user traffic.
			healthy := fetchProbe(ctx, "http://"+addr+"/healthz") != nil
			mu.Lock()
			out[name] = healthy
			mu.Unlock()
		}(target)
	}
	wg.Wait()
	return out
}

var client = &http.Client{Timeout: 3 * time.Second}

// fetchProbe is fetch's quiet twin: same request, but flagged as monitoring so
// the far end does not count it, and no span is recorded for it. Health checks
// happen constantly and would drown out the real traffic on the graph.
func fetchProbe(ctx context.Context, url string) json.RawMessage {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil
	}
	req.Header.Set("X-Quest-Probe", "1")
	resp, err := client.Do(req)
	if err != nil {
		return nil
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 400 {
		return nil
	}
	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<20))
	if err != nil {
		return nil
	}
	return json.RawMessage(body)
}

// The trace header name, shared with every other service in the fleet.
const traceHeader = "X-Quest-Trace"

var spans = newRespClient(env("REDIS_URL", "redis://redis:6379"))

// recordSpan reports one outbound call to the Redis stream the dashboard reads.
//
// Fire-and-forget on purpose: telemetry must never slow down or fail the
// request it is describing. If Redis is down we lose visibility, which is bad;
// if Redis being down broke request handling, that would be far worse.
func recordSpan(traceID, to string, started time.Time, status int) {
	if traceID == "" {
		return
	}
	go func() {
		err := spans.xaddSpan("quest:spans", map[string]string{
			"traceId": traceID,
			"from":    "util",
			"to":      to,
			"ms":      fmt.Sprintf("%d", time.Since(started).Milliseconds()),
			"status":  fmt.Sprintf("%d", status),
			"at":      fmt.Sprintf("%d", time.Now().UnixMilli()),
		})
		if err != nil {
			log.Printf("span drop: %v", err)
		}
	}()
}

// fetch propagates the incoming trace id to the next hop. This one line is
// what turns a pile of unrelated timings into a connected trace — and
// forgetting it is why so many traces mysteriously end one service early.
func fetch(ctx context.Context, url string) json.RawMessage {
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil
	}

	traceID, _ := ctx.Value(traceKey{}).(string)
	if traceID != "" {
		req.Header.Set(traceHeader, traceID)
	}

	started := time.Now()
	resp, err := client.Do(req)
	if err != nil {
		recordSpan(traceID, targetName(url), started, 0)
		return nil
	}
	defer resp.Body.Close()
	recordSpan(traceID, targetName(url), started, resp.StatusCode)

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
