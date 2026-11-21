"use client";

import { animate, useReducedMotion } from "motion/react";
import { useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";

/** Mastery bar: outlined track, flat colour fill. */
export function InkBar({
  p,
  from,
  className,
  estimated = false,
  height = 10,
  color = "var(--color-ink)",
}: {
  p: number;
  from?: number;
  className?: string;
  estimated?: boolean;
  height?: number;
  color?: string;
}) {
  return (
    <div
      className={cn("relative w-full overflow-hidden rounded-full border-[1.5px] border-line bg-white", className)}
      style={{ height }}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(p * 100)}
    >
      {from !== undefined && from > p && (
        <div
          className="absolute inset-y-0 left-0"
          style={{
            width: `${from * 100}%`,
            background: "repeating-linear-gradient(135deg, var(--color-redpen) 0 3px, transparent 3px 7px)",
            opacity: 0.55,
          }}
        />
      )}
      <div
        className={cn("absolute inset-y-0 left-0 border-r-[1.5px] border-line transition-[width] duration-700 ease-out", estimated && "opacity-50")}
        style={{ width: `${Math.max(2, p * 100)}%`, background: color }}
      />
    </div>
  );
}

/**
 * Overall mastery: a round flask filling with blue, with a gently moving surface.
 * On mount it fills from `from` (default empty) up to `p`, and later changes of `p` animate from the current level.
 */
export function InkWell({ p, size = 112, caption, from = 0 }: { p: number; size?: number; caption?: string; from?: number }) {
  const uid = useId().replace(/:/g, "");
  const reduce = useReducedMotion();
  const last = useRef(reduce ? p : from);
  const [shown, setShown] = useState(last.current);
  useEffect(() => {
    if (reduce) {
      last.current = p;
      setShown(p);
      return;
    }
    const c = animate(last.current, p, {
      duration: 1.4,
      delay: 0.15,
      ease: [0.2, 0.8, 0.2, 1],
      onUpdate: (v) => {
        last.current = v;
        setShown(v);
      },
    });
    return () => c.stop();
  }, [p, reduce]);
  const r = size / 2;
  const level = size - Math.max(0.06, Math.min(0.97, shown)) * size;
  const w = size * 2;
  const wave = `M0,${level} C${w * 0.125},${level - 6} ${w * 0.375},${level + 6} ${w * 0.5},${level} S${w * 0.875},${level - 6} ${w},${level} L${w},${size} L0,${size} Z`;
  return (
    <div className="relative shrink-0" style={{ width: size + 6 }}>
      <div className="relative" style={{ width: size, height: size }}>
        <div className="absolute left-[5px] top-[5px] rounded-full bg-line" style={{ width: size, height: size }} aria-hidden />
        <svg className="relative" width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`Overall mastery ${Math.round(p * 100)}%`}>
          <defs>
            <clipPath id={`c${uid}`}>
              <circle cx={r} cy={r} r={r - 2} />
            </clipPath>
          </defs>
          <circle cx={r} cy={r} r={r - 1} fill="#ffffff" />
          <g clipPath={`url(#c${uid})`}>
            <g transform="translate(0,5)">
              <path d={wave} fill="#8ea2ff" style={{ transformBox: "fill-box", animation: "ink-wave 7s linear infinite reverse" }} />
            </g>
            <path d={wave} fill="var(--color-ink)" style={{ transformBox: "fill-box", animation: "ink-wave 5s linear infinite" }} />
          </g>
          <circle cx={r} cy={r} r={r - 1.5} fill="none" stroke="var(--color-line)" strokeWidth={3} />
          <path d={`M${r * 0.45},${r * 0.62} A${r * 0.6},${r * 0.6} 0 0 1 ${r * 0.85},${r * 0.32}`} fill="none" stroke="#ffffff" strokeWidth={4} strokeLinecap="round" opacity={0.9} />
        </svg>
        <div className="absolute inset-0 grid place-items-center">
          <span
            className="display tabular rounded-[10px] border-2 border-line bg-white px-2 py-0.5 text-[22px] font-extrabold leading-none text-navy"
          >
            {Math.round(shown * 100)}%
          </span>
        </div>
      </div>
      {caption && <p className="mt-2.5 text-center text-[12.5px] font-bold text-slate">{caption}</p>}
    </div>
  );
}

/**
 * Chapter progress: chunky outlined tube in the chapter's colour.
 * The fill sweeps in after `delay` ms (InkBar's width transition does the sweep); the % label always shows the final value.
 */
export function InkTube({
  label,
  p,
  color = "var(--color-ink)",
  delay,
}: {
  label: string;
  p: number;
  color?: string;
  delay?: number;
}) {
  const reduce = useReducedMotion();
  const [shown, setShown] = useState(reduce ? p : 0);
  useEffect(() => {
    if (reduce) {
      setShown(p);
      return;
    }
    const t = setTimeout(() => setShown(p), delay ?? 0);
    return () => clearTimeout(t);
  }, [p, delay, reduce]);
  return (
    <div className="grid min-w-[120px] flex-1 gap-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[13.5px] font-bold text-navy">{label}</span>
        <span className="tabular text-[13px] font-extrabold text-navy">{Math.round(p * 100)}%</span>
      </div>
      <InkBar p={shown} color={color} height={12} />
    </div>
  );
}

/** A small round glyph that fills from the bottom: the concept dot, reusable inline. */
export function InkDot({
  p,
  size = 14,
  estimated = false,
  unseen = false,
  color = "var(--color-ink)",
}: {
  p: number;
  size?: number;
  estimated?: boolean;
  unseen?: boolean;
  color?: string;
}) {
  const r = size / 2;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden className="shrink-0">
      <circle cx={r} cy={r} r={r - 1} fill="#fff" stroke="var(--color-line)" strokeOpacity={unseen ? 0.45 : 1} strokeWidth={1.5} strokeDasharray={unseen ? "2 2" : undefined} />
      {!unseen && (
        <rect
          x={2}
          y={2}
          width={size - 4}
          height={size - 4}
          rx={r}
          fill={color}
          opacity={estimated ? 0.45 : 1}
          style={{ transformBox: "fill-box", transformOrigin: "bottom", transform: `scaleY(${p})`, transition: "transform 700ms ease-out" }}
        />
      )}
    </svg>
  );
}
