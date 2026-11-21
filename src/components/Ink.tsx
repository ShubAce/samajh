"use client";

import { cn } from "@/lib/utils";

/** Mastery shown as ink: an outlined bar that fills with royal-blue ink. */
export function InkBar({
  p,
  from,
  className,
  estimated = false,
  height = 8,
}: {
  p: number;
  from?: number;
  className?: string;
  estimated?: boolean;
  height?: number;
}) {
  return (
    <div
      className={cn("relative w-full overflow-hidden rounded-full bg-ink-wash ring-1 ring-inset ring-ink/15", className)}
      style={{ height }}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(p * 100)}
    >
      {from !== undefined && from > p && (
        <div className="absolute inset-y-0 left-0 bg-redpen/25" style={{ width: `${from * 100}%` }} />
      )}
      <div
        className={cn("absolute inset-y-0 left-0 rounded-full bg-ink transition-[width] duration-700 ease-out", estimated && "opacity-45")}
        style={{ width: `${Math.max(2, p * 100)}%` }}
      />
    </div>
  );
}

/** A small round "ink well" that fills from the bottom: the concept-map glyph, reusable inline. */
export function InkDot({ p, size = 14, estimated = false, unseen = false }: { p: number; size?: number; estimated?: boolean; unseen?: boolean }) {
  const r = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className="shrink-0">
      <circle cx={r} cy={r} r={r - 1} fill="white" stroke="var(--color-ink)" strokeOpacity={unseen ? 0.35 : 0.8} strokeDasharray={unseen ? "2 2" : undefined} />
      {!unseen && (
        <rect
          x={1.5}
          y={1.5}
          width={size - 3}
          height={size - 3}
          rx={r}
          fill="var(--color-ink)"
          opacity={estimated ? 0.4 : 1}
          style={{ transformBox: "fill-box", transformOrigin: "bottom", transform: `scaleY(${p})`, transition: "transform 700ms ease-out" }}
        />
      )}
    </svg>
  );
}
