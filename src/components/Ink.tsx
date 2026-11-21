"use client";

import { useId } from "react";
import { cn } from "@/lib/utils";

const INK_GRADIENT = "linear-gradient(90deg, #6c5cff 0%, #7d8cff 55%, #46d3ff 100%)";

/** Mastery as luminous ink: a track that fills with an indigo→cyan gradient. */
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
      className={cn("relative w-full overflow-hidden rounded-full bg-white/[.06] ring-1 ring-inset ring-white/[.06]", className)}
      style={{ height }}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(p * 100)}
    >
      {from !== undefined && from > p && (
        <div className="absolute inset-y-0 left-0 rounded-full bg-redpen/35" style={{ width: `${from * 100}%` }} />
      )}
      <div
        className={cn("absolute inset-y-0 left-0 rounded-full transition-[width] duration-700 ease-out", estimated && "opacity-45")}
        style={{
          width: `${Math.max(2, p * 100)}%`,
          background: INK_GRADIENT,
          boxShadow: "0 0 14px rgb(108 92 255 / .55)",
        }}
      />
    </div>
  );
}

/** A glass orb of luminous ink with a moving surface: overall mastery. */
export function InkWell({ p, size = 112, caption }: { p: number; size?: number; caption?: string }) {
  const uid = useId().replace(/:/g, "");
  const r = size / 2;
  const level = size - Math.max(0.06, Math.min(0.97, p)) * size;
  const w = size * 2;
  const wave = `M0,${level} C${w * 0.125},${level - 6} ${w * 0.375},${level + 6} ${w * 0.5},${level} S${w * 0.875},${level - 6} ${w},${level} L${w},${size} L0,${size} Z`;
  return (
    <div className="relative shrink-0" style={{ width: size }}>
      <div className="relative" style={{ width: size, height: size }}>
        <div className="absolute inset-[-14px] rounded-full bg-[radial-gradient(circle,rgba(108,92,255,.45),transparent_65%)] blur-md" aria-hidden />
        <svg className="relative" width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Overall mastery ${Math.round(p * 100)}%`}>
          <defs>
            <clipPath id={`c${uid}`}>
              <circle cx={r} cy={r} r={r - 5} />
            </clipPath>
            <linearGradient id={`g${uid}`} x1="0" y1="1" x2="1" y2="0">
              <stop offset="0" stopColor="#5b4cff" />
              <stop offset=".6" stopColor="#7d8cff" />
              <stop offset="1" stopColor="#46d3ff" />
            </linearGradient>
            <radialGradient id={`s${uid}`} cx=".35" cy=".3" r=".75">
              <stop offset="0" stopColor="#ffffff" stopOpacity=".18" />
              <stop offset=".5" stopColor="#ffffff" stopOpacity=".03" />
              <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
            </radialGradient>
          </defs>
          <circle cx={r} cy={r} r={r - 1.5} fill="#0d1230" stroke="rgba(255,255,255,.16)" strokeWidth={2} />
          <g clipPath={`url(#c${uid})`}>
            <g transform="translate(0,4)">
              <path d={wave} fill={`url(#g${uid})`} opacity={0.35} style={{ transformBox: "fill-box", animation: "ink-wave 7s linear infinite reverse" }} />
            </g>
            <path d={wave} fill={`url(#g${uid})`} style={{ transformBox: "fill-box", animation: "ink-wave 5s linear infinite" }} />
          </g>
          <circle cx={r} cy={r} r={r - 5} fill={`url(#s${uid})`} />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <span className="display tabular text-[28px] font-bold leading-none text-white" style={{ textShadow: "0 2px 12px rgba(10,8,40,.6)" }}>
            {Math.round(p * 100)}%
          </span>
        </div>
      </div>
      {caption && <p className="mt-2.5 text-center text-[12px] font-semibold text-slate">{caption}</p>}
    </div>
  );
}

/** Horizontal luminous tube for a chapter */
export function InkTube({ label, p }: { label: string; p: number }) {
  return (
    <div className="grid min-w-[120px] flex-1 gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-semibold text-navy">{label}</span>
        <span className="tabular text-[12.5px] font-bold text-[#c9c3ff]">{Math.round(p * 100)}%</span>
      </div>
      <div className="relative h-2.5 overflow-hidden rounded-full bg-white/[.06] ring-1 ring-inset ring-white/[.06]">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-700"
          style={{ width: `${Math.max(4, p * 100)}%`, background: INK_GRADIENT, boxShadow: "0 0 12px rgb(108 92 255 / .6)" }}
        />
      </div>
    </div>
  );
}

/** A small luminous dot that fills from the bottom: the concept glyph, reusable inline. */
export function InkDot({ p, size = 14, estimated = false, unseen = false }: { p: number; size?: number; estimated?: boolean; unseen?: boolean }) {
  const r = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className="shrink-0">
      <circle cx={r} cy={r} r={r - 1} fill="#111733" stroke="#958bff" strokeOpacity={unseen ? 0.35 : 0.9} strokeDasharray={unseen ? "2 2" : undefined} />
      {!unseen && (
        <rect
          x={1.5}
          y={1.5}
          width={size - 3}
          height={size - 3}
          rx={r}
          fill="#8b80ff"
          opacity={estimated ? 0.4 : 1}
          style={{ transformBox: "fill-box", transformOrigin: "bottom", transform: `scaleY(${p})`, transition: "transform 700ms ease-out" }}
        />
      )}
    </svg>
  );
}
