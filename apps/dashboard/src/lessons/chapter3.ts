import type { Lesson } from "./types.ts";

/**
 * Chapter 3  -  How containers talk, where data lives, and Compose.
 *
 * Networking and storage are where most real-world container confusion
 * happens, because both behave differently inside a container than the
 * intuition you built outside one. Compose is the file that declares the
 * whole multi-service picture: after ports, DNS, env, and volumes, this
 * chapter makes that file legible and writable.
 */

const CHAPTER_TITLE = "Networking, Compose, and data";

/** Absolute-enough path used across the course for this repo on the learner machine. */
const COMPOSE =
  "docker compose -f ~/Documents/containerquest/infra/compose/docker-compose.yml";

export const CHAPTER_3: Lesson[] = [
  {
    id: "ports",
    chapter: 3,
    chapterTitle: CHAPTER_TITLE,
    title: "Ports: why your app is running but unreachable",
    minutes: 8,
    concept: [
      "In Chapter 0 you ran a server with no `-p` and watched it be perfectly healthy and completely unreachable. That is the first half of this problem, and you have already solved it: publishing is opt-in, the left number is yours, the right one is the container's.",
      "This lesson is the second half, and it is the version that costs people entire afternoons, because publishing the port correctly does not fix it.",
      "Inside a container, `localhost` means THIS CONTAINER ONLY. It does not mean your Mac, and it does not mean any other container. So if your program is configured to listen on `localhost` or `127.0.0.1`, it is listening on a network nothing else can reach, and `-p` will not help you. Connections are refused while the program insists it is running fine, and the port mapping looks completely correct in `docker ps`.",
      "The fix is to listen on `0.0.0.0`, which means \"every network I'm attached to.\" If you ever hit a container that's definitely running but definitely unreachable, check this first. It's the answer far more often than not.",
      "This project hit exactly that bug during development, in a slightly nastier form: a health check used the name `localhost`, which on this system resolves to an IPv6 address first, while the program was listening only on IPv4. Same class of problem: right port, wrong network.",
    ],
    steps: [
      {
        instruction: "See which ports are published, and to where.",
        command: "docker ps --format 'table {{.Names}}\\t{{.Ports}}'",
        commandParts: [
          { piece: "docker ps", meaning: "List running containers" },
          { piece: "--format 'table ... Ports'", meaning: "Show published ports (host -> container)" },
        ],
        saw: "Entries like 0.0.0.0:8000->8000/tcp. Read that as: connections to port 8000 on your machine get forwarded to port 8000 inside that container. Containers with nothing in this column have no published ports; they're reachable by other containers, but not by you.",
        check: { kind: "manual", label: "I saw the port mappings" },
      },
      {
        instruction:
          "Reach the Python service through its published port, the normal way.",
        command: "curl -s -o /dev/null -w 'status %{http_code}\\n' localhost:8000/healthz",
        commandParts: [
          { piece: "curl -s", meaning: "HTTP request, silent" },
          { piece: "-o /dev/null", meaning: "Discard body" },
          { piece: "-w 'status %{http_code}'", meaning: "Print only the HTTP status code" },
          { piece: "localhost:8000/healthz", meaning: "AI liveness endpoint on the host" },
        ],
        saw: "status 200. That request went from your Mac, through the published port, into the container's private network.",
        check: { kind: "requests", service: "ai", delta: 1 },
      },
      {
        instruction:
          "Now try a port that exists inside a container but was never published. This should fail: that's the point.",
        command:
          "curl -s --max-time 4 localhost:5555/healthz >/dev/null 2>&1 && echo 'reachable' || echo 'refused: nothing is published on 5555'",
        commandParts: [
          { piece: "curl ... localhost:5555", meaning: "Port that nothing is listening on" },
          { piece: "|| echo 'refused: ...'", meaning: "Show failure clearly when nothing answers" },
        ],
        saw: "Refused. Nothing is listening there, because publishing is opt-in. A port inside a container is invisible from outside until you deliberately connect it.",
        check: { kind: "manual", label: "I saw it refuse" },
      },
    ],
    recap: [
      "You listed published port mappings and read host-to-container arrows in `docker ps`.",
      "You reached a service through a published port and got a healthy response.",
      "You proved an unpublished port is unreachable from your machine even when containers are running.",
    ],
    takeaway:
      "Publishing connects a port on your machine to one inside a container. Inside a container, `localhost` means only that container: listen on 0.0.0.0 instead.",
  },

  {
    id: "networks-dns",
    chapter: 3,
    chapterTitle: CHAPTER_TITLE,
    title: "How containers find each other",
    minutes: 8,
    concept: [
      "Containers that are on the same network can talk to each other directly, without publishing anything. Publishing is only for reaching in from OUTSIDE: your Mac, or the internet. Between themselves, they just talk.",
      "And they find each other BY NAME. Docker runs a small DNS server on each network, so the name `redis` resolves to whichever container is currently running as `redis`. No IP addresses anywhere, in any config file.",
      "This is a much bigger deal than it first appears. Container IP addresses change constantly: every restart, every replacement, every redeploy. If your config hardcoded an IP, it would break within a day. Because it's a name, and the name is re-pointed automatically, nothing breaks.",
      "That's why the worker's configuration says `redis://redis:6379` and never a number. The name is a promise: whatever container is playing the redis role right now, send it there.",
      "Kubernetes works the same way, for the same reason. Skills here transfer directly. In Chapter 5 you'll see services find each other by name in exactly this fashion, on a completely different system.",
      "Practical upshot: when a service can't reach another service, the question is almost always \"are they on the same network?\" and \"is the name spelled the way the other container is named?\", not \"what's the IP?\"",
    ],
    steps: [
      {
        instruction:
          "From inside the worker container, look up the address of a service by name.",
        command: "docker exec container-quest-worker-1 getent hosts redis",
        commandParts: [
          { piece: "docker exec ... worker", meaning: "Run inside the worker container" },
          { piece: "getent hosts redis", meaning: "DNS lookup for service name `redis` on the compose network" },
        ],
        saw: "An IP address and the name `redis`. The worker never knew that number and never will: it asks for the name every time, and Docker's DNS answers with wherever redis currently is.",
        check: { kind: "manual", label: "I saw an IP and the name" },
      },
      {
        instruction:
          "Now actually talk to the Python service from inside the Go service's network, using only the name.",
        command: "docker exec container-quest-worker-1 wget -qO- http://ai:8000/healthz",
        commandParts: [
          { piece: "docker exec ... worker", meaning: "Still inside the worker's network view" },
          { piece: "wget -qO- http://ai:8000/healthz", meaning: "Call the AI service by Compose DNS name, not localhost" },
        ],
        saw: "A healthy response. Note the URL: `http://ai:8000`. No IP address, no configuration file, no service registry to set up. Two containers, one name, and it just works, as long as they share a network.",
        check: { kind: "requests", service: "ai", delta: 1 },
      },
      {
        instruction: "See the network they're both attached to.",
        command: "docker network ls --filter name=container-quest",
        commandParts: [
          { piece: "docker network ls", meaning: "List Docker networks" },
          { piece: "--filter name=container-quest", meaning: "Only this project's network" },
        ],
        saw: "One network, created automatically for this project. Everything in the Compose file joined it, which is why they can all reach each other by name without a single line of network configuration.",
        check: { kind: "manual", label: "I saw the network" },
      },
    ],
    recap: [
      "From inside the worker you resolved another service by DNS name and saw a real IP attached to that name.",
      "You called a neighbor over HTTP using only its Compose service name, with no hardcoded address.",
      "You listed the project network that makes those names work for every service in the file.",
    ],
    takeaway:
      "Containers on a shared network reach each other by name, not IP, because names survive restarts and IP addresses don't.",
  },

  {
    id: "config-env",
    chapter: 3,
    chapterTitle: CHAPTER_TITLE,
    title: "Configuration: same image, different settings",
    minutes: 6,
    concept: [
      "Here's a rule that seems small and turns out to be structural: an image should be identical everywhere it runs. The exact same image in development, staging, and production.",
      "That's the entire value proposition. If you build a different image per environment, you're testing something you're not shipping, and the whole guarantee collapses.",
      "But environments obviously differ: different database addresses, different credentials, different log levels. So how do you keep one image while changing behavior?",
      "You inject settings at STARTUP, not build time. Environment variables are the usual mechanism: the image ships with sensible defaults, and whoever runs it overrides what needs overriding.",
      "This is why you'll see database URLs and API keys passed in as environment variables rather than baked into files. It's also, importantly, how secrets stay out of images: anything baked into an image is readable by anyone who has that image, permanently, including in layers you thought you deleted.",
      "One caution worth carrying to real work: environment variables are visible to anyone who can inspect the container. They're fine for addresses and settings, and they're the bare minimum for secrets. Production systems generally use a dedicated secret manager instead.",
    ],
    steps: [
      {
        instruction: "See the settings the worker was started with.",
        command:
          "docker inspect container-quest-worker-1 --format '{{range .Config.Env}}{{println .}}{{end}}' | grep -E 'REDIS|DATABASE|AI_URL|VERSION'",
        commandParts: [
          { piece: "docker inspect ... --format", meaning: "Pull fields from container metadata" },
          { piece: "{{range .Config.Env}}", meaning: "List environment variables inside the container" },
          { piece: "| grep SERVICE", meaning: "Show only the teaching-related env vars" },
        ],
        saw: "Addresses and a version, supplied when the container started; none of it compiled into the image. Swap these values and the same image talks to a completely different database, with no rebuild.",
        check: { kind: "manual", label: "I saw the environment variables" },
      },
      {
        instruction:
          "Run the Python image with a different version setting, and watch it report the new value. Same image, different behavior.",
        command:
          "docker run --rm -e SERVICE_VERSION=9.9.9 --entrypoint sh quest/ai:dev -c 'echo \"this container thinks it is version $SERVICE_VERSION\"'",
        commandParts: [
          { piece: "docker run --rm", meaning: "Throwaway container" },
          { piece: "-e SERVICE_VERSION=9.9.9", meaning: "Inject an environment variable for this run only" },
          { piece: "--entrypoint sh ... -c 'echo ...'", meaning: "Print what the process sees as its version" },
        ],
        saw: "9.9.9, a version that exists nowhere in the image. You changed how the container behaves without rebuilding anything. That's the whole technique.",
        check: { kind: "manual", label: "I saw 9.9.9" },
      },
    ],
    recap: [
      "You inspected the worker's environment and saw addresses and version supplied at start, not baked into the image.",
      "You ran the same Python image with a different SERVICE_VERSION and watched it report 9.9.9 without rebuilding.",
    ],
    takeaway:
      "Build one image, configure it at startup. Same bytes in every environment, behavior supplied from outside.",
  },

  {
    id: "volumes",
    chapter: 3,
    chapterTitle: CHAPTER_TITLE,
    title: "Volumes: making data outlive the container",
    minutes: 8,
    concept: [
      "In Chapter 1 you proved that replacing a container destroys everything written inside it. For most services that's fine and even desirable: they hold nothing worth keeping.",
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
        commandParts: [
          { piece: "docker exec ... postgres", meaning: "Run a command in the database container" },
          { piece: "psql -U quest -d quest -c '...'", meaning: "SQL: create a proof table/row inside Postgres" },
        ],
        saw: "INSERT 0 1, one row written. It's now on disk in a volume, not inside the container.",
        check: { kind: "manual", label: "I saw INSERT 0 1" },
      },
      {
        instruction:
          "Now destroy the database container completely (the same operation that wiped your file in Chapter 1) and check whether the row survived.",
        command:
          "cd ~/Documents/containerquest && docker compose -f infra/compose/docker-compose.yml up -d --force-recreate postgres && sleep 8 && docker exec container-quest-postgres-1 psql -U quest -d quest -t -c 'SELECT note FROM proof;'",
        commandParts: [
          { piece: "docker exec ... postgres", meaning: "Run a command in the database container" },
          { piece: "psql -U quest -d quest -c '...'", meaning: "SQL: create a proof table/row inside Postgres" },
        ],
        saw: "\"survived\". A brand new container, and the data is still there, because it never lived in the container. It lives in a volume that the new container attached to on startup. This is exactly the operation that destroyed your note file in Chapter 1; the only difference is the volume.",
        check: { kind: "manual", label: "I saw: survived" },
      },
      {
        instruction: "See the volume itself, which exists independently of any container.",
        command: "docker volume ls --filter name=container-quest",
        commandParts: [
          { piece: "docker volume ls", meaning: "List named volumes on this machine" },
          { piece: "--filter name=container-quest", meaning: "Volumes belonging to this project" },
        ],
        saw: "A volume, listed on its own. It outlives every container that has ever attached to it, and it stays there until something deliberately deletes it. Worth knowing: `docker compose down -v` deletes volumes; that -v flag has ended real databases.",
        check: { kind: "manual", label: "I saw the volume" },
      },
    ],
    recap: [
      "You wrote a proof row into Postgres while it was running on a named volume.",
      "You force-recreated the database container and found the row still there, unlike files stored only inside a container.",
      "You listed the volume as its own object, independent of any single container's lifetime.",
    ],
    takeaway:
      "Volumes hold data outside a container's lifetime. Anything you'd be upset to lose needs one.",
  },

  {
    id: "compose-recipe",
    chapter: 3,
    chapterTitle: CHAPTER_TITLE,
    section: "Compose",
    title: "Compose is the recipe for the whole stack",
    minutes: 12,
    concept: [
      "You have been living inside a multi-container system since the fleet came up. The file that defines it is Docker Compose: one YAML document that says which services exist, what image (or Dockerfile) each one uses, which ports they publish, what environment they get, what volumes they mount, and which other services they wait on.",
      "Up to now the course mostly used that file as plumbing: `make up` builds and starts everything. This lesson is about reading the recipe itself, and using the Compose CLI the way you will at work: by service name, not by long container ids.",
      "Compose does not replace Docker. It is a layer on top: each service still becomes one or more containers. The win is that the relationship between them is declared once, instead of a pile of `docker run` flags you will never reproduce the same way twice.",
      "Five keys cover most of what you will ever write: `image` or `build` (where the program comes from), `ports` (what the host can reach), `environment` (settings at startup), `volumes` (data that must outlive the container), and `depends_on` (startup order, with health, not just \"started\"). You already met the first four as ideas. Now you see them in the file that wires this project.",
    ],
    steps: [
      {
        instruction:
          "List every service this project's compose file defines. These are the roles on the shared network: the names other containers use as hostnames.",
        command: `cd ~/Documents/containerquest && ${COMPOSE} config --services`,
        commandParts: [
          { piece: "docker compose -f ...", meaning: "Target this project's compose file" },
          { piece: "config --services", meaning: "Print the service names after Compose resolves the file" },
        ],
        saw: "Eight names (dashboard, worker, ai, util, compute, postgres, redis, socket-proxy). Those names are DNS on the project network: `redis://redis:6379` works because `redis` is a service name, not a lucky hostname.",
        check: { kind: "manual", label: "I saw the eight service names" },
      },
      {
        instruction:
          "See which image each service will run. Build-from-source services show the tag Compose will produce; pull-only services show the registry image.",
        command: `cd ~/Documents/containerquest && ${COMPOSE} config --images`,
        commandParts: [
          { piece: "config --images", meaning: "Resolved image references for every service" },
        ],
        saw: "A mix of `quest/...:dev` (built by this repo) and official images like `postgres:18-alpine` and `redis:8-alpine`. Same idea either way: Compose ends up with a concrete image to run.",
        check: { kind: "manual", label: "I saw the image list" },
      },
      {
        instruction:
          "Skim the keys that matter in the real file: service names, image/build, ports, environment, volumes, depends_on, healthcheck.",
        command:
          "cd ~/Documents/containerquest && grep -nE '^(name:|services:)|^[ ]{2}[a-z0-9_-]+:|^[ ]{4}(image|build|ports|environment|volumes|depends_on|healthcheck|restart|command):' infra/compose/docker-compose.yml | head -60",
        commandParts: [
          { piece: "grep -nE '...'", meaning: "Show structure lines with numbers, not the whole file" },
          { piece: "head -60", meaning: "Enough to see the pattern without drowning" },
        ],
        saw: "Indentation is the structure: two spaces for a service name under `services:`, four spaces for its fields. When you open the full file later, you are reading the same shape you just listed.",
        check: { kind: "manual", label: "I recognized the keys" },
      },
      {
        instruction:
          "Pull logs for one service by its Compose name, not the long container name from `docker ps`.",
        command: `cd ~/Documents/containerquest && ${COMPOSE} logs --tail 20 redis`,
        commandParts: [
          { piece: "logs --tail 20", meaning: "Last twenty lines only" },
          { piece: "redis", meaning: "Service name from the compose file" },
        ],
        saw: "Redis startup lines, labeled with the service. In a multi-service project you almost always want logs for ONE role (`worker`, `ai`), not every container at once.",
        check: { kind: "manual", label: "I saw redis logs" },
      },
      {
        instruction:
          "Run a command inside a service by name. This is the Compose form of `docker exec`.",
        command: `cd ~/Documents/containerquest && ${COMPOSE} exec -T redis redis-cli ping`,
        commandParts: [
          { piece: "exec -T", meaning: "Run in the service container; -T = no interactive TTY (scripts/CI friendly)" },
          { piece: "redis", meaning: "Service name" },
          { piece: "redis-cli ping", meaning: "Ask Redis if it is alive; expects PONG" },
        ],
        saw: "PONG. Same power as `docker exec container-quest-redis-1 ...`, but you only need the role name Compose knows.",
        check: { kind: "manual", label: "I saw PONG" },
      },
      {
        instruction:
          "Show how the worker waits for its dependencies. Compose can wait until healthchecks pass, not merely until the process exists.",
        command:
          "cd ~/Documents/containerquest && sed -n '/^  worker:/,/^  [a-z]/p' infra/compose/docker-compose.yml | head -40",
        commandParts: [
          { piece: "sed -n '/^  worker:/,...'", meaning: "Print the worker service block from the YAML" },
        ],
        saw: "Look for `depends_on` with `condition: service_healthy` on redis and postgres. That is Compose saying: do not start the worker until those healthchecks succeed. Plain `depends_on: [redis]` only waits for the container to start, which is not the same as \"ready for traffic.\"",
        check: { kind: "manual", label: "I saw depends_on + health" },
      },
      {
        instruction:
          "Recreate a single service from the recipe. The rest of the stack stays up.",
        command: `cd ~/Documents/containerquest && ${COMPOSE} up -d --force-recreate redis && sleep 2 && ${COMPOSE} ps redis`,
        commandParts: [
          { piece: "up -d --force-recreate redis", meaning: "Rebuild/recreate only the redis service, detached" },
          { piece: "ps redis", meaning: "Confirm that one service's status" },
        ],
        ifItFails:
          "If redis flaps unhealthy for a few seconds, wait and run `docker compose ... ps redis` again. A recreate always has a short gap.",
        saw: "Redis comes back as one row, healthy. You did not tear down the whole fleet. Compose targets one service when you name it. That is the day-to-day workflow: change one thing, recreate one service.",
        check: { kind: "manual", label: "Redis is back up" },
      },
    ],
    recap: [
      "You listed the services and images defined by this project's compose file.",
      "You used Compose to fetch logs and exec by service name, and you saw depends_on wait on healthy dependencies.",
      "You recreated a single service without taking the whole stack down.",
    ],
    takeaway:
      "Compose is a declarative recipe for several containers: service names become DNS, and the CLI talks in those names. Read the file; do not memorize docker run flags.",
    source: {
      path: "infra/compose/docker-compose.yml",
      note: "The full fleet recipe: build args, healthchecks, depends_on, and the socket-proxy least-privilege pattern all live here.",
    },
  },

  {
    id: "compose-write",
    chapter: 3,
    chapterTitle: CHAPTER_TITLE,
    section: "Compose",
    title: "Write a tiny Compose file yourself",
    minutes: 12,
    concept: [
      "Reading a large compose file is useful. Writing a small one is what makes the skill stick.",
      "You will define two services: a static web server (nginx) and a Redis. They share a default project network automatically, so later you could reach Redis from the web container by the hostname `cache` if you needed to. That is the same DNS idea as `redis` in this project's fleet.",
      "No Makefile, no monorepo build. Just a folder, a YAML file, `up`, prove it works, then `down`. That loop is how most local multi-service development starts.",
      "Port 8099 is deliberate: it avoids colliding with the fleet's published ports (3000, 8000, 5432, …). When something fails with \"port is already allocated,\" change the left-hand number in `ports`.",
    ],
    steps: [
      {
        instruction:
          "Create a folder and a minimal compose file. Look at the layout below first, then run the command (or type the same file in an editor).",
        scaffold: {
          root: "~/quest-compose",
          note: "One file. Two services. No application code of your own.",
          files: [
            {
              path: "docker-compose.yml",
              language: "yaml",
              content: `name: quest-compose

services:
  web:
    image: nginx:alpine
    ports:
      - "8099:80"

  cache:
    image: redis:8-alpine
`,
            },
          ],
        },
        command: `mkdir -p ~/quest-compose
cat > ~/quest-compose/docker-compose.yml <<'EOF'
name: quest-compose

services:
  web:
    image: nginx:alpine
    ports:
      - "8099:80"

  cache:
    image: redis:8-alpine
EOF
cat ~/quest-compose/docker-compose.yml`,
        commandParts: [
          { piece: "name: quest-compose", meaning: "Project name (shows up in container names and networks)" },
          { piece: "services:", meaning: "Each key under here is a role / DNS name" },
          { piece: "image: nginx:alpine", meaning: "Pull and run this image (no build: block needed)" },
          { piece: "ports: [\"8099:80\"]", meaning: "Host 8099 → container 80 (nginx's default)" },
        ],
        saw: "A complete Compose project in under fifteen lines. Two images from Docker Hub, one published port, default network for free.",
        check: { kind: "manual", label: "I read the compose file" },
      },
      {
        instruction: "Validate the file and list the services Compose thinks it will run.",
        command: "cd ~/quest-compose && docker compose config --services",
        commandParts: [
          { piece: "cd ~/quest-compose", meaning: "Compose finds docker-compose.yml in the current directory" },
          { piece: "config --services", meaning: "Parse/validate and print service names" },
        ],
        ifItFails:
          "If Compose complains about YAML indentation, open the file and check that `web` and `cache` line up under `services:`, and that `image` / `ports` are indented one level further.",
        saw: "web and cache. If this prints those two names, the file is valid enough to start.",
        check: { kind: "manual", label: "I saw web and cache" },
      },
      {
        instruction: "Start both services in the background.",
        command: "cd ~/quest-compose && docker compose up -d",
        commandParts: [
          { piece: "up -d", meaning: "Create network/containers and start them detached" },
        ],
        ifItFails:
          "Port 8099 already in use: change the left side of ports to another free number (e.g. 8199:80), save, and run up -d again. Images missing: Compose will pull them; wait for the pull to finish.",
        saw: "Compose creates a project network and two containers. First run may pull nginx and redis; that is normal.",
        check: { kind: "running", container: "quest-compose-web-1" },
      },
      {
        instruction: "Hit the web service through the published port, then ping Redis by service name from the Compose CLI.",
        command:
          "curl -s -o /dev/null -w 'web %{http_code}\\n' localhost:8099/ && cd ~/quest-compose && docker compose exec -T cache redis-cli ping",
        commandParts: [
          { piece: "curl ... localhost:8099", meaning: "Host port you published for web" },
          { piece: "compose exec -T cache redis-cli ping", meaning: "Inside the cache service by Compose name" },
        ],
        saw: "web 200 and PONG. Two containers, one file, no hand-written docker run.",
        check: { kind: "manual", label: "I saw 200 and PONG" },
      },
      {
        instruction: "See Compose's view of the project, then tear it down cleanly (containers and the project network, not your fleet).",
        command:
          "cd ~/quest-compose && docker compose ps && docker compose down && docker compose ps",
        commandParts: [
          { piece: "ps", meaning: "Status of this project only" },
          { piece: "down", meaning: "Stop and remove this project's containers and default network" },
        ],
        saw: "First ps shows web and cache up; after down, empty (or no services). The Container Quest fleet on port 3000 is untouched: different project name, different compose file.",
        check: { kind: "manual", label: "Project is down" },
      },
      {
        instruction: "Optional tidy: remove the practice folder. Skip if you want to keep the file as a template.",
        command: "rm -rf ~/quest-compose && echo 'quest-compose removed'",
        check: { kind: "manual", label: "Cleaned up (or kept on purpose)" },
      },
    ],
    recap: [
      "You wrote a two-service compose file from scratch and validated it.",
      "You brought the stack up, reached nginx on a published port, and talked to Redis by service name.",
      "You tore the project down without disturbing the main Container Quest fleet.",
    ],
    takeaway:
      "A compose file is just services, images, ports, and a shared network. Write a small one, up -d, prove it, down. That is the whole local multi-service loop.",
  },
];
