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

/** A large ink well: overall mastery as ink with a gently moving surface. */
export function InkWell({ p, size = 104, caption }: { p: number; size?: number; caption?: string }) {
  const r = size / 2;
  const id = `well-${size}`;
  const level = size - Math.max(0.06, Math.min(0.97, p)) * size;
  const w = size * 2;
  const wave = `M0,${level} C${w * 0.125},${level - 5} ${w * 0.375},${level + 5} ${w * 0.5},${level} S${w * 0.875},${level - 5} ${w},${level} L${w},${size} L0,${size} Z`;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Overall mastery ${Math.round(p * 100)}%`}>
        <defs>
          <clipPath id={id}>
            <circle cx={r} cy={r} r={r - 4} />
          </clipPath>
        </defs>
        <circle cx={r} cy={r} r={r - 1.5} fill="white" stroke="var(--color-ink)" strokeWidth={3} />
        <g clipPath={`url(#${id})`}>
          <g transform="translate(0,3)">
            <path d={wave} fill="var(--color-ink)" opacity={0.35} style={{ transformBox: "fill-box", animation: "ink-wave 6s linear infinite reverse" }} />
          </g>
          <path d={wave} fill="var(--color-ink)" style={{ transformBox: "fill-box", animation: "ink-wave 4.5s linear infinite" }} />
        </g>
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <span
          className="tabular text-[26px] font-bold leading-none"
          style={{ color: p > 0.55 ? "white" : "var(--color-navy)", textShadow: p > 0.55 ? "0 1px 2px rgba(15,30,102,.35)" : "none", fontVariationSettings: '"wdth" 110' }}
        >
          {Math.round(p * 100)}%
        </span>
      </div>
      {caption && <p className="mt-1.5 text-center text-[12.5px] font-semibold text-slate">{caption}</p>}
    </div>
  );
}

/** Horizontal ink tube for a chapter */
export function InkTube({ label, p }: { label: string; p: number }) {
  return (
    <div className="grid min-w-[120px] flex-1 gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[13.5px] font-semibold text-navy">{label}</span>
        <span className="tabular text-[13px] font-semibold text-ink">{Math.round(p * 100)}%</span>
      </div>
      <div className="relative h-3 overflow-hidden rounded-full bg-white ring-1 ring-inset ring-ink/25">
        <div className="absolute inset-y-[2px] left-[2px] rounded-full bg-ink transition-[width] duration-700" style={{ width: `calc(${Math.max(4, p * 100)}% - 4px)` }} />
      </div>
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
