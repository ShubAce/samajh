"use client";

import { ArrowRight } from "lucide-react";
import { useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { ConceptMap } from "@/components/ConceptMap";
import { InkBar, InkWell } from "@/components/Ink";
import { MarginNote } from "@/components/RedPen";
import { QuestionSheet } from "@/components/QuestionSheet";
import { Button, ButtonLink, Sheet, Spinner } from "@/components/ui";
import { CHAPTERS, CONCEPT_BY_ID, CONCEPTS } from "@/lib/curriculum/concepts";
import { MISCONCEPTION_BY_ID } from "@/lib/curriculum/misconceptions";
import { BKT } from "@/lib/engine/learner";
import {
  DIAGNOSTIC_LENGTH,
  actionHref,
  chapterMastery,
  nextBestAction,
  overallMastery,
  pickDiagnostic,
  type Pick,
} from "@/lib/engine/policy";
import { nowFor, usePool, useSamajh } from "@/lib/store";
import type { Attempt } from "@/lib/types";
import { pct } from "@/lib/utils";

export default function DiagnosticPage() {
  return (
    <AppShell wide>
      <Diagnostic />
    </AppShell>
  );
}

function Diagnostic() {
  const student = useSamajh((s) => s.student);
  const diagnostic = useSamajh((s) => s.diagnostic);
  const [showResults, setShowResults] = useState(false);
  // set while "Explore as Aarav" navigates to /learn, so the demo student's Intro doesn't flash here meanwhile
  const [openingDemo, setOpeningDemo] = useState(false);

  if (openingDemo) {
    return (
      <Sheet className="mx-auto mt-8 flex max-w-lg items-center gap-3 p-7 text-[16px] font-semibold text-navy" aria-live="polite">
        <Spinner className="size-5 text-ink" /> Opening Aarav&rsquo;s map…
      </Sheet>
    );
  }
  if (!student) return <NameStep onDemo={() => setOpeningDemo(true)} />;
  if (showResults) return <Results />;
  if (diagnostic.status !== "running") return <Intro done={diagnostic.status === "done"} />;
  return <Runner onFinish={() => setShowResults(true)} />;
}

function NameStep({ onDemo }: { onDemo: () => void }) {
  const start = useSamajh((s) => s.start);
  const startDiagnostic = useSamajh((s) => s.startDiagnostic);
  const loadDemo = useSamajh((s) => s.loadDemo);
  const router = useRouter();
  const [name, setName] = useState("");
  return (
    <Sheet className="mx-auto mt-8 max-w-lg p-7 sm:p-9">
      <h1 className="display text-[32px] font-bold text-navy">Let&rsquo;s map what you know</h1>
      <p className="mt-2 text-[16px] leading-snug text-slate">
        Ten questions across Light, the Human Eye, Electricity and Magnetism. Each answer also tells Samajh about the
        concepts linked to it, so ten is enough to sketch all 31.
      </p>
      <form
        className="mt-6 grid gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          start(name);
          startDiagnostic();
        }}
      >
        <label htmlFor="name" className="text-[14.5px] font-semibold text-navy">
          What should Samajh call you?
        </label>
        <input
          id="name"
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your first name"
          maxLength={24}
          className="h-12 rounded-[11px] border border-navy/20 bg-surface px-4 text-[17px] text-navy focus:border-ink focus:outline-none"
        />
        <Button size="lg" type="submit" disabled={!name.trim()}>
          Start the diagnostic
        </Button>
        <p className="text-[13px] text-slate">Your progress stays in this browser. No sign-up needed.</p>
      </form>
      <p className="mt-5 border-t border-dashed border-navy/15 pt-4 text-[13.5px] text-slate">
        In a hurry?{" "}
        <button
          type="button"
          className="text-left font-bold text-ink hover:underline"
          onClick={() => {
            onDemo();
            loadDemo();
            router.push("/learn");
          }}
        >
          Explore as Aarav, a demo student three weeks in
        </button>
      </p>
    </Sheet>
  );
}

function Intro({ done }: { done: boolean }) {
  const startDiagnostic = useSamajh((s) => s.startDiagnostic);
  return (
    <Sheet className="mx-auto mt-8 max-w-xl p-7 sm:p-9">
      <h1 className="display text-[32px] font-bold text-navy">{done ? "Retake the diagnostic?" : "Ready when you are"}</h1>
      <p className="mt-2 text-[16px] leading-snug text-slate">
        {done
          ? "Your map keeps everything it has learned. A retake adds ten fresh data points."
          : "Ten questions, about six minutes. Explaining your thinking is optional, but it lets Samajh tell a careless slip from a misconception."}
      </p>
      <ul className="mt-5 grid gap-2 text-[15px] text-navy">
        <li>The next question depends on your last answer. Miss one and Samajh checks its prerequisites to find the root cause.</li>
        <li>Wrong options are designed traps. Each one matches a documented misconception.</li>
        <li>Watch the map fill with ink as Samajh learns about you.</li>
      </ul>
      <div className="mt-7 flex flex-wrap gap-3">
        <Button size="lg" onClick={startDiagnostic}>
          {done ? "Retake the diagnostic" : "Start question 1"}
        </Button>
        {done && (
          <ButtonLink href="/learn" variant="outline" size="lg">
            Back to my map
          </ButtonLink>
        )}
      </div>
    </Sheet>
  );
}

function Runner({ onFinish }: { onFinish: () => void }) {
  const pool = usePool();
  const states = useSamajh((s) => s.states);
  const misconceptions = useSamajh((s) => s.misconceptions);
  const finishDiagnostic = useSamajh((s) => s.finishDiagnostic);
  const [current, setCurrent] = useState<Pick | null>(null);
  const [pulse, setPulse] = useState<string[]>([]);
  const [lastAttempt, setLastAttempt] = useState<Attempt | null>(null);
  const reduce = useReducedMotion();
  // the question we've already advanced from, so a double-click on "Next" can't skip one
  const advancedFrom = useRef<string | null>(null);

  const computeNext = () => {
    const s = useSamajh.getState();
    const history = s.attempts
      .filter((a) => a.mode === "diagnostic" && a.t >= (s.diagnostic.startedAt ?? 0))
      .map((a) => ({ conceptId: a.conceptId, correct: a.correct }));
    if (s.diagnostic.asked.length >= DIAGNOSTIC_LENGTH) return null;
    return pickDiagnostic({ states: s.states, asked: s.diagnostic.asked, history, pool, stats: s.qstats, theta: s.theta });
  };

  useEffect(() => {
    if (!current) {
      const next = computeNext();
      if (next) setCurrent(next);
      else {
        finishDiagnostic();
        onFinish();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const asked = useSamajh((s) => s.diagnostic.asked.length);
  const index = Math.min(DIAGNOSTIC_LENGTH, asked + (lastAttempt?.questionId === current?.question.id ? 0 : 1));

  if (!current) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_400px]">
      <div>
        <div className="mb-4 flex items-center gap-4">
          <p className="tabular shrink-0 text-[15px] font-semibold text-navy">
            Question {index} of {DIAGNOSTIC_LENGTH}
          </p>
          <div className="flex flex-1 gap-1" aria-hidden>
            {Array.from({ length: DIAGNOSTIC_LENGTH }).map((_, i) => (
              <span
                key={i}
                className="h-1.5 flex-1 rounded-full transition-[background-color] duration-500"
                style={{ background: i < asked ? "var(--color-ink)" : "rgba(0,0,0,.1)" }}
              />
            ))}
          </div>
        </div>
        {/* keyed: every new question lands with a short rise (backwards fill leaves no transform behind) */}
        <div key={current.question.id} style={{ animation: "rise 380ms cubic-bezier(.2,.8,.2,1) backwards" }}>
          <QuestionSheet
            question={current.question}
            why={current.why}
            predicted={current.predicted}
            mode="diagnostic"
            number={index}
            nextLabel={asked >= DIAGNOSTIC_LENGTH ? "See my map" : "Next question"}
            onAnswered={(a) => {
              setLastAttempt(a);
              // the ripple (and its caption) covers only the concepts that visibly moved
              const moved = (a.propagated ?? []).filter((p) => Math.round(p.from * 100) !== Math.round(p.to * 100));
              setPulse([a.conceptId, ...moved.map((p) => p.conceptId)]);
            }}
            onNext={() => {
              if (advancedFrom.current === current.question.id) return;
              advancedFrom.current = current.question.id;
              const next = computeNext();
              setPulse([]);
              window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
              if (!next) {
                finishDiagnostic();
                onFinish();
              } else setCurrent(next);
            }}
          />
        </div>
      </div>
      <aside className="grid content-start gap-4 self-start lg:sticky lg:top-20">
        <Sheet className="graph-paper overflow-hidden p-4">
          <p className="mb-2 text-[14px] font-semibold text-navy">Your map, filling in live</p>
          <ConceptMap states={states} misconceptions={misconceptions} compact focus={current.conceptId} pulse={pulse} />
          {pulse.length > 1 && (
            <p key={pulse.join()} className="hand mt-1 text-[17px] leading-snug text-ink" style={{ animation: "write 600ms ease-out backwards" }}>
              This answer also updated {pulse.length - 1} linked concept{pulse.length - 1 === 1 ? "" : "s"}
            </p>
          )}
          <p className="mt-2 text-[12.5px] leading-snug text-slate">
            Solid ink means checked directly. Pale ink is estimated from linked concepts. Highlighted is the concept being tested now.
          </p>
        </Sheet>
        <Sheet className="p-4">
          <p className="text-[14px] font-semibold text-navy">What Samajh knows so far</p>
          <ul className="mt-2 grid gap-2">
            {CHAPTERS.map((ch) => {
              const cs = CONCEPTS.filter((c) => c.chapter === ch.id);
              const m = cs.reduce((s, c) => s + (states[c.id]?.p ?? BKT.pInit), 0) / cs.length;
              return (
                <li key={ch.id} className="grid gap-1">
                  <div className="flex justify-between text-[13.5px]">
                    <span className="text-navy">{ch.short}</span>
                    <span className="tabular text-slate">{pct(m)}</span>
                  </div>
                  <InkBar p={m} height={6} />
                </li>
              );
            })}
          </ul>
        </Sheet>
      </aside>
    </div>
  );
}

function Results() {
  const s = useSamajh();
  const router = useRouter();
  const now = nowFor(s.clockOffsetDays);
  const diag = s.attempts.filter((a) => a.mode === "diagnostic" && a.t >= (s.diagnostic.startedAt ?? 0));
  const correct = diag.filter((a) => a.correct).length;
  const chapters = chapterMastery(s.states);
  const sorted = [...CHAPTERS].sort((a, b) => chapters[b.id] - chapters[a.id]);
  const foundMis = [...new Set(diag.flatMap((a) => a.analysis?.misconceptionIds ?? []))];
  const weakest = [...CONCEPTS].sort((a, b) => (s.states[a.id]?.p ?? BKT.pInit) - (s.states[b.id]?.p ?? BKT.pInit))[0];
  const action = useMemo(
    () =>
      nextBestAction({
        diagnosticDone: true,
        states: s.states,
        misconceptions: s.misconceptions,
        cards: s.cards,
        now,
      }),
    [s.states, s.misconceptions, s.cards, now],
  );

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center gap-6">
        <InkWell p={overallMastery(s.states)} caption="first estimate" />
        <div>
          <p className="text-[15px] text-slate">
            {correct} of {diag.length} correct. Samajh estimated all {CONCEPTS.length} concepts from these answers.
          </p>
          <h1 className="display mt-1 text-[36px] font-bold text-navy sm:text-[42px]">Your map is ready</h1>
        </div>
      </div>
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
        <Sheet className="graph-paper overflow-x-auto p-4 sm:p-5">
          <div className="min-w-[760px]">
            <ConceptMap states={s.states} misconceptions={s.misconceptions} />
          </div>
        </Sheet>
        <div className="grid content-start gap-4">
          <Sheet className="p-5">
            <p className="text-[14px] font-semibold text-slate">Strongest chapter</p>
            <p className="text-[20px] font-bold text-navy">
              {sorted[0].short} <span className="tabular font-semibold text-ink">{pct(chapters[sorted[0].id])}</span>
            </p>
            <p className="mt-3 text-[14px] font-semibold text-slate">Needs the most work</p>
            <p className="text-[20px] font-bold text-navy">
              {sorted[sorted.length - 1].short}{" "}
              <span className="tabular font-semibold text-redpen">{pct(chapters[sorted[sorted.length - 1].id])}</span>
            </p>
            <p className="mt-3 text-[14px] text-slate">
              Weakest single concept: <span className="font-semibold text-navy">{weakest.title}</span>
            </p>
          </Sheet>
          {foundMis.length > 0 && (
            <Sheet className="p-5">
              <p className="text-[14px] font-semibold text-slate">Misconceptions spotted</p>
              {foundMis.map((id) => (
                <MarginNote key={id} delay={200} className="mt-1">
                  {MISCONCEPTION_BY_ID[id]?.title ?? CONCEPT_BY_ID[id]?.title}
                </MarginNote>
              ))}
            </Sheet>
          )}
          <div className="next-step rounded-[20px] p-5">
            <p className="text-[13.5px] font-semibold text-slate">Recommended next step</p>
            <p className="mt-0.5 text-[19px] font-bold leading-tight text-navy">{action.title}</p>
            <p className="mt-1 text-[14.5px] leading-snug text-navy/80">{action.why}</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button onClick={() => router.push(actionHref(action))}>
                {action.cta} <ArrowRight className="size-4" />
              </Button>
              <ButtonLink href="/learn" variant="outline">
                Open my map
              </ButtonLink>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
