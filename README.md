# Container Quest

A hands-on course that teaches Docker and Kubernetes by running a real
eight-container system on your machine, then breaking it on purpose and
watching it recover.

Most tutorials stop at a hello-world container. This one starts there, walking
you through your first Dockerfile a line at a time, then hands you a miniature
production platform: eight services written in five languages, wired together
with Compose and deployed to a real local Kubernetes cluster. Every lesson is a
command you actually run, verified against services that actually change.

**32 lessons. 7 chapters. 8 containers. 5 languages.**

Repository: <https://github.com/porterwagen/containerquest>

---

## Quick start

```bash
git clone https://github.com/porterwagen/containerquest.git
cd containerquest
npm install

make doctor   # confirm the tools you need are installed
make up       # build and start all eight containers
```

Then open **http://localhost:3000** and start with Chapter 0.

When you are finished:

```bash
make down     # stop everything and remove volumes
```

### Iterating on the dashboard alone

If you are working on the UI rather than the course content, you can run the
Next.js app directly on your machine and skip Docker entirely:

```bash
npm run dev --workspace @quest/dashboard
```

The landing page and lessons render fine this way. The Dashboard view will show
every service as offline, because nothing is running for it to read.

---

## Requirements

| Tool | Needed for | Notes |
| --- | --- | --- |
| `docker` | Chapter 0 onward | [OrbStack](https://orbstack.dev) or Docker Desktop. macOS and Linux have no Docker daemon of their own, so one of these supplies it. |
| `node` | Running the dashboard | Version 22 or newer. |
| `kubectl` | Chapter 5 onward | The Kubernetes client. |
| `kind` | Chapter 5 onward | Runs a cluster as containers, no cloud account required. |

`make doctor` checks all of them and tells you what is missing.

---

## What you need to know first

**Assumed:** you can open a terminal and run a command, you know roughly what a
program and a network port are, and you can read a little code without needing
to write C, Go, or Python.

**Not assumed:** any Docker or Kubernetes knowledge at all. Chapter 0 starts
from why containers exist, has you run one, then walks through building your
own Dockerfile a line at a time. Every term is defined before it is used. No
systems or DevOps background, no networking theory, no YAML, no cloud account,
no credit card.

---

## The fleet

Eight containers. Five of them are services written for this project, each in a
different language on purpose, because the point is that the tooling does not
care what your program is written in.

| Service | Language | Port | Role |
| --- | --- | --- | --- |
| `dashboard` | TypeScript | 3000 | The course and the instrument panel. Also a container itself. |
| `worker` | TypeScript | 3001 | Chews through a background job queue. |
| `ai` | Python | 8000 | Slow and memory-hungry, like a real ML service. |
| `util` | Go | 8080 | Asks the other services how they are doing. |
| `compute` | C | 9000 | Raw number-crunching, in a 187 kB image. |
| `postgres` | Postgres 18 | 5432 | The database, where durable things go. |
| `redis` | Redis 8 | 6379 | Fast temporary store, used as the job queue. |
| `socket-proxy` | Infra | 2375 | Narrowly scoped Docker socket access for the dashboard. |

The same C program and Python program are packaged with the same commands and
scheduled with the same configuration. That is what makes these skills transfer
to any codebase.

---

## The course

| Chapter | Title | Lessons |
| --- | --- | --- |
| 00 | Getting started | 7 |
| 01 | What a container actually is | 4 |
| 02 | Images and how they're built | 4 |
| 03 | Networking, config, and data | 4 |
| 04 | When things break | 4 |
| 05 | Kubernetes | 6 |
| 06 | Ship your own app | 3 |

Docker first, then Compose, then Kubernetes. That is the order they were
invented, and the order in which each one's problems make the next one make
sense.

Lessons are not marked complete by clicking a button. The dashboard watches the
real services and verifies the effect of what you ran: a request counter rising,
a restart count moving, a container id being replaced. If the command did not
work, the step does not pass.

---

## Commands

Every target runs from the repository root.

### Docker

```bash
make up        # build and start the whole fleet
make ps        # container status
make logs      # tail every service
make meta      # curl /meta on all five services, one JSON shape
make down      # stop and remove volumes
```

### Kubernetes

```bash
make cluster     # create the local kind cluster (1 control plane, 2 workers)
make load        # build images and side-load them into the cluster
make deploy      # apply the manifests
make k8s         # all three of the above, everything Chapter 5 needs
make cluster-rm  # delete the cluster
```

No registry is involved. Images are built locally and handed straight to the
cluster, which is why you never need an account anywhere.

### Maintenance

```bash
make doctor    # check every required tool is present
make snippets  # regenerate in-app code snippets from the real files
make ledger    # regenerate the image size ledger from `docker images`
make record    # capture real terminal output for every lesson (needs the fleet up)
```

### Development

```bash
npm test       # run the contract tests across all workspaces
npm run typecheck
npm run dev --workspace @quest/dashboard
```

The contract tests are worth a look. They assert things the project actually
promises: that every service is one of the five languages, that host ports do
not collide, that every declared dependency resolves, and that each driver
capability gap has a note explaining it to the user.

---

## Project structure

```
containerquest/
├── Makefile                      orchestration, run everything from here
├── infra/
│   ├── compose/docker-compose.yml  all eight containers, wired together
│   ├── k8s/                        kind cluster config and manifests
│   └── images.env                  pinned base image versions
├── apps/dashboard/               Next.js app, and one of the eight containers
│   ├── src/app/                    routes: /, /learn, /dashboard
│   ├── src/lessons/                the course content, one file per chapter
│   └── Dockerfile
├── services/
│   ├── compute/                    C
│   ├── util/                       Go
│   ├── ai/                         Python
│   └── worker/                     TypeScript
└── packages/contracts/           shared types, the one JSON shape
```

Note that `services/compute`, `util`, and `ai` are not npm workspaces. They are
C, Go, and Python, and npm cannot touch them. Docker and `make` are what
orchestrate the whole fleet.

---

## Two modes

The dashboard runs in one of two modes, selected by `NEXT_PUBLIC_QUEST_MODE`.

**Live** is the default. The dashboard reads the real Docker socket through the
proxy, shows genuine telemetry, and verifies your lesson steps against services
that are actually running.

**Demo** is the hosted build, for reading the course in a browser with no Docker
present. Terminal output is not faked: every command was run against a live
system and recorded to `src/generated/recordings.json`, then played back. The
hostnames, image sizes, and errors are real. What you cannot do from a browser
is run the commands yourself.

```bash
make demo         # build and serve the demo locally on :3100
make deploy-demo  # publish the demo to Vercel
```

---

## Troubleshooting

**`make up` fails with a Docker connection error.** The `docker` CLI is only a
client. It needs a daemon, which on macOS means OrbStack or Docker Desktop must
be running. `docker info` confirms it.

**A service is running but unreachable.** Almost always because it is listening
on `localhost` rather than `0.0.0.0`. Inside a container, `localhost` means only
that container. Chapter 3 covers this in detail.

**A pod sits in `ImagePullBackOff`.** The image was built locally but the
cluster is trying to download it. Run `make load` to side-load it, and check
`imagePullPolicy: IfNotPresent` is set.

**Port already in use.** Something else on your machine owns 3000, 8000, 8080,
9000, 5432, or 6379. `make down` first, or stop the conflicting process.
