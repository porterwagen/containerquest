import { ALL_SERVICES } from "@quest/contracts";

/**
 * The map — how Docker, Compose and Kubernetes fit together, in one picture.
 *
 * Every lesson teaches one thing at a time, which is right for learning and
 * useless for orientation: you cannot see the shape of a system from inside a
 * single command. This is the only place that shows the whole thing at once,
 * at the three scales the course actually moves through:
 *
 *   one container   →   one machine   →   many machines
 *   Docker              Compose           Kubernetes
 *
 * Deliberately static — no hooks, no state, no client JS. That lets the same
 * component render on the static landing page and inside the (client) course
 * without either one paying for it.
 */

interface FleetBox {
  id: string;
  language: string;
  port: number;
}

/**
 * The containers a `docker compose up` actually starts, drawn from the shared
 * registry so the picture cannot drift from the fleet.
 */
const FLEET: FleetBox[] = [
  ...ALL_SERVICES.map((s) => ({ id: s.id, language: s.language, port: s.port })),
  // socket-proxy is in the Compose file but not the registry: nothing probes
  // it, it only guards the Docker socket. The diagram counts it anyway,
  // because it is a container you will see in `docker ps`.
  { id: "socket-proxy", language: "infra", port: 2375 },
];

const SUMMARY = [
  {
    tool: "Docker",
    line: "Builds an image and runs one container from it.",
  },
  {
    tool: "Compose",
    line: "Runs a set of containers together on one machine.",
  },
  {
    tool: "Kubernetes",
    line: "Keeps a set of containers alive across many machines.",
  },
];

export function TheMap() {
  return (
    <div className="space-y-3">
      <Band
        step="01"
        title="One program"
        tool="docker"
        chapters="Chapters 0–2"
        lead="A folder with your code and a Dockerfile becomes an image. An image is a template on disk. A container is one running instance made from it. Those three nouns are most of Docker."
      >
        <div className="grid items-stretch gap-2 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)]">
          <Node
            kind="on your machine"
            label="server.js + Dockerfile"
            detail="An ordinary folder. Your code does not know it is about to be containerized."
          />
          <Arrow label="docker build" />
          <Node
            kind="template"
            label="quest-hello:1.0"
            detail="An image: files plus a default way to start. Sits on disk, runs nothing."
            tone="beam"
          />
          <Arrow label="docker run" />
          <Node
            kind="instance"
            label="container"
            detail="A process with a private view of files, network and process list. One image, as many as you like."
            tone="live"
          />
        </div>

        <div className="mt-3 flex flex-col items-center gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-beam">
            docker push / docker pull
          </span>
          <span aria-hidden className="text-[12px] leading-none text-ink-faint">
            ↕
          </span>
          <div className="w-full rounded-lg border border-dashed border-edge-bright bg-panel px-3.5 py-2.5 sm:w-[360px]">
            <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
              registry
            </div>
            <div className="mt-1 text-[11.5px] leading-snug text-ink-dim">
              Docker Hub and friends. Where images go to travel between machines — the reason the
              thing you built runs the same on a server you have never touched.
            </div>
          </div>
        </div>
      </Band>

      <Band
        step="02"
        title="One machine, several containers"
        tool="docker compose"
        chapters="Chapters 3–4"
        lead="Real systems are not one container. Compose is a file listing several of them and one command that starts the lot. They get a private network and find each other by name."
      >
        <div className="rounded-lg border border-dashed border-edge-bright p-3">
          <div className="mb-2.5 flex flex-wrap items-baseline justify-between gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
              one machine · your laptop
            </span>
            <span className="font-mono text-[10px] text-beam">docker compose up</span>
          </div>

          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {FLEET.map((s) => (
              <div
                key={s.id}
                className="flex items-center gap-2 rounded-md border border-edge bg-panel px-2.5 py-2"
              >
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: `var(--color-lang-${s.language})` }}
                />
                <span className="min-w-0 flex-1 truncate font-mono text-[11.5px] text-ink">
                  {s.id}
                </span>
                <span className="font-mono text-[10px] text-ink-faint">:{s.port}</span>
              </div>
            ))}
          </div>

          <div className="mt-2 rounded-md border border-edge bg-panel px-3 py-2 text-[11.5px] leading-relaxed text-ink-dim">
            Private network. The dashboard reaches the Go service at{" "}
            <code className="font-mono text-beam">http://util:8080</code> — by name, never by IP,
            because names survive a restart and IP addresses do not.
          </div>
        </div>

        <div className="mt-2.5 flex flex-col items-center gap-1.5">
          <span className="font-mono text-[10px] uppercase tracking-[0.12em] text-beam">
            published: -p 3000:3000
          </span>
          <span aria-hidden className="text-[12px] leading-none text-ink-faint">
            ↓
          </span>
          <div className="w-full rounded-lg border border-edge bg-panel px-3.5 py-2.5 text-center sm:w-[360px]">
            <div className="font-mono text-[12px] text-ink">your browser</div>
            <div className="mt-1 text-[11.5px] leading-snug text-ink-dim">
              Only the ports you publish are reachable. Everything else talks privately.
            </div>
          </div>
        </div>
      </Band>

      <Band
        step="03"
        title="Many machines, kept alive"
        tool="kubernetes"
        chapters="Chapters 5–6"
        lead="Compose runs containers. It does not put them back when they die, spread them over machines, or replace them one at a time. Kubernetes does, and it follows from a single idea: you describe what should be true, and a loop makes reality match."
      >
        {/* items-center, not stretch: the cluster box is much taller than the
            desired-state box, and stretching the latter leaves a hole. */}
        <div className="grid items-center gap-2 lg:grid-cols-[minmax(0,230px)_auto_minmax(0,1fr)]">
          <Node
            kind="you write"
            label="replicas: 3"
            detail="A desired state, in a file. Not an instruction to start anything."
            tone="beam"
          />
          <Arrow label="control loop" sublabel="compares, forever" glyph="⟳" />

          <div className="rounded-lg border border-dashed border-edge-bright p-3">
            <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
              the cluster · many machines
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <NodeBox name="node 1">
                <Pod state="live" label="pod" />
                <Pod state="live" label="pod" />
              </NodeBox>
              <NodeBox name="node 2">
                <Pod state="dead" label="pod" />
                <Pod state="new" label="pod" />
              </NodeBox>
            </div>
            <p className="mt-2.5 text-[11.5px] leading-relaxed text-ink-dim">
              One died. Nobody was paged, and nobody typed anything. The loop noticed two where
              three were asked for, and started a replacement.
            </p>
          </div>
        </div>
      </Band>

      <div className="grid gap-2 sm:grid-cols-3">
        {SUMMARY.map((s) => (
          <div key={s.tool} className="rounded-xl border border-edge bg-panel px-4 py-3.5">
            <div className="font-mono text-[11px] uppercase tracking-[0.12em] text-beam">
              {s.tool}
            </div>
            <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-dim">{s.line}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/** One scale of the picture: a heading, a sentence, and the diagram itself. */
function Band({
  step,
  title,
  tool,
  chapters,
  lead,
  children,
}: {
  step: string;
  title: string;
  tool: string;
  chapters: string;
  lead: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-xl border border-edge bg-panel p-4 sm:p-5">
      <header className="flex flex-wrap items-baseline gap-x-3 gap-y-1.5">
        <span className="font-mono text-[11px] text-ink-faint">{step}</span>
        <h3 className="text-[15px] font-medium text-ink">{title}</h3>
        <span className="rounded border border-edge-bright px-1.5 py-0.5 font-mono text-[10px] text-beam">
          {tool}
        </span>
        <span className="ml-auto font-mono text-[10.5px] text-ink-faint">{chapters}</span>
      </header>

      <p className="mt-2 max-w-[72ch] text-[13px] leading-relaxed text-ink-dim">{lead}</p>

      <div className="mt-4 rounded-lg bg-void/60 p-3 sm:p-4">{children}</div>
    </section>
  );
}

/** A labelled box in a flow: what kind of thing it is, its name, what it is. */
function Node({
  kind,
  label,
  detail,
  tone = "ink",
}: {
  kind: string;
  label: string;
  detail: string;
  tone?: "ink" | "beam" | "live";
}) {
  return (
    <div className="rounded-lg border border-edge bg-panel px-3.5 py-3">
      <div className="font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">{kind}</div>
      <div className="mt-1 font-mono text-[12.5px]" style={{ color: `var(--color-${tone})` }}>
        {label}
      </div>
      <div className="mt-1.5 text-[11.5px] leading-snug text-ink-dim">{detail}</div>
    </div>
  );
}

/**
 * The connector between two boxes. Points down when the boxes stack on narrow
 * screens and right when they sit side by side, so the flow never lies about
 * its own direction.
 */
function Arrow({
  label,
  sublabel,
  glyph = "→",
}: {
  label: string;
  sublabel?: string;
  glyph?: string;
}) {
  const rotates = glyph === "→";
  return (
    <div className="flex shrink-0 flex-col items-center justify-center gap-0.5 px-1 py-1">
      <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-beam">{label}</span>
      <span aria-hidden className="text-[13px] leading-none text-ink-faint">
        {rotates ? (
          <>
            <span className="sm:hidden">↓</span>
            <span className="hidden sm:inline">→</span>
          </>
        ) : (
          glyph
        )}
      </span>
      {sublabel && (
        <span className="text-center font-mono text-[9.5px] text-ink-faint">{sublabel}</span>
      )}
    </div>
  );
}

/** One machine in the cluster, holding pods. */
function NodeBox({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div className="rounded-md border border-edge bg-panel p-2.5">
      <div className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
        {name}
      </div>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

/** A pod chip. Color carries the state, as everywhere else in this project. */
function Pod({ state, label }: { state: "live" | "dead" | "new"; label: string }) {
  const color = state === "dead" ? "dead" : "live";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded border px-2 py-1 font-mono text-[10.5px]"
      style={{
        borderColor: `color-mix(in oklab, var(--color-${color}) 45%, transparent)`,
        background: `color-mix(in oklab, var(--color-${color}) 8%, transparent)`,
        color: `var(--color-${color})`,
      }}
    >
      <span className={state === "dead" ? "line-through" : undefined}>{label}</span>
      {state === "dead" && <span className="text-[9.5px] text-ink-faint">died</span>}
      {state === "new" && <span className="text-[9.5px] text-ink-faint">new</span>}
    </span>
  );
}
