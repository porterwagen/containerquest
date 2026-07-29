/*
 * Container Quest — compute service
 *
 * An HTTP server in C on raw POSIX sockets. No framework, no runtime, no
 * package manager. It exists to prove one thing: Docker does not care.
 * This speaks the same /healthz, /readyz, /meta, /chaos contract as the
 * TypeScript, Python, and Go services, and Kubernetes schedules it with the
 * same YAML — while shipping in an image with no operating system inside.
 *
 * Deliberately a teaching prop, not a production server: fixed-size buffers,
 * no keep-alive, no TLS.
 */
#define _POSIX_C_SOURCE 200809L

#include <arpa/inet.h>
#include <netinet/in.h>
#include <pthread.h>
#include <signal.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <sys/socket.h>
#include <time.h>
#include <unistd.h>

#define BUF 8192

static time_t g_start;
static unsigned long g_requests = 0;
static time_t g_unready_until = 0; /* readiness fails until this time */
static time_t g_slow_until = 0;    /* responses are delayed until this time */
static pthread_mutex_t g_lock = PTHREAD_MUTEX_INITIALIZER;

static const char *envd(const char *key, const char *fallback) {
  const char *v = getenv(key);
  return (v && *v) ? v : fallback;
}

static long now_ms(void) {
  struct timespec ts;
  clock_gettime(CLOCK_MONOTONIC, &ts);
  return ts.tv_sec * 1000L + ts.tv_nsec / 1000000L;
}

static void send_response(int fd, int status, const char *reason, const char *ctype,
                          const char *body) {
  char head[512];
  size_t len = strlen(body);
  int n = snprintf(head, sizeof head,
                   "HTTP/1.1 %d %s\r\n"
                   "Content-Type: %s\r\n"
                   "Content-Length: %zu\r\n"
                   "Connection: close\r\n\r\n",
                   status, reason, ctype, len);
  if (write(fd, head, n) < 0) return;
  if (write(fd, body, len) < 0) return;
}

/* Emits a JSON string field, or a bare null when the value is absent.
 * podName is null under Docker and populated under Kubernetes — that
 * difference is exactly what the dashboard highlights. */
static void json_nullable(char *out, size_t cap, const char *key, const char *val) {
  if (val && *val)
    snprintf(out, cap, "\"%s\":\"%s\"", key, val);
  else
    snprintf(out, cap, "\"%s\":null", key);
}

static void handle_meta(int fd) {
  char host[256] = "unknown";
  gethostname(host, sizeof host - 1);

  char pod[300], node[300], ns[300];
  json_nullable(pod, sizeof pod, "podName", getenv("POD_NAME"));
  json_nullable(node, sizeof node, "nodeName", getenv("NODE_NAME"));
  json_nullable(ns, sizeof ns, "namespace", getenv("POD_NAMESPACE"));

  pthread_mutex_lock(&g_lock);
  unsigned long reqs = g_requests;
  pthread_mutex_unlock(&g_lock);

  char body[2048];
  snprintf(body, sizeof body,
           "{\"service\":\"compute\",\"language\":\"c\",\"version\":\"%s\","
           "\"gitSha\":\"%s\",\"buildTime\":\"%s\",\"hostname\":\"%s\","
           "%s,%s,%s,"
           "\"uptimeSec\":%ld,\"requests\":%lu,\"pid\":%d}",
           envd("SERVICE_VERSION", "1.0.0"), envd("GIT_SHA", "dev"),
           envd("BUILD_TIME", "unknown"), host, pod, node, ns,
           (long)(time(NULL) - g_start), reqs, (int)getpid());
  send_response(fd, 200, "OK", "application/json", body);
}

static void handle_chaos(int fd, const char *body) {
  const char *applied = "none";

  /* crash: exit non-zero. Under Compose the restart policy brings it back;
   * under Kubernetes the pod's restart counter ticks up. Same button, and
   * the difference in what happens next is the whole Docker-vs-k8s lesson. */
  if (strstr(body, "\"crash\"")) {
    send_response(fd, 200, "OK", "application/json",
                  "{\"ok\":true,\"action\":\"crash\"}");
    close(fd);
    fprintf(stderr, "[compute] chaos: crash requested, exiting 1\n");
    exit(1);
  }

  pthread_mutex_lock(&g_lock);
  if (strstr(body, "\"unready\"")) {
    /* Readiness only. The process stays perfectly healthy — Kubernetes pulls
     * it from the Service endpoints but never restarts it. */
    g_unready_until = time(NULL) + 15;
    applied = "unready";
  } else if (strstr(body, "\"slow\"")) {
    g_slow_until = time(NULL) + 15;
    applied = "slow";
  } else if (strstr(body, "\"hang\"")) {
    /* Stops answering entirely, so the liveness probe fails and the
     * supervisor kills us. The slow-motion version of crash. */
    g_unready_until = time(NULL) + 600;
    g_slow_until = time(NULL) + 600;
    applied = "hang";
  }
  pthread_mutex_unlock(&g_lock);

  char out[128];
  snprintf(out, sizeof out, "{\"ok\":true,\"action\":\"%s\"}", applied);
  send_response(fd, 200, "OK", "application/json", out);
}

/* The actual work: escape-time Mandelbrot, rendered as ASCII.
 * Real CPU burn, so the dashboard's CPU meter has something honest to show. */
static void handle_mandelbrot(int fd) {
  static const char ramp[] = " .:-=+*#%@";
  char *body = malloc(96 * 33 + 1);
  if (!body) {
    send_response(fd, 500, "Internal Server Error", "text/plain", "oom");
    return;
  }
  size_t p = 0;
  for (int y = 0; y < 32; y++) {
    for (int x = 0; x < 95; x++) {
      double cr = (x - 62.0) / 30.0, ci = (y - 16.0) / 13.0;
      double zr = 0, zi = 0;
      int i = 0;
      while (zr * zr + zi * zi <= 4.0 && i < 500) {
        double t = zr * zr - zi * zi + cr;
        zi = 2 * zr * zi + ci;
        zr = t;
        i++;
      }
      body[p++] = ramp[(i == 500) ? 9 : i % 9];
    }
    body[p++] = '\n';
  }
  body[p] = '\0';
  send_response(fd, 200, "OK", "text/plain", body);
  free(body);
}

static void *handle_conn(void *arg) {
  int fd = (int)(long)arg;
  char buf[BUF];
  ssize_t n = read(fd, buf, sizeof buf - 1);
  if (n <= 0) {
    close(fd);
    return NULL;
  }
  buf[n] = '\0';

  char method[8] = {0}, path[256] = {0};
  sscanf(buf, "%7s %255s", method, path);

  /* The dashboard polls this service every couple of seconds to draw its
   * card. Counting those would make g_requests a measure of the monitoring
   * rather than of real traffic, so probes identify themselves and skip it. */
  int is_probe = strstr(buf, "X-Quest-Probe") != NULL || strstr(buf, "x-quest-probe") != NULL;

  pthread_mutex_lock(&g_lock);
  if (!is_probe) g_requests++;
  time_t unready_until = g_unready_until, slow_until = g_slow_until;
  pthread_mutex_unlock(&g_lock);

  if (time(NULL) < slow_until) {
    struct timespec delay = {.tv_sec = 2, .tv_nsec = 0};
    nanosleep(&delay, NULL);
  }

  const char *body = strstr(buf, "\r\n\r\n");
  body = body ? body + 4 : "";

  long t0 = now_ms();

  if (strcmp(path, "/healthz") == 0) {
    /* Liveness: the process is running and can accept a socket. That is all
     * liveness should ever mean — checking dependencies here causes cascading
     * restarts when a shared database wobbles. */
    send_response(fd, 200, "OK", "application/json", "{\"ok\":true,\"checks\":{}}");
  } else if (strcmp(path, "/readyz") == 0) {
    int ready = time(NULL) >= unready_until;
    send_response(fd, ready ? 200 : 503, ready ? "OK" : "Service Unavailable",
                  "application/json",
                  ready ? "{\"ok\":true,\"checks\":{\"self\":true}}"
                        : "{\"ok\":false,\"checks\":{\"self\":false},"
                          "\"detail\":\"chaos: unready\"}");
  } else if (strcmp(path, "/meta") == 0) {
    handle_meta(fd);
  } else if (strncmp(path, "/chaos", 6) == 0 && strcmp(method, "POST") == 0) {
    handle_chaos(fd, body);
  } else if (strncmp(path, "/mandelbrot", 11) == 0) {
    handle_mandelbrot(fd);
  } else if (strcmp(path, "/") == 0) {
    send_response(fd, 200, "OK", "text/plain",
                  "compute (C) — try /meta /healthz /readyz /mandelbrot\n");
  } else {
    send_response(fd, 404, "Not Found", "application/json", "{\"error\":\"not found\"}");
  }

  fprintf(stderr, "[compute] %s %s %ldms\n", method, path, now_ms() - t0);
  close(fd);
  return NULL;
}

int main(void) {
  /* Writing to a socket the client already closed raises SIGPIPE, which
   * defaults to killing the process. In a container that reads as a mystery
   * crash loop. */
  signal(SIGPIPE, SIG_IGN);
  setvbuf(stderr, NULL, _IOLBF, 0);
  g_start = time(NULL);

  int port = atoi(envd("PORT", "9000"));
  int srv = socket(AF_INET, SOCK_STREAM, 0);
  if (srv < 0) return perror("socket"), 1;

  int one = 1;
  setsockopt(srv, SOL_SOCKET, SO_REUSEADDR, &one, sizeof one);

  struct sockaddr_in addr = {0};
  addr.sin_family = AF_INET;
  addr.sin_addr.s_addr = htonl(INADDR_ANY); /* not 127.0.0.1 — see Dockerfile */
  addr.sin_port = htons(port);

  if (bind(srv, (struct sockaddr *)&addr, sizeof addr) < 0) return perror("bind"), 1;
  if (listen(srv, 64) < 0) return perror("listen"), 1;

  fprintf(stderr, "[compute] listening on :%d (pid %d)\n", port, (int)getpid());

  for (;;) {
    int fd = accept(srv, NULL, NULL);
    if (fd < 0) continue;
    pthread_t t;
    if (pthread_create(&t, NULL, handle_conn, (void *)(long)fd) != 0) {
      close(fd);
      continue;
    }
    pthread_detach(t);
  }
}
