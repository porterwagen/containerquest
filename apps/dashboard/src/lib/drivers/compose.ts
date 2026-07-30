import Docker from "dockerode";
import type { Replica, QuestEvent } from "@quest/contracts";

/**
 * ComposeDriver — the Docker Engine API as a control plane.
 *
 * This container never touches /var/run/docker.sock. It talks to a socket
 * proxy over HTTP, and that proxy forwards only four capabilities: list
 * containers, inspect them, stream events, and restart. See the long note in
 * infra/compose/docker-compose.yml for why handing a container the raw socket
 * is equivalent to handing it root on the host.
 *
 * That allowlist is the same idea as the Kubernetes RBAC written in Phase 4:
 * name the operations you need, deny everything else by default. Comparing
 * this file with its Kubernetes twin is the fastest way to see what an
 * orchestrator actually adds.
 */

const PROJECT = process.env.COMPOSE_PROJECT_NAME || "container-quest";

let docker: Docker | null = null;

export function dockerAvailable(): boolean {
  return process.env.QUEST_ALLOW_DOCKER_SOCKET === "1";
}

function client(): Docker {
  if (docker) return docker;

  // DOCKER_HOST points at the proxy (tcp://socket-proxy:2375). Falling back to
  // the socket path keeps `npm run dev` on a laptop working, where the socket
  // is reachable as your own user anyway.
  const host = process.env.DOCKER_HOST;
  if (host?.startsWith("tcp://")) {
    const url = new URL(host);
    docker = new Docker({ host: url.hostname, port: Number(url.port || 2375) });
  } else {
    docker = new Docker({ socketPath: "/var/run/docker.sock" });
  }
  return docker;
}

/** Compose labels every container it creates; that is how we find our own. */
const labelFilter = JSON.stringify({
  label: [`com.docker.compose.project=${PROJECT}`],
});

interface RawContainer {
  Id: string;
  Names: string[];
  State: string;
  Status: string;
  Labels: Record<string, string>;
  Image: string;
  Created: number;
}

function serviceOf(c: RawContainer): string {
  return c.Labels["com.docker.compose.service"] ?? "unknown";
}

/**
 * Docker's states map onto the Kubernetes vocabulary the UI speaks. The
 * mapping is lossy on purpose — Docker genuinely has no notion of "Unready",
 * because it never separated liveness from readiness. That missing state is
 * the lesson, so we surface it rather than paper over it.
 */
function phaseOf(c: RawContainer): Replica["phase"] {
  switch (c.State) {
    case "running":
      return c.Status.includes("unhealthy")
        ? "Unready"
        : c.Status.includes("health: starting")
          ? "Starting"
          : "Ready";
    case "created":
    case "restarting":
      return "Starting";
    case "removing":
      return "Terminating";
    default:
      return "Gone";
  }
}

/**
 * Is a container with this exact name running right now?
 *
 * `listReplicas` cannot answer this. It filters on the Compose project label,
 * and the containers the Chapter 0 primer asks you to create are made by hand
 * with plain `docker run` — no project, no labels, invisible to that filter.
 *
 * Docker's `name` filter matches substrings, so "quest-hello" would also match
 * "quest-hello-backup". The exact comparison afterwards is what makes this a
 * real check rather than a near miss. Omitting `all: true` is deliberate: a
 * stopped container is not a running one, which is precisely the question.
 */
export async function containerRunning(name: string): Promise<boolean> {
  const containers = (await client().listContainers({
    filters: JSON.stringify({ name: [name] }),
  })) as unknown as RawContainer[];

  return containers.some((c) => c.Names.some((n) => n.replace(/^\//, "") === name));
}

export async function listReplicas(): Promise<Replica[]> {
  const containers = (await client().listContainers({
    all: true,
    filters: labelFilter,
  })) as unknown as RawContainer[];

  const out: Replica[] = [];
  for (const c of containers) {
    const service = serviceOf(c);
    if (service === "unknown") continue;

    // Restart count lives only in the detailed inspect, not the list response.
    let restarts = 0;
    try {
      const info = await client().getContainer(c.Id).inspect();
      restarts = info.RestartCount ?? 0;
    } catch {
      // Container vanished between list and inspect — normal during churn.
    }

    out.push({
      id: c.Id.slice(0, 12),
      service,
      version: c.Labels["quest.version"] ?? "1.0.0",
      phase: phaseOf(c),
      restarts,
      // teach: Compose runs everything on one host, so there is no node to
      // report. Kubernetes fills this in, and losing a node becomes survivable.
      node: null,
      startedAt: c.Created * 1000,
      cpuPct: 0,
      memMb: 0,
    });
  }
  return out;
}

/** `docker compose up --scale worker=N`, over the API. */
export async function scale(service: string, replicas: number): Promise<void> {
  // teach: There are two separate reasons scaling is unavailable here, and
  // saying "port conflict" for both would be wrong. Scaling down has no port
  // conflict at all; it is simply not something the Docker Engine API can
  // express, because the API has no concept of a service with a replica count.
  // `docker compose --scale` is a CLI-side loop that creates N containers.
  // Kubernetes puts that count in the Deployment itself, which is why scaling
  // there is one field rather than an external command.
  if (replicas > 1) {
    throw new Error(
      `Cannot scale ${service} to ${replicas} in Compose mode. It publishes a fixed host port, ` +
        `and two containers cannot bind the same one. A Kubernetes Service load-balances across ` +
        `pods instead, which is exactly what fixes this. Chapter 5 scales this same service to five.`,
    );
  }

  throw new Error(
    `Cannot set ${service} to ${replicas} replica${replicas === 1 ? "" : "s"} from the dashboard. ` +
      `There is no port conflict at this count: the Docker Engine API simply has no notion of a ` +
      `replica count to change. Compose does scaling from the CLI, Kubernetes puts it in the ` +
      `Deployment, and only one of those is something a dashboard can drive.`,
  );
}

export async function restart(service: string): Promise<void> {
  const containers = (await client().listContainers({
    filters: labelFilter,
  })) as unknown as RawContainer[];

  const target = containers.find((c) => serviceOf(c) === service);
  if (!target) throw new Error(`no running container for service "${service}"`);

  // teach: `restart` sends SIGTERM, waits, then SIGKILL — the same sequence
  // Kubernetes uses when deleting a pod. The difference is what happens after:
  // Docker restarts THIS container; Kubernetes creates a brand new pod, quite
  // possibly on a different machine.
  await client().getContainer(target.Id).restart({ t: 5 });
}

/**
 * Streams real Docker daemon events — no polling.
 *
 * `docker events` is the same firehose the CLI shows you. Subscribing to it is
 * what lets the dashboard react the instant a container dies, rather than up
 * to one poll interval later, which is where all the interesting moments hide.
 */
export async function subscribeDockerEvents(
  onEvent: (e: QuestEvent) => void,
  signal: AbortSignal,
): Promise<void> {
  const stream = (await client().getEvents({
    filters: { label: [`com.docker.compose.project=${PROJECT}`] },
  })) as NodeJS.ReadableStream;

  signal.addEventListener("abort", () => {
    (stream as unknown as { destroy?: () => void }).destroy?.();
  });

  let buffer = "";
  stream.on("data", (chunk: Buffer) => {
    buffer += chunk.toString();
    // The daemon emits newline-delimited JSON; a chunk can split an object.
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;
      let evt: {
        Type?: string;
        Action?: string;
        Actor?: { ID?: string; Attributes?: Record<string, string> };
        time?: number;
      };
      try {
        evt = JSON.parse(line);
      } catch {
        continue;
      }

      if (evt.Type !== "container") continue;
      const service = evt.Actor?.Attributes?.["com.docker.compose.service"];
      if (!service) continue;

      const at = (evt.time ?? Math.floor(Date.now() / 1000)) * 1000;
      const id = (evt.Actor?.ID ?? "").slice(0, 12);

      switch (evt.Action) {
        case "die":
          onEvent({
            type: "log",
            at,
            service,
            level: "error",
            message: `container exited (code ${evt.Actor?.Attributes?.exitCode ?? "?"})`,
            replicaId: id,
          });
          onEvent({ type: "replica.removed", at, service, id, reason: "died" });
          break;
        case "start":
          onEvent({
            type: "log",
            at,
            service,
            level: "info",
            message: "container started",
            replicaId: id,
          });
          break;
        case "health_status: healthy":
          onEvent({ type: "replica.phase", at, service, id, phase: "Ready" });
          break;
        case "health_status: unhealthy":
          onEvent({
            type: "probe.failed",
            at,
            service,
            id,
            probe: "readiness",
            detail: "healthcheck failed",
          });
          break;
      }
    }
  });

  stream.on("error", (err: Error) => {
    onEvent({
      type: "log",
      at: Date.now(),
      service: "dashboard",
      level: "error",
      message: `docker event stream: ${err.message}`,
      replicaId: null,
    });
  });
}
