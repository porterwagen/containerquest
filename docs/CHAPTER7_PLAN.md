# Chapter 7 plan: Ship beyond your laptop

Status: **roadmap only** (lesson list in the dashboard; full hands-on not built yet).  
Last updated: 2026-08-08.

## Intent

Chapters 0–6 stay **local, no cloud account**. They are the complete Container Quest core.

Chapter 7 is an **optional** track for job-adjacent shipping:

- another machine (cloud VM)
- host `.env` (not in git)
- private access (SSH/IAP tunnel)
- registry push/pull (GHCR first)
- image tags as deploy + rollback unit
- judgment: build on laptop/CI vs on the VM

It must **not** re-teach Dockerfile layers or kind. Point back to earlier chapters.

## Relationship to companion work

Hands-on prototype spirit: **ContainerQuest SM** (`containerquest-sm`):

- nginx + static UI + Python api + worker
- Compose multi-service
- VM scripts, GHCR build/push/deploy scripts
- `APP_VERSION` / tags, env drills

Chapter 7 lessons, when written, should follow that **small stack** shape, not deploy the full 8-service CQ fleet to a micro VM.

## Chapter 6 change

`where-next` expanded to:

1. Two production shapes (Compose on one server vs multi-node K8s)
2. Name the “missing middle” (versioned image on another host)
3. Point to Chapter 7 as optional roadmap
4. Keep the existing K8s-advanced list as the other fork

## Planned lessons (7.1–7.9) — not implemented as full labs yet

| ID | Title | Goal |
|----|--------|------|
| 7.1 | Your laptop is not production | VM + SSH/IAP + Docker on host only |
| 7.2 | One VM is a real production shape | Small Compose stack on VM; health on box |
| 7.3 | Config lives on the host, not in git | Host `.env`; recreate; see config change |
| 7.4 | Reach it without opening the world | Tunnel laptop → VM localhost |
| 7.5 | How the image leaves your laptop | Tag, login, push (GHCR) |
| 7.6 | The VM consumes a tag | Pull-only compose; no build on server |
| 7.7 | Version, deploy, rollback | v2 ship; roll back to v1 by tag |
| 7.8 | Build where? | Laptop/CI vs VM; resource judgment |
| 7.9 | After you can ship | HTTPS, CORS+token API, CI, then cloud K8s if needed |

Dashboard today: single lesson `chapter-7-roadmap` that **lists** these as coming soon.

## When we build hands-on Chapter 7

1. Split `chapter-7-roadmap` into real lessons (or keep roadmap + add 7.1…)
2. Prefer a **companion repo or lite stack** in-tree under something like `labs/ship-sm/` rather than forcing the full fleet onto e2-micro
3. GHCR first; Artifact Registry as a later alternate
4. Keep core CQ promise: Ch 0–6 still work with zero cloud account

## Explicit non-goals for Ch 7 v1

- Deploying all five application languages to the cloud VM
- Full public multi-tenant product
- Required cloud account to complete “Container Quest”
- Replacing Chapter 5 kind content

## Positioning (languages / fleet)

The multi-language fleet stays a **platform gym** (“Docker does not care what you wrote”), not one business product narrative. Do not gut it for Ch 7. Offer the **small deploy stack** instead of simplifying the whole course into only SM.

## Success criteria for “Ch 7 done”

Learner can say:

> I built images on my laptop, pushed versioned tags to a registry, pulled them on a Linux VM, configured the host with env files, reached the app through a private tunnel, and rolled back by redeploying a previous tag.
