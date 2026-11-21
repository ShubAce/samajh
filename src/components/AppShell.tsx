"use client";

import { GraduationCap, Map as MapIcon, RefreshCcw, UserRound } from "lucide-react";
import { MotionConfig } from "motion/react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useHydrated, useSamajh } from "@/lib/store";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";

/**
 * Loading the demo student replaces whatever is in this browser. A real student who has already answered
 * something is asked first, so a judge who took the diagnostic doesn't lose it by opening the demo.
 */
export function confirmDemoSwitch(): boolean {
  const s = useSamajh.getState();
  if (!s.student || s.isDemo || s.attempts.length === 0) return true;
  try {
    return window.confirm(`Open the demo student, Aarav? This replaces ${s.student.name}'s map in this browser.`);
  } catch {
    return true;
  }
}

export function AppShell({ children, wide = false }: { children: React.ReactNode; wide?: boolean }) {
  const hydrated = useHydrated();
  const pathname = usePathname();
  const student = useSamajh((s) => s.student);
  const isDemo = useSamajh((s) => s.isDemo);

  const links = [
    { href: "/learn", label: "My map", icon: <MapIcon className="size-4" /> },
    { href: "/teacher", label: "Teacher view", icon: <GraduationCap className="size-4" /> },
  ];

  return (
    // overflow-x: clip (not hidden) keeps the sticky header working and stops any stray overflow scrolling the page sideways
    <div className="min-h-dvh overflow-x-clip">
      <header className="sticky top-0 z-40 border-b-2 border-line bg-white">
        <div className={cn("mx-auto flex h-[68px] items-center gap-3 px-4 sm:px-6", wide ? "max-w-[1400px]" : "max-w-[1200px]")}>
          <Logo />
          <nav className="ml-2 flex items-center gap-2 sm:ml-8" aria-label="Main">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={cn(
                  "inline-flex h-9 items-center gap-1.5 rounded-full border-2 px-3.5 text-[14px] font-bold transition-all",
                  pathname?.startsWith(l.href)
                    ? "border-line bg-highlight text-navy shadow-[2px_2px_0_var(--color-line)]"
                    : "border-transparent text-slate hover:border-line hover:bg-white hover:text-navy",
                )}
              >
                {l.icon}
                <span className="hidden sm:inline">{l.label}</span>
              </Link>
            ))}
          </nav>
          <div className="ml-auto min-w-0">{hydrated && student && <StudentMenu name={student.name} isDemo={isDemo} />}</div>
        </div>
      </header>
      <main className={cn("mx-auto px-4 pb-16 pt-6 sm:px-6", wide ? "max-w-[1400px]" : "max-w-[1200px]")}>
        {/* motion/react components on app pages follow the OS reduced-motion setting */}
        <MotionConfig reducedMotion="user">{hydrated ? children : <ShellSkeleton />}</MotionConfig>
      </main>
    </div>
  );
}

function StudentMenu({ name, isDemo }: { name: string; isDemo: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const loadDemo = useSamajh((s) => s.loadDemo);
  const reset = useSamajh((s) => s.reset);
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-label={`Student menu: ${name}${isDemo ? ", demo student" : ""}`}
        className="inline-flex h-10 max-w-full items-center gap-2 rounded-full border-2 border-line bg-white pl-1 pr-1 text-[14px] font-bold text-navy shadow-[2px_2px_0_var(--color-line)] transition-transform hover:-translate-y-px sm:pr-3"
      >
        <span className="relative grid size-7 shrink-0 place-items-center rounded-full border-2 border-line bg-ink text-[12px] font-extrabold text-white">
          {name.slice(0, 1).toUpperCase()}
          {/* on a phone the name and the demo tag fold into a yellow dot on the avatar */}
          {isDemo && <span aria-hidden className="absolute -right-1.5 -top-1.5 size-3 rounded-full border-2 border-line bg-highlight sm:hidden" />}
        </span>
        <span className="hidden truncate sm:inline">{name}</span>
        {isDemo && (
          <span className="hidden rounded-full border-[1.5px] border-line bg-highlight px-1.5 text-[11px] font-extrabold text-navy sm:inline">demo</span>
        )}
      </button>
      {open && (
        <div className="absolute right-0 top-12 w-64 rounded-[14px] border-2 border-line bg-white p-1.5 shadow-[4px_4px_0_var(--color-line)]">
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-[8px] px-2.5 py-2 text-left text-[14px] text-navy hover:bg-ink-wash"
            onClick={() => {
              setOpen(false);
              if (!confirmDemoSwitch()) return;
              loadDemo();
              router.push("/learn");
            }}
          >
            <UserRound className="size-4 text-ink" /> Switch to demo student (Aarav)
          </button>
          <button
            type="button"
            className="flex w-full items-center gap-2 rounded-[8px] px-2.5 py-2 text-left text-[14px] text-navy hover:bg-ink-wash"
            onClick={() => {
              reset();
              setOpen(false);
              router.push("/");
            }}
          >
            <RefreshCcw className="size-4 text-ink" /> Start fresh as a new student
          </button>
        </div>
      )}
    </div>
  );
}

function ShellSkeleton() {
  return (
    <div className="grid gap-4" aria-busy>
      <div className="h-24 animate-pulse rounded-[14px] bg-navy/[.04]" />
      <div className="h-[420px] animate-pulse rounded-[14px] bg-navy/[.04]" />
    </div>
  );
}
