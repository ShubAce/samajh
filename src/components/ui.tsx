"use client";

import Link from "next/link";
import { forwardRef } from "react";
import { cn } from "@/lib/utils";

type Variant = "ink" | "outline" | "quiet" | "highlight" | "danger";
type Size = "sm" | "md" | "lg";

// Every solid button is a physical key: outline + offset shadow, it lifts on hover and presses in on click.
const press =
  "border-2 border-line shadow-[3px_3px_0_var(--color-line)] hover:-translate-x-px hover:-translate-y-px hover:shadow-[4px_4px_0_var(--color-line)] active:translate-x-[2px] active:translate-y-[2px] active:shadow-[1px_1px_0_var(--color-line)]";

const variants: Record<Variant, string> = {
  ink: "btn-glow text-white",
  outline: `bg-white text-navy ${press}`,
  quiet: "bg-transparent text-slate hover:text-navy hover:bg-navy/5",
  highlight: `bg-highlight text-navy ${press}`,
  danger: `bg-redpen-wash text-redpen ${press}`,
};
const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-[13.5px] gap-1.5 rounded-[11px]",
  md: "h-11 px-4 text-[15px] gap-2 rounded-[12px]",
  lg: "h-[52px] px-6 text-[16px] gap-2.5 rounded-[14px]",
};

const base =
  "inline-flex items-center justify-center font-bold whitespace-nowrap transition-[transform,box-shadow,background-color,color] duration-150 disabled:opacity-40 disabled:pointer-events-none select-none";

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

/** The house card: white, crisp outline, solid offset shadow. */
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
    neutral: "bg-white text-navy",
    ink: "bg-ink-soft text-ink-deep",
    red: "bg-redpen-wash text-redpen",
    good: "bg-good-wash text-good",
    highlight: "bg-highlight text-navy",
  };
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 rounded-full border-[1.5px] border-line px-2.5 text-[12px] font-bold",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("animate-spin size-4", className)} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Section kicker: a small outlined tag */
export function Kicker({ children, className, tone = "white" }: { children: React.ReactNode; className?: string; tone?: "white" | "yellow" | "blue" | "lilac" }) {
  const tones = { white: "bg-white", yellow: "bg-highlight", blue: "bg-ink-soft", lilac: "bg-lilac" };
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-full border-2 border-line px-3 py-1 text-[13px] font-bold text-navy shadow-[2px_2px_0_var(--color-line)]",
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
