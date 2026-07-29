import type { Lesson } from "./types";

/**
 * Chapter 3 — How containers talk, and where data lives.
 *
 * Networking and storage are where most real-world container confusion
 * happens, because both behave differently inside a container than the
 * intuition you built outside one.
 */

export const CHAPTER_3: Lesson[] = [
  {
    id: "ports",
    chapter: 3,
    chapterTitle: "Networking, config, and data",
    title: "Ports: why your app is running but unreachable",
    minutes: 8,
    concept: [
      "A container gets its own private network. That's the single fact behind most \"but it's definitely running!\" confusion.",
      "Inside the container, your program listens on a port as normal. But that port is inside its own little network, and nothing on your Mac can reach it — unless you explicitly PUBLISH it, which connects a port on your machine to a port inside the container.",
      "That's what the `-p 3000:3000` you've seen everywhere does. Left side: the port on your machine. Right side: the port inside the container. They don't have to match, and mapping 8080 on your machine to 3000 inside is completely normal.",
      "Now the trap that costs people entire afternoons. Inside a container, `localhost` means THIS CONTAINER ONLY. It does not mean your Mac, and it does not mean any other container. So if your program is configured to listen on `localhost` or `127.0.0.1`, it's listening on a network nothing else can reach, and publishing the port won't help. Connections will be refused, while the program insists it's running fine.",
      "The fix is to listen on `0.0.0.0`, which means \"every network I'm attached to.\" If you ever hit a container that's definitely running but definitely unreachable, check this first. It's the answer far more often than not.",
      "This project hit exactly that bug during development, in a slightly nastier form — a health check used the name `localhost`, which on this system resolves to an IPv6 address first, while the program was listening only on IPv4. Same class of problem: right port, wrong network.",
    ],
    steps: [
      {
        instruction: "See which ports are published, and to where.",
        command: "docker ps --format 'table {{.Names}}\\t{{.Ports}}'",
        saw: "Entries like 0.0.0.0:8000->8000/tcp. Read that as: connections to port 8000 on your machine get forwarded to port 8000 inside that container. Containers with nothing in this column have no published ports — they're reachable by other containers, but not by you.",
        check: { kind: "manual", label: "I saw the port mappings" },
      },
      {
        instruction:
          "Reach the Python service through its published port, the normal way.",
        command: "curl -s -o /dev/null -w 'status %{http_code}\\n' localhost:8000/healthz",
        saw: "status 200. That request went from your Mac, through the published port, into the container's private network.",
        check: { kind: "requests", service: "ai", delta: 1 },
      },
      {
        instruction:
          "Now try a port that exists inside a container but was never published. This should fail — that's the point.",
        command:
          "curl -s --max-time 4 localhost:5555/healthz >/dev/null 2>&1 && echo 'reachable' || echo 'refused — nothing is published on 5555'",
        saw: "Refused. Nothing is listening there, because publishing is opt-in. A port inside a container is invisible from outside until you deliberately connect it.",
        check: { kind: "manual", label: "I saw it refuse" },
      },
    ],
    takeaway:
      "Publishing connects a port on your machine to one inside a container. Inside a container, `localhost` means only that container — listen on 0.0.0.0 instead.",
  },

  {
    id: "networks-dns",
    chapter: 3,
    chapterTitle: "Networking, config, and data",
    title: "How containers find each other",
    minutes: 8,
    concept: [
      "Containers that are on the same network can talk to each other directly, without publishing anything. Publishing is only for reaching in from OUTSIDE — your Mac, or the internet. Between themselves, they just talk.",
      "And they find each other BY NAME. Docker runs a small DNS server on each network, so the name `redis` resolves to whichever container is currently running as `redis`. No IP addresses anywhere, in any config file.",
      "This is a much bigger deal than it first appears. Container IP addresses change constantly — every restart, every replacement, every redeploy. If your config hardcoded an IP, it would break within a day. Because it's a name, and the name is re-pointed automatically, nothing breaks.",
      "That's why the worker's configuration says `redis://redis:6379` and never a number. The name is a promise: whatever container is playing the redis role right now, send it there.",
      "Kubernetes works the same way, for the same reason. Skills here transfer directly — in Chapter 5 you'll see services find each other by name in exactly this fashion, on a completely different system.",
      "Practical upshot: when a service can't reach another service, the question is almost always \"are they on the same network?\" and \"is the name spelled the way the other container is named?\" — not \"what's the IP?\"",
    ],
    steps: [
      {
        instruction:
          "From inside the worker container, look up the address of a service by name.",
        command: "docker exec container-quest-worker-1 getent hosts redis",
        saw: "An IP address and the name `redis`. The worker never knew that number and never will — it asks for the name every time, and Docker's DNS answers with wherever redis currently is.",
        check: { kind: "manual", label: "I saw an IP and the name" },
      },
      {
        instruction:
          "Now actually talk to the Python service from inside the Go service's network — using only the name.",
        command: "docker exec container-quest-worker-1 wget -qO- http://ai:8000/healthz",
        saw: "A healthy response. Note the URL: `http://ai:8000`. No IP address, no configuration file, no service registry to set up. Two containers, one name, and it just works — as long as they share a network.",
        check: { kind: "requests", service: "ai", delta: 1 },
      },
      {
        instruction: "See the network they're both attached to.",
        command: "docker network ls --filter name=container-quest",
        saw: "One network, created automatically for this project. Everything in the Compose file joined it, which is why they can all reach each other by name without a single line of network configuration.",
        check: { kind: "manual", label: "I saw the network" },
      },
    ],
    takeaway:
      "Containers on a shared network reach each other by name, not IP — because names survive restarts and IP addresses don't.",
  },

  {
    id: "config-env",
    chapter: 3,
    chapterTitle: "Networking, config, and data",
    title: "Configuration: same image, different settings",
    minutes: 6,
    concept: [
      "Here's a rule that seems small and turns out to be structural: an image should be identical everywhere it runs. The exact same image in development, staging, and production.",
      "That's the entire value proposition. If you build a different image per environment, you're testing something you're not shipping, and the whole guarantee collapses.",
      "But environments obviously differ — different database addresses, different credentials, different log levels. So how do you keep one image while changing behavior?",
      "You inject settings at STARTUP, not build time. Environment variables are the usual mechanism: the image ships with sensible defaults, and whoever runs it overrides what needs overriding.",
      "This is why you'll see database URLs and API keys passed in as environment variables rather than baked into files. It's also, importantly, how secrets stay out of images — anything baked into an image is readable by anyone who has that image, permanently, including in layers you thought you deleted.",
      "One caution worth carrying to real work: environment variables are visible to anyone who can inspect the container. They're fine for addresses and settings, and they're the bare minimum for secrets. Production systems generally use a dedicated secret manager instead.",
    ],
    steps: [
      {
        instruction: "See the settings the worker was started with.",
        command:
          "docker inspect container-quest-worker-1 --format '{{range .Config.Env}}{{println .}}{{end}}' | grep -E 'REDIS|DATABASE|AI_URL|VERSION'",
        saw: "Addresses and a version, supplied when the container started — none of it compiled into the image. Swap these values and the same image talks to a completely different database, with no rebuild.",
        check: { kind: "manual", label: "I saw the environment variables" },
      },
      {
        instruction:
          "Run the Python image with a different version setting, and watch it report the new value. Same image, different behavior.",
        command:
          "docker run --rm -e SERVICE_VERSION=9.9.9 --entrypoint sh quest/ai:dev -c 'echo \"this container thinks it is version $SERVICE_VERSION\"'",
        saw: "9.9.9 — a version that exists nowhere in the image. You changed how the container behaves without rebuilding anything. That's the whole technique.",
        check: { kind: "manual", label: "I saw 9.9.9" },
      },
    ],
    takeaway:
      "Build one image, configure it at startup. Same bytes in every environment, behavior supplied from outside.",
  },

  {
    id: "volumes",
    chapter: 3,
    chapterTitle: "Networking, config, and data",
    title: "Volumes: making data outlive the container",
    minutes: 8,
    concept: [
      "In Chapter 1 you proved that replacing a container destroys everything written inside it. For most services that's fine and even desirable — they hold nothing worth keeping.",
      "But a database obviously can't work that way. Neither can uploaded files. Something has to survive.",
      "The answer is a VOLUME: storage that lives outside any container's lifetime, mounted into a container at a path. The container reads and writes it like a normal folder, but it belongs to Docker, not to the container. Destroy the container, recreate it, attach the same volume, and the data is exactly as it was.",
      "This project uses one for PostgreSQL. That single line of configuration is the difference between a database and a very elaborate way to lose customer records.",
      "There are two flavours worth knowing. A NAMED VOLUME is managed by Docker and is what you want for databases. A BIND MOUNT maps a real folder from your machine into the container, which is what you want in development so your code edits appear instantly without a rebuild.",
      "The practical instinct to build: any container holding data you'd be upset to lose needs a volume. If you're not sure whether something is stored durably, assume it isn't and check.",
    ],
    steps: [
      {
        instruction: "Write a row into the database.",
        command:
          "docker exec container-quest-postgres-1 psql -U quest -d quest -c \"CREATE TABLE IF NOT EXISTS proof (note TEXT); INSERT INTO proof VALUES ('survived');\" ",
        saw: "INSERT 0 1 — one row written. It's now on disk in a volume, not inside the container.",
        check: { kind: "manual", label: "I saw INSERT 0 1" },
      },
      {
        instruction:
          "Now destroy the database container completely — the same operation that wiped your file in Chapter 1 — and check whether the row survived.",
        command:
          "cd ~/Documents/containerquest && docker compose -f infra/compose/docker-compose.yml up -d --force-recreate postgres && sleep 8 && docker exec container-quest-postgres-1 psql -U quest -d quest -t -c 'SELECT note FROM proof;'",
        saw: "\"survived\". A brand new container, and the data is still there — because it never lived in the container. It lives in a volume that the new container attached to on startup. This is exactly the operation that destroyed your note file in Chapter 1; the only difference is the volume.",
        check: { kind: "manual", label: "I saw: survived" },
      },
      {
        instruction: "See the volume itself, which exists independently of any container.",
        command: "docker volume ls --filter name=container-quest",
        saw: "A volume, listed on its own. It outlives every container that has ever attached to it, and it stays there until something deliberately deletes it. Worth knowing: `docker compose down -v` deletes volumes — that -v flag has ended real databases.",
        check: { kind: "manual", label: "I saw the volume" },
      },
    ],
    takeaway:
      "Volumes hold data outside a container's lifetime. Anything you'd be upset to lose needs one.",
  },
];
