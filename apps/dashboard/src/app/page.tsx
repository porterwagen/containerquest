import Link from "next/link";
import { LESSONS, chapters } from "@/lessons";

/**
 * The front door.
 *
 * Static on purpose. This page reads no telemetry, so it costs nothing to
 * serve and looks identical in the hosted demo and on a live machine. Only
 * /dashboard pays for a live poll.
 */

const REPO_URL = "https://github.com/porterwagen/containerquest";

const FLEET = [
  { name: "dashboard", lang: "TypeScript", color: "typescript", role: "This page, and the instrument panel", port: "3000" },
  { name: "worker", lang: "TypeScript", color: "typescript", role: "Chews through a background job queue", port: "3001" },
  { name: "ai", lang: "Python", color: "python", role: "Slow and memory-hungry, like the real thing", port: "8000" },
  { name: "util", lang: "Go", color: "go", role: "Asks the others how they are doing", port: "8080" },
  { name: "compute", lang: "C", color: "c", role: "Raw number-crunching, in a 187 kB image", port: "9000" },
  { name: "postgres", lang: "Postgres", color: "infra", role: "The database, where durable things go", port: "5432" },
  { name: "redis", lang: "Redis", color: "infra", role: "Fast temporary store, used as the queue", port: "6379" },
  { name: "socket-proxy", lang: "Infra", color: "infra", role: "Guards Docker access so the dashboard cannot overreach", port: "2375" },
];

const PRINCIPLES = [
  {
    title: "Nothing is simulated",
    body: "Every command is a real command against real containers running on your machine. The output you see is the output your terminal produced, including the errors.",
  },
  {
    title: "It checks what it can",
    body: "Where the system can prove you did something, it watches for it: a request counter rising, a restart count moving, a container id being replaced. Where it genuinely cannot tell, it asks you instead of pretending to know.",
  },
  {
    title: "You break it on purpose",
    body: "Crash a service and watch it revive. Scale to five copies. Roll out a new version with no downtime, then roll it back. Recovery is only convincing once you have caused the failure.",
  },
];

const ASSUMED = [
  "You can open a terminal and run a command someone gives you.",
  "You know roughly what a program, a file, and a network port are.",
  "You can read a little code without needing to write C, Go, or Python.",
  "You have a Mac or Linux machine you can install software on.",
];

const NOT_ASSUMED = [
  "Any Docker knowledge at all. Chapter 0 starts from why containers exist and has you build one by hand, one line at a time.",
  "Any Kubernetes knowledge. Every term is defined before it is used.",
  "A systems, ops, or DevOps background of any kind.",
  "Networking theory. The parts that matter are taught where they first bite.",
  "YAML, cloud accounts, or a credit card. Everything runs locally and for free.",
];

const TOOLS = [
  { cmd: "docker", why: "Chapter 0 onward. Install OrbStack or Docker Desktop." },
  { cmd: "node", why: "Version 22 or newer, to run the dashboard." },
  { cmd: "kubectl", why: "Chapter 5 onward, to talk to the cluster." },
  { cmd: "kind", why: "Chapter 5 onward, to create a local cluster." },
];

export default function Landing() {
  const chapterList = chapters();

  return (
    <main className="mx-auto max-w-[1180px] px-5 py-7 sm:px-8">
      <nav className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <span className="pulse h-2 w-2 rounded-full bg-live text-live" />
          <span className="text-[15px] font-medium tracking-tight text-ink">Container Quest</span>
        </div>
        <div className="flex items-center gap-1 text-[13px]">
          <Link
            href="/learn"
            className="rounded-md px-3 py-1.5 text-ink-faint transition-colors hover:text-ink"
          >
            Learn
          </Link>
          <Link
            href="/dashboard"
            className="rounded-md px-3 py-1.5 text-ink-faint transition-colors hover:text-ink"
          >
            Dashboard
          </Link>
          <a
            href={REPO_URL}
            target="_blank"
            rel="noreferrer"
            className="rounded-md px-3 py-1.5 text-ink-faint transition-colors hover:text-ink"
          >
            GitHub
          </a>
        </div>
      </nav>

      {/* Hero */}
      <section className="mt-16 grid items-center gap-12 lg:mt-24 lg:grid-cols-[minmax(0,1fr)_420px]">
        <div className="fade-up">
          <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-beam">
            A course that runs on your own machine
          </p>

          <h1 className="mt-4 text-[40px] font-medium leading-[1.08] tracking-tight text-ink sm:text-[52px]">
            Docker and Kubernetes,
            <br />
            <span className="text-ink-dim">made visible.</span>
          </h1>

          <p className="mt-5 max-w-xl text-[15px] leading-relaxed text-ink-dim">
            Most tutorials stop at a hello-world container. This one starts there, walking you
            through your first Dockerfile a line at a time, then hands you a small production
            system: eight containers, five languages, all running locally. You learn by taking
            it apart and watching it put itself back together.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/learn"
              className="rounded-lg bg-beam px-5 py-2.5 text-[14px] font-medium text-void transition-opacity hover:opacity-90"
            >
              Start with Chapter 0 →
            </Link>
            <Link
              href="/dashboard"
              className="rounded-lg border border-edge bg-panel px-5 py-2.5 text-[14px] text-ink-dim transition-colors hover:border-edge-bright hover:text-ink"
            >
              Look at the dashboard first
            </Link>
          </div>

          <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-4">
            {[
              { n: LESSONS.length, l: "lessons" },
              { n: chapterList.length, l: "chapters" },
              { n: 8, l: "containers" },
              { n: 5, l: "languages" },
            ].map((s) => (
              <div key={s.l}>
                <dt className="font-mono text-[24px] leading-none text-ink">{s.n}</dt>
                <dd className="mt-1.5 text-[12px] uppercase tracking-wider text-ink-faint">
                  {s.l}
                </dd>
              </div>
            ))}
          </dl>
        </div>

        {/* The fleet, as an instrument readout */}
        <div className="fade-up rounded-xl border border-edge bg-panel p-1.5" style={{ animationDelay: "120ms" }}>
          <div className="flex items-center gap-2 px-3 py-2">
            <span className="h-1.5 w-1.5 rounded-full bg-dead/70" />
            <span className="h-1.5 w-1.5 rounded-full bg-warn/70" />
            <span className="h-1.5 w-1.5 rounded-full bg-live/70" />
            <span className="ml-2 font-mono text-[10.5px] uppercase tracking-wider text-ink-faint">
              the fleet
            </span>
          </div>
          <div className="rounded-lg bg-void/60 p-2">
            {FLEET.map((s, i) => (
              <div
                key={s.name}
                className="fade-up flex items-center gap-3 rounded-md px-2.5 py-2 transition-colors hover:bg-panel-2"
                style={{ animationDelay: `${200 + i * 55}ms` }}
              >
                <span
                  className="h-1.5 w-1.5 shrink-0 rounded-full"
                  style={{ background: `var(--color-lang-${s.color})` }}
                />
                <span className="w-[92px] shrink-0 font-mono text-[12.5px] text-ink">
                  {s.name}
                </span>
                <span
                  className="w-[76px] shrink-0 font-mono text-[10.5px]"
                  style={{ color: `var(--color-lang-${s.color})` }}
                >
                  {s.lang}
                </span>
                <span className="ml-auto font-mono text-[10.5px] text-ink-faint">:{s.port}</span>
              </div>
            ))}
          </div>
          <p className="px-3 py-2.5 text-[11.5px] leading-relaxed text-ink-faint">
            Five languages on purpose. The tooling treats a C program and a Python program
            identically, which is why these skills transfer to any codebase.
          </p>
        </div>
      </section>

      {/* Principles */}
      <section className="mt-24 lg:mt-32">
        <div className="grid gap-4 sm:grid-cols-3">
          {PRINCIPLES.map((p) => (
            <div key={p.title} className="rounded-xl border border-edge bg-panel p-5">
              <h3 className="text-[14.5px] font-medium text-ink">{p.title}</h3>
              <p className="mt-2.5 text-[13px] leading-relaxed text-ink-dim">{p.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Prerequisites */}
      <section className="mt-24 lg:mt-32">
        <h2 className="text-[26px] font-medium tracking-tight text-ink">
          What you need to know first
        </h2>
        <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-ink-dim">
          Being precise about this matters. A course that quietly assumes you already know half
          of what it teaches is worse than one that says so up front.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-edge bg-panel p-6">
            <h3 className="flex items-center gap-2.5 text-[14px] font-medium text-ink">
              <span className="h-1.5 w-1.5 rounded-full bg-live" />
              Assumed
            </h3>
            <ul className="mt-4 space-y-3">
              {ASSUMED.map((t) => (
                <li key={t} className="flex gap-3 text-[13px] leading-relaxed text-ink-dim">
                  <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-ink-faint" />
                  {t}
                </li>
              ))}
            </ul>
          </div>

          <div className="rounded-xl border border-edge bg-panel p-6">
            <h3 className="flex items-center gap-2.5 text-[14px] font-medium text-ink">
              <span className="h-1.5 w-1.5 rounded-full bg-beam" />
              Not assumed
            </h3>
            <ul className="mt-4 space-y-3">
              {NOT_ASSUMED.map((t) => (
                <li key={t} className="flex gap-3 text-[13px] leading-relaxed text-ink-dim">
                  <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-ink-faint" />
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-edge bg-panel p-6">
          <h3 className="text-[14px] font-medium text-ink">Tools to install</h3>
          <p className="mt-2 text-[13px] leading-relaxed text-ink-dim">
            Only the first two are needed to begin. Run{" "}
            <code className="font-mono text-ink">make doctor</code> and it will tell you what is
            missing.
          </p>
          <div className="mt-5 grid gap-x-8 gap-y-3 sm:grid-cols-2">
            {TOOLS.map((t) => (
              <div key={t.cmd} className="flex items-baseline gap-3">
                <code className="w-[68px] shrink-0 font-mono text-[12.5px] text-beam">
                  {t.cmd}
                </code>
                <span className="text-[12.5px] leading-relaxed text-ink-faint">{t.why}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The path */}
      <section className="mt-24 lg:mt-32">
        <h2 className="text-[26px] font-medium tracking-tight text-ink">The path</h2>
        <p className="mt-3 max-w-2xl text-[14px] leading-relaxed text-ink-dim">
          Docker first, then Compose, then Kubernetes. That is the order they were invented, and
          the order in which each one&apos;s problems make the next one make sense.
        </p>

        <ol className="mt-8 space-y-px overflow-hidden rounded-xl border border-edge">
          {chapterList.map((c) => (
            <li
              key={c.number}
              className="flex flex-wrap items-baseline gap-x-4 gap-y-1 bg-panel px-5 py-4 transition-colors hover:bg-panel-2"
            >
              <span className="font-mono text-[11px] text-ink-faint">
                {String(c.number).padStart(2, "0")}
              </span>
              <span className="text-[14.5px] text-ink">{c.title}</span>
              <span className="ml-auto font-mono text-[11.5px] text-ink-faint">
                {c.lessons.length} {c.lessons.length === 1 ? "lesson" : "lessons"}
              </span>
            </li>
          ))}
        </ol>
      </section>

      {/* Run it */}
      <section className="mt-24 lg:mt-32">
        <div className="grid gap-8 rounded-xl border border-edge bg-panel p-8 md:grid-cols-2 md:items-center">
          <div>
            <h2 className="text-[22px] font-medium tracking-tight text-ink">
              Run it for real
            </h2>
            <p className="mt-3 text-[13.5px] leading-relaxed text-ink-dim">
              You can read every lesson here, with real recorded output. But the point is to run
              the commands yourself and watch your own system respond.{" "}
              <a
                href={REPO_URL}
                target="_blank"
                rel="noreferrer"
                className="text-beam underline decoration-beam/40 underline-offset-2 transition-colors hover:decoration-beam"
              >
                Clone the repo
              </a>
              , start the fleet, and the dashboard turns live.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href="/learn"
                className="rounded-lg bg-beam px-5 py-2.5 text-[14px] font-medium text-void transition-opacity hover:opacity-90"
              >
                Start the course →
              </Link>
              <a
                href={REPO_URL}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-edge px-5 py-2.5 text-[14px] text-ink-dim transition-colors hover:border-edge-bright hover:text-ink"
              >
                View on GitHub
              </a>
            </div>
          </div>

          <div className="rounded-lg border border-edge bg-void/60 p-4 font-mono text-[12.5px] leading-relaxed">
            <div className="text-ink-faint"># start all eight containers</div>
            <div className="mt-1">
              <span className="text-live">$</span> <span className="text-ink">make up</span>
            </div>
            <div className="mt-3 text-ink-faint"># check every tool is present</div>
            <div className="mt-1">
              <span className="text-live">$</span> <span className="text-ink">make doctor</span>
            </div>
            <div className="mt-3 text-ink-faint"># five languages, one JSON shape</div>
            <div className="mt-1">
              <span className="text-live">$</span> <span className="text-ink">make meta</span>
            </div>
          </div>
        </div>
      </section>

      <footer className="mt-20 border-t border-edge py-8 text-[12.5px] text-ink-faint">
        Container Quest. A miniature production platform in five languages, built to make Docker
        and Kubernetes visible.
      </footer>
    </main>
  );
}
