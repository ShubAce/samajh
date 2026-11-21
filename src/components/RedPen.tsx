"use client";

import { Check } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
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
  tight = false,
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  animate?: boolean;
  /** smaller vertical overshoot, for large headline words */
  tight?: boolean;
}) {
  return (
    // non-tight loops get a little side margin, so the neighbouring words sit outside the loop
    <span className={cn("relative inline-block", !tight && "mx-2.5", className)}>
      <span className="relative z-10">{children}</span>
      {/* the loop circumscribes the phrase box (an inscribed ellipse would cut through its corners) */}
      <span
        aria-hidden
        className="pointer-events-none absolute"
        style={
          tight
            ? { left: "calc(-9% - 6px)", right: "calc(-9% - 6px)", top: "calc(-6% - 2px)", bottom: "calc(-10% - 2px)" }
            : { left: "calc(-5% - 7px)", right: "calc(-5% - 7px)", top: "calc(-34% - 6px)", bottom: "calc(-34% - 6px)" }
        }
      >
      <svg
        className="block h-full w-full overflow-visible"
        viewBox="0 0 200 60"
        preserveAspectRatio="none"
      >
        <path
          d="M30 44 C 10 34, 14 12, 70 7 C 130 2, 196 10, 194 31 C 192 52, 120 58, 72 55 C 26 52, 4 42, 9 27 C 13 16, 34 9, 58 8"
          fill="none"
          stroke="var(--color-redpen)"
          strokeWidth={2.4}
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

/** a hand-drawn red stroke, stretched to each line of an underlined phrase (stroke width stays fixed) */
const UNDERLINE_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 8" preserveAspectRatio="none"><path d="M1 5.2 C 18 2.6, 36 6.6, 55 4.2 S 88 3, 99 5" fill="none" stroke="#ef4a36" stroke-width="2.3" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>';
const UNDERLINE_BG = `url("data:image/svg+xml,${encodeURIComponent(UNDERLINE_SVG)}")`;

/**
 * Red-pen underline for long phrases. The stroke is a background cloned onto every line fragment, so a quote
 * that wraps is underlined on every line it covers, and each line's stroke is drawn in from the left.
 */
export function RedPenUnderline({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  return (
    <span
      className="inline"
      style={{
        backgroundImage: UNDERLINE_BG,
        backgroundRepeat: "no-repeat",
        backgroundPosition: "0 100%",
        backgroundSize: "100% 8px",
        paddingBottom: 5,
        WebkitBoxDecorationBreak: "clone",
        boxDecorationBreak: "clone",
        animation: `pen-underline 800ms cubic-bezier(.65,0,.35,1) ${delay}ms both`,
      }}
    >
      {children}
    </span>
  );
}

/** A note in the margin, written in red pen */
export function MarginNote({ children, className, delay = 600 }: { children: React.ReactNode; className?: string; delay?: number }) {
  return (
    <p
      className={cn("hand text-redpen text-[19px] leading-snug opacity-0", className)}
      style={{ animation: `write 700ms ease-out ${delay}ms forwards` }}
    >
      {children}
    </p>
  );
}

/** Student handwriting (blue ink) */
export function Handwriting({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("hand text-[#1f3fc9] text-[19px] leading-relaxed", className)}>{children}</span>;
}

/**
 * Progress towards fixing a misconception: one box per trap the student has to beat in a row.
 * Beaten traps are ticked in green; the newest tick pops in.
 */
export function TrapPips({ n, total = 2, size = 20, className }: { n: number; total?: number; size?: number; className?: string }) {
  const filled = Math.max(0, Math.min(total, Math.round(n)));
  return (
    <span role="img" aria-label={`${filled} of ${total} traps beaten`} className={cn("inline-flex shrink-0 items-center gap-1.5", className)}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          className="relative grid shrink-0 place-items-center rounded-[5px] border-2 border-line bg-white"
          style={{ width: size, height: size }}
        >
          {i < filled && (
            <span
              className="absolute inset-0 grid place-items-center rounded-[3px] bg-good text-white"
              style={i === filled - 1 ? { animation: "pop-in 380ms cubic-bezier(.2,.9,.3,1.3) 600ms both" } : undefined}
            >
              <Check size={Math.round(size * 0.62)} strokeWidth={3} aria-hidden />
            </span>
          )}
        </span>
      ))}
    </span>
  );
}

/** A green stroke drawn through its (relative) parent: the misconception crossed out once it is fixed. */
export function StrikeThrough({
  delay = 600,
  duration = 600,
  className,
  style,
}: {
  delay?: number;
  duration?: number;
  className?: string;
  /** position overrides, e.g. to strike one line of a wrapped title */
  style?: React.CSSProperties;
}) {
  return (
    <svg
      aria-hidden
      className={cn("pointer-events-none absolute inset-x-0 top-1/2 h-3 -translate-y-1/2 overflow-visible", className)}
      style={style}
      viewBox="0 0 100 8"
      preserveAspectRatio="none"
    >
      <path
        d="M2 6 C 30 2, 70 9, 98 4"
        fill="none"
        stroke="var(--color-good)"
        strokeWidth={3}
        strokeLinecap="round"
        pathLength={1}
        style={{ strokeDasharray: 1, strokeDashoffset: 1, animation: `draw ${duration}ms ease-out ${delay}ms forwards` } as React.CSSProperties}
      />
    </svg>
  );
}

/** A tilted rubber stamp that slams down once a misconception is fixed (static with reduced motion). */
export function FixedStamp({ delay = 900, className, children = "Fixed" }: { delay?: number; className?: string; children?: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      className={cn(
        "display -rotate-6 inline-block rounded-[10px] border-[3px] border-good bg-white px-3 py-0.5 text-[22px] font-extrabold uppercase text-good shadow-[2px_2px_0_var(--color-good)]",
        className,
      )}
      style={{ letterSpacing: "0.06em" }}
      initial={reduce ? false : { opacity: 0, scale: 1.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{
        scale: { delay: delay / 1000, type: "spring", stiffness: 520, damping: 16, mass: 0.9 },
        opacity: { delay: delay / 1000, duration: 0.12 },
      }}
    >
      {children}
    </motion.span>
  );
}
