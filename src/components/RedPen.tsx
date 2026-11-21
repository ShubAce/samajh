"use client";

import { cn } from "@/lib/utils";

/**
 * The red pen: a hand-drawn loop around the student's own words, drawn like a teacher marking a notebook.
 * Red is reserved for misconceptions everywhere in the product.
 */
export function RedPenCircle({
  children,
  className,
  delay = 0,
  animate = true,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  animate?: boolean;
}) {
  return (
    <span className={cn("relative inline-block", className)}>
      <span className="relative z-10">{children}</span>
      {/* the loop circumscribes the phrase box (an inscribed ellipse would cut through its corners) */}
      <span
        aria-hidden
        className="pointer-events-none absolute"
        style={{ left: "calc(-6% - 7px)", right: "calc(-6% - 7px)", top: "calc(-34% - 6px)", bottom: "calc(-34% - 6px)" }}
      >
      <svg
        className="block h-full w-full overflow-visible"
        viewBox="0 0 200 60"
        preserveAspectRatio="none"
        style={{ filter: "drop-shadow(0 0 5px rgba(255,92,124,.75))" }}
      >
        <path
          d="M30 44 C 10 34, 14 12, 70 7 C 130 2, 196 10, 194 31 C 192 52, 120 58, 72 55 C 26 52, 4 42, 9 27 C 13 16, 34 9, 58 8"
          fill="none"
          stroke="var(--color-redpen)"
          strokeWidth={1.7}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
          style={
            animate
              ? ({ strokeDasharray: 1, strokeDashoffset: 1, animation: `draw 950ms cubic-bezier(.65,0,.35,1) ${delay}ms forwards` } as React.CSSProperties)
              : undefined
          }
        />
      </svg>
      </span>
    </span>
  );
}

/** Circle short phrases; underline long ones (a loop around a long line looks like a scribble). */
export function RedPenMark({ children, text, delay = 0 }: { children: React.ReactNode; text: string; delay?: number }) {
  return text.length > 44 ? <RedPenUnderline delay={delay}>{children}</RedPenUnderline> : <RedPenCircle delay={delay}>{children}</RedPenCircle>;
}

/** Red-pen underline (for shorter marks, e.g. inside running text) */
export function RedPenUnderline({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <span className="relative inline">
      {children}
      <svg
        aria-hidden
        className="pointer-events-none absolute left-0 -bottom-1.5 h-2 w-full overflow-visible"
        viewBox="0 0 100 8"
        preserveAspectRatio="none"
        style={{ filter: "drop-shadow(0 0 4px rgba(255,92,124,.8))" }}
      >
        <path
          d="M2 5 C 20 2, 40 7, 60 4 S 90 3, 98 5"
          fill="none"
          stroke="var(--color-redpen)"
          strokeWidth={2.2}
          strokeLinecap="round"
          pathLength={1}
          style={{ strokeDasharray: 1, strokeDashoffset: 1, animation: `draw 700ms ease-out ${delay}ms forwards` } as React.CSSProperties}
        />
      </svg>
    </span>
  );
}

/** A note in the margin, written in red pen */
export function MarginNote({ children, className, delay = 600 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <p
      className={cn("hand text-redpen text-[19px] leading-snug opacity-0", className)}
      style={{ animation: `write 700ms ease-out ${delay}ms forwards`, textShadow: "0 0 18px rgba(255,92,124,.45)" }}
    >
      {children}
    </p>
  );
}

/** Student handwriting (blue ink) */
export function Handwriting({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("hand text-[#b8c4ff] text-[19px] leading-relaxed", className)}>{children}</span>;
}
