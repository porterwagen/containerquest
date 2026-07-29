import { z } from "zod";

/**
 * Distributed tracing, hand-rolled.
 *
 * A "trace" is one logical request, and a "span" is one hop inside it. When the
 * dashboard calls util, and util calls ai and compute, that is one trace with
 * three spans. Collect enough of them and you can draw the actual shape of your
 * system instead of the shape you believe it has.
 *
 * Real systems use OpenTelemetry for this. We build it by hand in ~40 lines per
 * service because the mechanism is genuinely simple, and seeing it plainly is
 * worth more here than the features a real tracing library would add:
 *
 *   1. The caller generates a trace id and sends it in a header.
 *   2. Every service passes that header along to whoever it calls next.
 *   3. Each caller records how long its call took, tagged with that id.
 *
 * Step 2 is the whole trick, and it is also the step everyone forgets — which
 * is why half-instrumented systems produce traces that mysteriously stop.
 */

/** A Redis stream. Append-only, capped, readable from a cursor by many clients. */
export const SPAN_STREAM = "quest:spans";

/** Kept small: this is a live view, not an archive. */
export const SPAN_STREAM_MAXLEN = 2_000;

export const Span = z.object({
  traceId: z.string(),
  /** Service that made the call. */
  from: z.string(),
  /** Service that answered it. */
  to: z.string(),
  ms: z.number(),
  status: z.number(),
  at: z.number(),
  /** Which container instance served it — visible once replicas are scaled up. */
  toHost: z.string().optional(),
});
export type Span = z.infer<typeof Span>;

/** Short, sortable, and readable in a log. Not cryptographic. */
export function newTraceId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}
