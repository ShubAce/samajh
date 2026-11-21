"use client";

import { useMemo, useState } from "react";
import { CHAPTERS, CONCEPTS, CONCEPT_BY_ID, ancestorsOf, depthOf } from "@/lib/curriculum/concepts";
import { BKT } from "@/lib/engine/learner";
import { useMisconceptionDef } from "@/lib/store";
import type { ConceptState, StudentMisconception } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Layout {
  pos: Record<string, { x: number; y: number }>;
  lanes: { id: string; label: string; top: number; height: number }[];
  width: number;
  height: number;
  r: number;
}

function computeLayout(compact: boolean): Layout {
  const COL_W = compact ? 54 : 168;
  const ROW_H = compact ? 21 : 44;
  const LANE_GAP = compact ? 18 : 34;
  const LEFT = compact ? 16 : 26;
  const TOP = compact ? 22 : 40;
  const r = compact ? 6.5 : 11.5;
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
      // mark the concept where the misconception does the most damage (lowest mastery)
      const target = [...def.conceptIds].sort((a, b) => (states[a]?.p ?? BKT.pInit) - (states[b]?.p ?? BKT.pInit))[0];
      if (target) set.add(target);
    }
    return set;
  }, [misconceptions, states, lookup]);

  const pulseSet = useMemo(() => new Set(pulse), [pulse]);

  return (
    <div className={cn("relative", className)}>
      <svg
        viewBox={`0 0 ${L.width} ${L.height}`}
        className="block h-auto w-full"
        role="img"
        aria-label="Concept map of Class 10 Physics with your mastery of each concept"
      >
        {/* lanes */}
        {L.lanes.map((lane, i) => (
          <g key={lane.id}>
            {i > 0 && (
              <line
                x1={0}
                x2={L.width}
                y1={lane.top - (compact ? 10 : 18)}
                y2={lane.top - (compact ? 10 : 18)}
                stroke="var(--color-navy)"
                strokeOpacity={0.08}
                strokeDasharray="4 5"
              />
            )}
            <text
              x={compact ? 2 : 4}
              y={lane.top - (compact ? 6 : 13)}
              className="fill-slate"
              style={{ fontSize: compact ? 8.5 : 13.5, fontWeight: 650, fontVariationSettings: '"wdth" 112' }}
            >
              {lane.label}
            </text>
          </g>
        ))}

        {/* edges */}
        {CONCEPTS.flatMap((c) =>
          c.prereqs.map((p) => {
            const a = L.pos[p];
            const b = L.pos[c.id];
            if (!a || !b) return null;
            const x1 = a.x + L.r;
            const x2 = b.x - L.r;
            const dx = Math.max(16, (x2 - x1) / 2);
            const onChain = active && (c.id === active || chain.has(c.id)) && (chain.has(p) || p === active);
            return (
              <path
                key={`${p}->${c.id}`}
                d={`M${x1},${a.y} C${x1 + dx},${a.y} ${x2 - dx},${b.y} ${x2},${b.y}`}
                fill="none"
                stroke={onChain ? "var(--color-ink)" : "var(--color-navy)"}
                strokeOpacity={onChain ? 0.75 : 0.13}
                strokeWidth={onChain ? (compact ? 1.4 : 1.8) : compact ? 0.8 : 1.1}
                style={{ transition: "stroke-opacity 200ms" }}
              />
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
          const labelW = label.length * (compact ? 0 : 7.9);
          const r = L.r;
          return (
            <g
              key={c.id}
              transform={`translate(${x},${y})`}
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
            >
              <title>{`${c.title} — ${checked ? `${Math.round(p * 100)}% mastery` : estimated ? `estimated ${Math.round(p * 100)}% (not asked directly)` : "not checked yet"}`}</title>
              {!compact && isSel && (
                <rect x={r + 3} y={-12} width={labelW + 12} height={24} rx={6} fill="var(--color-highlight)" opacity={0.85} />
              )}
              {isFocus && (
                <circle r={r + (compact ? 4 : 6)} fill="none" stroke="var(--color-highlight)" strokeWidth={compact ? 3 : 5} opacity={0.95} />
              )}
              {pulseSet.has(c.id) && (
                <circle
                  r={r}
                  fill="none"
                  stroke="var(--color-ink)"
                  strokeWidth={2}
                  style={{ transformBox: "fill-box", transformOrigin: "center", animation: "ping-once 1100ms ease-out 1" }}
                />
              )}
              <circle
                r={r}
                fill="white"
                stroke="var(--color-ink)"
                strokeOpacity={unseen ? 0.35 : 0.9}
                strokeWidth={compact ? 1.1 : 1.5}
                strokeDasharray={unseen || estimated ? (compact ? "2 2" : "3 3") : undefined}
              />
              {!unseen && (
                <rect
                  x={-r + 2}
                  y={-r + 2}
                  width={2 * r - 4}
                  height={2 * r - 4}
                  rx={r}
                  fill="var(--color-ink)"
                  opacity={estimated ? 0.38 : 1}
                  style={{
                    transformBox: "fill-box",
                    transformOrigin: "bottom",
                    transform: `scaleY(${Math.max(0.04, p)})`,
                    transition: "transform 800ms cubic-bezier(.2,.8,.2,1)",
                  }}
                />
              )}
              {!compact && (
                <text
                  x={r + 9}
                  y={5}
                  style={{ fontSize: 15, fontWeight: checked ? 600 : 500 }}
                  className={checked ? "fill-navy" : "fill-slate"}
                >
                  {label}
                </text>
              )}
              {isFlag && (
                <path
                  d={
                    compact
                      ? `M${-r - 3},${r + 1} C${-r - 6},${-r - 4} ${r + 6},${-r - 6} ${r + 4},${0} C${r + 2},${r + 6} ${-r - 2},${r + 6} ${-r - 4},${-2}`
                      : `M${-r - 4},${6} C${-r - 10},${-16} ${r + labelW * 0.6},${-19} ${r + labelW + 18},${-8} C${r + labelW + 28},${4} ${r + labelW},${17} ${r + 30},${17} C${-r},${18} ${-r - 12},${10} ${-r - 6},${-6}`
                  }
                  fill="none"
                  stroke="var(--color-redpen)"
                  strokeWidth={compact ? 1.4 : 2}
                  strokeLinecap="round"
                  pathLength={1}
                  style={{ strokeDasharray: 1, strokeDashoffset: 1, animation: "draw 900ms cubic-bezier(.65,0,.35,1) 200ms forwards" }}
                />
              )}
            </g>
          );
        })}
      </svg>

      {showLegend && (
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2 px-1 text-[13px] text-slate">
          <span className="inline-flex items-center gap-2">
            <svg width="16" height="16" aria-hidden>
              <circle cx="8" cy="8" r="7" fill="white" stroke="var(--color-ink)" strokeOpacity=".35" strokeDasharray="2 2" />
            </svg>
            Not checked yet
          </span>
          <span className="inline-flex items-center gap-2">
            <svg width="16" height="16" aria-hidden>
              <circle cx="8" cy="8" r="7" fill="white" stroke="var(--color-ink)" strokeDasharray="2 2" />
              <rect x="2" y="8" width="12" height="6" rx="3" fill="var(--color-ink)" opacity=".38" />
            </svg>
            Estimated from linked concepts
          </span>
          <span className="inline-flex items-center gap-2">
            <svg width="16" height="16" aria-hidden>
              <circle cx="8" cy="8" r="7" fill="white" stroke="var(--color-ink)" />
              <rect x="2" y="4" width="12" height="10" rx="5" fill="var(--color-ink)" />
            </svg>
            Ink level = mastery
          </span>
          <span className="inline-flex items-center gap-2">
            <svg width="22" height="16" aria-hidden>
              <path d="M3 11 C1 3, 20 1, 20 8 C20 14, 6 15, 2 9" fill="none" stroke="var(--color-redpen)" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            Misconception found
          </span>
        </div>
      )}
    </div>
  );
}
