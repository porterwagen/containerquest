SHELL := /bin/bash
export PATH := $(HOME)/.orbstack/bin:$(PATH)

COMPOSE := docker compose -f infra/compose/docker-compose.yml
CLUSTER := container-quest

# Every host port the fleet publishes. Kept here so `preflight` can check them
# all, not just the dashboard's.
PORTS := 3000 3001 5432 6379 8000 8080 9000

.DEFAULT_GOAL := help

## help: list targets
help:
	@grep -E '^## ' $(MAKEFILE_LIST) | sed 's/## //' | awk -F: '{printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

## doctor: check that every required tool is present
doctor:
	@for t in docker kubectl kind helm go node; do \
	  printf "  %-10s " $$t; command -v $$t >/dev/null && echo "ok" || echo "MISSING"; done
	@printf "  %-10s " docker-daemon; docker info >/dev/null 2>&1 && echo "ok" || echo "NOT RUNNING"
	@$(MAKE) --no-print-directory preflight 2>/dev/null || true

## preflight: fail early if a non-Docker process already owns a published port
#
# teach: Publishing a port does NOT reserve it. If something on your machine is
# teach: already listening on 3000, Docker still reports the port as published
# teach: and exits 0 — but your browser reaches the other process, not the
# teach: container. The usual culprit is a leftover `npm run dev`, which has
# teach: none of the fleet's env (REDIS_URL, DOCKER_HOST) and cannot resolve
# teach: service names, so the dashboard 500s in ways that look like app bugs
# teach: while the containers behind it are perfectly healthy. Catching it here
# teach: costs one lsof and saves an afternoon.
preflight:
	@command -v lsof >/dev/null 2>&1 || exit 0; \
	clash=""; \
	for p in $(PORTS); do \
	  for entry in $$(lsof -nP -iTCP:$$p -sTCP:LISTEN 2>/dev/null | awk 'NR>1 {print $$1 "|" $$2}' | sort -u); do \
	    cmd=$${entry%%|*}; pid=$${entry##*|}; \
	    case "$$cmd" in \
	      OrbStack*|Docker*|com.docke*|docker*|dockerd|vpnkit|qemu*) ;; \
	      *) clash="$$clash\n    :$$p is held by $$cmd (pid $$pid)";; \
	    esac; \
	  done; \
	done; \
	if [ -n "$$clash" ]; then \
	  printf "\n  \033[1;31mPort conflict detected — 'make up' will refuse to start.\033[0m\n"; \
	  printf "%b\n" "$$clash"; \
	  printf "\n  Something outside Docker already owns a port the fleet publishes.\n"; \
	  printf "  The usual cause is an 'npm run dev' left running on :3000.\n\n"; \
	  printf "  Docker does NOT treat this as an error. It publishes the port anyway\n"; \
	  printf "  and your browser keeps talking to the other process, which has none of\n"; \
	  printf "  the fleet's configuration — so the dashboard fails in ways that look\n"; \
	  printf "  like application bugs while the containers are perfectly healthy.\n\n"; \
	  printf "  Stop it, then re-run 'make up':\n"; \
	  printf "    kill \$$(lsof -ti tcp:3000)   # or Ctrl-C the terminal running it\n\n"; \
	  printf "  To run a dev server alongside the fleet, give it its own port:\n"; \
	  printf "    PORT=3002 npm run dev --workspace @quest/dashboard\n\n"; \
	  exit 1; \
	fi; \
	printf "  %-10s ok\n" ports

## up: build and start the whole fleet under Docker Compose
up: preflight
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

## cluster: create the local kind cluster (skipped if it already exists)
#
# teach: `kind create cluster` fails outright when a cluster of that name is
# teach: already there, which made `make k8s` a one-shot command: safe the first
# teach: time, an error every time after. Chapter 5 tells learners to run it
# teach: whenever the cluster looks wrong, so it has to be re-runnable. Checking
# teach: first is the whole fix.
cluster:
	@if kind get clusters 2>/dev/null | grep -qx '$(CLUSTER)'; then \
	  printf "  %-10s already exists (%s)\n" cluster $(CLUSTER); \
	else \
	  kind create cluster --config infra/k8s/kind-cluster.yaml; \
	fi

## cluster-rm: delete the kind cluster
cluster-rm:
	kind delete cluster --name $(CLUSTER)

## load: build images and side-load them into kind (no registry needed)
#
# teach: --quiet on purpose. The images are normally already built by `make up`,
# teach: so the build here is a cache check, and 200 lines of BuildKit output
# teach: buries the part that matters: which images went onto which nodes.
load:
	$(COMPOSE) build --quiet
	@for s in compute ai util; do kind load docker-image quest/$$s:dev --name $(CLUSTER); done

## k8s: cluster + images + manifests, everything Chapter 5 needs
k8s: cluster load deploy
	@kubectl get pods -n container-quest

## deploy: apply the Kubernetes manifests
deploy:
	kubectl apply -k infra/k8s/base

## record: capture real terminal output for every lesson (needs the fleet up)
record:
	node scripts/record-lessons.mjs

## record-missing: record only the steps that have no recording yet
record-missing:
	node scripts/record-lessons.mjs --missing

## check-recordings: fail if any lesson step lacks a current recording
check-recordings:
	node scripts/check-recordings.mjs

## demo: build and serve the browser-only demo on :3100 (no Docker needed)
demo: check-recordings
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

.PHONY: help doctor preflight up down ps logs meta cluster cluster-rm load k8s deploy record record-missing check-recordings demo deploy-demo snippets ledger
