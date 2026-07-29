# teach: Fifth image, same three moves — and the largest of the five, because
# teach: a React framework needs its runtime and its compiled output. Compare
# teach: with services/compute/Dockerfile: 187 kB versus ~200 MB, and Kubernetes
# teach: applies byte-for-byte identical YAML to both.

FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY packages/contracts/package.json packages/contracts/
COPY services/worker/package.json services/worker/
COPY apps/dashboard/package.json apps/dashboard/
RUN npm ci --workspace @quest/dashboard --include-workspace-root

FROM node:24-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY package.json package-lock.json ./
COPY packages/contracts ./packages/contracts
COPY apps/dashboard ./apps/dashboard

# teach: Baked in at build time, so every running container can report exactly
# teach: which commit it came from. This is what makes the version badge during
# teach: a rolling deploy meaningful rather than decorative.
ARG GIT_SHA=dev
ARG BUILD_TIME=unknown
ENV NEXT_TELEMETRY_DISABLED=1
RUN npm run build --workspace @quest/dashboard

FROM node:24-alpine AS runtime
WORKDIR /app
RUN apk add --no-cache tini

# teach: ARG exists only during the build; ENV persists into the running
# teach: container. Re-declaring here is required — ARGs do NOT cross stage
# teach: boundaries, a detail that silently produces "unknown" versions.
ARG GIT_SHA=dev
ARG BUILD_TIME=unknown
ENV GIT_SHA=$GIT_SHA BUILD_TIME=$BUILD_TIME

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
# teach: HOSTNAME=0.0.0.0 matters. Next binds localhost by default, and inside a
# teach: container localhost means *that container only* — the port would be
# teach: published but nothing would ever answer on it.

# teach: `output: "standalone"` in next.config.ts produced a minimal server
# teach: bundle with only the node_modules actually imported. Copying the full
# teach: workspace instead would roughly quintuple this image.
COPY --from=build --chown=node:node /app/apps/dashboard/.next/standalone ./
COPY --from=build --chown=node:node /app/apps/dashboard/.next/static ./apps/dashboard/.next/static

USER node
EXPOSE 3000
ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "apps/dashboard/server.js"]
