/**
 * Appendix — a pocket reference of Docker commands you will actually use.
 *
 * Not a lesson. No progress, no checks. Sit this open next to a terminal when
 * you forget the flag you need. Grouped the same way the course introduces them.
 */

type Cmd = {
  cmd: string;
  does: string;
  tip?: string;
};

type Group = {
  id: string;
  title: string;
  blurb: string;
  commands: Cmd[];
};

const GROUPS: Group[] = [
  {
    id: "see",
    title: "See what is running",
    blurb: "Before you change anything, look. These four answer most “what is going on?” questions.",
    commands: [
      {
        cmd: "docker ps",
        does: "List running containers: name, image, ports, status.",
      },
      {
        cmd: "docker ps -a",
        does: "Include stopped containers. The ones you forgot about live here.",
      },
      {
        cmd: "docker images",
        does: "List images on disk (the packages, not the running instances).",
      },
      {
        cmd: "docker stats",
        does: "Live CPU / memory per container. Like top, for containers.",
      },
    ],
  },
  {
    id: "run",
    title: "Start and stop",
    blurb: "The lifecycle: create a container from an image, stop it, remove it.",
    commands: [
      {
        cmd: "docker run IMAGE",
        does: "Create and start a container from IMAGE.",
        tip: "Add --rm to delete it when it exits. Add -d to run in the background.",
      },
      {
        cmd: "docker run -p HOST:CONTAINER IMAGE",
        does: "Publish a port so your machine can reach the container.",
        tip: "Without -p the process is up but unreachable from outside.",
      },
      {
        cmd: "docker run -e KEY=value IMAGE",
        does: "Pass an environment variable into the container.",
      },
      {
        cmd: "docker run --name NAME IMAGE",
        does: "Give the container a stable name you can use later.",
      },
      {
        cmd: "docker stop NAME",
        does: "Ask a running container to shut down cleanly (SIGTERM, then SIGKILL).",
      },
      {
        cmd: "docker start NAME",
        does: "Restart a stopped container (same filesystem layer as before).",
      },
      {
        cmd: "docker rm NAME",
        does: "Delete a stopped container. Does not delete the image.",
      },
      {
        cmd: "docker rm -f NAME",
        does: "Force-remove: stop if needed, then delete.",
      },
    ],
  },
  {
    id: "inside",
    title: "Look inside",
    blurb: "Logs and a shell are how you debug when the process is “up” but wrong.",
    commands: [
      {
        cmd: "docker logs NAME",
        does: "Print stdout/stderr from the container’s main process.",
      },
      {
        cmd: "docker logs -f NAME",
        does: "Follow logs live (Ctrl-C to stop following).",
      },
      {
        cmd: "docker logs --tail 50 NAME",
        does: "Only the last 50 lines — useful when history is huge.",
      },
      {
        cmd: "docker exec -it NAME sh",
        does: "Open a shell inside a running container.",
        tip: "Use bash instead of sh if the image has it. Alpine usually only has sh.",
      },
      {
        cmd: "docker inspect NAME",
        does: "Dump full JSON metadata: IP, mounts, env, health, config.",
      },
    ],
  },
  {
    id: "build",
    title: "Build images",
    blurb: "Turn a Dockerfile (and the files next to it) into an image you can run.",
    commands: [
      {
        cmd: "docker build -t NAME:TAG .",
        does: "Build from the Dockerfile in the current directory; tag the result.",
      },
      {
        cmd: "docker build --no-cache -t NAME:TAG .",
        does: "Rebuild every layer. Use when the cache is lying to you.",
      },
      {
        cmd: "docker pull IMAGE",
        does: "Download an image from a registry (usually Docker Hub).",
      },
      {
        cmd: "docker tag SRC DEST",
        does: "Add another name/tag to an existing local image.",
      },
      {
        cmd: "docker rmi NAME:TAG",
        does: "Delete an image from disk. Fails if a container still uses it.",
      },
      {
        cmd: "docker history IMAGE",
        does: "Show each layer and its size — why an image is fat or thin.",
      },
    ],
  },
  {
    id: "compose",
    title: "Docker Compose",
    blurb:
      "Several containers defined together in one YAML file. This project’s fleet is a Compose project; Chapter 3 teaches you to read that recipe and write a small one of your own.",
    commands: [
      {
        cmd: "docker compose up -d",
        does: "Create and start the whole stack in the background.",
      },
      {
        cmd: "docker compose up -d SERVICE",
        does: "Create/recreate only that service (others stay as they are).",
      },
      {
        cmd: "docker compose up -d --force-recreate SERVICE",
        does: "Destroy and recreate one service from its image/config.",
      },
      {
        cmd: "docker compose down",
        does: "Stop and remove this project’s containers and default network.",
        tip: "Add -v to delete named volumes too: that can wipe a database.",
      },
      {
        cmd: "docker compose ps",
        does: "Status of services defined in the compose file.",
      },
      {
        cmd: "docker compose config --services",
        does: "Validate the file and list service names (the DNS names on the project network).",
      },
      {
        cmd: "docker compose config --images",
        does: "Show the resolved image for each service.",
      },
      {
        cmd: "docker compose logs --tail N SERVICE",
        does: "Last N log lines for one service (use -f to follow).",
      },
      {
        cmd: "docker compose build",
        does: "Rebuild images defined with a build: section.",
      },
      {
        cmd: "docker compose exec -T SERVICE CMD",
        does: "Run a command inside a service by Compose name (not container id).",
        tip: "-T disables a TTY: what you want in scripts; drop it for interactive shells.",
      },
      {
        cmd: "depends_on: (in the YAML)",
        does: "Startup order. Prefer condition: service_healthy so you wait for readiness, not just process start.",
      },
    ],
  },
  {
    id: "net-data",
    title: "Networks, volumes, cleanup",
    blurb: "How containers reach each other, where data lives, and how to reclaim disk.",
    commands: [
      {
        cmd: "docker network ls",
        does: "List networks. Compose creates one so services can use each other’s names.",
      },
      {
        cmd: "docker volume ls",
        does: "List named volumes — durable storage that outlives containers.",
      },
      {
        cmd: "docker volume rm NAME",
        does: "Delete a volume. Data inside is gone.",
      },
      {
        cmd: "docker system df",
        does: "How much disk images, containers, and volumes are using.",
      },
      {
        cmd: "docker system prune",
        does: "Delete unused containers, networks, and dangling images.",
        tip: "Add -a to remove unused images too. Add --volumes to include volumes (destructive).",
      },
    ],
  },
  {
    id: "quest",
    title: "This project",
    blurb: "Shortcuts from the Makefile. Prefer these over raw compose when you are working here.",
    commands: [
      {
        cmd: "make up",
        does: "Build and start the eight-container fleet.",
      },
      {
        cmd: "make down",
        does: "Stop and tear down the fleet.",
      },
      {
        cmd: "make doctor",
        does: "Check that Docker, Node, kubectl, and kind are present.",
      },
      {
        cmd: "make meta",
        does: "Hit each service’s /meta endpoint — five languages, one shape.",
      },
      {
        cmd: "make logs",
        does: "Tail fleet logs (see Makefile for exact target).",
      },
    ],
  },
];

export function Appendix() {
  return (
    <article className="fade-up">
      <header className="mb-6">
        <div className="text-[11px] uppercase tracking-[0.14em] text-ink-faint">
          Appendix · Reference
        </div>
        <h1 className="mt-1.5 text-[26px] font-medium leading-tight tracking-tight text-ink">
          Common Docker commands
        </h1>
        <p className="mt-2 max-w-[62ch] text-[14px] leading-relaxed text-ink-dim">
          A cheat sheet for the commands the course actually uses. Read it when you need a flag,
          not as a lesson. Nothing here is checked — open a terminal and try them when it helps.
        </p>
      </header>

      <div className="space-y-8">
        {GROUPS.map((group) => (
          <section key={group.id} id={`appendix-${group.id}`}>
            <h2 className="text-[14px] font-medium text-ink">{group.title}</h2>
            <p className="mt-1 max-w-[62ch] text-[12.5px] leading-relaxed text-ink-faint">
              {group.blurb}
            </p>
            <ul className="mt-3 overflow-hidden rounded-xl border border-edge bg-panel">
              {group.commands.map((c, i) => (
                <li
                  key={c.cmd}
                  className={`grid gap-1 px-3.5 py-3 sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)] sm:gap-4 sm:items-start ${
                    i > 0 ? "border-t border-edge" : ""
                  }`}
                >
                  <code className="font-mono text-[12.5px] leading-snug text-beam">{c.cmd}</code>
                  <div>
                    <p className="text-[13px] leading-relaxed text-ink-dim">{c.does}</p>
                    {c.tip && (
                      <p className="mt-1 text-[12px] leading-relaxed text-ink-faint">{c.tip}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>

      <p className="mt-8 max-w-[62ch] border-t border-edge pt-5 text-[12.5px] leading-relaxed text-ink-faint">
        Flags change slightly across Docker versions;{" "}
        <code className="font-mono text-ink-dim">docker COMMAND --help</code> is always right.
        For Kubernetes commands, the course introduces them in chapter 5 when you need them.
      </p>
    </article>
  );
}
