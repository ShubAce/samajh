"use client";

import Link from "next/link";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "ink" | "outline" | "quiet" | "highlight" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  ink: "btn-glow text-white",
  outline:
    "bg-surface text-navy border border-white/12 hover:border-white/25 hover:bg-surface-2 backdrop-blur",
  quiet: "bg-transparent text-slate hover:text-navy hover:bg-white/5",
  highlight: "bg-highlight text-[#1b1300] hover:brightness-105 shadow-[0_10px_30px_-12px_rgba(255,194,75,.8)]",
  danger: "bg-redpen-wash text-redpen border border-redpen/35 hover:bg-redpen/15",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5 rounded-[10px]",
  md: "h-10 px-4 text-[14.5px] gap-2 rounded-[12px]",
  lg: "h-12 px-5 text-[15.5px] gap-2.5 rounded-[14px]",
};

const base =
  "inline-flex items-center justify-center font-semibold whitespace-nowrap transition-all duration-200 disabled:opacity-40 disabled:pointer-events-none select-none active:scale-[.98]";

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }
>(function Button({ variant = "ink", size = "md", className, ...props }, ref) {
  return <button ref={ref} className={cn(base, variants[variant], sizes[size], className)} {...props} />;
});

export function ButtonLink({
  href,
  variant = "ink",
  size = "md",
  className,
  children,
  ...rest
}: { href: string; variant?: Variant; size?: Size; className?: string; children: React.ReactNode } & Omit<
  React.AnchorHTMLAttributes<HTMLAnchorElement>,
  "href"
>) {
  return (
    <Link href={href} className={cn(base, variants[variant], sizes[size], className)} {...rest}>
      {children}
    </Link>
  );
}

/** A glass panel: the main surface. */
export function Sheet({
  className,
  children,
  as: As = "section",
  ...rest
}: { className?: string; children: React.ReactNode; as?: "section" | "div" | "article" | "aside" } & React.HTMLAttributes<HTMLElement>) {
  return (
    <As className={cn("glass rounded-[20px]", className)} {...rest}>
      {children}
    </As>
  );
}

export function Pill({
  className,
  children,
  tone = "neutral",
}: {
  className?: string;
  children: React.ReactNode;
  tone?: "neutral" | "ink" | "red" | "good" | "highlight";
}) {
  const tones = {
    neutral: "bg-white/[.06] text-slate ring-1 ring-inset ring-white/10",
    ink: "bg-ink-soft text-[#c9c3ff] ring-1 ring-inset ring-ink/30",
    red: "bg-redpen-wash text-redpen ring-1 ring-inset ring-redpen/30",
    good: "bg-good-wash text-good ring-1 ring-inset ring-good/30",
    highlight: "bg-highlight-wash text-highlight ring-1 ring-inset ring-highlight/30",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 h-6 text-[12px] font-semibold", tones[tone], className)}>
      {children}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("animate-spin size-4", className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".2" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Small uppercase-free section kicker with a glowing dot */
export function Kicker({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 rounded-full bg-white/[.05] px-3 py-1 text-[12.5px] font-semibold text-[#c9c3ff] ring-1 ring-inset ring-white/10", className)}>
      <span className="size-1.5 rounded-full bg-ink-2 shadow-[0_0_10px_2px_rgba(70,211,255,.8)]" />
      {children}
    </span>
  );
}
