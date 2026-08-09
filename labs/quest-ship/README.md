# quest-ship (Chapter 7 lab stack)

Small three-service Compose app for **Ship beyond your laptop**:

```text
web (nginx) → api (FastAPI) → worker (FastAPI)
```

Port **3100** on the host (avoids clashing with Container Quest on 3000).

## Local

```bash
cd labs/quest-ship
docker compose up --build -d
curl -s http://127.0.0.1:3100/api/healthz
open http://127.0.0.1:3100
```

## Version stamp

```bash
APP_VERSION=v2 docker compose up --build -d
```

## Registry shape (Chapter 7)

Build/push from a machine with Docker and a GHCR token, then on a VM use
`compose.registry.yaml` with `GHCR_IMAGE_PREFIX` and `APP_VERSION` (pull only).

This folder is the in-repo dummy project for Chapter 7. No separate zip required
if you have the Container Quest checkout; hosted demo mode uses recorded
terminals instead of this folder.
