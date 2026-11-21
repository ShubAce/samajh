"use client";

import { ArrowRight, Check, Sparkles } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ConceptMap } from "@/components/ConceptMap";
import { InkBar } from "@/components/Ink";
import { MarginNote } from "@/components/RedPen";
import { QuestionSheet } from "@/components/QuestionSheet";
import { Button, ButtonLink, Sheet } from "@/components/ui";
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
  const [genNote, setGenNote] = useState<string | null>(null);

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
        const { question, meta } = (await res.json()) as { question: Question; meta?: { verifierWorking?: string } };
        addGenerated(question);
        seen.current.add(question.id);
        setGenNote(meta?.verifierWorking ? `Verifier's working: ${meta.verifierWorking}` : null);
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
                  className="h-1.5 flex-1 rounded-full"
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
          <>
            <QuestionSheet
              question={current.question}
              why={current.why}
              predicted={current.predicted}
              mode={plan.mode === "review" ? "review" : plan.mode === "fix" ? "fix" : "practice"}
              number={step + 1}
              nextLabel={step + 1 >= plan.steps.length ? "Finish session" : "Next question"}
              onAnswered={(a) => {
                setResults((r) => [...r, a]);
                setPulse([a.conceptId, ...(a.propagated ?? []).map((p) => p.conceptId)]);
              }}
              onNext={() => {
                const n = step + 1;
                setStep(n);
                setPulse([]);
                setGenNote(null);
                load(n);
              }}
            />
            {genNote && current.question.source === "generated" && (
              <details className="mt-3 rounded-[10px] px-1 text-[13.5px] text-slate">
                <summary className="cursor-pointer font-semibold text-ink">How this question was checked</summary>
                <p className="mt-1">{genNote}</p>
              </details>
            )}
          </>
        )}
      </div>
      <aside className="grid content-start gap-4 lg:sticky lg:top-20">
        <Sheet className="graph-paper overflow-hidden p-4">
          <p className="mb-2 text-[14px] font-semibold text-navy">Live map</p>
          <ConceptMap states={states} misconceptions={misconceptions} compact focus={focusConcept} pulse={pulse} />
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

function Generating({ difficulty, conceptId, focus }: { difficulty: number; conceptId: string; focus?: string }) {
  const steps = [
    focus
      ? `Gemini drafts a question with a trap for "${MISCONCEPTION_BY_ID[focus]?.title}"`
      : `Gemini drafts a ${CONCEPT_BY_ID[conceptId]?.short} question at difficulty ${difficulty}/5`,
    "Each wrong option is tagged with the misconception it catches",
    "A second AI solves it from scratch, without seeing the answer key",
    "It's only shown to you if both agree",
  ];
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => Math.min(steps.length - 1, x + 1)), 1500);
    return () => clearInterval(t);
  }, [steps.length]);
  return (
    <Sheet className="p-6" aria-live="polite">
      <p className="flex items-center gap-2 text-[17px] font-bold text-navy">
        <Sparkles className="size-5 text-ink" /> Writing a new question for you
      </p>
      <ol className="mt-4 grid gap-2.5">
        {steps.map((s, k) => (
          <li key={s} className={cn("flex items-center gap-2.5 text-[15px] transition-opacity", k > i ? "opacity-35" : "")}>
            <span className={cn("grid size-5 place-items-center rounded-full border", k < i ? "border-ink bg-ink text-white" : "border-ink/40")}>
              {k < i ? <Check className="size-3" /> : k === i ? <span className="size-1.5 animate-pulse rounded-full bg-ink" /> : null}
            </span>
            {s}
          </li>
        ))}
      </ol>
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
          <div className="mt-5 border-t border-dashed border-navy/15 pt-4">
            {misChanges.map((m) => (
              <MarginNote key={m.id} delay={200} className={m.status === "resolved" ? "text-good" : undefined}>
                {MISCONCEPTION_BY_ID[m.id]?.title}:{" "}
                {m.status === "resolved" ? "fixed" : m.status === "resolving" ? "getting fixed" : m.status === "active" ? "confirmed" : "suspected"}
              </MarginNote>
            ))}
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
