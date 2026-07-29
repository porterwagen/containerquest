package main

// A Redis client in ~90 lines, written against the wire protocol directly.
//
// This is here to make a point about why Go dominates cloud infrastructure.
// The obvious move is `go get github.com/redis/go-redis` — a fine library, and
// also 40k lines and a dependency tree to audit and update forever. But the
// Redis protocol (RESP) is deliberately trivial, and we need exactly one
// command. So we write it, and this service keeps its zero-dependency go.mod.
//
// RESP encodes a command as an array of bulk strings:
//
//	*3\r\n         <- array of 3 elements
//	$4\r\nXADD\r\n  <- bulk string of 4 bytes
//	...
//
// That is the entire format. Human-readable, trivially parsed, and you can
// drive a Redis server by hand with netcat if you want to.

import (
	"bufio"
	"fmt"
	"net"
	"net/url"
	"strings"
	"sync"
	"time"
)

type respClient struct {
	addr string
	mu   sync.Mutex
	conn net.Conn
	rw   *bufio.ReadWriter
}

func newRespClient(redisURL string) *respClient {
	addr := "redis:6379"
	if u, err := url.Parse(redisURL); err == nil && u.Host != "" {
		addr = u.Host
	}
	return &respClient{addr: addr}
}

// connect is lazy and re-runs after any failure. Redis restarting must not
// require this service to restart — resilience here is three lines of code.
func (c *respClient) connect() error {
	if c.conn != nil {
		return nil
	}
	conn, err := net.DialTimeout("tcp", c.addr, 2*time.Second)
	if err != nil {
		return err
	}
	c.conn = conn
	c.rw = bufio.NewReadWriter(bufio.NewReader(conn), bufio.NewWriter(conn))
	return nil
}

func (c *respClient) close() {
	if c.conn != nil {
		_ = c.conn.Close()
		c.conn = nil
		c.rw = nil
	}
}

// do sends one command and reads one reply, discarding the value. We only
// issue XADD, whose reply we do not need.
func (c *respClient) do(args ...string) error {
	c.mu.Lock()
	defer c.mu.Unlock()

	if err := c.connect(); err != nil {
		return err
	}

	var b strings.Builder
	fmt.Fprintf(&b, "*%d\r\n", len(args))
	for _, a := range args {
		fmt.Fprintf(&b, "$%d\r\n%s\r\n", len(a), a)
	}

	_ = c.conn.SetDeadline(time.Now().Add(2 * time.Second))
	if _, err := c.rw.WriteString(b.String()); err != nil {
		c.close()
		return err
	}
	if err := c.rw.Flush(); err != nil {
		c.close()
		return err
	}

	// Every RESP reply is one line, or a length-prefixed blob. XADD returns a
	// simple string (the entry id), so a single ReadString suffices.
	line, err := c.rw.ReadString('\n')
	if err != nil {
		c.close()
		return err
	}
	if strings.HasPrefix(line, "-") {
		return fmt.Errorf("redis: %s", strings.TrimSpace(line[1:]))
	}
	return nil
}

// xaddSpan appends one span to the capped stream.
//
// MAXLEN ~ N (with the tilde) lets Redis trim approximately, at whatever entry
// boundary is cheapest. Exact trimming forces work on every single write; here
// "roughly the last 2000" is exactly as useful and materially faster.
func (c *respClient) xaddSpan(stream string, fields map[string]string) error {
	args := []string{"XADD", stream, "MAXLEN", "~", "2000", "*"}
	for k, v := range fields {
		args = append(args, k, v)
	}
	return c.do(args...)
}
