# teach: Same three moves as the C service — pick a base, build, ship a thin
# teach: final stage. Different language, identical shape.

# teach: The Go toolchain is ~250 MB of compiler, linker, and standard library.
# teach: None of it will appear in the final image.
FROM golang:1.26-alpine AS build
WORKDIR /src

# teach: Copy go.mod BEFORE the source. Docker caches each layer and invalidates
# teach: everything below the first change — so dependency downloads survive
# teach: source edits. Copying everything at once throws that cache away on
# teach: every single build.
COPY go.mod ./
RUN go mod download

COPY . .
# teach: CGO_ENABLED=0 builds a pure-Go static binary with no libc dependency.
# teach: -ldflags="-s -w" strips the symbol table and DWARF debug info (~25% smaller).
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -trimpath -o /util .

# teach: Distroless: a base with CA certificates and timezone data, but no shell
# teach: and no package manager. The middle ground between Alpine and scratch —
# teach: you keep TLS support, you lose the attack surface.
FROM gcr.io/distroless/static-debian13:nonroot
# teach: ARG exists only during the build; ENV persists into the running
# teach: container. Promoting one to the other is how a container can report
# teach: which commit it was built from — the basis of the version badge you
# teach: watch move during a rolling deploy.
ARG GIT_SHA=dev
ARG BUILD_TIME=unknown
ENV GIT_SHA=$GIT_SHA BUILD_TIME=$BUILD_TIME

COPY --from=build /util /util

# teach: Running as a non-root user is one word here, and it is the single
# teach: highest-value line in any Dockerfile. Root in a container is root on
# teach: the host kernel if anything ever escapes.
USER nonroot:nonroot
EXPOSE 8080
ENTRYPOINT ["/util"]
