# Chapter 7 plan: Ship beyond your laptop

Status: **lessons live in the dashboard** (hands-on optional; demo mode has recordings).  
Companion stack: **`labs/quest-ship/`** (in-repo dummy project).  
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

It does **not** re-teach Dockerfile layers or kind. Point back to earlier chapters.

## Dummy project: zip or in-repo?

**Decision: in-repo lab folder, not a separate downloadable zip (for now).**

| Approach | Pros | Cons |
|----------|------|------|
| **`labs/quest-ship/` in this repo** | Versioned with the course; `cp -R` in lessons; CI can build it | Needs CQ checkout for live path |
| **Downloadable zip** | Works without full monorepo | Extra release artifact, version drift, hosting |
| **Heredoc-only scaffold** | No extra files | Painful for 3 services |

Hosted demo does **not** need the folder: it replays `recordings.json`.  
Live learners with the repo use `labs/quest-ship`.  
A public zip can be added later if we publish Ch 7 without shipping the whole monorepo.

## Lessons implemented

| ID | Title |
|----|--------|
| `two-machines` | Your laptop is not production |
| `ship-stack` | One VM is a real production shape |
| `env-on-host` | Config lives on the host, not in git |
| `tunnel-access` | Reach it without opening the world |
| `registry-push` | How the image leaves your laptop |
| `registry-pull` | The VM consumes a tag |
| `version-rollback` | Version, deploy, rollback |
| `build-where` | Build where? |
| `after-you-can-ship` | After you can ship |

Recordings: synthetic but realistic outputs in `apps/dashboard/src/generated/recordings.json` for hosted demo (cloud commands cannot all be captured from the local fleet).

## Relationship to containerquest-sm

External companion (`~/Documents/containerquest-sm`) is the fuller experiment (GHCR scripts, richer UI).  
`labs/quest-ship` is the **course-embedded** minimal twin so Chapter 7 does not depend on another repo.

## Non-goals

- Deploying the full 5-language fleet to a micro VM
- Required cloud account to complete “Container Quest” core (0–6)
- Replacing Chapter 5 kind content
