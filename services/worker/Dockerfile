# teach: Fourth language, same three moves. Note what is MISSING: there is no
# teach: compile step. Node 24 strips TypeScript types at load time, so the .ts
# teach: files run directly — TypeScript never becomes a build stage at all.

# teach: This image builds from the REPO ROOT, not from services/worker.
# teach: A monorepo's lockfile lives at the root, and Docker cannot COPY from
# teach: above its build context. See the `context:` key in docker-compose.yml.

FROM node:24-alpine AS deps
WORKDIR /app

# teach: Copy only the manifests first. Dependencies change far less often than
# teach: source, so this layer stays cached across almost every rebuild — the
# teach: single biggest speedup available in a Node Dockerfile.
COPY package.json package-lock.json ./
COPY packages/contracts/package.json packages/contracts/
COPY services/worker/package.json services/worker/
COPY apps/dashboard/package.json apps/dashboard/

# teach: `npm ci` (not `npm install`) installs exactly what the lockfile says
# teach: and fails if the two disagree. Reproducible builds require it.
RUN npm ci --omit=dev --workspace @quest/worker --include-workspace-root

FROM node:24-alpine
WORKDIR /app
# teach: ARG exists only during the build; ENV persists into the running
# teach: container. Promoting one to the other is how a container can report
# teach: which commit it was built from — the basis of the version badge you
# teach: watch move during a rolling deploy.
ARG GIT_SHA=dev
ARG BUILD_TIME=unknown
ENV GIT_SHA=$GIT_SHA BUILD_TIME=$BUILD_TIME


# teach: tini is a tiny init process. Without it your app is PID 1, and PID 1
# teach: in Linux ignores signals it has no handler for — so `docker stop`
# teach: hangs for 10s and then SIGKILLs. tini forwards signals and reaps
# teach: zombie processes properly.
RUN apk add --no-cache tini

COPY --from=deps /app/node_modules ./node_modules
COPY --chown=node:node services/worker ./services/worker
COPY --chown=node:node packages/contracts ./packages/contracts

# teach: The node image ships an unprivileged `node` user already. Use it.
USER node
WORKDIR /app/services/worker
EXPOSE 3001

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "index.ts"]
