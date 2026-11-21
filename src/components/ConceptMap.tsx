"use client";

import { useMemo, useState } from "react";
import { CHAPTERS, CHAPTER_BY_ID, CONCEPTS, CONCEPT_BY_ID, ancestorsOf, depthOf, descendantsOf } from "@/lib/curriculum/concepts";
import { BKT } from "@/lib/engine/learner";
import { useMisconceptionDef } from "@/lib/store";
import type { ConceptState, StudentMisconception } from "@/lib/types";
import { cn } from "@/lib/utils";

const LINE = "#17171c";

interface Layout {
  pos: Record<string, { x: number; y: number }>;
  lanes: { id: string; label: string; top: number; height: number }[];
  width: number;
  height: number;
  r: number;
}

function computeLayout(compact: boolean): Layout {
  const COL_W = compact ? 54 : 168;
  const ROW_H = compact ? 21 : 46;
  const LANE_GAP = compact ? 20 : 44;
  const LEFT = compact ? 16 : 26;
  const TOP = compact ? 24 : 50;
  const r = compact ? 6.5 : 12;
  const memo: Record<string, number> = {};
  const pos: Layout["pos"] = {};
  const lanes: Layout["lanes"] = [];
  let top = TOP;
  for (const ch of CHAPTERS) {
    const nodes = CONCEPTS.filter((c) => c.chapter === ch.id);
    const byDepth = new Map<number, typeof nodes>();
    for (const n of nodes) {
      const d = depthOf(n.id, memo);
      byDepth.set(d, [...(byDepth.get(d) ?? []), n]);
    }
    let rows = 1;
    for (const d of [...byDepth.keys()].sort((a, b) => a - b)) {
      const col = byDepth.get(d)!;
      const bary = (id: string) => {
        const ps = CONCEPT_BY_ID[id].prereqs.filter((p) => pos[p]);
        return ps.length ? ps.reduce((s, p) => s + pos[p].y, 0) / ps.length : Infinity;
      };
      col.sort((a, b) => {
        const ba = bary(a.id);
        const bb = bary(b.id);
        return ba === bb ? 0 : ba - bb;
      });
      col.forEach((n, i) => {
        pos[n.id] = { x: LEFT + r + d * COL_W, y: top + r + i * ROW_H };
      });
      rows = Math.max(rows, col.length);
    }
    const height = (rows - 1) * ROW_H + 2 * r;
    lanes.push({ id: ch.id, label: ch.short, top, height });
    top += height + LANE_GAP;
  }
  const maxDepth = Math.max(...CONCEPTS.map((c) => depthOf(c.id, memo)));
  return {
    pos,
    lanes,
    width: LEFT + 2 * r + maxDepth * COL_W + (compact ? 14 : 150),
    height: top - LANE_GAP + (compact ? 10 : 18),
    r,
  };
}

const LAYOUTS: Partial<Record<"full" | "compact", Layout>> = {};
const layoutFor = (compact: boolean) => (LAYOUTS[compact ? "compact" : "full"] ??= computeLayout(compact));
const depthMemo: Record<string, number> = {};

export function ConceptMap({
  states,
  misconceptions = {},
  selected,
  onSelect,
  pulse = [],
  focus,
  compact = false,
  className,
  showLegend = !compact,
}: {
  states: Record<string, ConceptState>;
  misconceptions?: Record<string, StudentMisconception>;
  selected?: string | null;
  onSelect?: (id: string) => void;
  pulse?: string[];
  focus?: string | null;
  compact?: boolean;
  className?: string;
  showLegend?: boolean;
}) {
  const L = layoutFor(compact);
  const [hover, setHover] = useState<string | null>(null);
  const active = hover ?? selected ?? null;
  const chain = useMemo(() => (active ? ancestorsOf(active) : new Map<string, number>()), [active]);

  const lookup = useMisconceptionDef();
  const flagged = useMemo(() => {
    const set = new Set<string>();
    for (const m of Object.values(misconceptions)) {
      if (m.status === "resolved") continue;
      const def = lookup(m.id);
      if (!def) continue;
      const target = [...def.conceptIds].sort((a, b) => (states[a]?.p ?? BKT.pInit) - (states[b]?.p ?? BKT.pInit))[0];
      if (target) set.add(target);
    }
    return set;
  }, [misconceptions, states, lookup]);

  const pulseSet = useMemo(() => new Set(pulse), [pulse]);
  // ripple: pulse[0] is the answered concept; the rest moved through the prerequisite graph
  const src = pulse[0] ?? null;
  const srcAnc = useMemo(() => (src ? ancestorsOf(src) : new Map<string, number>()), [src]);
  const srcDesc = useMemo(() => (src ? descendantsOf(src) : new Map<string, number>()), [src]);

  return (
    <div className={cn("relative", className)}>
      <svg
        viewBox={`0 0 ${L.width} ${L.height}`}
        className="block h-auto w-full"
        role="img"
        aria-label="Concept map of Class 10 Physics with your mastery of each concept"
      >
        {/* lanes: coloured chapter tags */}
        {L.lanes.map((lane, i) => {
          const ch = CHAPTER_BY_ID[lane.id as keyof typeof CHAPTER_BY_ID];
          const tagW = compact ? lane.label.length * 5.2 + 10 : lane.label.length * 8 + 22;
          const tagH = compact ? 12 : 22;
          const ty = lane.top - (compact ? 19 : 38);
          return (
            <g key={lane.id}>
              {i > 0 && (
                <line
                  x1={0}
                  x2={L.width}
                  y1={lane.top - (compact ? 22 : 44) + (compact ? 1 : 2)}
                  y2={lane.top - (compact ? 22 : 44) + (compact ? 1 : 2)}
                  stroke={LINE}
                  strokeOpacity={0.12}
                  strokeDasharray="2 6"
                />
              )}
              <rect x={compact ? 2 : 4} y={ty} width={tagW} height={tagH} rx={tagH / 2} fill={ch.color} stroke={LINE} strokeWidth={compact ? 1.2 : 2} />
              <text
                x={(compact ? 2 : 4) + tagW / 2}
                y={ty + tagH / 2 + (compact ? 3 : 5)}
                textAnchor="middle"
                fill={lane.id === "electricity" ? "#ffffff" : LINE}
                style={{ fontSize: compact ? 8 : 13, fontWeight: 800 }}
              >
                {lane.label}
              </text>
            </g>
          );
        })}

        {/* edges */}
        {CONCEPTS.flatMap((c) =>
          c.prereqs.map((p) => {
            const a = L.pos[p];
            const b = L.pos[c.id];
            if (!a || !b) return null;
            const x1 = a.x + L.r;
            const x2 = b.x - L.r;
            const dx = Math.max(16, (x2 - x1) / 2);
            const d = `M${x1},${a.y} C${x1 + dx},${a.y} ${x2 - dx},${b.y} ${x2},${b.y}`;
            const onChain = !!active && (c.id === active || chain.has(c.id)) && (chain.has(p) || p === active);
            // an answer's ripple: back along its prerequisites (up) and forward to its dependents (down)
            const up = pulseSet.has(p) && srcAnc.has(p) && (c.id === src || (srcAnc.has(c.id) && pulseSet.has(c.id)));
            const down = pulseSet.has(c.id) && srcDesc.has(c.id) && (p === src || (srcDesc.has(p) && pulseSet.has(p)));
            const ripple = !onChain && (up || down);
            const lit = onChain || ripple;
            return (
              <g key={`${p}->${c.id}`}>
                <path
                  d={d}
                  fill="none"
                  stroke={lit ? "#3355ff" : LINE}
                  strokeOpacity={lit ? 1 : 0.17}
                  strokeWidth={onChain ? (compact ? 1.8 : 3) : ripple ? (compact ? 1.6 : 2.6) : compact ? 0.9 : 1.3}
                  style={{ transition: "stroke-opacity 200ms" }}
                />
                {lit && (
                  // dash period 11 divides current-flow's -44 offset, so the loop is seamless
                  <path
                    d={d}
                    fill="none"
                    stroke="#ffd23f"
                    strokeWidth={compact ? 2 : 3.5}
                    strokeLinecap="round"
                    strokeDasharray="0.1 10.9"
                    style={{
                      animation: onChain
                        ? "current-flow 1.1s linear infinite"
                        : `current-flow 0.9s linear infinite ${up ? "reverse" : "normal"}`,
                    }}
                  />
                )}
              </g>
            );
          }),
        )}

        {/* nodes */}
        {CONCEPTS.map((c) => {
          const { x, y } = L.pos[c.id];
          const st = states[c.id];
          const p = st?.p ?? BKT.pInit;
          const checked = (st?.attempts ?? 0) > 0;
          const estimated = !checked && Math.abs(p - BKT.pInit) > 0.01;
          const unseen = !checked && !estimated;
          const isSel = selected === c.id;
          const isFocus = focus === c.id;
          const isFlag = flagged.has(c.id);
          const label = c.short;
          const labelW = label.length * (compact ? 0 : 7.7);
          const r = L.r;
          const color = CHAPTER_BY_ID[c.chapter].color;
          const delay = 60 + depthOf(c.id, depthMemo) * 110 + (y % 7) * 12;
          // graph distance from the answered concept: the ripple reaches nearer concepts first
          const dist = c.id === src ? 0 : (srcAnc.get(c.id) ?? srcDesc.get(c.id) ?? 1);
          return (
            <g key={c.id} data-concept={c.id} transform={`translate(${x},${y})`}>
              <g
                className={cn(onSelect && "cursor-pointer outline-none")}
                tabIndex={onSelect ? 0 : -1}
                role={onSelect ? "button" : undefined}
                aria-label={`${c.title}: ${checked ? `${Math.round(p * 100)}% mastery` : estimated ? `estimated ${Math.round(p * 100)}%` : "not checked yet"}${isFlag ? ", misconception detected" : ""}`}
                onClick={() => onSelect?.(c.id)}
                onKeyDown={(e) => {
                  if (onSelect && (e.key === "Enter" || e.key === " ")) {
                    e.preventDefault();
                    onSelect(c.id);
                  }
                }}
                onMouseEnter={() => setHover(c.id)}
                onMouseLeave={() => setHover(null)}
                style={{ transformBox: "fill-box", transformOrigin: "center", animation: `node-in 420ms cubic-bezier(.2,.9,.3,1.3) ${delay}ms both` }}
              >
                <title>{`${c.title}: ${checked ? `${Math.round(p * 100)}% mastery` : estimated ? `estimated ${Math.round(p * 100)}% (not asked directly)` : "not checked yet"}`}</title>
                {!compact && isSel && (
                  <rect x={r + 4} y={-14} width={labelW + 16} height={28} rx={8} fill="#ffd23f" stroke={LINE} strokeWidth={2} />
                )}
                {isFocus && (
                  <circle
                    r={r + (compact ? 4 : 6)}
                    fill="#ffd23f"
                    stroke={LINE}
                    strokeWidth={compact ? 1.2 : 2}
                    style={{ animation: "pulse-ring 1.4s ease-in-out infinite" }}
                  />
                )}
                {pulseSet.has(c.id) && (
                  <circle
                    r={r}
                    fill="none"
                    stroke="#3355ff"
                    strokeWidth={2.5}
                    style={{ transformBox: "fill-box", transformOrigin: "center", animation: `ping-once 900ms ease-out ${dist * 140}ms 1 backwards` }}
                  />
                )}
                {checked && !compact && <circle cx={2.5} cy={2.5} r={r} fill={LINE} />}
                <circle
                  r={r}
                  fill="#ffffff"
                  stroke={LINE}
                  strokeOpacity={unseen ? 0.4 : 1}
                  strokeWidth={compact ? 1.2 : 2}
                  strokeDasharray={unseen || estimated ? (compact ? "2 2" : "3.5 3") : undefined}
                />
                {!unseen && (
                  <rect
                    x={-r + 2.5}
                    y={-r + 2.5}
                    width={2 * r - 5}
                    height={2 * r - 5}
                    rx={r}
                    fill={color}
                    opacity={estimated ? 0.45 : 1}
                    style={{
                      transformBox: "fill-box",
                      transformOrigin: "bottom",
                      transform: `scaleY(${Math.max(0.04, p)})`,
                      transition: `transform 800ms cubic-bezier(.2,.8,.2,1) ${pulseSet.has(c.id) ? dist * 140 : 0}ms`,
                    }}
                  />
                )}
                {!compact && (
                  // a paper-coloured halo (painted under the fill) lets traced edges pass behind the label, not through it
                  <text
                    x={r + 11}
                    y={5}
                    fill={checked ? LINE : "#8b8e9f"}
                    stroke={isSel ? "#ffd23f" : "#ffffff"}
                    strokeWidth={5}
                    strokeLinejoin="round"
                    style={{ fontSize: 14.5, fontWeight: checked ? 750 : 550, paintOrder: "stroke" }}
                  >
                    {label}
                  </text>
                )}
                {isFlag && (
                  <path
                    d={
                      compact
                        ? `M${-r - 3},${r + 1} C${-r - 6},${-r - 4} ${r + 6},${-r - 6} ${r + 4},${0} C${r + 2},${r + 6} ${-r - 2},${r + 6} ${-r - 4},${-2}`
                        : `M${-r - 4},${6} C${-r - 10},${-18} ${r + labelW * 0.6},${-21} ${r + labelW + 22},${-8} C${r + labelW + 32},${4} ${r + labelW},${19} ${r + 30},${19} C${-r},${20} ${-r - 12},${10} ${-r - 6},${-6}`
                    }
                    fill="none"
                    stroke="#ef4a36"
                    strokeWidth={compact ? 1.6 : 2.6}
                    strokeLinecap="round"
                    pathLength={1}
                    style={{ strokeDasharray: 1, strokeDashoffset: 1, animation: `draw 900ms cubic-bezier(.65,0,.35,1) ${delay + 500}ms forwards` }}
                  />
                )}
              </g>
            </g>
          );
        })}
      </svg>

      {showLegend && (
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 px-1 text-[12.5px] font-semibold text-slate">
          {focus && !compact && (
            <span className="inline-flex items-center gap-2">
              <svg width="16" height="16" aria-hidden>
                <circle cx="8" cy="8" r="6.5" fill="#ffd23f" stroke={LINE} strokeWidth="1.5" />
              </svg>
              Your next step
            </span>
          )}
          <span className="inline-flex items-center gap-2">
            <svg width="16" height="16" aria-hidden>
              <circle cx="8" cy="8" r="6.5" fill="#fff" stroke={LINE} strokeOpacity=".4" strokeWidth="1.5" strokeDasharray="2 2" />
            </svg>
            Not checked yet
          </span>
          <span className="inline-flex items-center gap-2">
            <svg width="16" height="16" aria-hidden>
              <circle cx="8" cy="8" r="6.5" fill="#fff" stroke={LINE} strokeWidth="1.5" strokeDasharray="2 2" />
              <rect x="3" y="8" width="10" height="5" rx="2.5" fill="#3355ff" opacity=".45" />
            </svg>
            Estimated
          </span>
          <span className="inline-flex items-center gap-2">
            <svg width="16" height="16" aria-hidden>
              <circle cx="8" cy="8" r="6.5" fill="#fff" stroke={LINE} strokeWidth="1.5" />
              <rect x="3" y="5" width="10" height="8" rx="4" fill="#3355ff" />
            </svg>
            Fill = mastery
          </span>
          <span className="inline-flex items-center gap-2">
            <svg width="22" height="16" aria-hidden>
              <path d="M3 11 C1 3, 20 1, 20 8 C20 14, 6 15, 2 9" fill="none" stroke="#ef4a36" strokeWidth="2" strokeLinecap="round" />
            </svg>
            Misconception found
          </span>
          <span className="inline-flex items-center gap-2">
            <svg width="26" height="10" aria-hidden>
              <line x1="2" y1="5" x2="24" y2="5" stroke="#3355ff" strokeWidth="3" />
              <line x1="2" y1="5" x2="24" y2="5" stroke="#ffd23f" strokeWidth="3" strokeDasharray="0.1 8" strokeLinecap="round" />
            </svg>
            Hover a concept to trace its prerequisites
          </span>
        </div>
      )}
    </div>
  );
}
