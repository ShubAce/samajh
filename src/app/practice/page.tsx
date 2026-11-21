"use client";

import { ArrowDown, ArrowRight, Check, Lock, PenLine, ShieldCheck, Sparkles } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ConceptMap } from "@/components/ConceptMap";
import { InkBar } from "@/components/Ink";
import { FixedStamp, MarginNote, StrikeThrough } from "@/components/RedPen";
import { QuestionSheet } from "@/components/QuestionSheet";
import { Button, ButtonLink, Sheet, Spinner } from "@/components/ui";
import { CONCEPT_BY_ID } from "@/lib/curriculum/concepts";
import { MISCONCEPTION_BY_ID } from "@/lib/curriculum/misconceptions";
import { BKT, effectiveTheta, ratingToDifficulty, retention } from "@/lib/engine/learner";
import { actionHref, dueCards, nextBestAction, pickPractice } from "@/lib/engine/policy";
import { nowFor, usePool, useSamajh } from "@/lib/store";
import type { Attempt, Question } from "@/lib/types";
import { cn, pct } from "@/lib/utils";

type Mode = "learn" | "fix" | "review" | "stretch";

export default function PracticePage() {
  return (
    <AppShell wide>
      <Suspense fallback={null}>
        <PracticeRouter />
      </Suspense>
    </AppShell>
  );
}

interface Plan {
  mode: Mode;
  title: string;
  subtitle: string;
  steps: { conceptId: string; focusMisconceptionId?: string }[];
}

function buildPlan(mode: Mode, concept: string | null, mis: string | null): Plan | null {
  const s = useSamajh.getState();
  const now = nowFor(s.clockOffsetDays);
  if (mode === "fix" && mis) {
    const def = MISCONCEPTION_BY_ID[mis];
    if (!def) return null;
    const target = [...def.conceptIds].sort((a, b) => (s.states[a]?.p ?? BKT.pInit) - (s.states[b]?.p ?? BKT.pInit));
    const steps = [0, 1, 2].map((i) => ({ conceptId: target[i % target.length], focusMisconceptionId: mis }));
    return {
      mode,
      title: `Fix: ${def.title}`,
      subtitle: `Each question has an option that this idea falls for. Get past the trap twice and it's marked fixed.`,
      steps,
    };
  }
  if (mode === "review") {
    const due = dueCards(s.cards, now).slice(0, 5);
    if (!due.length) return null;
    return {
      mode,
      title: `Spaced review`,
      subtitle: `${due.length} concept${due.length > 1 ? "s are" : " is"} fading. One question each pushes the next review further out.`,
      steps: due.map((c) => ({ conceptId: c.conceptId })),
    };
  }
  if ((mode === "learn" || mode === "stretch") && concept && CONCEPT_BY_ID[concept]) {
    const n = mode === "stretch" ? 4 : 5;
    return {
      mode,
      title: `${mode === "stretch" ? "Stretch" : "Practise"}: ${CONCEPT_BY_ID[concept].title}`,
      subtitle:
        mode === "stretch"
          ? "Harder, board-level questions to keep a secure concept sharp."
          : "Questions are matched to your level: about a 70% chance of getting each one right.",
      steps: Array.from({ length: n }, () => ({ conceptId: concept })),
    };
  }
  return null;
}

function PracticeRouter() {
  const params = useSearchParams();
  // remount the whole session whenever the URL changes (e.g. "Start fixing" from a summary)
  return (
    <Practice
      key={params.toString()}
      mode={(params.get("mode") as Mode) || "learn"}
      concept={params.get("concept")}
      mis={params.get("mis")}
    />
  );
}

function Practice({ mode, concept, mis }: { mode: Mode; concept: string | null; mis: string | null }) {
  const [plan] = useState(() => buildPlan(mode, concept, mis));

  if (!useSamajh.getState().student) {
    return (
      <Sheet className="mx-auto mt-10 max-w-lg p-8 text-center">
        <h1 className="display text-[28px] font-bold text-navy">Start with the diagnostic</h1>
        <p className="mt-2 text-slate">Samajh needs a first read of what you know before it can plan practice.</p>
        <ButtonLink href="/diagnostic" className="mt-5" size="lg">
          Take the diagnostic
        </ButtonLink>
      </Sheet>
    );
  }
  if (!plan) {
    return (
      <Sheet className="mx-auto mt-10 max-w-lg p-8 text-center">
        <h1 className="display text-[28px] font-bold text-navy">Nothing to do here right now</h1>
        <p className="mt-2 text-slate">That session isn&rsquo;t available (no reviews due, or the link is out of date).</p>
        <ButtonLink href="/learn" className="mt-5" size="lg">
          Back to my map
        </ButtonLink>
      </Sheet>
    );
  }
  return <Session plan={plan} />;
}

type Current =
  | { kind: "question"; question: Question; why: string; predicted: number }
  | { kind: "generating"; conceptId: string; difficulty: number; focus?: string }
  | { kind: "done" };

/** what /api/generate reports about the writer → blind-checker run behind a generated question */
type GenMeta = { model?: string; verifierModel?: string; verifierWorking?: string; attempts?: number; ms?: number };

/** "models/gemini-2.5-flash" → "Gemini 2.5 Flash" */
const niceModel = (m: string) =>
  m
    .replace("models/", "")
    .split("-")
    .map((w) => (w === "gemini" ? "Gemini" : w ? w[0].toUpperCase() + w.slice(1) : w))
    .join(" ");

/** receipt chips, only for the fields the API actually returned */
function receipt(m: GenMeta): string[] {
  const out: string[] = [];
  if (m.model) out.push(`Written by ${niceModel(m.model)}`);
  if (m.verifierModel) out.push(`solved blind by ${niceModel(m.verifierModel)}`);
  if (m.attempts) out.push(m.attempts === 1 ? "agreed on the first draft" : `agreed on draft ${m.attempts}`);
  if (typeof m.ms === "number") out.push(`${(m.ms / 1000).toFixed(1)} s`);
  return out;
}

function Session({ plan }: { plan: Plan }) {
  const pool = usePool();
  const addGenerated = useSamajh((s) => s.addGenerated);
  const states = useSamajh((s) => s.states);
  const misconceptions = useSamajh((s) => s.misconceptions);
  const [step, setStep] = useState(0);
  const [current, setCurrent] = useState<Current | null>(null);
  const [results, setResults] = useState<Attempt[]>([]);
  const [pulse, setPulse] = useState<string[]>([]);
  const seen = useRef(new Set<string>());
  const startStates = useRef(useSamajh.getState().states);
  const startMis = useRef(useSamajh.getState().misconceptions);
  const [genMeta, setGenMeta] = useState<GenMeta | null>(null);
  const reduce = useReducedMotion();
  // the step we've already advanced from, so a double-click on "Next" can't skip a question
  const advancedFrom = useRef(-1);

  async function load(i: number) {
    if (i >= plan.steps.length) {
      setCurrent({ kind: "done" });
      return;
    }
    const s = useSamajh.getState();
    const st = plan.steps[i];
    const recent = new Set(s.attempts.slice(-12).map((a) => a.questionId));
    const allSeen = new Set([...seen.current, ...recent]);
    const fullPool = [...pool, ...s.generated.filter((g) => !pool.some((p) => p.id === g.id))];
    const base = { states: s.states, pool: fullPool, stats: s.qstats, theta: s.theta, seen: allSeen };
    let pick: ReturnType<typeof pickPractice> = null;
    if (st.focusMisconceptionId) {
      // fix mode: an unseen trap for this misconception, in any concept it affects (weakest first)
      const def = MISCONCEPTION_BY_ID[st.focusMisconceptionId];
      const order = [st.conceptId, ...(def?.conceptIds ?? []).filter((c) => c !== st.conceptId)];
      for (const conceptId of order) {
        pick = pickPractice({ ...base, conceptId, focusMisconceptionId: st.focusMisconceptionId, requireTrap: true });
        if (pick) break;
      }
    } else {
      pick = pickPractice({ ...base, conceptId: st.conceptId });
    }
    if (pick) {
      seen.current.add(pick.question.id);
      setCurrent({ kind: "question", question: pick.question, why: pick.why, predicted: pick.predicted });
      return;
    }
    // bank exhausted → ask Gemini to write a new, verified question at the right difficulty
    const p = s.states[st.conceptId]?.p ?? BKT.pInit;
    const target = Math.round(ratingToDifficulty(effectiveTheta(s.theta, p) + (plan.mode === "stretch" ? 150 : -60)));
    setCurrent({ kind: "generating", conceptId: st.conceptId, difficulty: target, focus: st.focusMisconceptionId });
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        signal: AbortSignal.timeout(62_000),
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          conceptId: st.conceptId,
          targetDifficulty: target,
          focusMisconceptionId: st.focusMisconceptionId,
          avoidStems: [...pool, ...s.generated].filter((q) => q.conceptId === st.conceptId).map((q) => q.stem),
          extraMisconceptions: s.discovered,
        }),
      });
      if (res.ok) {
        const { question, meta } = (await res.json()) as { question: Question; meta?: GenMeta };
        addGenerated(question);
        seen.current.add(question.id);
        setGenMeta(meta ?? null);
        setCurrent({
          kind: "question",
          question,
          why: st.focusMisconceptionId
            ? `You've used up the ready-made questions for this, so Gemini wrote a new one aimed at "${MISCONCEPTION_BY_ID[st.focusMisconceptionId]?.title}", and a second AI checked the answer.`
            : `You've seen every ready-made question for this concept, so Gemini wrote a new one at difficulty ${target}/5, and a second AI checked the answer before you see it.`,
          predicted: 0.7,
        });
        return;
      }
    } catch {
      /* fall through to a repeat */
    }
    // fallback: an unseen non-trap question, else the least-recently-seen one for the concept
    const fresh = pickPractice({ ...base, conceptId: st.conceptId, focusMisconceptionId: st.focusMisconceptionId });
    if (fresh) {
      seen.current.add(fresh.question.id);
      setCurrent({ kind: "question", question: fresh.question, why: fresh.why, predicted: fresh.predicted });
      return;
    }
    const qs = fullPool.filter((q) => q.conceptId === st.conceptId && !seen.current.has(q.id));
    const lastSeenAt = (id: string) => [...s.attempts].reverse().find((a) => a.questionId === id)?.t ?? 0;
    const repeat = qs.sort((a, b) => lastSeenAt(a.id) - lastSeenAt(b.id))[0];
    if (repeat) {
      seen.current.add(repeat.id);
      setCurrent({ kind: "question", question: repeat, why: "A question you've seen before. Can you still get it right?", predicted: 0.7 });
    } else setCurrent({ kind: "done" });
  }

  useEffect(() => {
    load(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const focusConcept =
    current?.kind === "question" ? current.question.conceptId : current?.kind === "generating" ? current.conceptId : null;

  if (current?.kind === "done") {
    return <Summary plan={plan} results={results} startStates={startStates.current} startMis={startMis.current} />;
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
      <div>
        <div className="mb-4">
          <h1 className={cn("display text-[28px] font-bold sm:text-[32px]", plan.mode === "fix" ? "text-redpen" : "text-navy")}>{plan.title}</h1>
          <p className="mt-1 text-[15px] text-slate">{plan.subtitle}</p>
          <div className="mt-3 flex items-center gap-3">
            <p className="tabular shrink-0 text-[14px] font-semibold text-navy">
              {Math.min(step + 1, plan.steps.length)} of {plan.steps.length}
            </p>
            <div className="flex flex-1 gap-1" aria-hidden>
              {plan.steps.map((_, i) => (
                <span
                  key={i}
                  className="h-1.5 flex-1 rounded-full transition-[background-color] duration-500"
                  style={{
                    background:
                      i < results.length ? (results[i].correct ? "var(--color-ink)" : "var(--color-redpen)") : "rgba(0,0,0,.1)",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
        {current?.kind === "generating" && <Generating difficulty={current.difficulty} conceptId={current.conceptId} focus={current.focus} />}
        {current?.kind === "question" && (
          // keyed: every new question lands with a short rise (backwards fill leaves no transform behind)
          <div key={current.question.id} style={{ animation: "rise 380ms cubic-bezier(.2,.8,.2,1) backwards" }}>
            <QuestionSheet
              question={current.question}
              why={current.why}
              predicted={current.predicted}
              mode={plan.mode === "review" ? "review" : plan.mode === "fix" ? "fix" : "practice"}
              number={step + 1}
              nextLabel={step + 1 >= plan.steps.length ? "Finish session" : "Next question"}
              onAnswered={(a) => {
                setResults((r) => [...r, a]);
                // the ripple (and its caption) covers only the concepts that visibly moved
                const moved = (a.propagated ?? []).filter((p) => Math.round(p.from * 100) !== Math.round(p.to * 100));
                setPulse([a.conceptId, ...moved.map((p) => p.conceptId)]);
              }}
              onNext={() => {
                if (advancedFrom.current === step) return;
                advancedFrom.current = step;
                const n = step + 1;
                setStep(n);
                setPulse([]);
                setGenMeta(null);
                window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
                load(n);
              }}
            />
            {genMeta && current.question.source === "generated" && (
              <details className="mt-3 rounded-[10px] px-1 text-[13.5px] text-slate">
                <summary className="cursor-pointer leading-7">
                  <span className="font-semibold text-ink">How this question was checked</span>
                  {receipt(genMeta).map((chip) => (
                    <span
                      key={chip}
                      className="ml-1.5 inline-flex h-6 items-center rounded-full border-[1.5px] border-line bg-white px-2 align-middle text-[11.5px] font-bold text-navy"
                    >
                      {chip}
                    </span>
                  ))}
                </summary>
                {genMeta.verifierWorking && <p className="mt-1">Checker&rsquo;s working: {genMeta.verifierWorking}</p>}
              </details>
            )}
          </div>
        )}
      </div>
      <aside className="grid content-start gap-4 self-start lg:sticky lg:top-20">
        <Sheet className="graph-paper overflow-hidden p-4">
          <p className="mb-2 text-[14px] font-semibold text-navy">Live map</p>
          <ConceptMap states={states} misconceptions={misconceptions} compact focus={focusConcept} pulse={pulse} />
          {pulse.length > 1 && (
            <p key={pulse.join()} className="hand mt-1 text-[17px] leading-snug text-ink" style={{ animation: "write 600ms ease-out backwards" }}>
              This answer also updated {pulse.length - 1} linked concept{pulse.length - 1 === 1 ? "" : "s"}
            </p>
          )}
        </Sheet>
        {focusConcept && <FocusCard conceptId={focusConcept} />}
      </aside>
    </div>
  );
}

function FocusCard({ conceptId }: { conceptId: string }) {
  const st = useSamajh((s) => s.states[conceptId]);
  const card = useSamajh((s) => s.cards[conceptId]);
  const offset = useSamajh((s) => s.clockOffsetDays);
  const c = CONCEPT_BY_ID[conceptId];
  return (
    <Sheet className="p-4">
      <p className="text-[13px] font-semibold text-slate">Now practising</p>
      <p className="text-[17px] font-bold text-navy">{c.title}</p>
      {c.formula && <p className="mt-1 inline-block rounded-md bg-ink-wash px-2 py-0.5 text-[14px] font-semibold text-ink">{c.formula}</p>}
      <div className="mt-3 grid gap-1">
        <div className="flex justify-between text-[13.5px]">
          <span className="text-navy">Mastery</span>
          <span className="tabular font-semibold text-ink">{pct(st?.p ?? BKT.pInit)}</span>
        </div>
        <InkBar p={st?.p ?? BKT.pInit} />
      </div>
      {card && (
        <p className="mt-2 text-[13px] text-slate">
          Recall today {pct(retention(card, nowFor(offset)))}, reviewed {card.reps} time{card.reps === 1 ? "" : "s"}.
        </p>
      )}
    </Sheet>
  );
}

/**
 * The 8–25 s wait while /api/generate runs: a writer agent drafts the question (with a trap when fixing a
 * misconception), then a checker agent solves it blind. Progress follows elapsed time, so it never looks stuck.
 */
function Generating({ difficulty, conceptId, focus }: { difficulty: number; conceptId: string; focus?: string }) {
  const [ms, setMs] = useState(0);
  useEffect(() => {
    const t0 = performance.now();
    const id = setInterval(() => setMs(performance.now() - t0), 100);
    return () => clearInterval(id);
  }, []);
  const step = ms < 2500 ? 0 : ms < 5000 ? 1 : ms < 8000 ? 2 : 3;
  const checking = step >= 2;
  const trap = focus ? MISCONCEPTION_BY_ID[focus]?.title : undefined;
  const steps = [
    focus
      ? `Gemini drafts a question with a trap for "${trap}"`
      : `Gemini drafts a ${CONCEPT_BY_ID[conceptId]?.short} question at difficulty ${difficulty}/5`,
    "Each wrong option is tagged with the misconception it catches",
    "A second AI solves it from scratch, without seeing the answer key",
    "It's only shown to you if both agree",
  ];
  const agentCard = "rounded-[14px] border-2 border-line bg-white p-3 shadow-[3px_3px_0_var(--color-line)]";
  return (
    <Sheet className="p-5 sm:p-6" style={{ animation: "rise 380ms cubic-bezier(.2,.8,.2,1) backwards" }}>
      <div className="flex items-center justify-between gap-3">
        <p className="flex items-center gap-2 text-[17px] font-bold text-navy">
          <Sparkles className="size-5 shrink-0 text-ink" aria-hidden /> Writing a fresh question for you
        </p>
        <span aria-hidden className="tabular inline-flex h-6 shrink-0 items-center rounded-full border-[1.5px] border-line bg-white px-2 text-[12px] font-extrabold">
          {(ms / 1000).toFixed(1)} s
        </span>
      </div>
      <p className="mt-1.5 text-[14.5px] leading-snug text-slate">
        {focus
          ? `You’ve used the ready-made questions for this, so two AI agents are writing a new one with a trap for “${trap}”.`
          : `You’ve used the ready-made questions here, so two AI agents are writing a new one at difficulty ${difficulty}/5.`}
      </p>

      <div className="mt-5 grid items-center gap-3 sm:grid-cols-[1fr_auto_1fr]">
        <div className={agentCard}>
          <p className="flex items-center gap-1.5 text-[13px] font-extrabold text-navy">
            <PenLine className="size-4" aria-hidden /> Writer agent · Gemini
          </p>
          <div aria-hidden className="mt-3 grid gap-1.5">
            {[92, 78, 55].map((w, i) => (
              <span key={w} className="block h-2.5 rounded-full bg-navy/15" style={{ width: `${w}%`, animation: `write 700ms ease-out ${200 + i * 350}ms both` }} />
            ))}
          </div>
          <ul aria-hidden className="mt-3 grid gap-1.5">
            {(["A", "B", "C", "D"] as const).map((id, i) => (
              <li key={id} className="flex h-4 items-center gap-2" style={{ animation: `rise 300ms ${1300 + i * 120}ms both` }}>
                <span className="size-4 shrink-0 rounded-full border-2 border-line/40" />
                <span className="h-2 flex-1 rounded-full bg-navy/10" />
                {focus && id === "B" && (
                  <span
                    className="rounded-full border-[1.5px] border-line bg-redpen-wash px-1.5 text-[10.5px] font-extrabold leading-[14px] text-redpen"
                    style={{ animation: "stick 420ms cubic-bezier(.2,.9,.3,1.2) 1900ms both" }}
                  >
                    trap
                  </span>
                )}
              </li>
            ))}
          </ul>
        </div>

        <div aria-hidden className="grid place-items-center text-navy">
          <ArrowRight className="hidden size-5 sm:block" />
          <ArrowDown className="size-5 sm:hidden" />
        </div>

        <div className={cn(agentCard, "transition-opacity duration-500", !checking && "opacity-50")}>
          <p className="flex items-center gap-1.5 text-[13px] font-extrabold text-navy">
            <ShieldCheck className="size-4" aria-hidden /> Checker agent · solves it blind
          </p>
          <div aria-hidden className="mt-3 flex gap-1.5">
            {(["A", "B", "C", "D"] as const).map((id, i) => (
              <span
                key={id}
                className="grid size-6 place-items-center rounded-full border-2 border-line/40 text-[11px] font-bold"
                style={checking ? { animation: `pulse-ring 1.2s ease-in-out ${i * 150}ms infinite` } : undefined}
              >
                {id}
              </span>
            ))}
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-[12.5px] font-bold text-slate">
            <Lock className="size-3.5" aria-hidden /> answer key hidden
          </p>
          {checking && (
            <p className="mt-1.5 flex items-center gap-1.5 text-[12.5px] font-bold text-ink" style={{ animation: "rise 300ms both" }}>
              <Spinner className="size-3.5" /> Solving from scratch…
            </p>
          )}
        </div>
      </div>

      <ol className="mt-5 grid gap-2">
        {steps.map((s, k) => (
          <li key={s} className={cn("flex items-center gap-2.5 text-[14px] transition-opacity", k > step ? "opacity-35" : "")}>
            <span className={cn("grid size-5 shrink-0 place-items-center rounded-full border", k < step ? "border-ink bg-ink text-white" : "border-ink/40")}>
              {k < step ? <Check className="size-3" /> : k === step ? <span className="size-1.5 animate-pulse rounded-full bg-ink" /> : null}
            </span>
            {s}
          </li>
        ))}
      </ol>
      {/* screen readers hear each stage once, not the ticking timer */}
      <p className="sr-only" aria-live="polite">
        {steps[step]}
      </p>
    </Sheet>
  );
}

function Summary({
  plan,
  results,
  startStates,
  startMis,
}: {
  plan: Plan;
  results: Attempt[];
  startStates: Record<string, { p: number }>;
  startMis: Record<string, { status: string }>;
}) {
  const s = useSamajh();
  const router = useRouter();
  const now = nowFor(s.clockOffsetDays);
  const concepts = [...new Set(results.map((r) => r.conceptId))];
  const correct = results.filter((r) => r.correct).length;
  const misChanges = Object.values(s.misconceptions).filter((m) => startMis[m.id]?.status !== m.status);
  const action = useMemo(
    () => nextBestAction({ diagnosticDone: s.diagnostic.status === "done", states: s.states, misconceptions: s.misconceptions, cards: s.cards, now }),
    [s.diagnostic.status, s.states, s.misconceptions, s.cards, now],
  );
  return (
    <div className="mx-auto grid max-w-3xl gap-6">
      <div>
        <p className="text-[15px] text-slate">
          {correct} of {results.length} correct
        </p>
        <h1 className="display mt-1 text-[34px] font-bold text-navy">Session complete</h1>
      </div>
      <Sheet className="p-6">
        <p className="text-[14.5px] font-semibold text-navy">What changed in your learner model</p>
        <ul className="mt-3 grid gap-3">
          {concepts.map((id) => {
            const from = startStates[id]?.p ?? BKT.pInit;
            const to = s.states[id]?.p ?? BKT.pInit;
            return (
              <li key={id} className="grid gap-1">
                <div className="flex justify-between text-[15px]">
                  <span className="text-navy">{CONCEPT_BY_ID[id]?.title}</span>
                  <span className={cn("tabular font-semibold", to >= from ? "text-ink" : "text-redpen")}>
                    {pct(from)} → {pct(to)}
                  </span>
                </div>
                <InkBar p={to} from={from} />
              </li>
            );
          })}
        </ul>
        {misChanges.length > 0 && (
          <div className="mt-5 grid gap-3 border-t border-dashed border-navy/15 pt-4">
            {misChanges.map((m) =>
              m.status === "resolved" ? (
                // a fixed idea gets the same treatment as in the session: crossed out in green, then stamped
                <div key={m.id} className="flex flex-wrap items-center gap-x-4 gap-y-2">
                  <p className="hand relative inline-block text-[22px] leading-tight text-redpen">
                    {MISCONCEPTION_BY_ID[m.id]?.title}
                    {/* an absolutely positioned svg doesn't stretch to left/right on its own: give it the title's width */}
                    <StrikeThrough delay={350} className="w-full" />
                  </p>
                  <FixedStamp delay={850} className="px-2.5 text-[17px]" />
                </div>
              ) : (
                <MarginNote key={m.id} delay={200}>
                  {MISCONCEPTION_BY_ID[m.id]?.title}:{" "}
                  {m.status === "resolving" ? "getting fixed" : m.status === "active" ? "confirmed" : "suspected"}
                </MarginNote>
              ),
            )}
          </div>
        )}
      </Sheet>
      <div className="next-step rounded-[20px] p-5">
        <p className="text-[13.5px] font-semibold text-slate">Next best step</p>
        <p className="mt-0.5 text-[19px] font-bold text-navy">{action.title}</p>
        <p className="mt-1 text-[14.5px] text-navy/80">{action.why}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => router.push(actionHref(action))}>
            {action.cta} <ArrowRight className="size-4" />
          </Button>
          <ButtonLink href="/learn" variant="outline">
            Back to my map
          </ButtonLink>
        </div>
      </div>
      {plan.mode === "fix" && <p className="text-center text-[13px] text-slate">Fixed misconceptions are re-checked in later reviews in case they come back.</p>}
    </div>
  );
}
