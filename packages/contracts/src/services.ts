import type { Language } from "./meta.ts";

/**
 * The service registry — one source of truth for what exists in the fleet.
 *
 * The Compose file, the Kubernetes manifests, the topology graph, and the
 * simulator all read from here, so adding a service is a one-line change
 * rather than a scavenger hunt.
 */

export interface ServiceDef {
  id: string;
  label: string;
  language: Language | "infra";
  /** Port the service listens on inside its container. */
  port: number;
  /** Port published to localhost under Compose. */
  hostPort: number;
  /** What it teaches — shown in the dashboard's why-panel. */
  role: string;
  /** Services it calls. Drives the edges in the topology graph. */
  dependsOn: string[];
  /** Base image family, for the size ledger. */
  baseImage: string;
}

export const SERVICES: ServiceDef[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    language: "typescript",
    port: 3000,
    hostPort: 3000,
    role: "Next.js mission control. Aggregates every other service and renders the fleet.",
    dependsOn: ["worker", "ai", "util", "compute", "postgres", "redis"],
    baseImage: "node:24-alpine",
  },
  {
    id: "worker",
    label: "Worker",
    language: "typescript",
    port: 3001,
    hostPort: 3001,
    role: "Background job consumer. Proves that scaling replicas multiplies throughput.",
    dependsOn: ["redis", "postgres"],
    baseImage: "node:24-alpine",
  },
  {
    id: "ai",
    label: "AI Service",
    language: "python",
    port: 8000,
    hostPort: 8000,
    role: "FastAPI. Simulated embeddings and inference — the slow, memory-hungry neighbour.",
    dependsOn: ["redis"],
    baseImage: "python:3.13-slim",
  },
  {
    id: "util",
    label: "Utility",
    language: "go",
    port: 8080,
    hostPort: 8080,
    role: "Go stdlib. Health aggregation and SSE fan-out — why Go runs cloud infrastructure.",
    dependsOn: ["ai", "compute"],
    baseImage: "distroless/static",
  },
  {
    id: "compute",
    label: "Compute",
    language: "c",
    port: 9000,
    hostPort: 9000,
    role: "Hand-written C on raw sockets. Ships FROM scratch — no OS in the image at all.",
    dependsOn: [],
    baseImage: "scratch",
  },
];

export const INFRA: ServiceDef[] = [
  {
    id: "postgres",
    label: "PostgreSQL",
    language: "infra",
    port: 5432,
    hostPort: 5432,
    role: "Stateful dependency. Its outage is what makes readiness probes matter.",
    dependsOn: [],
    baseImage: "postgres:18-alpine",
  },
  {
    id: "redis",
    label: "Redis",
    language: "infra",
    port: 6379,
    hostPort: 6379,
    role: "Queue and trace bus. Every request span lands here before the dashboard reads it.",
    dependsOn: [],
    baseImage: "redis:8-alpine",
  },
];

export const ALL_SERVICES = [...SERVICES, ...INFRA];

export const byId = (id: string): ServiceDef | undefined =>
  ALL_SERVICES.find((s) => s.id === id);
