SHELL := /bin/bash
export PATH := $(HOME)/.orbstack/bin:$(PATH)

COMPOSE := docker compose -f infra/compose/docker-compose.yml
CLUSTER := container-quest

.DEFAULT_GOAL := help

## help: list targets
help:
	@grep -E '^## ' $(MAKEFILE_LIST) | sed 's/## //' | awk -F: '{printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

## doctor: check that every required tool is present
doctor:
	@for t in docker kubectl kind helm go node; do \
	  printf "  %-10s " $$t; command -v $$t >/dev/null && echo "ok" || echo "MISSING"; done
	@printf "  %-10s " docker-daemon; docker info >/dev/null 2>&1 && echo "ok" || echo "NOT RUNNING"

## up: build and start the whole fleet under Docker Compose
up:
	$(COMPOSE) up --build -d
	@$(MAKE) --no-print-directory ps

## down: stop the fleet and remove volumes
down:
	$(COMPOSE) down -v

## ps: show container status
ps:
	@$(COMPOSE) ps

## logs: tail every service
logs:
	$(COMPOSE) logs -f --tail=50

## meta: curl /meta on every service — five languages, one JSON shape
meta:
	@for p in 3000 3001 8000 8080 9000; do \
	  echo "--- :$$p ---"; curl -s --max-time 3 localhost:$$p/meta || echo "(no response)"; echo; done

## cluster: create the local kind cluster
cluster:
	kind create cluster --config infra/k8s/kind-cluster.yaml

## cluster-rm: delete the kind cluster
cluster-rm:
	kind delete cluster --name $(CLUSTER)

## load: build images and side-load them into kind (no registry needed)
load:
	$(COMPOSE) build
	@for s in dashboard worker ai util compute; do kind load docker-image quest/$$s:dev --name $(CLUSTER); done

## deploy: apply the Kubernetes manifests
deploy:
	kubectl apply -k infra/k8s/overlays/local

## demo: build and serve the browser-only demo on :3100 (no Docker needed)
demo:
	NEXT_PUBLIC_QUEST_MODE=demo npm run build --workspace @quest/dashboard
	@cp -R apps/dashboard/.next/static apps/dashboard/.next/standalone/apps/dashboard/.next/static
	@echo "→ http://localhost:3100"
	@cd apps/dashboard && PORT=3100 NEXT_PUBLIC_QUEST_MODE=demo node .next/standalone/apps/dashboard/server.js

## deploy-demo: publish the demo build to Vercel (requires `vercel login`)
deploy-demo:
	npx vercel deploy --prod

## snippets: regenerate the in-app code snippets from the real files on disk
snippets:
	node scripts/collect-snippets.mjs

## ledger: regenerate the image size ledger from `docker images`
ledger:
	node scripts/image-report.mjs

.PHONY: help doctor up down ps logs meta cluster cluster-rm load deploy snippets ledger
