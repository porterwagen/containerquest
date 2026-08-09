import type { Lesson } from "./types.ts";

/**
 * Chapter 7  -  Ship beyond your laptop.
 *
 * Optional cloud/deploy track after the local course (Ch 0-6). Uses the small
 * labs/quest-ship stack, not the full eight-service fleet. Hosted demo mode
 * replays recordings in recordings.json (including illustrative cloud output).
 */

const CH = "Ship beyond your laptop";

export const CHAPTER_7: Lesson[] = [
  {
    id: "two-machines",
    chapter: 7,
    chapterTitle: CH,
    section: "Another machine",
    title: "Your laptop is not production",
    minutes: 10,
    concept: [
      "Chapters 0 to 6 lived on one computer. That was deliberate: no cloud account, no credit card, and the ideas still hold.",
      "Production means at least two places: the machine where you build or write code, and the machine where users (or you) run the app. Until an image runs on a second machine, you have only practiced local Docker.",
      "This chapter uses a SMALL stack (web + api + worker) in labs/quest-ship, not the full Container Quest fleet. The fleet already proved multi-language packaging. Here the lesson is shipping.",
      "You will need a Linux VM with Docker (for example a small Google Compute Engine instance) and a way to SSH in. IAP tunnel SSH is a good pattern on GCP; plain SSH keys work elsewhere. If you are reading the hosted demo, you will replay recorded terminals instead of talking to a real VM.",
    ],
    steps: [
      {
        instruction:
          "Confirm Docker is available where you will work. On a cloud VM this is the first thing you install after SSH.",
        command: "docker --version && docker compose version",
        commandParts: [
          { piece: "docker --version", meaning: "Docker Engine is installed" },
          { piece: "docker compose version", meaning: "Compose plugin is installed" },
        ],
        ifItFails:
          "Install Docker Engine for your OS (docs.docker.com). On a fresh VM, do that before any compose up.",
        saw: "Version lines for Engine and Compose. The host needs Docker. It does not need Node or Python for quest-ship; those run inside images.",
        check: { kind: "manual", label: "Docker and Compose report versions" },
      },
      {
        instruction:
          "Sketch the two-machine picture. This command only prints the map (no cloud required).",
        command:
          "echo 'laptop/build-machine  -->  registry (later)  -->  VM runs containers'",
        commandParts: [
          {
            piece: "echo '...'",
            meaning: "Name the path; registry is the warehouse between machines",
          },
        ],
        saw: "Three roles: build somewhere, store images in a registry, run on a server. Kind load skipped the registry. Real deploy usually does not.",
        check: { kind: "manual", label: "I can name build, registry, and run roles" },
      },
    ],
    recap: [
      "You confirmed Docker and Compose exist on the machine you care about.",
      "You named the path: build machine, registry, and VM as separate roles.",
    ],
    takeaway:
      "Shipping means a second machine. Docker on that host runs images; the host does not need your app language installed.",
  },

  {
    id: "ship-stack",
    chapter: 7,
    chapterTitle: CH,
    section: "Compose on a host",
    title: "One VM is a real production shape",
    minutes: 18,
    concept: [
      "A single server running Compose is a legitimate production shape. Many internal tools never need Kubernetes.",
      "Use a small stack so builds finish on a tiny VM. The in-repo lab is labs/quest-ship: nginx UI, Python api, Python worker. Host port 3100 avoids clashing with Container Quest on 3000.",
      "If you have this repository checked out, copy the lab folder. Hosted demo mode shows the same commands as a recording.",
      "First bring-up may use docker compose up --build on the server. Later lessons switch to pull-only from a registry so the VM stops compiling.",
    ],
    steps: [
      {
        instruction:
          "Copy the Chapter 7 lab stack into your home directory (from a Container Quest checkout).",
        command:
          "rm -rf ~/quest-ship && cp -R labs/quest-ship ~/quest-ship && ls -1 ~/quest-ship",
        commandParts: [
          { piece: "cp -R labs/quest-ship ~/quest-ship", meaning: "Dummy project lives under labs/" },
          { piece: "ls -1 ~/quest-ship", meaning: "You should see compose.yaml and services/" },
        ],
        ifItFails:
          "Run this from the Container Quest repo root so labs/quest-ship exists. On the hosted demo, play the recording instead.",
        saw: "compose.yaml, compose.registry.yaml, apps/, services/, README. That is enough to practice real multi-service deploy without the full fleet.",
        check: { kind: "manual", label: "quest-ship folder is in place" },
      },
      {
        instruction: "Build and start the stack. First build downloads base images and may take a few minutes.",
        command: "cd ~/quest-ship && docker compose up --build -d && docker compose ps",
        commandParts: [
          { piece: "docker compose up --build -d", meaning: "Build images and start detached" },
          { piece: "docker compose ps", meaning: "All three services should look healthy" },
        ],
        ifItFails:
          "Out of memory on a micro VM: free disk, stop other stacks, or use a slightly larger machine. Prefer registry pull later so the VM does not compile.",
        saw: "web, api, and worker running. web publishes 3100:80. Healthchecks should pass.",
        check: { kind: "manual", label: "compose ps shows healthy services" },
      },
      {
        instruction: "Prove the path on the host: health, then a job through nginx to api to worker.",
        command:
          "curl -sS http://127.0.0.1:3100/api/healthz && echo && curl -sS -X POST http://127.0.0.1:3100/api/v1/jobs -H 'Content-Type: application/json' -d '{\"message\":\"hello ship\"}' && echo",
        commandParts: [
          { piece: "curl .../api/healthz", meaning: "nginx proxies /api to the api container" },
          { piece: "POST .../v1/jobs", meaning: "api calls worker; response shows path and versions" },
        ],
        saw: "JSON from api, then a job result with path browser/web/api/worker and a worker version stamp. Open http://127.0.0.1:3100 for the tiny UI.",
        check: { kind: "manual", label: "Health and job both succeeded" },
      },
    ],
    recap: [
      "You placed the small quest-ship lab on disk and started it with Compose.",
      "You verified multi-service traffic through nginx to api to worker.",
    ],
    takeaway:
      "A small Compose stack on one host is a real deploy shape. Keep the app tiny when the host is tiny.",
    source: {
      path: "labs/quest-ship/compose.yaml",
      note: "The Chapter 7 dummy project. Not the eight-service fleet.",
    },
  },

  {
    id: "env-on-host",
    chapter: 7,
    chapterTitle: CH,
    section: "Compose on a host",
    title: "Config lives on the host, not in git",
    minutes: 12,
    concept: [
      "Images should not contain secrets. Production config is supplied at run time.",
      "Compose reads a .env file in the project directory for ${VAR} substitution, and can pass environment into containers. That file stays on the host (or in a secret manager). Git keeps .env.example only.",
      "Changing env and recreating containers updates behavior without editing Python. Changing code still needs a new image build.",
    ],
    steps: [
      {
        instruction: "Create a host env file from the example and set a visible delay.",
        command:
          "cd ~/quest-ship && cp -n .env.example .env 2>/dev/null; grep -q '^WORK_DELAY_MS=' .env && sed -i.bak 's/^WORK_DELAY_MS=.*/WORK_DELAY_MS=800/' .env || echo 'WORK_DELAY_MS=800' >> .env; grep WORK_DELAY_MS .env",
        commandParts: [
          { piece: "cp -n .env.example .env", meaning: "Local config file (gitignored in real projects)" },
          { piece: "WORK_DELAY_MS=800", meaning: "Config change without editing app source" },
        ],
        saw: "WORK_DELAY_MS=800 in .env. The worker will sleep longer so timing in the UI is obvious.",
        check: { kind: "manual", label: "Host .env shows the new delay" },
      },
      {
        instruction: "Recreate containers so they pick up env, then run a job and notice workerMs.",
        command:
          "cd ~/quest-ship && docker compose up -d && sleep 2 && curl -sS -X POST http://127.0.0.1:3100/api/v1/jobs -H 'Content-Type: application/json' -d '{\"message\":\"env drill\"}' && echo",
        commandParts: [
          { piece: "docker compose up -d", meaning: "Recreate with new env (no code rebuild required for env-only)" },
        ],
        saw: "workerMs should be around 800 (plus a little overhead). Config changed; image code did not have to change.",
        check: { kind: "manual", label: "Job timing reflects WORK_DELAY_MS" },
      },
    ],
    recap: [
      "You created a host .env and changed WORK_DELAY_MS without editing application source.",
      "You recreated the stack and saw runtime config affect the job.",
    ],
    takeaway:
      "Host env files configure a deployment. Git holds examples, not production secrets.",
  },

  {
    id: "tunnel-access",
    chapter: 7,
    chapterTitle: CH,
    section: "Access",
    title: "Reach it without opening the world",
    minutes: 10,
    concept: [
      "On a cloud VM, the app may listen on 127.0.0.1 only, or on a private interface. Your laptop browser cannot open the VM's localhost directly: localhost always means the machine you are sitting at.",
      "An SSH local forward (including gcloud compute ssh with IAP and -L) maps laptop:PORT to the remote localhost:PORT. Your browser talks to the laptop; the tunnel carries bytes to the VM.",
      "Port-forward in Kubernetes was a debug tool. The same idea on a VM is often how you preview before you add public HTTPS.",
    ],
    steps: [
      {
        instruction:
          "Print the tunnel recipe. When you have a real VM, run the gcloud (or ssh -L) form and leave it open.",
        command: `echo 'gcloud compute ssh VM_NAME --tunnel-through-iap -- -L 3100:localhost:3100'
echo 'Then open http://127.0.0.1:3100 on your laptop while the tunnel stays up.'`,
        commandParts: [
          { piece: "-L 3100:localhost:3100", meaning: "Laptop 3100 forwards to VM localhost 3100" },
          { piece: "--tunnel-through-iap", meaning: "GCP: admin path without public SSH if configured" },
        ],
        saw: "You have the command shape. Public port 80/443 comes later with a reverse proxy. Do not confuse admin SSH with public app traffic.",
        check: { kind: "manual", label: "I understand laptop localhost vs VM localhost" },
      },
      {
        instruction:
          "On this machine (no tunnel needed if compose is local), hit the app the same way your browser will.",
        command: "curl -sS -o /dev/null -w '%{http_code}\\n' http://127.0.0.1:3100/healthz",
        commandParts: [
          { piece: "http://127.0.0.1:3100/healthz", meaning: "Same origin your UI uses after a tunnel" },
        ],
        ifItFails: "Start the stack from the previous lesson: cd ~/quest-ship && docker compose up -d",
        saw: "HTTP 200. Through a tunnel, this same URL on the laptop is the VM's app.",
        check: { kind: "manual", label: "Health returned 200" },
      },
    ],
    recap: [
      "You learned that localhost is per machine and tunnels bridge laptop to VM.",
      "You verified the local health endpoint the tunnel would expose.",
    ],
    takeaway:
      "Tunnel first for private preview. Public HTTPS is a separate step from getting containers healthy.",
  },

  {
    id: "registry-push",
    chapter: 7,
    chapterTitle: CH,
    section: "Registry",
    title: "How the image leaves your laptop",
    minutes: 15,
    concept: [
      "A registry stores images by name and tag so other machines can pull them. GitHub Container Registry (ghcr.io) is a good starting registry. GCP Artifact Registry is the natural pair for GCE. Same idea either way.",
      "Build on a machine with enough CPU (your laptop or CI). Tag images with a version, not only latest. Push. The server should not need your source tree to run that version.",
      "Auth: a personal access token with package read/write, or gcloud for Artifact Registry. Never commit tokens.",
      "Hosted demo shows a representative session. On your machine, replace OWNER with your GitHub username (lowercase).",
    ],
    steps: [
      {
        instruction: "Build and tag the three quest-ship images for a version (local tags first).",
        command:
          "cd ~/quest-ship && APP_VERSION=v1 docker compose build && docker images 'quest-ship-*' --format '{{.Repository}}:{{.Tag}}'",
        commandParts: [
          { piece: "APP_VERSION=v1", meaning: "Version becomes image tag and runtime env" },
          { piece: "docker compose build", meaning: "Create web, api, worker images" },
        ],
        saw: "Images like quest-ship-web:v1, quest-ship-api:v1, quest-ship-worker:v1. Tags are the unit of deploy.",
        check: { kind: "manual", label: "Images tagged v1 exist locally" },
      },
      {
        instruction:
          "Retag for GHCR and show the push commands (run push only when logged in to ghcr.io).",
        command: `OWNER=your-github-user
TAG=v1
for S in web api worker; do
  echo docker tag quest-ship-$S:$TAG ghcr.io/$OWNER/quest-ship-$S:$TAG
  echo docker push ghcr.io/$OWNER/quest-ship-$S:$TAG
done`,
        commandParts: [
          { piece: "docker tag ... ghcr.io/...", meaning: "Registry path must be lowercase" },
          { piece: "docker push", meaning: "Upload layers; needs docker login ghcr.io" },
        ],
        ifItFails:
          "docker login ghcr.io -u USER --password-stdin with a PAT that has write:packages. First private package may need visibility set under github.com/USER?tab=packages.",
        saw: "Printed tag and push lines for three images. After a real push, those tags exist in the registry for any machine that can authenticate and pull.",
        check: { kind: "manual", label: "I understand tag + push to ghcr.io" },
      },
    ],
    recap: [
      "You built versioned local images for quest-ship.",
      "You saw how those images are retagged and pushed to GHCR.",
    ],
    takeaway:
      "The registry holds versioned images. Build where you have CPU; push so servers can pull.",
  },

  {
    id: "registry-pull",
    chapter: 7,
    chapterTitle: CH,
    section: "Registry",
    title: "The VM consumes a tag",
    minutes: 12,
    concept: [
      "Best practice on the server: pull images, then compose up without building. The VM becomes a runner, not a compile farm.",
      "compose.registry.yaml (in quest-ship) has no build: keys. It only references GHCR_IMAGE_PREFIX and APP_VERSION.",
      "That is the same idea as kind load, except the image came through a registry instead of a side channel.",
    ],
    steps: [
      {
        instruction: "Show a pull-only deploy using the registry compose file (dry-run style echo + real local fallback).",
        command:
          "cd ~/quest-ship && echo 'Registry form:' && echo '  export GHCR_IMAGE_PREFIX=ghcr.io/OWNER APP_VERSION=v1' && echo '  docker compose -f compose.registry.yaml pull && docker compose -f compose.registry.yaml up -d' && echo 'Local practice without registry:' && APP_VERSION=v1 docker compose up -d && docker compose ps --format 'table {{.Name}}\\t{{.Image}}\\t{{.Status}}'",
        commandParts: [
          { piece: "compose.registry.yaml", meaning: "Pull-only; no Dockerfile build on the VM" },
          { piece: "APP_VERSION=v1 docker compose up -d", meaning: "Local stand-in when you have not pushed yet" },
        ],
        saw: "You saw the registry command shape, then a local compose ps with :v1 images if the previous lesson built them. On a real VM after push, use only the registry form.",
        check: { kind: "manual", label: "I know pull-only deploy vs build-on-VM" },
      },
      {
        instruction: "Confirm the running API reports the version stamp.",
        command: "curl -sS http://127.0.0.1:3100/api/healthz && echo && curl -sS http://127.0.0.1:3100/version.json && echo",
        commandParts: [
          { piece: "/api/healthz", meaning: "api version from container env" },
          { piece: "/version.json", meaning: "web version baked at image build" },
        ],
        saw: "version fields present. When you deploy a new tag, these strings are how you prove the new images are live.",
        check: { kind: "manual", label: "Version endpoints responded" },
      },
    ],
    recap: [
      "You compared registry pull-only deploy to local compose up.",
      "You checked version endpoints that prove which tag is running.",
    ],
    takeaway:
      "On the server, prefer pull + up. The image tag is what you promote.",
    source: {
      path: "labs/quest-ship/compose.registry.yaml",
      note: "No build context: images come only from the registry prefix + tag.",
    },
  },

  {
    id: "version-rollback",
    chapter: 7,
    chapterTitle: CH,
    section: "Release loop",
    title: "Version, deploy, rollback",
    minutes: 14,
    concept: [
      "A release is a tag you can name in chat: v1, v2, or a git SHA. latest is a moving pointer and a poor sole strategy.",
      "Deploy means run containers from that tag. Rollback means run the previous tag again. You should not need to recompile on the server to undo a bad release if the old image is still in the registry (or still on the host).",
      "Practice here with local tags. The same commands apply after GHCR with pull.",
    ],
    steps: [
      {
        instruction: "Ship v2 locally (rebuild with a new APP_VERSION) and confirm health.",
        command:
          "cd ~/quest-ship && APP_VERSION=v2 docker compose up --build -d && sleep 2 && curl -sS http://127.0.0.1:3100/api/healthz && echo",
        commandParts: [
          { piece: "APP_VERSION=v2", meaning: "New image tags and runtime version" },
          { piece: "up --build -d", meaning: "Build v2 images and recreate containers" },
        ],
        saw: "api health JSON includes version v2. The UI version.json should also say v2 after refresh.",
        check: { kind: "manual", label: "Stack reports v2" },
      },
      {
        instruction: "Roll back to v1 without rebuilding: recreate from existing v1 images.",
        command:
          "cd ~/quest-ship && APP_VERSION=v1 docker compose up -d && sleep 2 && curl -sS http://127.0.0.1:3100/api/healthz && echo && docker compose ps --format 'table {{.Name}}\\t{{.Image}}'",
        commandParts: [
          { piece: "APP_VERSION=v1 docker compose up -d", meaning: "Point at older tags; no --build" },
        ],
        ifItFails:
          "If v1 images are missing, rebuild them once with APP_VERSION=v1 docker compose build, then retry. After GHCR, docker pull restores old tags.",
        saw: "Health back to v1 and image column shows :v1. That is rollback: retarget the previous artifact.",
        check: { kind: "manual", label: "Rollback to v1 succeeded" },
      },
    ],
    recap: [
      "You deployed v2 and verified the version endpoint.",
      "You rolled back to v1 by retargeting tags without a rebuild.",
    ],
    takeaway:
      "Releases are tags. Deploy and rollback mean changing which tag the host runs.",
  },

  {
    id: "build-where",
    chapter: 7,
    chapterTitle: CH,
    section: "Release loop",
    title: "Build where?",
    minutes: 8,
    concept: [
      "Three places people build images:",
      "1. On the laptop (what you just did).\n2. In CI (GitHub Actions builds on push or tag).\n3. On the server (compose up --build on the VM).",
      "Building on a tiny VM is fine for a 50 MB Python API. It is miserable for a large frontend production build. Resource limits are part of architecture.",
      "Kind load and docker save|ssh|load are classroom or emergency paths. Day-to-day best practice is registry push/pull.",
    ],
    steps: [
      {
        instruction: "Print a decision card you can reuse in a real project.",
        command: `printf '%s\\n' \
'Build on laptop/CI when: image is heavy, VM is small, many servers need the same bits.' \
'Build on VM when: stack is tiny, you are learning, or offline constraints block a registry.' \
'Always: tag immutably, keep secrets out of images, prefer pull on the server.'`,
        commandParts: [
          {
            piece: "printf ...",
            meaning: "Judgment checklist, not a Docker flag",
          },
        ],
        saw: "Three lines of judgment. Interview-ready: you can explain when not to compile on production hosts.",
        check: { kind: "manual", label: "I can explain build-on-VM vs registry" },
      },
    ],
    recap: [
      "You named when to build on laptop/CI versus on the VM, and why registries beat side-loading for normal work.",
    ],
    takeaway:
      "Build where you have CPU. Run on the server from tags. Tiny VMs are runners, not build farms.",
  },

  {
    id: "after-you-can-ship",
    chapter: 7,
    chapterTitle: CH,
    section: "After ship",
    title: "After you can ship",
    minutes: 8,
    concept: [
      "Once pull-by-tag on a VM is boring, you have the core of professional container deploy for small systems.",
      "What is still optional, in a sensible order:",
      "• PUBLIC HTTPS: reverse proxy (Caddy/Nginx) on 80/443 to 127.0.0.1:app-port. DNS to the VM. Keep Python/API ports private.\n• SECRETS: API tokens, DB URLs in host env or a secret manager, never in git.\n• OTHER SITES CALLING YOUR API: CORS + auth (token). The worker pattern is an internal service; the public edge is the API or BFF.\n• CI: on git tag, build and push images; humans or a workflow deploy by tag.\n• CLOUD KUBERNETES: only when one VM is not enough. Kind already taught the control-plane ideas.",
      "Container Quest core (0 to 6) plus this chapter's path is a complete beginner-to-ship story without pretending everyone needs a cluster on day one.",
      "Clean up the lab stack when you are done experimenting so port 3100 is free.",
    ],
    steps: [
      {
        instruction: "Stop the quest-ship stack on this machine when you are finished with Chapter 7 drills.",
        command: "cd ~/quest-ship && docker compose down && echo 'quest-ship stopped'",
        commandParts: [
          { piece: "docker compose down", meaning: "Stop and remove the lab containers" },
        ],
        ifItFails: "If the folder is missing, there is nothing to stop. That is fine.",
        saw: "Containers stopped. Images may remain for later experiments (docker images | grep quest-ship).",
        check: { kind: "manual", label: "Lab stack stopped (or was not running)" },
      },
      {
        instruction: "Name what you will practice next outside this course.",
        command:
          "echo 'Next for me: (registry push for real | HTTPS on VM | CI build | deeper K8s)'",
        commandParts: [
          { piece: "echo 'Next for me: ...'", meaning: "Pick one concrete follow-up" },
        ],
        saw: "A named next step beats a vague intention. The course ends; the practice does not.",
        check: { kind: "manual", label: "I named a follow-up" },
      },
    ],
    recap: [
      "You reviewed HTTPS, secrets, external API clients, CI, and cloud K8s as post-ship topics.",
      "You cleaned up the local quest-ship stack and named a next practice goal.",
    ],
    takeaway:
      "Ship with tags to a real host first. Add HTTPS, CI, and cloud Kubernetes only when you feel the pain they solve.",
  },
];
