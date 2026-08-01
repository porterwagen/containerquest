import Link from "next/link";

/**
 * Site wordmark + beta chip.
 *
 * The β mark is deliberate: small mono telemetry, not a marketing banner.
 * It reads as "this system is still under construction" without shouting.
 */
export function BrandMark({
  href = "/",
  size = "md",
  as = "link",
}: {
  href?: string;
  size?: "sm" | "md" | "lg";
  /** Use `span` on pages that already wrap the brand in their own link. */
  as?: "link" | "span";
}) {
  const titleClass =
    size === "lg"
      ? "text-[28px] sm:text-[32px]"
      : size === "sm"
        ? "text-[15px]"
        : "text-[22px]";

  const chipClass =
    size === "lg" ? "text-[10px] px-1.5 py-0.5" : size === "sm" ? "text-[8px] px-1 py-px" : "text-[9px] px-1.5 py-0.5";

  const inner = (
    <>
      <span className="pulse h-2 w-2 shrink-0 rounded-full bg-live text-live" />
      <span
        className={`font-medium tracking-tight text-ink transition-colors ${titleClass} ${
          as === "link" ? "group-hover:text-beam" : ""
        }`}
      >
        Container Quest
      </span>
      <BetaChip className={chipClass} />
    </>
  );

  if (as === "span") {
    return <span className="inline-flex items-center gap-2.5">{inner}</span>;
  }

  return (
    <Link href={href} className="group inline-flex items-center gap-2.5">
      {inner}
    </Link>
  );
}

export function BetaChip({ className = "" }: { className?: string }) {
  return (
    <span
      className={`beta-chip relative inline-flex items-center overflow-hidden rounded-[4px] font-mono font-medium uppercase leading-none tracking-[0.14em] ${className}`}
      title="Public beta — lessons and the fleet are still moving"
      aria-label="Beta"
    >
      <span className="beta-chip-sheen" aria-hidden />
      <span className="relative z-[1] text-beam">β</span>
      <span className="relative z-[1] text-ink-dim">eta</span>
    </span>
  );
}
