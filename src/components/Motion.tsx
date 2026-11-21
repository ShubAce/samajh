"use client";

import { animate, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const EASE_OUT = [0.2, 0.8, 0.2, 1] as const;

/** Fades and lifts its children in the first time they scroll into view. */
export function Reveal({
  children,
  className,
  delay = 0,
  as: As = "div",
}: {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  as?: "div" | "section" | "li";
}) {
  const ref = useRef<HTMLElement | null>(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return (
    <As
      ref={ref as never}
      className={cn("transition-[opacity,transform,translate] duration-700 ease-[cubic-bezier(.2,.8,.2,1)]", shown ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0", className)}
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </As>
  );
}

/** Counts up to a number when it scrolls into view. */
export function CountUp({ to, duration = 1200, className }: { to: number; duration?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const [v, setV] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    const run = () => {
      const t0 = performance.now();
      const tick = (t: number) => {
        const k = Math.min(1, (t - t0) / duration);
        setV(Math.round(to * (1 - Math.pow(1 - k, 3))));
        if (k < 1) raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };
    const io = new IntersectionObserver((es) => {
      if (es.some((e) => e.isIntersecting)) {
        run();
        io.disconnect();
      }
    });
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [to, duration]);
  return (
    <span ref={ref} className={cn("tabular", className)}>
      {v}
    </span>
  );
}

/**
 * Tweens a 0–1 value from `from` to `to` and shows it as a percentage, e.g. 53% → 22%.
 * Screen readers get the final value once; reduced motion shows it at once.
 */
export function TweenNumber({
  from,
  to,
  delay = 0,
  duration = 0.9,
  className,
}: {
  from: number;
  to: number;
  /** seconds */
  delay?: number;
  /** seconds */
  duration?: number;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const [v, setV] = useState(reduce ? to : from);
  useEffect(() => {
    if (reduce) {
      setV(to);
      return;
    }
    const c = animate(from, to, { delay, duration, ease: EASE_OUT, onUpdate: setV });
    return () => c.stop();
  }, [from, to, delay, duration, reduce]);
  return (
    <span className={cn("tabular", className)}>
      <span aria-hidden>{Math.round(v * 100)}%</span>
      <span className="sr-only">{Math.round(to * 100)}%</span>
    </span>
  );
}

/** A stopwatch pill counting up in 0.1 s steps from when it mounts (decorative: hidden from screen readers). */
export function Elapsed({ className }: { className?: string }) {
  const [start] = useState(() => performance.now());
  const [ms, setMs] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setMs(performance.now() - start), 100);
    return () => clearInterval(t);
  }, [start]);
  return (
    <span
      aria-hidden
      className={cn(
        "tabular inline-flex h-6 shrink-0 items-center rounded-full border-[1.5px] border-line bg-white px-2 text-[12px] font-extrabold text-navy",
        className,
      )}
    >
      {(ms / 1000).toFixed(1)} s
    </span>
  );
}

const CONFETTI_COLORS = ["#3355ff", "#ffd23f", "#ef4a36", "#109e69", "#b9a2ff", "#ff8a3d"];

/** A short burst of flat confetti from the element's centre (respects reduced motion via global CSS). */
export function ConfettiBurst({ count = 26 }: { count?: number }) {
  const [pieces] = useState(() =>
    Array.from({ length: count }, (_, i) => {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.4;
      const dist = 70 + Math.random() * 90;
      return {
        dx: `${Math.cos(angle) * dist}px`,
        dy: `${Math.sin(angle) * dist - 40}px`,
        rot: `${Math.round(Math.random() * 540 - 270)}deg`,
        color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
        w: 6 + Math.round(Math.random() * 6),
        h: 8 + Math.round(Math.random() * 8),
        delay: Math.round(Math.random() * 120),
      };
    }),
  );
  return (
    <span aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 z-20">
      {pieces.map((p, i) => (
        <span
          key={i}
          className="absolute rounded-[2px] border border-line"
          style={
            {
              width: p.w,
              height: p.h,
              background: p.color,
              "--dx": p.dx,
              "--dy": p.dy,
              "--rot": p.rot,
              animation: `confetti 900ms cubic-bezier(.15,.7,.3,1) ${p.delay}ms forwards`,
            } as React.CSSProperties
          }
        />
      ))}
    </span>
  );
}
