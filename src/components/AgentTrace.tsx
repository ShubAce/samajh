"use client";

// The six agents replaying one real answer from the demo student: as each one runs, its card lifts and prints
// what it actually produced. Numbers come from the engine and the synthetic class, not from copy.

import { Brain, GitBranch, Keyboard, ListChecks, RotateCcw, ShieldCheck, Users } from "lucide-react";
import { useInView, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Reveal } from "@/components/Motion";
import { bktUpdate } from "@/lib/engine/learner";
import { syntheticClass } from "@/lib/seed/class";
import { cn, pct } from "@/lib/utils";

const TONE = {
  input: { box: "bg-white text-navy", tag: "bg-white text-navy", label: "Input" },
  ai: { box: "bg-ink text-white", tag: "bg-highlight text-navy", label: "Gemini" },
  code: { box: "bg-[#9fe3c4] text-navy", tag: "bg-white text-navy", label: "Code" },
} as const;

const LAST = 5; // index of the final agent
const FIRST_MS = 500;
const STEP_MS = 1100;

export function AgentTrace() {
  const cls = syntheticClass();
  const count = cls.filter((s) => s.misconceptions.includes("current-consumed")).length;
  const nodes: { icon: React.ReactNode; title: string; body: string; tone: keyof typeof TONE; trace: string }[] = [
    {
      icon: <Keyboard className="size-5" />,
      title: "Student",
      body: "Answer + reasoning: typed, voice or photo",
      tone: "input",
      trace: "voice note → “pehla bulb thoda current use kar leta hai…”",
    },
    {
      icon: <Brain className="size-5" />,
      title: "Misconception detective",
      body: "Gemini reads the reasoning, quotes the faulty step, names the idea",
      tone: "ai",
      trace: "misconception · Current gets used up · 93% · quote “current use kar leta hai”",
    },
    {
      icon: <GitBranch className="size-5" />,
      title: "Learner model",
      body: "Bayesian Knowledge Tracing; evidence spreads along prerequisites",
      tone: "code",
      trace: `BKT · Series circuits 62% → ${pct(bktUpdate(0.62, "incorrect"))} · linked concepts nudged down`,
    },
    {
      icon: <ListChecks className="size-5" />,
      title: "Tutor planner",
      body: "Next best step: fix, review, learn the frontier, or stretch",
      tone: "code",
      trace: "next action · Fix “Current gets used up” · beat its trap twice",
    },
    {
      icon: <ShieldCheck className="size-5" />,
      title: "Question smith + verifier",
      body: "Gemini writes trap questions; a second AI solves each before it ships",
      tone: "ai",
      trace: "drafts a new trap question → a second model solves it blind → answers match ✓ ships",
    },
    {
      icon: <Users className="size-5" />,
      title: "Teacher insights",
      body: "Misconception clusters, reteach plans, new ideas for approval",
      tone: "ai",
      trace: `${count} of ${cls.length} in Class 10-B share this idea → 10-minute reteach plan`,
    },
  ];

  const ref = useRef<HTMLOListElement>(null);
  // "in view" once the list reaches the top 65% of the screen: unlike a 30% threshold, this also works on a
  // short screen where the stacked list is several times taller than the viewport
  const inView = useInView(ref, { margin: "0px 0px -35% 0px" });
  const reduce = useReducedMotion();
  const [active, setActive] = useState(-1);
  const [run, setRun] = useState(0);

  // one pass, 1 → 6, each time the section scrolls in (or Replay is pressed)
  useEffect(() => {
    if (reduce) {
      setActive(LAST);
      return;
    }
    setActive(-1);
    if (!inView) return;
    let k = 0;
    let tick: ReturnType<typeof setInterval> | undefined;
    const first = setTimeout(() => {
      setActive(0);
      tick = setInterval(() => {
        k += 1;
        setActive(k);
        if (k >= LAST && tick) clearInterval(tick);
      }, STEP_MS);
    }, FIRST_MS);
    return () => {
      clearTimeout(first);
      if (tick) clearInterval(tick);
    };
  }, [inView, reduce, run]);

  return (
    <>
      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[14px] font-semibold text-white/70">Replaying one real answer from the demo student</p>
        <button
          type="button"
          onClick={() => setRun((r) => r + 1)}
          aria-label="Replay the trace"
          className="inline-flex h-9 items-center gap-1.5 rounded-full border-2 border-white px-3.5 text-[13px] font-bold text-white transition-colors hover:bg-white hover:text-navy"
        >
          <RotateCcw className="size-4" aria-hidden /> Replay
        </button>
      </div>
      <ol ref={ref} className="mt-5 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {nodes.map((n, i) => {
          const t = TONE[n.tone];
          const on = i === active;
          return (
            <Reveal as="li" key={n.title} delay={i * 90} className="relative">
              <div
                className={cn(
                  "flex h-full flex-col rounded-[20px] border-2 bg-white/[.04] p-5 transition-[transform,translate,box-shadow,border-color] duration-300 hover:-translate-y-1",
                  on ? "-translate-y-1 border-highlight shadow-[5px_5px_0_var(--color-highlight)]" : "border-white",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cn("grid size-11 place-items-center rounded-[12px] border-2 border-white", t.box)}>{n.icon}</span>
                  <span className={cn("rounded-full border-2 border-white px-2.5 py-0.5 text-[11.5px] font-extrabold", t.tag)}>{t.label}</span>
                </div>
                <p className="mt-4 text-[17px] font-extrabold text-white">
                  <span className="mr-2 text-highlight">{i + 1}.</span>
                  {n.title}
                </p>
                <p className="mt-1 text-[14px] leading-snug text-white/70">{n.body}</p>
                {/* always rendered, so nothing shifts and screen readers get every line */}
                <div className="mt-auto pt-3">
                  <p
                    className="break-words rounded-[10px] border-2 border-dashed border-white/30 px-3 py-2 font-mono text-[12px] leading-snug text-highlight transition-opacity duration-300"
                    style={{ opacity: i <= active ? 1 : 0.18 }}
                  >
                    {n.trace}
                  </p>
                </div>
              </div>
            </Reveal>
          );
        })}
      </ol>
      <p className="mt-6 inline-flex rounded-full border-2 border-white px-3 py-1 text-[13px] font-bold text-white">
        ↻ Then it loops: the next question is chosen from this answer.
      </p>
    </>
  );
}
