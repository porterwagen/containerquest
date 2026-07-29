"use client";

import { useEffect, useRef, useState } from "react";
import recordingsFile from "@/generated/recordings.json";

/**
 * A recorded session, replayed.
 *
 * This is NOT a simulated terminal. There is no input, nothing is pattern
 * matched, and no output is invented. Every character below was captured by
 * running the real command against the real running system — the hostnames are
 * real hostnames, the image sizes are real sizes, the errors really happened.
 *
 * That distinction is the whole reason the public site can be honest about
 * itself. A fake shell has to guess what you might type; a recording only ever
 * shows you something that actually occurred.
 *
 * Regenerate with: node scripts/record-lessons.mjs
 */

interface Recording {
  command: string;
  output: string;
  exitCode: number;
  ms: number;
}

const DATA = recordingsFile as { recordedAt: string; recordings: Record<string, Recording> };

export function getRecording(lessonId: string, stepIndex: number): Recording | undefined {
  return DATA.recordings[`${lessonId}:${stepIndex}`];
}

export const RECORDED_AT = DATA.recordedAt;

/** Reveals output over ~700ms so it reads as a session, not a paste. */
function useTypewriter(text: string, active: boolean) {
  const [shown, setShown] = useState("");
  const frame = useRef<number>(0);

  useEffect(() => {
    if (!active) {
      setShown("");
      return;
    }
    // Long output would take forever character by character, so it streams in
    // chunks sized to finish in roughly the same time regardless of length.
    const total = text.length;
    const duration = Math.min(280 + total * 1.5, 900);
    const start = performance.now();

    const tick = (now: number) => {
      const t = Math.min((now - start) / duration, 1);
      setShown(text.slice(0, Math.floor(total * t)));
      if (t < 1) frame.current = requestAnimationFrame(tick);
    };
    frame.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame.current);
  }, [text, active]);

  return shown;
}

export function Replay({
  lessonId,
  stepIndex,
  onPlayed,
}: {
  lessonId: string;
  stepIndex: number;
  onPlayed?: () => void;
}) {
  const rec = getRecording(lessonId, stepIndex);
  const [played, setPlayed] = useState(false);
  const shown = useTypewriter(rec?.output ?? "", played);

  if (!rec) return null;

  const done = played && shown.length === rec.output.length;

  return (
    <div className="mt-2.5 overflow-hidden rounded-md border border-edge bg-void">
      <div className="flex items-center justify-between gap-3 border-b border-edge px-3 py-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="flex gap-1" aria-hidden>
            <span className="h-2 w-2 rounded-full bg-edge-bright" />
            <span className="h-2 w-2 rounded-full bg-edge-bright" />
            <span className="h-2 w-2 rounded-full bg-edge-bright" />
          </span>
          <span className="truncate font-mono text-[10px] text-ink-faint">
            recorded session · real output
          </span>
        </div>
        {!played && (
          <button
            onClick={() => {
              setPlayed(true);
              onPlayed?.();
            }}
            className="shrink-0 rounded border border-beam/50 bg-beam/10 px-2 py-0.5 font-mono text-[10px] text-beam transition-colors hover:bg-beam/20"
          >
            ▸ run
          </button>
        )}
      </div>

      <div className="max-h-[300px] overflow-auto px-3 py-2.5">
        <div className="font-mono text-[12px] leading-relaxed">
          <span className="text-live">$</span>{" "}
          <span className="text-ink-dim">{rec.command}</span>
        </div>

        {played ? (
          <pre className="mt-1.5 whitespace-pre-wrap break-words font-mono text-[11.5px] leading-relaxed text-ink-dim">
            {shown}
            {!done && <span className="animate-pulse text-beam">▊</span>}
          </pre>
        ) : (
          <p className="mt-1.5 font-mono text-[11px] text-ink-faint">
            press run to replay what this actually printed
          </p>
        )}

        {done && (
          <div className="mt-2 flex items-center gap-2 border-t border-edge pt-2 font-mono text-[10px] text-ink-faint">
            <span>took {rec.ms}ms</span>
            {rec.exitCode !== 0 && (
              <span className="text-warn">exit {rec.exitCode} — expected here</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
