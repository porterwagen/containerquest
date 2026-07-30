"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  LESSONS,
  chapters,
  chapterMeta,
  evaluate,
  isChapterEnd,
  type Lesson,
  type ProbeMap,
  type CommandPart,
  type Predict,
  type Scaffold,
  type Step,
} from "@/lessons";
import { Replay, getRecording } from "./Replay";
import type { Mode } from "@/lib/control";

/**
 * The course.
 *
 * This is the front door. You land on a lesson, not on telemetry — the graphs
 * only mean something once you know what they are showing.
 *
 * Steps verify themselves against live service counters, so finishing a lesson
 * means you really ran the commands. Progress is kept in localStorage so you
 * can close the tab and come back.
 */

const STORAGE_KEY = "container-quest.progress.v1";

interface Progress {
  done: string[];
  current: string;
}

function loadProgress(): Progress {
  if (typeof window === "undefined") return { done: [], current: LESSONS[0]!.id };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { done: [], current: LESSONS[0]!.id };
    const parsed = JSON.parse(raw) as Progress;
    return {
      done: Array.isArray(parsed.done) ? parsed.done : [],
      current: parsed.current ?? LESSONS[0]!.id,
    };
  } catch {
    return { done: [], current: LESSONS[0]!.id };
  }
}

export function Course({ mode = "live" }: { mode?: Mode }) {
  const [progress, setProgress] = useState<Progress>({ done: [], current: LESSONS[0]!.id });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setProgress(loadProgress());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
  }, [progress, hydrated]);

  const lesson = useMemo(
    () => LESSONS.find((l) => l.id === progress.current) ?? LESSONS[0]!,
    [progress.current],
  );

  const index = LESSONS.findIndex((l) => l.id === lesson.id);
  const isDone = progress.done.includes(lesson.id);

  const complete = useCallback((id: string) => {
    setProgress((p) => (p.done.includes(id) ? p : { ...p, done: [...p.done, id] }));
  }, []);

  const goTo = useCallback((id: string) => {
    setProgress((p) => ({ ...p, current: id }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
      <Sidebar current={lesson.id} done={progress.done} onSelect={goTo} mode={mode} />

      <div className="min-w-0">
        <LessonView
          key={lesson.id}
          lesson={lesson}
          done={isDone}
          mode={mode}
          onComplete={() => complete(lesson.id)}
        />

        <nav className="mt-6 flex items-center justify-between gap-3 border-t border-edge pt-5">
          <button
            onClick={() => index > 0 && goTo(LESSONS[index - 1]!.id)}
            disabled={index === 0}
            className="rounded-md border border-edge px-3 py-2 text-[13px] text-ink-dim transition-colors hover:border-edge-bright hover:text-ink disabled:opacity-30"
          >
            ← Previous
          </button>

          {index < LESSONS.length - 1 ? (
            <button
              onClick={() => goTo(LESSONS[index + 1]!.id)}
              className="rounded-md border border-beam bg-beam/10 px-4 py-2 text-[13px] text-beam transition-colors hover:bg-beam/20"
            >
              Next lesson →
            </button>
          ) : (
            <span className="text-[13px] text-ink-faint">
              End of the written chapters. More coming.
            </span>
          )}
        </nav>
      </div>
    </div>
  );
}

function Sidebar({
  current,
  done,
  onSelect,
  mode,
}: {
  current: string;
  done: string[];
  onSelect: (id: string) => void;
  mode: Mode;
}) {
  return (
    <aside className="lg:sticky lg:top-6 lg:self-start">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-[11px] uppercase tracking-[0.14em] text-ink-faint">Course</h2>
        <span className="font-mono text-[11px] text-ink-faint">
          {done.length}/{LESSONS.length}
        </span>
      </div>

      {chapters().map((ch) => {
        const chDone = ch.lessons.filter((l) => done.includes(l.id)).length;
        return (
          <div key={ch.number} className="mb-4">
            <div className="mb-1.5 flex items-baseline justify-between gap-2">
              <span className="text-[11px] font-medium text-ink-dim">
                {ch.number}. {ch.title}
              </span>
              <span
                className="shrink-0 font-mono text-[10px]"
                style={{
                  color:
                    chDone === ch.lessons.length
                      ? "var(--color-live)"
                      : "var(--color-ink-faint)",
                }}
              >
                {chDone}/{ch.lessons.length}
              </span>
            </div>
            <ul className="space-y-0.5">
              {ch.lessons.map((l, i) => {
                const isDone = done.includes(l.id);
                const isCurrent = l.id === current;
                // A long chapter reads as a few short arcs rather than one
                // undifferentiated wall. Drawn whenever the label changes.
                const newSection = l.section && l.section !== ch.lessons[i - 1]?.section;
                return (
                  <li key={l.id}>
                    {newSection && (
                      <div
                        className={`px-2 pb-1 text-[10px] uppercase tracking-[0.12em] text-ink-faint ${
                          i === 0 ? "" : "mt-2.5 border-t border-edge pt-2.5"
                        }`}
                      >
                        {l.section}
                      </div>
                    )}
                    <button
                      onClick={() => onSelect(l.id)}
                      className={`flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-[12.5px] transition-colors ${
                        isCurrent
                          ? "bg-panel-2 text-ink"
                          : "text-ink-faint hover:bg-panel hover:text-ink-dim"
                      }`}
                    >
                      <span
                        className="shrink-0 font-mono text-[10px]"
                        style={{ color: isDone ? "var(--color-live)" : "var(--color-ink-faint)" }}
                      >
                        {isDone ? "✓" : "○"}
                      </span>
                      <span className="min-w-0 flex-1 truncate">{l.title}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}

      <p className="mt-5 border-t border-edge pt-4 text-[11.5px] leading-relaxed text-ink-faint">
        {mode === "demo"
          ? "Every command here was really run against a real system - press run to replay what it printed."
          : "Keep a terminal open beside this. Every lesson asks you to run something real."}
      </p>
    </aside>
  );
}

function LessonView({
  lesson,
  done,
  mode,
  onComplete,
}: {
  lesson: Lesson;
  done: boolean;
  mode: Mode;
  onComplete: () => void;
}) {
  const [passed, setPassed] = useState<boolean[]>(() => lesson.steps.map(() => false));
  const [manual, setManual] = useState<boolean[]>(() => lesson.steps.map(() => false));
  const baselineRef = useRef<ProbeMap | null>(null);
  const [probes, setProbes] = useState<ProbeMap>({});

  // Snapshot the counters when the lesson opens; every check is measured
  // against that moment, so previous lessons' activity can't pass a step.
  useEffect(() => {
    if (mode === "demo") return;
    let stop = false;

    async function tick() {
      try {
        const res = await fetch("/api/probe", { cache: "no-store" });
        const data = await res.json();
        if (stop) return;
        baselineRef.current ??= data.probes;
        setProbes(data.probes);
      } catch {
        /* fleet down — automatic checks just won't pass */
      }
    }

    void tick();
    const id = setInterval(tick, 2_000);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, [lesson.id, mode]);

  // Re-evaluate every step against the latest counters.
  useEffect(() => {
    const base = baselineRef.current;
    if (!base) return;
    setPassed((prev) =>
      lesson.steps.map((s, i) => prev[i] || (s.check.kind !== "manual" && evaluate(s.check, base, probes))),
    );
  }, [probes, lesson.steps]);

  // Live mode proves you ran the command by watching the services change.
  // Demo mode has nothing to watch, so a step completes when you play its
  // recording — and the UI says so rather than implying verification.
  const allDone = lesson.steps.every((s, i) =>
    mode === "demo" ? manual[i] : s.check.kind === "manual" ? manual[i] : passed[i],
  );

  useEffect(() => {
    if (allDone && !done) onComplete();
  }, [allDone, done, onComplete]);

  return (
    <article>
      <header className="mb-5">
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-ink-faint">
          <span>
            Chapter {lesson.chapter} · {lesson.chapterTitle}
          </span>
          <span>·</span>
          <span>{lesson.minutes} min</span>
        </div>
        <h1 className="mt-1.5 text-[26px] font-medium leading-tight tracking-tight text-ink">
          {lesson.title}
        </h1>
      </header>

      <div className="space-y-3.5">
        {lesson.concept.map((p, i) => (
          <ConceptBlock key={i} text={p} />
        ))}
      </div>

      <div className="mt-7 space-y-3">
        {lesson.steps.map((step, i) => (
          <StepCard
            key={i}
            n={i + 1}
            step={step}
            lessonId={lesson.id}
            stepIndex={i}
            mode={mode}
            passed={
              mode === "demo"
                ? manual[i]!
                : step.check.kind === "manual"
                  ? manual[i]!
                  : passed[i]!
            }
            onManual={() => setManual((m) => m.map((v, j) => (j === i ? true : v)))}
          />
        ))}
      </div>

      {/* `done` as well as `allDone`, so a finished lesson still shows its
          recap and takeaway when you come back to review. Step state resets on
          navigation (LessonView is keyed on lesson.id), so without this a
          completed lesson renders as if you had never touched it. */}
      {(allDone || done) && lesson.recap && lesson.recap.length > 0 && (
        <section className="fade-up mt-7 rounded-xl border border-edge bg-panel p-5">
          <h2 className="text-[11px] uppercase tracking-[0.14em] text-beam">What you just did</h2>
          <ul className="mt-3 space-y-2">
            {lesson.recap.map((line, i) => (
              <li
                key={i}
                className="flex max-w-[68ch] gap-3 text-[13.5px] leading-relaxed text-ink-dim"
              >
                <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-beam" />
                {line}
              </li>
            ))}
          </ul>
        </section>
      )}

      {(allDone || done) && (
        <div className="fade-up mt-7 rounded-xl border border-live/40 bg-live/5 p-5">
          <div className="text-[11px] uppercase tracking-[0.14em] text-live">Lesson complete</div>
          <p className="mt-2 max-w-[62ch] text-[15px] leading-relaxed text-ink">
            {lesson.takeaway}
          </p>
          {lesson.source && (
            <p className="mt-3 text-[12.5px] leading-relaxed text-ink-faint">
              Curious? {lesson.source.note} It lives in{" "}
              <code className="font-mono text-ink-dim">{lesson.source.path}</code>.
            </p>
          )}
          <Link
            href="/dashboard"
            className="mt-4 inline-block rounded-md border border-edge px-3 py-1.5 text-[12.5px] text-ink-dim transition-colors hover:border-edge-bright hover:text-ink"
          >
            See it on the live dashboard →
          </Link>
        </div>
      )}

      {/* Finishing a chapter is the one moment worth zooming out for. Nothing
          else in the course looks past a single lesson. */}
      {(allDone || done) && isChapterEnd(lesson.id) && <ChapterMilestone chapter={lesson.chapter} />}
    </article>
  );
}

function ChapterMilestone({ chapter }: { chapter: number }) {
  const meta = chapterMeta(chapter);
  if (!meta) return null;

  return (
    <section className="fade-up mt-4 rounded-xl border border-beam/40 bg-beam/5 p-5">
      <div className="text-[11px] uppercase tracking-[0.14em] text-beam">
        Chapter {meta.number} complete · {meta.title}
      </div>
      <p className="mt-2 text-[13px] text-ink-dim">What you can do now:</p>
      <ul className="mt-2.5 space-y-2">
        {meta.summary.map((line, i) => (
          <li
            key={i}
            className="flex max-w-[68ch] gap-3 text-[13.5px] leading-relaxed text-ink-dim"
          >
            <span className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-beam" />
            {line}
          </li>
        ))}
      </ul>
      <p className="mt-3.5 max-w-[62ch] text-[13px] leading-relaxed text-ink-faint">
        {meta.nextUp}
      </p>
    </section>
  );
}

function StepCard({
  n,
  step,
  lessonId,
  stepIndex,
  mode,
  passed,
  onManual,
}: {
  n: number;
  step: Step;
  lessonId: string;
  stepIndex: number;
  mode: Mode;
  passed: boolean;
  onManual: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const recording = getRecording(lessonId, stepIndex);
  const isDemo = mode === "demo";

  async function copy() {
    if (!step.command) return;
    await navigator.clipboard.writeText(step.command);
    setCopied(true);
    setTimeout(() => setCopied(false), 1_600);
  }

  return (
    <section
      className="rounded-xl border bg-panel transition-colors"
      style={{
        borderColor: passed
          ? "color-mix(in oklab, var(--color-live) 40%, transparent)"
          : "var(--color-edge)",
      }}
    >
      <div className="flex items-start gap-3 p-4">
        <span
          className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border font-mono text-[11px]"
          style={{
            borderColor: passed ? "var(--color-live)" : "var(--color-edge-bright)",
            color: passed ? "var(--color-live)" : "var(--color-ink-faint)",
          }}
        >
          {passed ? "\u2713" : n}
        </span>

        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] leading-relaxed text-ink">{step.instruction}</p>

          {/* File-writing steps: show tree + contents first so printf one-liners
              are not the only way to understand what is being created. */}
          {step.scaffold && <ScaffoldPanel scaffold={step.scaffold} />}

          {/* Above the command on purpose: the guess only works if it is made
              before the answer is in view. Never gates completion. */}
          {step.predict && <PredictPanel predict={step.predict} />}

          {/* On the web there is nothing to run against, so the command is
              shown as a replay of the real recorded session. Locally it is a
              command you copy and actually execute. */}
          {step.command && isDemo && recording ? (
            <div className="mt-2.5">
              <Replay lessonId={lessonId} stepIndex={stepIndex} onPlayed={onManual} />
              {step.commandParts && step.commandParts.length > 0 && (
                <CommandPartsPanel parts={step.commandParts} />
              )}
            </div>
          ) : (
            step.command && (
              <div className="mt-2.5">
                {step.scaffold && (
                  <p className="mb-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-ink-faint">
                    Terminal (optional if you create the files another way)
                  </p>
                )}
                <div className="flex items-stretch gap-2">
                  <code className="min-w-0 flex-1 overflow-x-auto whitespace-pre rounded-md border border-edge bg-void px-3 py-2.5 font-mono text-[12.5px] leading-relaxed text-beam">
                    {step.command}
                  </code>
                  <button
                    onClick={copy}
                    className="shrink-0 rounded-md border border-edge px-2.5 font-mono text-[11px] text-ink-faint transition-colors hover:border-edge-bright hover:text-ink"
                  >
                    {copied ? "copied" : "copy"}
                  </button>
                </div>
                {step.commandParts && step.commandParts.length > 0 && (
                  <CommandPartsPanel parts={step.commandParts} />
                )}
              </div>
            )
          )}

          {!passed && !isDemo && step.check.kind === "manual" && (
            <button
              onClick={onManual}
              className="mt-2.5 rounded-md border border-edge px-2.5 py-1.5 text-[12px] text-ink-dim transition-colors hover:border-edge-bright hover:text-ink"
            >
              {step.check.label}
            </button>
          )}

          {!passed && !isDemo && step.check.kind !== "manual" && (
            <p className="mt-2.5 font-mono text-[11.5px] text-ink-faint">
              waiting - this checks itself when you run it
            </p>
          )}

          {/* Demo mode has no services to watch, so any step that is not
              auto-completed by playing a recording needs a button here. That
              covers two cases: a step with no command at all, and a step whose
              recording is missing. Without the second case a missing recording
              is a hard dead end - no run button, no button here, and the lesson
              can never be completed on the hosted site.

              The label is the authored one rather than a generic "Got it",
              because in demo mode it is the only comprehension prompt the
              learner gets ("I saw: Cannot find module 'express'"). */}
          {!passed && isDemo && (!step.command || !recording) && (
            <button
              onClick={onManual}
              className="mt-2.5 rounded-md border border-edge px-2.5 py-1.5 text-[12px] text-ink-dim transition-colors hover:border-edge-bright hover:text-ink"
            >
              {step.check.kind === "manual" ? step.check.label : "Got it"}
            </button>
          )}

          {/* Shown before the step passes, because that is when it is needed.
              A beginner whose port is already taken otherwise hits a hard stop
              with no idea that the error is ordinary and fixable. */}
          {!passed && step.ifItFails && (
            <p className="mt-2.5 max-w-[62ch] rounded-md border border-edge bg-panel-2 px-3 py-2 text-[12px] leading-relaxed text-ink-faint">
              <span className="text-warn">If it fails: </span>
              {step.ifItFails}
            </p>
          )}

          {passed && step.saw && (
            <p className="fade-up mt-3 max-w-[62ch] whitespace-pre-line border-l-2 border-live/40 pl-3 text-[13.5px] leading-relaxed text-ink-dim">
              {step.saw}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

/**
 * Concept strings sometimes encode lists with "• " or "1. " and newlines.
 * Render those as real lists so they don't collapse into one paragraph.
 */
function ConceptBlock({ text }: { text: string }) {
  const trimmed = text.trim();
  const bulletSplit = trimmed.split(/\n•\s*/);
  if (trimmed.startsWith("• ") || trimmed.startsWith("•\t") || bulletSplit.length > 1) {
    const items = trimmed.startsWith("•")
      ? trimmed
          .split(/\n•\s*/)
          .map((s) => s.replace(/^•\s*/, "").trim())
          .filter(Boolean)
      : bulletSplit.map((s) => s.replace(/^•\s*/, "").trim()).filter(Boolean);
    return (
      <ul className="max-w-[68ch] list-disc space-y-2 pl-5 text-[15px] leading-[1.65] text-ink-dim marker:text-ink-faint">
        {items.map((item) => (
          <li key={item.slice(0, 48)} className="pl-1">
            {item}
          </li>
        ))}
      </ul>
    );
  }

  const numbered = trimmed.match(/^\d+\.\s/);
  if (numbered && /\n\d+\.\s/.test(trimmed)) {
    const items = trimmed
      .split(/\n(?=\d+\.\s)/)
      .map((s) => s.replace(/^\d+\.\s*/, "").trim())
      .filter(Boolean);
    return (
      <ol className="max-w-[68ch] list-decimal space-y-2 pl-5 text-[15px] leading-[1.65] text-ink-dim marker:text-ink-faint">
        {items.map((item, i) => (
          <li key={`${i}-${item.slice(0, 40)}`} className="pl-1">
            {item}
          </li>
        ))}
      </ol>
    );
  }

  // whitespace-pre-line so a paragraph that has newlines but is neither
  // bullet- nor number-shaped keeps them instead of collapsing to one line.
  return (
    <p className="max-w-[68ch] whitespace-pre-line text-[15px] leading-[1.65] text-ink-dim">
      {text}
    </p>
  );
}

/** Token-by-token decode of a command (first time a flag appears). */
/**
 * Commit to an answer before running the command.
 *
 * Being wrong on purpose is the point: a prediction you got wrong is far more
 * memorable than the same fact read passively. Choosing is optional and does
 * not affect whether the step completes.
 */
function PredictPanel({ predict }: { predict: Predict }) {
  const [chosen, setChosen] = useState<0 | 1 | null>(null);

  return (
    <div className="mt-3 rounded-lg border border-edge bg-panel-2 p-3.5">
      <p className="text-[12.5px] leading-relaxed text-ink">
        <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-beam">
          Predict{" "}
        </span>
        {predict.question}
      </p>

      <div className="mt-2.5 flex flex-wrap gap-2">
        {predict.options.map((option, i) => {
          const isChosen = chosen === i;
          const isRight = predict.answer === i;
          const revealed = chosen !== null;
          return (
            <button
              key={option}
              onClick={() => setChosen(i as 0 | 1)}
              disabled={revealed}
              className={`rounded-md border px-3 py-1.5 text-[12px] transition-colors ${
                revealed
                  ? isRight
                    ? "border-live/50 text-live"
                    : isChosen
                      ? "border-dead/50 text-dead"
                      : "border-edge text-ink-faint opacity-50"
                  : "border-edge text-ink-dim hover:border-edge-bright hover:text-ink"
              }`}
            >
              {option}
            </button>
          );
        })}
      </div>

      {chosen !== null && (
        <p className="fade-up mt-3 max-w-[62ch] text-[12.5px] leading-relaxed text-ink-dim">
          <span className={chosen === predict.answer ? "text-live" : "text-warn"}>
            {chosen === predict.answer ? "Right. " : "Not quite. "}
          </span>
          {predict.because}
        </p>
      )}
    </div>
  );
}

function CommandPartsPanel({ parts }: { parts: CommandPart[] }) {
  return (
    <div className="mt-2 overflow-hidden rounded-md border border-edge">
      <ul className="m-0 list-none divide-y divide-edge p-0">
        {parts.map((part) => (
          <li
            key={part.piece}
            className="grid grid-cols-1 gap-0.5 px-3 py-2 sm:grid-cols-[minmax(0,auto)_1fr] sm:gap-4 sm:items-baseline"
          >
            <code className="font-mono text-[12px] text-beam whitespace-pre-wrap break-all">
              {part.piece}
            </code>
            <span className="text-[12.5px] leading-snug text-ink-dim">{part.meaning}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Companion panel for file-writing steps: directory tree + each file's contents.
 * Keeps the learning surface readable even when the terminal command is dense.
 */
function ScaffoldPanel({ scaffold }: { scaffold: Scaffold }) {
  return (
    <div className="mt-3 space-y-2.5 rounded-lg border border-edge bg-void/60 p-3">
      <pre className="m-0 overflow-x-auto font-mono text-[12.5px] leading-relaxed text-ink-dim">
        {scaffoldTree(scaffold)}
      </pre>

      {scaffold.note && (
        <p className="m-0 text-[12.5px] leading-relaxed text-ink-faint">{scaffold.note}</p>
      )}

      {scaffold.files.map((file) => (
        <div key={file.path} className="overflow-hidden rounded-md border border-edge">
          <div className="flex items-center justify-between gap-2 border-b border-edge bg-panel px-3 py-1.5">
            <span className="font-mono text-[11.5px] text-beam">
              {scaffold.root.replace(/\/$/, "")}/{file.path}
            </span>
            {file.language && (
              <span className="font-mono text-[10px] uppercase tracking-wider text-ink-faint">
                {file.language}
              </span>
            )}
          </div>
          <pre className="m-0 max-h-64 overflow-auto whitespace-pre bg-void px-3 py-2.5 font-mono text-[12px] leading-relaxed text-ink-dim">
            {file.content.replace(/\n$/, "")}
          </pre>
        </div>
      ))}
    </div>
  );
}

/** Simple tree from a flat file list under one root. */
function scaffoldTree(scaffold: Scaffold): string {
  const root = scaffold.root.replace(/\/$/, "");
  const lines = [`${root}/`];
  const paths = scaffold.files.map((f) => f.path).sort();
  paths.forEach((path, i) => {
    const last = i === paths.length - 1;
    const branch = last ? "└── " : "├── ";
    lines.push(`${branch}${path}`);
  });
  return lines.join("\n");
}
