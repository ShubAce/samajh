"use client";

import { ArrowRight, Check, ChevronDown, Copy, Sparkles, Users, X } from "lucide-react";
import { AnimatePresence, MotionConfig, motion, useInView, useReducedMotion } from "motion/react";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ConfettiBurst, CountUp } from "@/components/Motion";
import { Handwriting, MarginNote, RedPenCircle, RedPenMark } from "@/components/RedPen";
import { Button, Kicker, Pill, Sheet, Spinner } from "@/components/ui";
import { CHAPTERS, CONCEPT_BY_ID, CONCEPTS, ancestorsOf } from "@/lib/curriculum/concepts";
import { MISCONCEPTIONS, MISCONCEPTION_BY_ID } from "@/lib/curriculum/misconceptions";
import { BKT } from "@/lib/engine/learner";
import { syntheticClass, type ClassStudent } from "@/lib/seed/class";
import { useNow, useSamajh } from "@/lib/store";
import type { Misconception, ReteachPlan } from "@/lib/types";
import { cn, pct, timeAgo } from "@/lib/utils";

export default function TeacherPage() {
  return (
    <AppShell wide>
      <TeacherDashboard />
    </AppShell>
  );
}

function useRoster() {
  const student = useSamajh((s) => s.student);
  const states = useSamajh((s) => s.states);
  const misconceptions = useSamajh((s) => s.misconceptions);
  const attempts = useSamajh((s) => s.attempts.length);
  return useMemo(() => {
    const cls = syntheticClass();
    if (!student) return { roster: cls, liveId: null as string | null };
    const mis = Object.values(misconceptions).filter((m) => m.status !== "resolved");
    const live: ClassStudent = {
      id: "live",
      name: `${student.name} (live)`,
      mastery: Object.fromEntries(CONCEPTS.map((c) => [c.id, states[c.id]?.p ?? BKT.pInit])),
      misconceptions: mis.map((m) => m.id),
      quotes: Object.fromEntries(mis.filter((m) => m.quotes[0] && !m.quotes[0].startsWith("Chose ")).map((m) => [m.id, m.quotes[0]])),
      lastActiveDays: 0,
      attempts,
    };
    return { roster: [live, ...cls], liveId: "live" };
  }, [student, states, misconceptions, attempts]);
}

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** heatmap scale: coral (struggling) → paper → electric blue (secure) */
function heat(p: number) {
  const stops: [number, [number, number, number]][] = [
    [0, [255, 196, 186]],
    [0.5, [238, 241, 255]],
    [1, [51, 85, 255]],
  ];
  const x = Math.max(0, Math.min(1, p));
  const i = x < 0.5 ? 0 : 1;
  const [x0, c0] = stops[i];
  const [x1, c1] = stops[i + 1];
  const t = (x - x0) / (x1 - x0);
  const c = c0.map((v, k) => Math.round(v + (c1[k] - v) * t));
  return `rgb(${c[0]} ${c[1]} ${c[2]})`;
}

/** An inline keyframe animation, dropped entirely under reduced motion so nothing waits on a delay. */
const anim = (reduce: boolean | null, animation: string): React.CSSProperties | undefined => (reduce ? undefined : { animation });

type Cluster = { id: string; students: ClassStudent[]; def?: Misconception };

// ───────── the reteach agent ─────────
// Plans are drafted ahead of the teacher and shared across the page: one request per misconception,
// whoever asks first (the priorities card on load, or a cluster). The maps also absorb StrictMode's double effects.

type PlanWithMeta = ReteachPlan & { meta?: { model?: string; ms?: number } };
const planCache = new Map<string, PlanWithMeta>();
const inflight = new Map<string, Promise<PlanWithMeta | null>>();
/** when the latest draft for each misconception started (epoch ms), so every view shows the same real elapsed time */
const startedAt = new Map<string, number>();
const planListeners = new Set<(id: string, plan: PlanWithMeta) => void>();

/** what students in this cluster actually wrote or said, without repeats */
const quotesFor = (c: Cluster) => [...new Set(c.students.map((s) => s.quotes[c.id]).filter(Boolean))].slice(0, 3);

function isPlan(x: unknown): x is PlanWithMeta {
  const p = x as PlanWithMeta | null;
  return (
    !!p &&
    typeof p.headline === "string" &&
    typeof p.boardExplanation === "string" &&
    Array.isArray(p.activity?.steps) &&
    Array.isArray(p.checkQuestions)
  );
}

/** AbortSignal.timeout is missing on older Safari; without it the request simply has no client-side timeout */
const timeoutSignal = (ms: number) =>
  typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function" ? AbortSignal.timeout(ms) : undefined;

function requestPlan(c: Cluster, n: number): Promise<PlanWithMeta | null> {
  const cached = planCache.get(c.id);
  if (cached) return Promise.resolve(cached);
  const running = inflight.get(c.id);
  if (running) return running;
  startedAt.set(c.id, Date.now());
  const promise = fetch("/api/reteach", {
    method: "POST",
    signal: timeoutSignal(50_000),
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      misconceptionId: c.id,
      misconception: c.def,
      affected: c.students.length,
      classSize: n,
      quotes: quotesFor(c),
    }),
  })
    .then((r) => (r.ok ? r.json() : null))
    .then((data: unknown) => {
      if (!isPlan(data)) return null;
      planCache.set(c.id, data);
      planListeners.forEach((l) => l(c.id, data));
      return data;
    })
    .catch(() => null)
    .finally(() => inflight.delete(c.id));
  inflight.set(c.id, promise);
  return promise;
}

/** "gemini-3.5-flash-lite" → "Gemini 3.5 Flash Lite" */
const modelLabel = (m: string) =>
  m
    .replace("models/", "")
    .split("-")
    .filter(Boolean)
    .map((w) => (w === "gemini" ? "Gemini" : w === "gemma" ? "Gemma" : w[0].toUpperCase() + w.slice(1)))
    .join(" ");

/** the plan as plain text, ready to paste into a lesson plan or a staff-room chat */
function planText(p: ReteachPlan) {
  return [
    p.headline,
    "",
    `Why: ${p.whyItHappens}`,
    "",
    `${p.activity.title} (${p.activity.minutes} min)`,
    ...p.activity.steps.map((s, i) => `${i + 1}. ${s}`),
    "",
    "On the board:",
    p.boardExplanation,
    "",
    "Exit check:",
    ...p.checkQuestions.flatMap((q, i) => [`Q${i + 1}. ${q.question}`, `A${i + 1}. ${q.answer}`]),
    "",
    `Grouping: ${p.grouping}`,
  ].join("\n");
}

/** milliseconds since `since` (or since mount), ticking every 0.1 s */
function useElapsed(since?: number) {
  const [t0] = useState(() => since ?? Date.now());
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(t);
  }, []);
  return Math.max(0, now - t0);
}

/** a live stopwatch for the agent's work (decorative: screen readers get the status text instead) */
function Stopwatch({ since, className }: { since?: number; className?: string }) {
  const ms = useElapsed(since);
  return (
    <span aria-hidden className={cn("tabular", className)}>
      {(ms / 1000).toFixed(1)} s
    </span>
  );
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // clipboard API unavailable or blocked (e.g. inside an embedded preview): hidden-textarea fallback
    try {
      const active = document.activeElement as HTMLElement | null;
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      active?.focus();
      return ok;
    } catch {
      return false;
    }
  }
}

// ───────── page ─────────

function TeacherDashboard() {
  const { roster, liveId } = useRoster();
  const discovered = useSamajh((s) => s.discovered);
  const [openCluster, setOpenCluster] = useState<string | null>(null);
  const [autoPlan, setAutoPlan] = useState<string | null>(null);
  const n = roster.length;
  const live = roster.find((s) => s.id === "live");

  const clusters = useMemo(() => {
    const map = new Map<string, ClassStudent[]>();
    for (const s of roster) for (const m of s.misconceptions) map.set(m, [...(map.get(m) ?? []), s]);
    return [...map.entries()]
      .map(([id, students]) => ({ id, students, def: MISCONCEPTION_BY_ID[id] ?? discovered.find((d) => d.id === id) }))
      .filter((c) => c.def)
      .sort((a, b) => b.students.length - a.students.length);
  }, [roster, discovered]);

  const gaps = useMemo(() => {
    return CONCEPTS.map((c) => {
      const vals = roster.map((s) => s.mastery[c.id] ?? BKT.pInit);
      return { c, mean: avg(vals), below: vals.filter((v) => v < 0.5).length };
    }).sort((a, b) => a.mean - b.mean);
  }, [roster]);

  const classMean = avg(gaps.map((g) => g.mean));
  const weakChapter = [...CHAPTERS]
    .map((ch) => ({ ch, m: avg(gaps.filter((g) => g.c.chapter === ch.id).map((g) => g.mean)) }))
    .sort((a, b) => a.m - b.m)[0];
  const top = clusters[0];

  // The cluster opens with a height:auto animation. motion measures "auto" first and restores the scroll position it
  // read, which cancels any smooth scroll already under way, so the page scrolls once the expansion has finished.
  const pendingScroll = useRef<string | null>(null);
  function scrollToCluster(id: string) {
    const el = document.getElementById(`cluster-${id}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
    // keyboard users land on the cluster they just opened, not back at the top of the page
    el?.querySelector("button")?.focus({ preventScroll: true });
  }
  function onOpenCluster(id: string, auto?: boolean) {
    if (auto) setAutoPlan(id);
    if (openCluster === id) {
      // already open: nothing will animate
      scrollToCluster(id);
      return;
    }
    pendingScroll.current = id;
    setOpenCluster(id);
    // safety net, should the expansion never report back
    window.setTimeout(() => onExpanded(id), 1500);
  }
  function onExpanded(id: string) {
    if (pendingScroll.current !== id) return;
    pendingScroll.current = null;
    scrollToCluster(id);
  }

  return (
    <MotionConfig reducedMotion="user">
      {/* minmax(0,1fr) tracks: the wide heatmap scrolls inside its card instead of widening the page on a phone */}
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="flex items-center gap-2 text-[15px] text-slate">
              <Users className="size-4" /> Class 10-B Physics · {n} students
            </p>
            <h1 className="display mt-1 text-[34px] font-bold text-navy sm:text-[40px]">
              Where your class is stuck, and{" "}
              <RedPenCircle tight delay={500}>
                why
              </RedPenCircle>
            </h1>
            <p className="mt-2 max-w-[75ch] text-[15px] text-slate">
              {top ? (
                <>
                  The biggest single issue is <HighlighterSwipe>a misconception, not a topic</HighlighterSwipe>: {top.students.length} of {n}{" "}
                  students show &ldquo;{top.def!.title.toLowerCase()}&rdquo;.
                </>
              ) : (
                "No misconceptions detected yet."
              )}
              {` Weakest chapter: ${weakChapter.ch.short} (${pct(weakChapter.m)} average mastery).`}
            </p>
          </div>
          <span title="The other students are a realistic simulated class so the dashboard has something to show in a demo.">
            <Pill className="h-auto min-h-6 py-0.5">
              Demo class · {liveId ? n - 1 : n} simulated students{live ? ` + ${live.name}` : ""}
            </Pill>
          </span>
        </div>

        <Priorities key={top?.id ?? "none"} clusters={clusters} roster={roster} n={n} onOpenCluster={onOpenCluster} />

        <div className="grid grid-cols-[minmax(0,1fr)] items-start gap-6 xl:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
          <Clusters clusters={clusters} n={n} open={openCluster} setOpen={setOpenCluster} autoPlan={autoPlan} onExpanded={onExpanded} />
          <Gaps gaps={gaps} n={n} classMean={classMean} />
        </div>

        <div id="proposals" className="scroll-mt-24">
          <Proposals />
        </div>
        <Heatmap roster={roster} liveId={liveId} />
      </div>
    </MotionConfig>
  );
}

/** the yellow highlighter swipes across the phrase, left to right, once */
function HighlighterSwipe({ children }: { children: React.ReactNode }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      className="highlighter font-semibold text-navy"
      style={{ backgroundRepeat: "no-repeat" }}
      initial={reduce ? false : { backgroundSize: "0% 100%" }}
      animate={{ backgroundSize: "100% 100%" }}
      transition={{ duration: 0.7, delay: 0.9, ease: [0.65, 0, 0.35, 1] }}
    >
      {children}
    </motion.span>
  );
}

// ───────── priorities: the agent's funnel and this week's three things ─────────

type PriorityItem = { key: string; title: string; body: React.ReactNode; status?: React.ReactNode; action?: React.ReactNode };

function Priorities({
  clusters,
  roster,
  n,
  onOpenCluster,
}: {
  clusters: Cluster[];
  roster: ClassStudent[];
  n: number;
  onOpenCluster: (id: string, auto?: boolean) => void;
}) {
  const reduce = useReducedMotion();
  const pending = useSamajh((s) => s.proposals.filter((p) => p.status === "pending").length);
  const decided = useSamajh((s) => s.proposals.filter((p) => p.status !== "pending").length);
  const libSize = useSamajh((s) => MISCONCEPTIONS.length + s.discovered.length);
  const top = clusters[0];
  const [ready, setReady] = useState<PlanWithMeta | null>(() => (top ? planCache.get(top.id) ?? null : null));
  const [failed, setFailed] = useState(false);

  // the reteach agent starts drafting the #1 priority as soon as the dashboard loads
  useEffect(() => {
    if (!top) return;
    let live = true;
    // a retry from the cluster panel also lands here
    const onPlan = (id: string, plan: PlanWithMeta) => {
      if (!live || id !== top.id) return;
      setReady(plan);
      setFailed(false);
    };
    planListeners.add(onPlan);
    requestPlan(top, n).then((p) => {
      if (!live) return;
      if (p) setReady(p);
      else setFailed(true);
    });
    return () => {
      live = false;
      planListeners.delete(onPlan);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [top?.id, n]);

  const struggling = [...roster]
    .filter((s) => s.id !== "live")
    .map((s) => ({ s, m: avg(Object.values(s.mastery)) }))
    .sort((a, b) => a.m - b.m)
    .slice(0, 3);

  const items: PriorityItem[] = [];
  if (top) {
    const shorts = top.def!.conceptIds
      .map((id) => CONCEPT_BY_ID[id]?.short)
      .filter(Boolean)
      .join(", ");
    items.push({
      key: "reteach",
      title: `Reteach “${top.def!.title.toLowerCase()}”`,
      body: `${top.students.length} of ${n} students hold this idea. ${
        ready ? "Samajh has drafted" : failed ? "Samajh can draft" : "Samajh is drafting"
      } a 10-minute lesson that targets ${shorts}.`,
      status: ready ? (
        <span className="inline-flex" style={anim(reduce, "pop-in 420ms both")}>
          <Pill tone="good">
            <Check className="size-3.5" aria-hidden /> Draft ready
            {ready.engine === "gemini" && ready.meta?.ms ? ` · ${(ready.meta.ms / 1000).toFixed(1)} s` : ""}
          </Pill>
        </span>
      ) : failed ? null : (
        <Pill tone="ink">
          <Spinner className="size-3" /> Drafting with Gemini… <Stopwatch since={startedAt.get(top.id)} className="ml-0.5 font-extrabold" />
        </Pill>
      ),
      action: (
        <Button size="sm" onClick={() => onOpenCluster(top.id, true)}>
          <Sparkles className="size-3.5" aria-hidden /> {ready ? "Open the plan" : "Watch it plan"}
        </Button>
      ),
    });
  }
  items.push({
    key: "check-in",
    title: `Check in with ${struggling.map((x) => x.s.name.split(" ")[0]).join(", ")}`,
    body: `Lowest mastery in the class (${struggling.map((x) => pct(x.m)).join(", ")}). Most of their gaps sit on shared prerequisites.`,
  });
  if (pending)
    items.push({
      key: "review",
      title: `Review ${pending} new misconception${pending > 1 ? "s" : ""}`,
      body: "Samajh found faulty ideas that aren't in the library yet. Nothing is added without you.",
      action: (
        <Button
          size="sm"
          variant="outline"
          onClick={() => {
            document.getElementById("proposals")?.scrollIntoView({ behavior: "smooth", block: "start" });
            document.getElementById("proposals-title")?.focus({ preventScroll: true });
          }}
        >
          Review
        </Button>
      ),
    });
  else if (decided)
    items.push({
      key: "reviewed",
      title: "New misconceptions reviewed",
      body: "Nothing is waiting for you. Samajh will flag the next faulty idea that isn't in the library.",
      status: (
        <span className="inline-flex h-7 items-center gap-1 rounded-full border-2 border-line bg-good-wash px-2.5 text-[12.5px] font-extrabold text-good">
          <Check className="size-3.5" aria-hidden /> New ideas reviewed · library at {libSize}
        </span>
      ),
    });

  // the funnel: every answer in the class, narrowed down to this week's priorities
  const answers = roster.reduce((s, x) => s + x.attempts, 0);
  const t = Math.max(3, Math.round(n / 4));
  const shared = clusters.filter((c) => c.students.length >= t).length;
  const num = (v: number) =>
    reduce ? <span className="display tabular font-extrabold">{v}</span> : <CountUp to={v} className="display font-extrabold" />;
  const funnel: { key: string; label: React.ReactNode; strong?: boolean }[] = [
    { key: "answers", label: <>{num(answers)} answers from {n} students</> },
    { key: "found", label: <>{num(clusters.length)} misconceptions found</> },
    { key: "shared", label: <>{num(shared)} shared by {t}+ students</> },
    { key: "priorities", label: <><span className="display font-extrabold">{items.length}</span> priorities</>, strong: true },
  ];

  return (
    <section className="next-step rounded-[20px] px-5 py-5 sm:px-6" aria-labelledby="priorities">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <h2 id="priorities" className="display text-[24px] font-extrabold text-navy">
          This week&rsquo;s priorities
        </h2>
        <Kicker>
          <Sparkles className="size-3.5" aria-hidden /> Chosen by Samajh&rsquo;s agent · just now
        </Kicker>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-2">
        <p className="w-full text-[13px] font-bold text-navy/70">
          From {answers} answers to {items.length} things to do this week
        </p>
        <p className="sr-only">
          {answers} answers from {n} students, {clusters.length} misconceptions found, {shared} shared by {t} or more students,{" "}
          {items.length} priorities.
        </p>
        {funnel.map((f, i) => (
          <Fragment key={f.key}>
            {i > 0 && <FunnelArrow delay={(i - 1) * 260 + 200} reduce={reduce} />}
            <span
              aria-hidden
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-full border-2 border-line bg-white px-3 text-[13px] font-bold text-navy shadow-[2px_2px_0_var(--color-line)]",
                f.strong && "bg-ink text-white",
              )}
              style={anim(reduce, `pop-in 420ms ${i * 260}ms cubic-bezier(.2,.9,.3,1.3) both`)}
            >
              {f.label}
            </span>
          </Fragment>
        ))}
      </div>

      <ol className="mt-4 grid gap-3 lg:grid-cols-3">
        {items.map((it, i) => (
          <li
            key={it.key}
            className="flex gap-3 rounded-[14px] border-2 border-line bg-white p-4 shadow-[3px_3px_0_var(--color-line)] transition-transform hover:-translate-y-0.5"
            style={anim(reduce, `rise 520ms ${120 + i * 120}ms cubic-bezier(.2,.8,.2,1) both`)}
          >
            <span
              aria-hidden
              className="hand grid size-9 shrink-0 place-items-center rounded-full border-2 border-line bg-white text-[22px] leading-none text-ink shadow-[2px_2px_0_var(--color-line)]"
            >
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[15.5px] font-bold leading-snug text-navy">{it.title}</p>
              <p className="mt-1 text-[13.5px] leading-snug text-slate">{it.body}</p>
              {it.status !== undefined && (
                <div className="mt-2.5" aria-live="polite">
                  {it.status}
                </div>
              )}
              {it.action && <div className="mt-3">{it.action}</div>}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** a hand-drawn arrow between funnel chips; draws itself after the chip before it lands */
function FunnelArrow({ delay, reduce }: { delay: number; reduce: boolean | null }) {
  const draw = (ms: number, at: number) =>
    reduce ? undefined : ({ strokeDasharray: 1, strokeDashoffset: 1, animation: `draw ${ms}ms ease-out ${at}ms forwards` } as React.CSSProperties);
  return (
    <svg
      aria-hidden
      width={24}
      height={12}
      viewBox="0 0 24 12"
      className="hidden shrink-0 sm:block"
      fill="none"
      stroke="var(--color-line)"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 6 C 8 2, 14 10, 20 6" pathLength={1} style={draw(380, delay)} />
      <path d="M16 3 L21 6 L16 9" pathLength={1} style={draw(200, delay + 260)} />
    </svg>
  );
}

// ───────── misconception clusters ─────────

/** outlined track whose flat fill grows in when it scrolls into view */
function ReachBar({ p, color, delay = 0, label }: { p: number; color: string; delay?: number; label?: string }) {
  return (
    <div
      className="relative h-3 flex-1 overflow-hidden rounded-full border-[1.5px] border-line bg-white"
      role={label ? "meter" : undefined}
      aria-label={label}
      aria-valuemin={label ? 0 : undefined}
      aria-valuemax={label ? 100 : undefined}
      aria-valuenow={label ? Math.round(p * 100) : undefined}
      aria-hidden={label ? undefined : true}
    >
      <motion.div
        className="h-full border-r-[1.5px] border-line"
        style={{ background: color }}
        initial={{ width: "0%" }}
        whileInView={{ width: `${Math.max(2, p * 100)}%` }}
        viewport={{ once: true, amount: 0.6 }}
        transition={{ duration: 0.8, delay, ease: [0.2, 0.8, 0.2, 1] }}
      />
    </div>
  );
}

function Clusters({
  clusters,
  n,
  open,
  setOpen,
  autoPlan,
  onExpanded,
}: {
  clusters: Cluster[];
  n: number;
  open: string | null;
  setOpen: (fn: (o: string | null) => string | null) => void;
  autoPlan: string | null;
  /** called when a cluster's expand animation has finished */
  onExpanded: (id: string) => void;
}) {
  return (
    <Sheet className="p-5 sm:p-6">
      <h2 className="text-[19px] font-bold text-navy">Misconceptions spreading in the class</h2>
      <p className="mt-1 text-[14px] text-slate">
        Grouped by the faulty idea behind the wrong answers, not by chapter. Fix one idea and marks improve across several topics.
      </p>
      <ul className="mt-4 grid gap-3">
        {clusters.slice(0, 7).map((c, i) => {
          const isOpen = open === c.id;
          const k = c.students.length;
          return (
            <li
              key={c.id}
              id={`cluster-${c.id}`}
              className={cn(
                "scroll-mt-24 rounded-[14px] border-2 border-line bg-white shadow-[2px_2px_0_var(--color-line)] transition-[background-color,box-shadow,translate] duration-200",
                isOpen
                  ? "bg-redpen-wash/40 shadow-[4px_4px_0_var(--color-line)]"
                  : "hover:-translate-y-0.5 hover:shadow-[3px_3px_0_var(--color-line)]",
              )}
            >
              <button
                type="button"
                className="flex w-full items-start gap-3 rounded-[12px] px-4 py-3 text-left"
                onClick={() => setOpen((o) => (o === c.id ? null : c.id))}
                aria-expanded={isOpen}
              >
                <div className="min-w-0 flex-1">
                  <p className="hand text-[19px] leading-tight text-redpen">{c.def!.title}</p>
                  <p className="mt-0.5 text-[13px] text-slate">
                    {c.def!.conceptIds
                      .map((id) => CONCEPT_BY_ID[id]?.short)
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                  <div className="mt-2 flex items-center gap-2">
                    <ReachBar p={k / n} color="var(--color-redpen)" delay={i * 0.07} />
                    <span className="tabular shrink-0 rounded-full border-2 border-line bg-redpen-wash px-2 text-[13px] font-extrabold text-redpen">
                      {k} of {n}
                    </span>
                  </div>
                </div>
                <ChevronDown aria-hidden className={cn("mt-1 size-5 shrink-0 text-slate transition-transform", isOpen && "rotate-180")} />
              </button>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    key="detail"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.28, ease: [0.2, 0.8, 0.2, 1] }}
                    onAnimationComplete={() => onExpanded(c.id)}
                    className="overflow-hidden"
                  >
                    <ClusterDetail cluster={c} n={n} autoPlan={autoPlan === c.id} />
                  </motion.div>
                )}
              </AnimatePresence>
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}

function ClusterDetail({ cluster, n, autoPlan }: { cluster: Cluster; n: number; autoPlan: boolean }) {
  const [plan, setPlan] = useState<PlanWithMeta | null>(() => planCache.get(cluster.id) ?? null);
  const [status, setStatus] = useState<"idle" | "working" | "error">(() => (inflight.has(cluster.id) ? "working" : "idle"));
  const quotes = quotesFor(cluster);

  async function run() {
    setStatus("working");
    const p = await requestPlan(cluster, n);
    if (!p) {
      setStatus("error");
      return;
    }
    setPlan(p);
    setStatus("idle");
    // after motion's measure pass (see onOpenCluster), so the smooth scroll isn't cancelled
    window.setTimeout(() => {
      document.getElementById(`plan-${cluster.id}`)?.scrollIntoView({ behavior: "smooth", block: "nearest" });
      // the button that started the plan has unmounted: keep keyboard focus on the plan, not on <body>
      if (!document.activeElement || document.activeElement === document.body)
        document.getElementById(`plan-title-${cluster.id}`)?.focus({ preventScroll: true });
    }, 80);
  }

  // join a draft that's already running (or start one when opened from the priorities card)
  useEffect(() => {
    if (!plan && (autoPlan || inflight.has(cluster.id))) void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlan]);

  return (
    <div className="border-t-2 border-dashed border-line/20 px-4 pb-4 pt-3">
      <p className="text-[14px] text-navy">{cluster.def!.description}</p>
      {quotes.length > 0 && (
        <div className="mt-3">
          <p className="text-[12.5px] font-bold text-slate">What students wrote or said</p>
          <ul className="mt-1 grid gap-1">
            {quotes.map((q) => (
              <li key={q}>
                <Handwriting className="text-[17px] leading-snug">&ldquo;{q}&rdquo;</Handwriting>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className="mt-3 text-[13px] text-slate">
        <span className="font-semibold text-navy">Students: </span>
        {cluster.students
          .slice(0, 8)
          .map((s) => s.name.split(" ")[0])
          .join(", ")}
        {cluster.students.length > 8 ? ` and ${cluster.students.length - 8} more` : ""}
      </p>
      {plan ? (
        <ReteachView plan={plan} id={cluster.id} />
      ) : status === "working" ? (
        <PlanTrace affected={cluster.students.length} title={cluster.def!.title} since={startedAt.get(cluster.id)} />
      ) : status === "error" ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <p role="alert" className="text-[13.5px] font-semibold text-redpen">
            Gemini didn&rsquo;t answer in time.
          </p>
          <Button size="sm" variant="outline" onClick={run}>
            Try again
          </Button>
        </div>
      ) : (
        <Button className="mt-4" onClick={run}>
          <Sparkles className="size-4" aria-hidden /> Plan a 10-minute reteach
        </Button>
      )}
    </div>
  );
}

/**
 * What the reteach agent is doing while Gemini writes the plan. Steps advance every 1.6 s from when the draft
 * actually started (it may already be running from page load) and the last one stays active until the plan lands.
 */
function PlanTrace({ affected, title, since }: { affected: number; title: string; since?: number }) {
  const steps = [
    `Reading what ${affected} students wrote and said`,
    `Tracing where “${title}” comes from`,
    "Designing a 10-minute predict–observe–explain demo",
    "Writing 3 exit-check questions",
  ];
  const elapsed = useElapsed(since);
  const active = Math.min(steps.length - 1, Math.floor(elapsed / 1600));

  return (
    <div className="mt-4 rounded-[12px] border-2 border-line bg-ink-wash p-4" aria-live="polite">
      <div className="flex items-start gap-2">
        <p className="flex flex-1 items-center gap-2 text-[14px] font-semibold text-navy">
          <Sparkles className="size-4 shrink-0 text-ink" aria-hidden /> Samajh&rsquo;s reteach agent is working with Gemini
        </p>
        <span
          aria-hidden
          className="tabular inline-flex h-6 shrink-0 items-center rounded-full border-[1.5px] border-line bg-white px-2 text-[12px] font-extrabold text-navy"
        >
          {(elapsed / 1000).toFixed(1)} s
        </span>
      </div>
      <ol className="mt-3 grid gap-2.5">
        {steps.map((s, i) => (
          <li key={s} className={cn("flex items-center gap-2.5 text-[13.5px] leading-snug text-navy", i > active && "opacity-40")}>
            <span className="grid size-5 shrink-0 place-items-center" aria-hidden>
              {i < active ? (
                <span
                  className="grid size-5 place-items-center rounded-full border-2 border-line bg-ink text-white"
                  style={{ animation: "pop-in 320ms cubic-bezier(.2,.9,.3,1.3) both" }}
                >
                  <Check className="size-3" strokeWidth={3} />
                </span>
              ) : i === active ? (
                <Spinner className="size-3.5 text-ink" />
              ) : (
                <span className="size-3.5 rounded-full border-2 border-dashed border-line/50" />
              )}
            </span>
            <span className={cn(i === active && "font-semibold")}>{s}</span>
          </li>
        ))}
      </ol>
      <span className="sr-only">{steps[active]}</span>
    </div>
  );
}

/** the Gemini plan as a lesson card a teacher can take into class */
function ReteachView({ plan, id }: { plan: PlanWithMeta; id: string }) {
  const reduce = useReducedMotion();
  const [copied, setCopied] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const board = plan.boardExplanation
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  const model = plan.engine === "gemini" ? plan.meta?.model : undefined;

  async function copy() {
    if (!(await copyText(planText(plan)))) return;
    setCopied(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div
      id={`plan-${id}`}
      className="mt-4 scroll-mt-24 overflow-hidden rounded-[18px] border-2 border-line bg-white shadow-[4px_4px_0_var(--color-line)]"
      style={anim(reduce, "rise 450ms cubic-bezier(.2,.8,.2,1) both")}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-line bg-highlight px-4 py-2.5">
        <h3 id={`plan-title-${id}`} tabIndex={-1} className="text-[14px] font-extrabold text-navy">
          10-minute reteach plan
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          {model ? (
            <span className="inline-flex h-auto min-h-6 items-center gap-1 rounded-full border-[1.5px] border-line bg-white px-2 py-0.5 text-[11.5px] font-bold leading-tight text-navy">
              <Sparkles className="size-3 shrink-0 text-ink" aria-hidden />
              <span>
                Written by {modelLabel(model)}
                {plan.meta?.ms ? <span className="hidden sm:inline">{` · ${(plan.meta.ms / 1000).toFixed(1)} s`}</span> : null}
              </span>
            </span>
          ) : (
            <Pill>From the misconception library</Pill>
          )}
          <Button size="sm" variant="outline" onClick={copy}>
            {copied ? <Check className="size-4" aria-hidden /> : <Copy className="size-4" aria-hidden />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <span className="sr-only" aria-live="polite">
            {copied ? "Plan copied to the clipboard" : ""}
          </span>
        </div>
      </div>

      <div className="grid gap-4 p-4 sm:p-5">
        <p className="display text-[21px] font-extrabold text-navy" style={{ lineHeight: 1.15 }}>
          {plan.headline}
        </p>
        <div>
          <p className="text-[12.5px] font-bold text-slate">Why students think this</p>
          <p className="mt-0.5 text-[14.5px] leading-relaxed text-navy">{plan.whyItHappens}</p>
        </div>

        <div>
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-[15px] font-bold text-navy">{plan.activity.title}</p>
            <Pill tone="highlight">{plan.activity.minutes} min</Pill>
          </div>
          <ol className="mt-3 grid gap-3">
            {plan.activity.steps.map((s, i, all) => (
              <li key={i} className="relative grid grid-cols-[28px_1fr] gap-3" style={anim(reduce, `rise 420ms ${200 + i * 140}ms both`)}>
                <span
                  aria-hidden
                  className="grid size-7 place-items-center rounded-full border-2 border-line bg-white text-[13px] font-extrabold text-navy"
                >
                  {i + 1}
                </span>
                {i < all.length - 1 && (
                  <span aria-hidden className="absolute left-[13px] top-8 -bottom-3 border-l-2 border-dashed border-line/30" />
                )}
                <p className="pt-1 text-[14.5px] leading-snug text-navy">{s}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="rounded-[12px] border-2 border-line bg-[#23402f] px-4 py-3 text-[#eef3ea] shadow-[3px_3px_0_var(--color-line)]">
          <p className="text-[12px] font-semibold opacity-70">On the board</p>
          <p className="hand mt-0.5 text-[18px] leading-snug">
            {board.map((line, i) => (
              <span
                key={i}
                className={cn("block", !reduce && "opacity-0")}
                style={anim(reduce, `write 700ms ease-out ${700 + i * 450}ms forwards`)}
              >
                {line}
              </span>
            ))}
          </p>
        </div>

        <div>
          <p className="text-[12.5px] font-bold text-slate">Exit check</p>
          <ol className="mt-1.5 grid gap-3 sm:grid-cols-3">
            {plan.checkQuestions.map((q, i) => (
              <ExitTicket key={i} q={q} i={i} />
            ))}
          </ol>
        </div>

        <div className="flex gap-2 rounded-[12px] border-2 border-line bg-lilac/25 p-3 text-[14px] text-navy">
          <Users className="mt-0.5 size-4 shrink-0" aria-hidden />
          <p>
            <strong>How to group</strong> · {plan.grouping}
          </p>
        </div>
        {plan.engine === "fallback" && <p className="text-[12px] text-slate">Generated from the misconception library (AI unavailable).</p>}
      </div>
    </div>
  );
}

function ExitTicket({ q, i }: { q: { question: string; answer: string }; i: number }) {
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  return (
    <li className="flex flex-col rounded-[12px] border-2 border-line bg-white p-3">
      <span className="text-[11.5px] font-extrabold text-slate">Q{i + 1}</span>
      <p className="mt-0.5 text-[14px] leading-snug text-navy">{q.question}</p>
      <div className="mt-auto">
        <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="mt-2 text-[13px] font-bold text-ink hover:underline">
          {open ? "Hide answer" : "Show answer"}
        </button>
        {open && (
          <p className="mt-1 text-[13.5px] font-semibold text-good" style={anim(reduce, "pop-in 300ms cubic-bezier(.2,.9,.3,1.3) both")}>
            {q.answer}
          </p>
        )}
      </div>
    </li>
  );
}

// ───────── weakest concepts ─────────

function Gaps({ gaps, n, classMean }: { gaps: { c: (typeof CONCEPTS)[number]; mean: number; below: number }[]; n: number; classMean: number }) {
  const means = useMemo(() => Object.fromEntries(gaps.map((g) => [g.c.id, g.mean])), [gaps]);
  return (
    <Sheet className="p-5 sm:p-6">
      <h2 className="text-[19px] font-bold text-navy">Weakest concepts</h2>
      <p className="mt-1 text-[14px] text-slate">
        Class average mastery is {pct(classMean)}. Where a weak concept sits on a weak prerequisite, the prerequisite is named.
      </p>
      <ul className="mt-4 grid gap-3.5">
        {gaps.slice(0, 8).map((g, i) => {
          const weakAnc = [...ancestorsOf(g.c.id).entries()].filter(([id]) => means[id] < 0.5).sort((a, b) => b[1] - a[1])[0];
          return (
            <li key={g.c.id} className="grid gap-1.5">
              <div className="flex items-baseline justify-between gap-2 text-[14.5px]">
                <span className="font-semibold text-navy">{g.c.title}</span>
                <span className="tabular shrink-0 text-[13px] text-slate">
                  {pct(g.mean)} · {g.below} of {n} below 50%
                </span>
              </div>
              <ReachBar p={g.mean} color="var(--color-ink)" delay={i * 0.07} label={`${g.c.title}: class average ${pct(g.mean)}`} />
              {weakAnc && (
                <p className="text-[12.5px] text-slate">
                  Rooted in{" "}
                  <span className="inline-block rounded-full border-[1.5px] border-line bg-redpen-wash px-2 text-[12px] font-bold text-redpen">
                    {CONCEPT_BY_ID[weakAnc[0]].title}
                  </span>{" "}
                  ({pct(means[weakAnc[0]])})
                </p>
              )}
            </li>
          );
        })}
      </ul>
    </Sheet>
  );
}

// ───────── human in the loop: AI-found misconceptions wait for the teacher ─────────

const FLOW = [
  { label: "Gemini drafts it", cls: "bg-ink text-white" },
  { label: "You decide", cls: "bg-highlight text-navy" },
  { label: "Checked in new answers", cls: "bg-good-wash text-navy" },
];

function Proposals() {
  const proposals = useSamajh((s) => s.proposals);
  const discovered = useSamajh((s) => s.discovered);
  const approve = useSamajh((s) => s.approveProposal);
  const reject = useSamajh((s) => s.rejectProposal);
  const now = useNow();
  const reduce = useReducedMotion();
  const [stamped, setStamped] = useState<string | null>(null);
  const titles = useRef(new Map<string, HTMLElement>());
  const pending = proposals.filter((p) => p.status === "pending");
  const decided = proposals.filter((p) => p.status !== "pending").slice(0, 3);
  const libSize = MISCONCEPTIONS.length + discovered.length;

  function decide(id: string, add: boolean) {
    if (add) {
      // mark it first, so the stamp mounts already knowing it should slam
      setStamped(id);
      approve(id);
    } else reject(id);
    // the buttons unmount with the decision: keep keyboard focus on the card it was made on
    requestAnimationFrame(() => titles.current.get(id)?.focus());
  }

  return (
    <Sheet className="p-5 sm:p-6" aria-labelledby="proposals-title">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 id="proposals-title" tabIndex={-1} className="text-[19px] font-bold text-navy">
          New misconceptions Samajh found
        </h2>
        <div className="flex flex-wrap items-center gap-2" aria-live="polite">
          {pending.length > 0 && <Pill tone="red">{pending.length} waiting for you</Pill>}
          <span
            key={libSize}
            className="tabular inline-flex h-7 items-center rounded-full border-2 border-line bg-white px-2.5 text-[12.5px] font-extrabold text-navy"
            style={anim(reduce, "pop-in 420ms cubic-bezier(.2,.9,.3,1.3) both")}
          >
            Library · {libSize} misconceptions
          </span>
        </div>
      </div>
      <p className="mt-1 max-w-[80ch] text-[14px] text-slate">
        When a student&rsquo;s reasoning shows a faulty idea that isn&rsquo;t in the library, Gemini drafts a new entry. Nothing is added until you
        approve it. Once approved, Samajh checks new answers for it.
      </p>
      <ol className="mt-3 flex flex-wrap items-center gap-1.5" aria-label="How a new misconception joins the library">
        {FLOW.map((f, i) => (
          <li key={f.label} className="flex items-center gap-1.5">
            {i > 0 && <ArrowRight className="size-3.5 text-navy" aria-hidden />}
            <span className={cn("rounded-full border-2 border-line px-2.5 py-0.5 text-[12.5px] font-extrabold", f.cls)}>{f.label}</span>
          </li>
        ))}
      </ol>
      {pending.length === 0 && decided.length === 0 && <p className="mt-4 text-[14px] text-slate">Nothing new right now.</p>}
      <ul className="mt-4 grid items-start gap-3 lg:grid-cols-2">
        <AnimatePresence initial={false}>
          {[...pending, ...decided].map((p) => {
            const approved = p.status === "approved";
            const rejected = p.status === "rejected";
            const concept = CONCEPT_BY_ID[p.conceptId]?.title ?? p.conceptId;
            return (
              <motion.li
                layout="position"
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.96 }}
                transition={{ type: "spring", stiffness: 380, damping: 30 }}
                className={cn(
                  "relative rounded-[14px] border-2 border-line p-4",
                  p.status === "pending" ? "bg-white shadow-[4px_4px_0_var(--color-line)]" : approved ? "bg-good-wash" : "bg-white",
                )}
              >
                {approved && <LibraryStamp slam={stamped === p.id} />}
                <p className="text-[11.5px] font-extrabold text-ink-deep">
                  Found in {p.studentName.split(" ")[0]}&rsquo;s answer · {timeAgo(p.createdAt, now)}
                </p>
                <div
                  ref={(el) => {
                    if (el) titles.current.set(p.id, el);
                  }}
                  tabIndex={-1}
                  className="mt-1"
                >
                  {rejected ? (
                    <p className="text-[16px] font-bold leading-snug text-slate line-through">{p.title}</p>
                  ) : (
                    <MarginNote delay={0} className="text-[19px]">
                      {p.title}
                    </MarginNote>
                  )}
                </div>
                {p.status === "pending" ? (
                  <>
                    <p className="mt-1 text-[14px] text-navy">{p.description}</p>
                    <Handwriting className="mt-2 block text-[17px]">
                      <RedPenMark text={p.evidenceQuote} delay={500}>
                        &ldquo;{p.evidenceQuote}&rdquo;
                      </RedPenMark>
                    </Handwriting>
                    <div className="mt-2.5">
                      <Pill tone="ink">{concept}</Pill>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      <Button size="sm" onClick={() => decide(p.id, true)}>
                        <Check className="size-4" aria-hidden /> Add to library
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => decide(p.id, false)}>
                        <X className="size-4" aria-hidden /> Not a misconception
                      </Button>
                    </div>
                  </>
                ) : (
                  <p className="mt-1 text-[13.5px] text-navy/80">
                    {approved ? `In the library. Samajh now checks new answers on ${concept} for it.` : "Dismissed."}
                  </p>
                )}
                {approved && stamped === p.id && !reduce && <ConfettiBurst />}
              </motion.li>
            );
          })}
        </AnimatePresence>
      </ul>
    </Sheet>
  );
}

/** a tilted rubber stamp on approved cards; it slams down only on the card the teacher just approved */
function LibraryStamp({ slam }: { slam: boolean }) {
  const reduce = useReducedMotion();
  return (
    <motion.span
      className="display mb-4 mt-1 inline-block rotate-[-8deg] rounded-[8px] border-[3px] border-good bg-white px-2.5 py-0.5 text-[15px] font-extrabold uppercase text-good shadow-[2px_2px_0_var(--color-good)] sm:float-right sm:mb-4 sm:ml-4"
      style={{ letterSpacing: "0.04em" }}
      initial={slam && !reduce ? { opacity: 0, scale: 1.9 } : false}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ scale: { type: "spring", stiffness: 520, damping: 16, mass: 0.9 }, opacity: { duration: 0.12 } }}
    >
      Added to library
    </motion.span>
  );
}

// ───────── heatmap ─────────

function Heatmap({ roster, liveId }: { roster: ClassStudent[]; liveId: string | null }) {
  const rows = useMemo(
    () =>
      [...roster].sort((a, b) => {
        if (a.id === liveId) return -1;
        if (b.id === liveId) return 1;
        return avg(Object.values(a.mastery)) - avg(Object.values(b.mastery));
      }),
    [roster, liveId],
  );
  const cols = CHAPTERS.flatMap((ch) => CONCEPTS.filter((c) => c.chapter === ch.id));
  const [hover, setHover] = useState<{ s: string; c: string; p: number } | null>(null);
  const reduce = useReducedMotion();
  const tableRef = useRef<HTMLTableElement>(null);
  // rows fade in, struggling students first, the first time the table scrolls into view
  const seen = useInView(tableRef, { once: true, amount: 0.15 });
  return (
    <Sheet className="p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[19px] font-bold text-navy">Every student, every concept</h2>
        <p className="text-[13px] text-slate">
          {hover ? (
            <>
              <span className="font-semibold text-navy">{hover.s}</span> · {CONCEPT_BY_ID[hover.c].title} ·{" "}
              <span className="tabular font-semibold text-ink">{pct(hover.p)}</span>
            </>
          ) : (
            "Blue = secure, coral = struggling. Struggling students at the top. Hover a cell for details."
          )}
        </p>
      </div>
      <div className="mt-4 overflow-x-auto">
        <table
          ref={tableRef}
          className="w-full min-w-[760px] table-fixed border-separate"
          style={{ borderSpacing: 2 }}
          onMouseLeave={() => setHover(null)}
        >
          <thead>
            <tr>
              <th className="w-[150px]" />
              {CHAPTERS.map((ch) => (
                <th
                  key={ch.id}
                  colSpan={CONCEPTS.filter((c) => c.chapter === ch.id).length}
                  className="border-b border-navy/15 pb-1 text-left text-[12px] font-semibold text-slate"
                >
                  {ch.short}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((s, i) => (
              <tr
                key={s.id}
                className={cn(!reduce && !seen && "opacity-0")}
                style={!reduce && seen ? { animation: `rise 420ms cubic-bezier(.2,.8,.2,1) ${Math.min(i, 24) * 28}ms both` } : undefined}
              >
                <th
                  scope="row"
                  className={cn("truncate whitespace-nowrap pr-3 text-left text-[12.5px] font-medium", s.id === liveId ? "text-ink font-bold" : "text-navy")}
                >
                  {s.name}
                </th>
                {cols.map((c) => {
                  const p = s.mastery[c.id] ?? BKT.pInit;
                  return (
                    <td
                      key={c.id}
                      onMouseEnter={() => setHover({ s: s.name, c: c.id, p })}
                      title={`${s.name}: ${c.title} ${pct(p)}`}
                      className="h-[19px] rounded-[5px] lg:h-[21px]"
                      style={{
                        background: heat(p),
                        boxShadow: "inset 0 0 0 1px rgba(23,23,28,.14)",
                        outline: hover?.c === c.id || hover?.s === s.name ? "1px solid rgba(0,0,0,.25)" : undefined,
                      }}
                    />
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* a stepped key (flat swatches, no gradient) for the cell colours */}
      <div aria-hidden className="mt-3 flex items-center justify-end gap-2 text-[12px] font-bold text-slate">
        <span>Struggling</span>
        <span className="flex gap-[2px]">
          {[0.1, 0.3, 0.5, 0.7, 0.9].map((p) => (
            <span key={p} className="h-3.5 w-6 rounded-[4px]" style={{ background: heat(p), boxShadow: "inset 0 0 0 1px rgba(23,23,28,.14)" }} />
          ))}
        </span>
        <span>Secure</span>
      </div>
    </Sheet>
  );
}
