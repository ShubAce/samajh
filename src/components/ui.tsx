"use client";

import Link from "next/link";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "ink" | "outline" | "quiet" | "highlight" | "danger";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  ink: "bg-ink text-white hover:bg-[#1a32a0] active:bg-[#162b8a] shadow-[0_1px_0_#0f1e66,0_2px_6px_-2px_rgba(31,59,179,.5)]",
  outline: "bg-white text-navy border border-navy/20 hover:border-navy/45 hover:bg-ink-wash",
  quiet: "bg-transparent text-navy hover:bg-navy/5",
  highlight: "bg-highlight text-navy hover:bg-[#ffdc2e] shadow-[0_1px_0_#d9b800]",
  danger: "bg-white text-redpen border border-redpen/40 hover:bg-redpen-wash",
};
const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13.5px] gap-1.5 rounded-[9px]",
  md: "h-10 px-4 text-[15px] gap-2 rounded-[11px]",
  lg: "h-12 px-5 text-[16.5px] gap-2.5 rounded-[13px]",
};

const base =
  "inline-flex items-center justify-center font-semibold whitespace-nowrap transition-colors disabled:opacity-45 disabled:pointer-events-none select-none";

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

/** A sheet of paper: the main surface. Radius and edge differ by hierarchy, not one-size-fits-all. */
export function Sheet({
  className,
  children,
  as: As = "section",
  ...rest
}: { className?: string; children: React.ReactNode; as?: "section" | "div" | "article" | "aside" } & React.HTMLAttributes<HTMLElement>) {
  return (
    <As
      className={cn(
        "bg-sheet border border-rule rounded-[14px] shadow-[0_1px_0_rgba(22,32,74,.04),0_12px_30px_-22px_rgba(22,32,74,.35)]",
        className,
      )}
      {...rest}
    >
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
    neutral: "bg-navy/[.06] text-slate",
    ink: "bg-ink-soft text-ink",
    red: "bg-redpen-wash text-redpen",
    good: "bg-good-wash text-good",
    highlight: "bg-highlight-wash text-navy",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2.5 h-6 text-[12.5px] font-semibold", tones[tone], className)}>
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
