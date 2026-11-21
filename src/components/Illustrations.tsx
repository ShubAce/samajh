"use client";

// Hand-drawn physics illustrations in the house style: flat colour, 2–3px black outlines, purposeful motion.
// Motion is always physics: current flowing, light refracting, field lines circulating.

import { cn } from "@/lib/utils";

const LINE = "#17171c";

/** Series circuit with flowing current and two ammeters that read the same: the misconception, disproved. */
export function CircuitIllustration({ className, flowing = true }: { className?: string; flowing?: boolean }) {
  const loop = "M70 150 L70 50 L310 50 L310 150 Z";
  return (
    <svg viewBox="0 0 404 214" className={cn("h-auto w-full", className)} role="img" aria-label="A cell, two bulbs and two ammeters in series. Both ammeters read 0.5 amperes.">
      {/* wires */}
      <path d={loop} fill="none" stroke={LINE} strokeWidth={4} strokeLinejoin="round" />
      {/* current: dots flowing around the loop */}
      {flowing && (
        <path
          d={loop}
          fill="none"
          stroke="#3355ff"
          strokeWidth={6}
          strokeLinecap="round"
          strokeDasharray="0.1 22"
          style={{ animation: "current-flow 1.4s linear infinite" }}
        />
      )}
      {/* cell (left) */}
      <rect x={52} y={84} width={36} height={32} fill="#f3f4f7" stroke="none" />
      <line x1={50} y1={92} x2={90} y2={92} stroke={LINE} strokeWidth={4} />
      <line x1={60} y1={108} x2={80} y2={108} stroke={LINE} strokeWidth={7} />
      <text x={22} y={96} fontSize={15} fontWeight={800} fill={LINE}>+</text>
      <text x={24} y={118} fontSize={15} fontWeight={800} fill={LINE}>−</text>

      {/* bulbs on the top wire */}
      {[150, 240].map((x, i) => (
        <g key={x} transform={`translate(${x},50)`}>
          <circle r={30} fill="#ffd23f" opacity={0.45} style={{ animation: `glow-bulb 2.2s ease-in-out ${i * 0.3}s infinite` }} />
          <circle r={17} fill="#fff6c2" stroke={LINE} strokeWidth={3} />
          <path d="M-8 3 C-4 -8, 4 -8, 8 3" fill="none" stroke={LINE} strokeWidth={2.5} strokeLinecap="round" />
          <rect x={-8} y={14} width={16} height={9} rx={2} fill="#c9ccd6" stroke={LINE} strokeWidth={2.5} />
        </g>
      ))}

      {/* ammeters on the right and bottom: same reading before and after the bulbs */}
      {[
        { x: 310, y: 100, label: "before" },
        { x: 190, y: 150, label: "after" },
      ].map((m) => (
        <g key={m.label} transform={`translate(${m.x},${m.y})`}>
          <circle r={19} fill="#fff" stroke={LINE} strokeWidth={3} />
          <text x={0} y={6} textAnchor="middle" fontSize={17} fontWeight={800} fill={LINE}>A</text>
          <g transform={m.label === "before" ? "translate(26,-12)" : "translate(-30,30)"}>
            <rect x={0} y={0} width={58} height={24} rx={7} fill="#dde4ff" stroke={LINE} strokeWidth={2} />
            <text x={29} y={17} textAnchor="middle" fontSize={13} fontWeight={800} fill={LINE}>0.5 A</text>
          </g>
        </g>
      ))}
    </svg>
  );
}

/** White light into a prism, the spectrum fanning out. */
export function PrismIllustration({ className }: { className?: string }) {
  const colors = ["#8b3dff", "#4b3dff", "#2d7dff", "#14b86a", "#ffd23f", "#ff8a3d", "#ef4a36"];
  return (
    <svg viewBox="0 0 260 170" className={cn("h-auto w-full", className)} role="img" aria-label="A prism splitting white light into a spectrum">
      <path
        d="M10 104 L104 86"
        stroke={LINE}
        strokeWidth={5}
        strokeLinecap="round"
        pathLength={1}
        style={{ strokeDasharray: 1, strokeDashoffset: 1, animation: "draw 700ms ease-out 200ms forwards" }}
      />
      {colors.map((c, i) => (
        <path
          key={c}
          d={`M150 ${84 + i * 2.4} L250 ${42 + i * 16}`}
          stroke={c}
          strokeWidth={6}
          strokeLinecap="round"
          pathLength={1}
          style={{ strokeDasharray: 1, strokeDashoffset: 1, animation: `draw 600ms ease-out ${900 + i * 70}ms forwards` }}
        />
      ))}
      <path d="M128 22 L188 132 L68 132 Z" fill="#e6dcff" stroke={LINE} strokeWidth={3} strokeLinejoin="round" />
      <path d="M108 80 L150 90" stroke="#ffffff" strokeWidth={5} opacity={0.9} />
      <path d="M128 40 L120 56" stroke="#ffffff" strokeWidth={4} strokeLinecap="round" opacity={0.9} />
    </svg>
  );
}

/** Parallel rays converging through a convex lens to the focus. */
export function LensIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 260 170" className={cn("h-auto w-full", className)} role="img" aria-label="A convex lens bringing parallel rays to a focus">
      <line x1={8} y1={85} x2={252} y2={85} stroke={LINE} strokeWidth={1.5} strokeDasharray="4 5" opacity={0.5} />
      {[45, 85, 125].map((y, i) => (
        <path
          key={y}
          d={`M10 ${y} L120 ${y} L205 85`}
          fill="none"
          stroke="#ef4a36"
          strokeWidth={4}
          strokeLinejoin="round"
          strokeLinecap="round"
          pathLength={1}
          style={{ strokeDasharray: 1, strokeDashoffset: 1, animation: `draw 1100ms ease-in-out ${300 + i * 150}ms forwards` }}
        />
      ))}
      <path d="M120 20 C150 50, 150 120, 120 150 C90 120, 90 50, 120 20 Z" fill="#cfe9ff" stroke={LINE} strokeWidth={3} opacity={0.95} />
      <path d="M112 44 C106 62, 106 80, 110 96" stroke="#ffffff" strokeWidth={4} fill="none" strokeLinecap="round" />
      <g transform="translate(205,85)">
        <g style={{ transformBox: "fill-box", transformOrigin: "center", animation: "pop-in 400ms ease-out 1500ms both" }}>
          <circle r={9} fill="#ffd23f" stroke={LINE} strokeWidth={2.5} />
        </g>
      </g>
      <text x={198} y={116} fontSize={14} fontWeight={800} fill={LINE}>F</text>
    </svg>
  );
}

/** Horseshoe magnet; field lines arc from N to S across the gap, flowing in the field direction. */
export function MagnetIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 260 170" className={cn("h-auto w-full", className)} role="img" aria-label="A horseshoe magnet with field lines running from its north pole to its south pole">
      {[0, 1, 2].map((i) => (
        <path
          key={i}
          d={`M90 56 C${90 - i * 6} ${30 - i * 12}, ${170 + i * 6} ${30 - i * 12}, 170 56`}
          fill="none"
          stroke="#3355ff"
          strokeWidth={3}
          strokeLinecap="round"
          strokeDasharray="7 7"
          style={{ animation: `current-flow ${1.5 + i * 0.35}s linear infinite` }}
        />
      ))}
      <path
        d="M70 58 L70 118 C70 166, 190 166, 190 118 L190 58 L150 58 L150 118 C150 134, 110 134, 110 118 L110 58 Z"
        fill="#ef4a36"
        stroke={LINE}
        strokeWidth={3}
        strokeLinejoin="round"
      />
      <path d="M150 58 L190 58 L190 118 C190 144, 172 158, 150 160 L150 128 C150 124, 150 122, 150 118 Z" fill="#3355ff" stroke={LINE} strokeWidth={3} strokeLinejoin="round" />
      <rect x={70} y={58} width={40} height={26} fill="#f3f4f7" stroke={LINE} strokeWidth={3} />
      <rect x={150} y={58} width={40} height={26} fill="#f3f4f7" stroke={LINE} strokeWidth={3} />
      <text x={90} y={77} textAnchor="middle" fontSize={16} fontWeight={900} fill={LINE}>N</text>
      <text x={170} y={77} textAnchor="middle" fontSize={16} fontWeight={900} fill={LINE}>S</text>
    </svg>
  );
}

/** Tiny inline bulb for buttons and badges */
export function BulbGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={cn("size-5", className)} aria-hidden>
      <circle cx={12} cy={10} r={7} fill="#ffd23f" stroke={LINE} strokeWidth={2} />
      <rect x={8.5} y={16} width={7} height={5} rx={1.5} fill="#c9ccd6" stroke={LINE} strokeWidth={2} />
    </svg>
  );
}
