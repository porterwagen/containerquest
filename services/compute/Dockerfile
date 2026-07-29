# teach: The whole Docker-is-language-agnostic argument, in 12 lines.
# teach: Compare this file to services/util (Go), services/ai (Python), and
# teach: services/worker (TypeScript). Same shape: pick a base, build, ship.

# teach: Stage 1 is a full Alpine system with a C compiler — around 250 MB.
FROM alpine:3.23 AS build
RUN apk add --no-cache gcc musl-dev
WORKDIR /src
COPY server.c .
# teach: -static bakes libc into the binary, so it depends on no shared library
# teach: at all. That is the trick that makes the next stage possible.
RUN gcc -O2 -Wall -Wextra -static -o compute server.c && strip compute

# teach: FROM scratch is a genuinely empty image. No shell, no libc, no distro,
# teach: no package manager, nothing. The final image is one file.
# teach: Measured result: 187 kB — about 1300x smaller than the Alpine builder
# teach: above, and Kubernetes schedules it with the exact same YAML as the
# teach: Next.js dashboard. Run `make ledger` for live numbers across all five.
# teach: A bonus: with no shell in the image, `docker exec ... sh` is impossible,
# teach: so the entire class of "attacker gets a shell" simply does not apply.
FROM scratch
# teach: ARG exists only during the build; ENV persists into the running
# teach: container. Promoting one to the other is how a container can report
# teach: which commit it was built from — the basis of the version badge you
# teach: watch move during a rolling deploy.
ARG GIT_SHA=dev
ARG BUILD_TIME=unknown
ENV GIT_SHA=$GIT_SHA BUILD_TIME=$BUILD_TIME

COPY --from=build /src/compute /compute

# teach: EXPOSE is documentation only — it publishes nothing by itself. The
# teach: server binds 0.0.0.0 rather than 127.0.0.1 because inside a container
# teach: "localhost" means the container alone, and the port would be unreachable.
EXPOSE 9000
ENTRYPOINT ["/compute"]
