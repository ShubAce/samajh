"use client";

import { ArrowRight, Check, Compass, Lightbulb, ShieldCheck, WandSparkles, X } from "lucide-react";
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { CHAPTER_BY_ID, CONCEPT_BY_ID } from "@/lib/curriculum/concepts";
import { MISCONCEPTION_BY_ID } from "@/lib/curriculum/misconceptions";
import { fallbackAnalysis } from "@/lib/engine/fallback";
import { ratingToDifficulty } from "@/lib/engine/learner";
import { questionRating } from "@/lib/engine/policy";
import { useMisconceptionDef, useSamajh } from "@/lib/store";
import type { Attempt, Misconception, OptionId, Question, ReasoningAnalysis } from "@/lib/types";
import { cn, pct } from "@/lib/utils";
import { InkBar, InkDot } from "./Ink";
import { ConfettiBurst, Elapsed, TweenNumber } from "./Motion";
import { FixedStamp, Handwriting, RedPenMark, StrikeThrough, TrapPips } from "./RedPen";
import { ReasoningInput, type Reasoning } from "./ReasoningInput";
import { Button, Pill, Spinner } from "./ui";

type Phase = "answer" | "analyzing" | "feedback";
/** a misconception that moved towards "fixed" on this answer */
type MisChange = { id: string; to: "resolving" | "resolved"; streak: number };

/**
 * Demo shortcuts: a clearly labelled row that picks an option and types realistic reasoning into the real
 * reasoning box. The student still presses Check and Gemini reads it live. Set to false for a clean recording.
 */
const DEMO_SHORTCUTS = true;

/** How a confused student usually types it (Hinglish), for the misconceptions a demo meets first. */
const SAMPLE: Record<string, string> = {
  "current-consumed": "bulb jalne ke liye thoda current kha jata hai, isliye bulb ke baad kam current bachta hai",
  "myopia-convex": "door ki cheezein saaf dekhne ke liye convex lens lagega, kyunki woh light ko converge karta hai",
  "hand-rule-swap": "wire kis taraf push hoga, woh right-hand thumb rule se pata chalega",
  "ignores-sign-convention": "saari distances positive leke formula lagaya, kyunki distance kabhi negative nahi hoti",
};

/**
 * Per trap option (`questionId:optionId`), where the misconception's generic line would not lead to that option's
 * numbers or framing. Each line is the misconception's own (wrong) working, so the typed reasoning matches the pick.
 */
const SAMPLE_FOR_OPTION: Record<string, string> = {
  "series-circuits-q3:A": "pehla 4 Ω resistor thoda current use kar leta hai, isliye 8 Ω wale resistor tak kam current pahunchta hai",
  "combined-circuits-q2:A": "X aur Y ko current pehle milta hai aur woh thoda kha jaate hain, toh Z ko sirf bacha hua current milta hai",
  "vision-defects-q2:B": "image retina ke peeche ban rahi hai, toh concave lens lagega jo light ko faila ke retina par focus karega",
  "vision-defects-q3:A": "door ki cheezein dekhne ke liye convex lens chahiye, toh power positive hogi: P = 1/0.8 = +1.25 D",
  "field-due-to-current-q2:A": "field ki direction Fleming ke left-hand rule se nikalti hai, isliye lines wire se seedhi bahar ki taraf jaati hain",
  "force-on-conductor-q3:C": "maine right-hand rule lagaya: particle west ja raha hai aur north mud raha hai, toh field neeche ki taraf aayi",
  "lens-ray-diagrams-q2:A": "lens ka neeche wala aadha dhak diya, toh image ka neeche wala aadha gayab ho jayega, sirf upar wala bachega",
  "lens-ray-diagrams-q2:B": "image ulti banti hai, toh lens ka neeche wala aadha dhakne se image ka upar wala aadha gayab ho jayega",
  "parallel-circuits-q1:A": "6 Ω + 6 Ω = 12 Ω, resistances toh hamesha add hoti hain",
  "parallel-circuits-q2:A": "naya 12 Ω resistor joda, toh total resistance 4 + 12 = 16 Ω ho jayega",
  "combined-circuits-q1:B": "saare resistances add kar diye: 2 + 4 + 4 = 10 Ω",
  "plane-mirror-q2:B": "image toh mirror ki surface par banti hai, toh 1 m chalne ke baad boy aur image ke beech 2 m bacha",
  "mirror-ray-diagrams-q3:A": "concave mirror image ko hamesha bada karta hai, toh object ko P aur F ke beech rakhna hoga",
  "refraction-laws-q2:A": "paani denser hai, toh light paani se hawa mein jaate hue normal ki taraf mudti hai",
  "refraction-laws-q3:B": "glass mein ray normal se door mudti hai, toh angle bada hoga: sin r = 1.5 × 0.5 = 0.75",
  "refractive-index-q1:A": "glass solid hai toh light usme tez chalti hai: 3 × 10⁸ × 1.5 = 4.5 × 10⁸ m/s",
  "refractive-index-q2:A": "paani kerosene se bhaari hai, toh woh optically bhi denser hoga",
  "refractive-index-q2:C": "kerosene ka refractive index zyada hai, toh light usme zyada tez chalegi",
  "lens-power-q2:A": "P = 3.5 − 2.5 = +1, toh f = 1/P = 1 cm, converging",
  "atmospheric-refraction-q2:B": "planets bhi stars ki tarah twinkle karte hain, bas unki twinkling itni slow hai ki humein dikhti nahi",
  "scattering-q1:A": "aasmaan mirror ki tarah samundar ka neela rang reflect karta hai, isliye blue dikhta hai",
  "potential-difference-q1:A": "1 volt matlab do points ke beech har second 1 coulomb charge flow karta hai",
  "potential-difference-q2:A": "voltage poore circuit mein flow karta hai, toh wire ke across bhi same 6 V aayega",
  "resistivity-q2:B": "dono wires same material ki hain, toh resistance bhi same 4 Ω hi rahega",
  "heating-effect-q2:A": "heat current ke saath badhti hai, toh H = I × R × t = 5 × 20 × 30 = 3000 J",
  "electric-power-q2:A": "1.5 kW ka matlab roz 1.5 unit, toh 30 din mein 45 unit, aur 45 × 6 = ₹270",
};

const rise = (ms: number) => `rise 420ms cubic-bezier(.2,.8,.2,1) ${ms}ms both`;
const pop = (ms: number) => `pop-in 380ms cubic-bezier(.2,.9,.3,1.3) ${ms}ms both`;

export function QuestionSheet({
  question,
  why,
  predicted,
  mode,
  header,
  onNext,
  nextLabel = "Next question",
  onAnswered,
  number,
}: {
  question: Question;
  why?: string;
  predicted?: number;
  mode: Attempt["mode"];
  header?: React.ReactNode;
  onNext: (attempt: Attempt) => void;
  nextLabel?: string;
  onAnswered?: (attempt: Attempt) => void;
  /** question number, written in the notebook margin */
  number?: number;
}) {
  const commitAttempt = useSamajh((s) => s.commitAttempt);
  const discovered = useSamajh((s) => s.discovered);
  const qstats = useSamajh((s) => s.qstats);
  const isDemo = useSamajh((s) => s.isDemo);
  const studentMis = useSamajh((s) => s.misconceptions);
  const lookup = useMisconceptionDef();
  const reduce = useReducedMotion();
  const [chosen, setChosen] = useState<OptionId | null>(null);
  const [reasoning, setReasoning] = useState<Reasoning>(null);
  const [phase, setPhase] = useState<Phase>("answer");
  const [attempt, setAttempt] = useState<Attempt | null>(null);
  const [typing, setTyping] = useState(false);
  /** bumps when the demo typer finishes, so the Check button pops once to say "your turn" */
  const [typedTick, setTypedTick] = useState(0);
  const [misChanges, setMisChanges] = useState<MisChange[]>([]);
  const typer = useRef<ReturnType<typeof setInterval> | null>(null);
  const analyzingRef = useRef<HTMLDivElement>(null);
  const checkRef = useRef<HTMLSpanElement>(null);
  // a real student never sees the shortcuts; the demo student (or ?demo=1, for a recording) does
  const [demoParam, setDemoParam] = useState(false);
  useEffect(() => {
    try {
      setDemoParam(new URLSearchParams(window.location.search).get("demo") === "1");
    } catch {
      /* no URL access: shortcuts stay off */
    }
  }, []);

  const DEMO_TOOLS = DEMO_SHORTCUTS && (isDemo || demoParam);

  useEffect(() => {
    if (typer.current) clearInterval(typer.current);
    typer.current = null;
    setTyping(false);
    setTypedTick(0);
    setChosen(null);
    setReasoning(null);
    setPhase("answer");
    setAttempt(null);
    setMisChanges([]);
  }, [question.id]);

  // stop the demo typer if the sheet goes away mid-sentence
  useEffect(
    () => () => {
      if (typer.current) clearInterval(typer.current);
    },
    [],
  );

  // once the demo typer finishes, the Check button can sit below the fold: bring it into view for the presenter
  useEffect(() => {
    if (typedTick === 0) return;
    const id = requestAnimationFrame(() =>
      checkRef.current?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" }),
    );
    return () => cancelAnimationFrame(id);
  }, [typedTick, reduce]);

  // the analysing trace replaces the reasoning box and can land below the fold: bring it into view
  useEffect(() => {
    if (phase !== "analyzing") return;
    const id = requestAnimationFrame(() =>
      analyzingRef.current?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" }),
    );
    return () => cancelAnimationFrame(id);
  }, [phase, reduce]);

  const stat = qstats[question.id];
  const calibrated = ratingToDifficulty(questionRating(question, qstats));

  // The trap a confused student falls into: prefer the misconception this student shows most strongly.
  const trap = useMemo(() => {
    const traps = question.options.filter((o) => o.misconceptionId && o.id !== question.answer);
    let best = traps[0] ?? null;
    let bestEvidence = -Infinity;
    for (const o of traps) {
      const m = studentMis[o.misconceptionId as string];
      if (m && m.status !== "resolved" && m.evidence > bestEvidence) {
        best = o;
        bestEvidence = m.evidence;
      }
    }
    return best;
  }, [question, studentMis]);
  const confusedText = trap?.misconceptionId
    ? (SAMPLE_FOR_OPTION[`${question.id}:${trap.id}`] ??
      SAMPLE[trap.misconceptionId] ??
      lookup(trap.misconceptionId)?.studentVoice ??
      "")
    : "";

  function stopTyper() {
    if (typer.current) clearInterval(typer.current);
    typer.current = null;
  }

  /** Demo shortcut: pick an option, then type the reasoning into the real box two characters at a time. */
  function demoFill(optionId: OptionId, text: string) {
    stopTyper();
    setChosen(optionId);
    if (!text) {
      setTyping(false);
      return;
    }
    if (reduce) {
      setTyping(false);
      setReasoning({ mode: "text", text });
      setTypedTick((k) => k + 1);
      return;
    }
    let n = 0;
    setTyping(true);
    typer.current = setInterval(() => {
      n = Math.min(text.length, n + 2);
      setReasoning({ mode: "text", text: text.slice(0, n) });
      if (n >= text.length) {
        stopTyper();
        setTyping(false);
        setTypedTick((k) => k + 1);
      }
    }, 24);
  }

  async function check() {
    if (!chosen || typing) return;
    const correct = chosen === question.answer;
    let analysis: ReasoningAnalysis;
    if (reasoning) {
      setPhase("analyzing");
      try {
        const res = await fetch("/api/analyze", {
          method: "POST",
          signal: AbortSignal.timeout(45_000),
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            question,
            chosen,
            correct,
            reasoningText: reasoning.mode === "text" ? reasoning.text : undefined,
            media:
              reasoning.mode === "voice"
                ? { kind: "audio", mimeType: reasoning.mimeType, data: reasoning.data }
                : reasoning.mode === "photo"
                  ? { kind: "image", mimeType: reasoning.mimeType, data: reasoning.data }
                  : undefined,
            extraMisconceptions: discovered satisfies Misconception[],
          }),
        });
        analysis = res.ok
          ? ((await res.json()) as ReasoningAnalysis)
          : fallbackAnalysis(question, chosen, correct, reasoning.mode === "text" ? reasoning.text : undefined);
      } catch {
        analysis = fallbackAnalysis(question, chosen, correct, reasoning.mode === "text" ? reasoning.text : undefined);
      }
    } else {
      analysis = fallbackAnalysis(question, chosen, correct);
    }
    const before = useSamajh.getState().misconceptions;
    const a = commitAttempt({
      question,
      chosen,
      mode,
      reasoningText: reasoning?.mode === "text" ? reasoning.text : analysis.transcript || undefined,
      reasoningMode: reasoning?.mode,
      analysis,
      predicted,
    });
    // which misconceptions just moved towards fixed (the engine counts clean trap answers in a row)
    const after = useSamajh.getState().misconceptions;
    setMisChanges(
      Object.values(after)
        .filter(
          (m) =>
            (m.status === "resolving" || m.status === "resolved") &&
            (before[m.id]?.status !== m.status || before[m.id]?.cleanStreak !== m.cleanStreak),
        )
        .map((m): MisChange => ({ id: m.id, to: m.status === "resolved" ? "resolved" : "resolving", streak: m.cleanStreak }))
        .sort((x, y) => Number(y.to === "resolved") - Number(x.to === "resolved")),
    );
    setAttempt(a);
    setPhase("feedback");
    onAnswered?.(a);
  }

  const concept = CONCEPT_BY_ID[question.conceptId];

  return (
    <div className="glass overflow-hidden rounded-[22px]">
      <div className="relative bg-white pb-5 pl-12 pr-4 pt-4 sm:pb-7 sm:pl-[76px] sm:pr-7 sm:pt-6">
        {/* exam-sheet margin: red rule + the question number in pen */}
        <span aria-hidden className="absolute inset-y-0 left-9 w-[1.5px] bg-redpen/35 sm:left-[60px]" />
        {number !== undefined && (
          <span aria-hidden className="hand absolute left-1.5 top-[18px] text-[20px] leading-none text-redpen/85 sm:left-4 sm:top-[26px] sm:text-[23px]">
            Q{number}.
          </span>
        )}
        {header}
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="ink">{concept?.title}</Pill>
          <span className="inline-flex items-center gap-1.5 text-[12.5px] text-slate" title="Difficulty is re-estimated from every answer (Elo calibration)">
            <DifficultyDots value={calibrated} />
            Difficulty {calibrated.toFixed(1)}
            {stat?.n ? ` · calibrated from ${stat.n} answers` : " · AI estimate"}
          </span>
          {question.source === "generated" && (
            <span
              className="inline-flex -rotate-2 items-center gap-1 rounded-[7px] border-2 border-good bg-white px-2 py-0.5 text-[11.5px] font-extrabold uppercase tracking-wide text-good"
              style={reduce ? undefined : { animation: "pop-in 420ms cubic-bezier(.2,.9,.3,1.3) 200ms both" }}
              title="Written by Gemini, then solved blind by a checker model. Shown only because both agreed."
            >
              <ShieldCheck className="size-3.5" aria-hidden /> New · verified
              <span className="sr-only">: written by Gemini, then solved blind by a checker model that agreed with the answer</span>
            </span>
          )}
        </div>

        {why && (
          <p className="mt-3 flex items-start gap-2 text-[14px] leading-snug text-slate">
            <Compass className="mt-0.5 size-4 shrink-0 text-ink" aria-hidden />
            <span>
              <span className="font-semibold text-navy">Why this question: </span>
              {why}
            </span>
          </p>
        )}

        <h2 className="display mt-4 text-[22px] font-bold leading-snug text-navy sm:text-[25px]" style={{ textWrap: "pretty", letterSpacing: "-0.015em" }}>
          {question.stem}
        </h2>

        <div className="mt-5 grid gap-3" role="radiogroup" aria-label="Answer options">
          {question.options.map((o) => {
            const isChosen = chosen === o.id;
            const isAnswer = o.id === question.answer;
            const done = phase === "feedback";
            const trapHit = done && isChosen && !isAnswer && o.misconceptionId;
            return (
              <button
                key={o.id}
                type="button"
                role="radio"
                aria-checked={isChosen}
                disabled={phase !== "answer"}
                onClick={() => setChosen(o.id)}
                className={cn(
                  "group flex w-full items-start gap-3 rounded-[14px] border-2 bg-white px-3.5 py-3 text-left transition-[transform,box-shadow,background-color] duration-150",
                  !done &&
                    (isChosen
                      ? "-translate-x-px -translate-y-px border-line bg-ink-soft shadow-[4px_4px_0_var(--color-line)]"
                      : "border-line/25 hover:-translate-y-px hover:border-line hover:shadow-[3px_3px_0_var(--color-line)]"),
                  done && isAnswer && "border-line bg-good-wash shadow-[3px_3px_0_var(--color-line)]",
                  done && isChosen && !isAnswer && "border-line bg-redpen-wash shadow-[3px_3px_0_var(--color-line)]",
                  done && !isChosen && !isAnswer && "border-line/15 opacity-55",
                )}
              >
                <span
                  className={cn(
                    "grid size-8 shrink-0 place-items-center rounded-full border-2 text-[14px] font-extrabold transition-colors",
                    isChosen && !done ? "border-line bg-ink text-white" : "border-line/70 bg-white text-navy",
                    done && isAnswer && "border-line bg-good text-white",
                    done && isChosen && !isAnswer && "border-line bg-redpen text-white",
                  )}
                >
                  {done && isAnswer ? <Check className="size-4" /> : done && isChosen ? <X className="size-4" /> : o.id}
                </span>
                <span className="pt-1 text-[16px] font-medium leading-snug text-navy">
                  {trapHit ? <RedPenMark text={o.text}>{o.text}</RedPenMark> : o.text}
                </span>
              </button>
            );
          })}
        </div>

        {phase === "answer" && (
          <>
            {DEMO_TOOLS && (
              <div
                role="group"
                aria-labelledby={`demo-${question.id}`}
                className="mt-4 flex flex-wrap items-center gap-2 rounded-[12px] border-2 border-dashed border-line/30 px-3 py-2"
              >
                <span id={`demo-${question.id}`} className="text-[12px] font-extrabold uppercase tracking-wide text-slate">
                  Demo shortcut
                </span>
                {trap && (
                  <Button
                    size="sm"
                    variant="highlight"
                    title="Picks the trap option and types the reasoning a student with this misconception usually gives. You still press Check, and Gemini reads it live."
                    onClick={() => demoFill(trap.id, confusedText)}
                  >
                    <WandSparkles className="size-3.5" aria-hidden /> Fill a confused answer
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  title="Picks the right option and types the worked reasoning."
                  onClick={() => demoFill(question.answer, question.explanation)}
                >
                  <Check className="size-3.5" aria-hidden /> Fill a correct answer
                </Button>
              </div>
            )}
            <div className="mt-5">
              <ReasoningInput
                value={reasoning}
                onChange={(r) => {
                  // the student's own typing, recording or photo always wins over the demo typer
                  if (typer.current) {
                    stopTyper();
                    setTyping(false);
                  }
                  setReasoning(r);
                }}
              />
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[13.5px] text-slate">
                {typing
                  ? "Typing the sample reasoning…"
                  : chosen
                    ? reasoning
                      ? "Samajh will read your reasoning before marking."
                      : "Tip: add your reasoning so Samajh can check how you got there."
                    : "Pick an answer to continue."}
              </p>
              <span
                key={typedTick}
                ref={checkRef}
                className="inline-flex scroll-mb-6"
                style={typedTick > 0 && !reduce ? { animation: "pop-in 420ms cubic-bezier(.2,.9,.3,1.3) both" } : undefined}
              >
                <Button size="lg" onClick={check} disabled={!chosen || typing}>
                  Check my answer
                </Button>
              </span>
            </div>
          </>
        )}

        {phase === "analyzing" && reasoning && (
          <div ref={analyzingRef} className="scroll-mt-24 scroll-mb-6">
            <AnalyzingTrace reasoning={reasoning} conceptId={question.conceptId} />
          </div>
        )}

        {phase === "feedback" && attempt && (
          <Feedback attempt={attempt} question={question} misChanges={misChanges} onNext={() => onNext(attempt)} nextLabel={nextLabel} />
        )}
      </div>
    </div>
  );
}

function DifficultyDots({ value }: { value: number }) {
  return (
    <span className="inline-flex gap-0.5" aria-hidden>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          className="size-1.5 rounded-full"
          style={{ background: "var(--color-navy)", opacity: value >= i - 0.25 ? 0.75 : 0.15 }}
        />
      ))}
    </span>
  );
}

/** static bar heights for the voice note when motion is reduced */
const STILL_BARS = [0.35, 0.6, 0.9, 0.5, 0.75, 1, 0.45, 0.8, 0.55, 0.7];

/** While Gemini works: show it reading the student's own words (or photo, or voice note), with a live timer. */
function AnalyzingTrace({ reasoning, conceptId }: { reasoning: NonNullable<Reasoning>; conceptId: string }) {
  const reduce = useReducedMotion();
  const mode = reasoning.mode;
  const count = useMemo(
    () => Object.values(MISCONCEPTION_BY_ID).filter((m) => m.conceptIds.includes(conceptId)).length,
    [conceptId],
  );
  const steps = [
    mode === "photo" ? "Reading your handwriting" : mode === "voice" ? "Transcribing what you said (Hinglish is fine)" : "Reading your reasoning",
    "Following your steps to find where they break",
    `Checking against ${count || "known"} documented misconceptions for this concept`,
    "Writing feedback in your words",
  ];
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((x) => Math.min(steps.length - 1, x + 1)), 1100);
    return () => clearInterval(t);
  }, [steps.length]);
  const heading =
    mode === "photo"
      ? "Gemini is reading your handwriting"
      : mode === "voice"
        ? "Gemini is listening to your explanation"
        : "Gemini is reading your reasoning";

  return (
    <div className="mt-6 rounded-[14px] border-2 border-line bg-ink-wash p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[14.5px] font-extrabold text-navy">{heading}</p>
        <Elapsed />
      </div>

      <div className="mt-3 rounded-[12px] border-2 border-dashed border-line/40 bg-white px-4 py-3">
        {reasoning.mode === "text" && <ScanWords text={reasoning.text} still={Boolean(reduce)} />}
        {reasoning.mode === "photo" && (
          <div className="flex flex-wrap items-center gap-4">
            <span className="relative inline-block max-w-full overflow-hidden rounded-md border-2 border-line">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={reasoning.preview} alt="Your working" className="block h-32 w-auto max-w-full object-cover" />
              {!reduce && (
                <motion.span
                  aria-hidden
                  className="absolute inset-x-0 h-0.75 bg-ink"
                  initial={{ top: "4%" }}
                  animate={{ top: ["4%", "94%"] }}
                  transition={{ duration: 1.4, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                />
              )}
            </span>
            <p className="max-w-65 text-[13.5px] leading-snug text-slate">Transcribing each line of your working, then checking every step.</p>
          </div>
        )}
        {reasoning.mode === "voice" && (
          <div className="flex flex-wrap items-center gap-3">
            <span aria-hidden className="flex h-7 items-end gap-0.75">
              {Array.from({ length: 20 }, (_, k) =>
                reduce ? (
                  <span
                    key={k}
                    className="h-7 w-1 origin-bottom rounded-full bg-ink"
                    style={{ transform: `scaleY(${STILL_BARS[k % STILL_BARS.length]})` }}
                  />
                ) : (
                  <motion.span
                    key={k}
                    className="h-7 w-1 origin-bottom rounded-full bg-ink"
                    initial={{ scaleY: 0.3 }}
                    animate={{ scaleY: [0.3, 1, 0.5, 0.9, 0.3] }}
                    transition={{ duration: 1.1, repeat: Infinity, delay: k * 0.05, ease: "easeInOut" }}
                  />
                ),
              )}
            </span>
            <span className="text-[13.5px] font-semibold text-navy">Your {reasoning.seconds} s recording</span>
          </div>
        )}
      </div>

      <p className="sr-only" aria-live="polite">
        {steps[i]}
      </p>
      <ol className="mt-3 grid gap-2">
        {steps.map((s, k) => (
          <li key={s} className={cn("flex items-center gap-2.5 text-[14px] text-navy transition-opacity", k > i ? "opacity-40" : "opacity-100")}>
            <span
              className={cn(
                "grid size-5 shrink-0 place-items-center rounded-full border-2 text-[11px]",
                k < i ? "border-line bg-ink text-white" : k === i ? "border-line bg-white" : "border-line/25 bg-white",
              )}
            >
              {k < i ? <Check className="size-3" strokeWidth={3} aria-hidden /> : k === i ? <Spinner className="size-3 text-ink" /> : null}
            </span>
            {s}
          </li>
        ))}
      </ol>
    </div>
  );
}

/** The student's own words, with a yellow highlighter sweeping across them as Gemini reads. */
function ScanWords({ text, still }: { text: string; still: boolean }) {
  const words = useMemo(() => {
    const all = text.trim().split(/\s+/).filter(Boolean);
    return all.length > 60 ? [...all.slice(0, 60), "…"] : all;
  }, [text]);
  const [scan, setScan] = useState(0);
  useEffect(() => {
    if (still) return;
    const t = setInterval(() => setScan((s) => (s + 1) % (words.length + 4)), 110);
    return () => clearInterval(t);
  }, [still, words.length]);
  return (
    <p className="leading-relaxed">
      <span className="sr-only">Reading your reasoning</span>
      <Handwriting>
        <span aria-hidden>
          {words.map((w, k) => (
            <span key={k}>
              {k > 0 && " "}
              <span
                className={cn(
                  "rounded-[3px] transition-[opacity,background-color,box-shadow] duration-100",
                  !still && (k === scan || k === scan - 1) && "bg-highlight shadow-[0_0_0_2px_var(--color-highlight)]",
                  !still && k > scan && "opacity-45",
                )}
              >
                {w}
              </span>
            </span>
          ))}
        </span>
      </Handwriting>
    </p>
  );
}

/** Find the model's evidence quote inside the student's words; tolerant of punctuation and spacing differences. */
function highlightQuote(text: string, quote?: string) {
  if (!quote || !text) return null;
  const q = quote.replace(/^["“”'‘’]+|["“”'‘’]+$/g, "").trim();
  if (q.length < 4) return null;
  const split = (i: number, len: number) => ({ before: text.slice(0, i), match: text.slice(i, i + len), after: text.slice(i + len) });
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx >= 0) return split(idx, q.length);
  const words = q.match(/[\p{L}\p{N}]+/gu) ?? [];
  if (words.length < 2) return null;
  const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const m = new RegExp(words.map(esc).join("[^\\p{L}\\p{N}]+"), "iu").exec(text);
  return m ? split(m.index, m[0].length) : null;
}

/** "models/gemini-3.5-flash-lite" → "Gemini 3.5 Flash Lite" */
function niceModel(m: string) {
  return m
    .replace("models/", "")
    .split("-")
    .filter(Boolean)
    .map((w) => (w === "gemini" ? "Gemini" : w[0].toUpperCase() + w.slice(1)))
    .join(" ");
}

function Feedback({
  attempt,
  question,
  misChanges,
  onNext,
  nextLabel,
}: {
  attempt: Attempt;
  question: Question;
  misChanges: MisChange[];
  onNext: () => void;
  nextLabel: string;
}) {
  const a = attempt.analysis;
  const correct = attempt.correct;
  const lookup = useMisconceptionDef();
  const reduce = useReducedMotion();
  const misIds = a?.misconceptionIds ?? [];
  const mis = misIds.map(lookup).filter((m): m is Misconception => Boolean(m));
  const studentMis = useSamajh((s) => s.misconceptions);
  const states = useSamajh((s) => s.states);
  const rightButShaky = correct && a?.engine === "gemini" && a.verdict === "misconception";
  const sound = correct && a?.engine === "gemini" && a.verdict === "sound";
  const reasoningShown = (attempt.reasoningMode === "text" ? attempt.reasoningText : a?.transcript) ?? "";
  const hl = highlightQuote(reasoningShown, a?.evidenceQuote);
  const concept = CONCEPT_BY_ID[attempt.conceptId];
  const before = attempt.masteryBefore;
  const after = attempt.masteryAfter;
  const up = after >= before;
  // only what visibly moved: a chip reading "93%→93%" would contradict its own heading
  const shown = (x: number) => Math.round(x * 100);
  const moved = (attempt.propagated ?? []).filter((c) => shown(c.from) !== shown(c.to));
  const unchanged = shown(before) === shown(after);
  const hasNotes = mis.length > 0 || Boolean(a?.novelMisconception);
  const wins = misChanges
    .map((c) => ({ ...c, title: lookup(c.id)?.title }))
    .filter((c): c is MisChange & { title: string } => Boolean(c.title))
    .slice(0, 2);

  // AI receipt: which model diagnosed this and how long it took (/api/analyze returns meta), or how the fallback matched
  const meta = (a as (ReasoningAnalysis & { meta?: { model?: string; ms?: number } }) | undefined)?.meta;
  const receipt =
    a?.engine === "gemini" && meta?.model && typeof meta.ms === "number"
      ? { by: niceModel(meta.model), s: (meta.ms / 1000).toFixed(1) }
      : null;
  // non-breaking spaces keep "in 1.9 s" together in the narrow sticky note
  const receiptLine = receipt
    ? `Diagnosed by ${receipt.by} in ${receipt.s} s`
    : a?.engine === "fallback" && misIds.length > 0 && reasoningShown
      ? "Matched from the trap option you picked"
      : null;

  const verdictRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [barP, setBarP] = useState(reduce ? after : before);

  // once the learner-model panel has landed, the bar drains over the red hatch (or fills up)
  useEffect(() => {
    if (reduce) return;
    const t = setTimeout(() => setBarP(after), 1200);
    return () => clearTimeout(t);
  }, [after, reduce]);

  // keep the feedback on screen: if the panel ends below the fold, bring the verdict up to the top
  useEffect(() => {
    const t = setTimeout(() => {
      const panel = panelRef.current;
      if (panel && panel.getBoundingClientRect().bottom > window.innerHeight) {
        verdictRef.current?.scrollIntoView({ block: "start", behavior: reduce ? "auto" : "smooth" });
      }
    }, 250);
    return () => clearTimeout(t);
  }, [reduce]);

  /** staged entrance, in reading order (everything at once with reduced motion) */
  const enter = (ms: number): React.CSSProperties | undefined => (reduce ? undefined : { animation: rise(ms) });
  const penDelay = reduce ? 0 : 450;

  const title = rightButShaky
    ? "Right answer, but the reasoning has a gap"
    : correct
      ? sound
        ? "Correct, and your reasoning holds up"
        : "Correct"
      : a?.verdict === "slip"
        ? "Not quite, but your method was right"
        : "Not quite";

  return (
    <div className="mt-6 grid gap-5 border-t-2 border-dashed border-line/15 pt-5" aria-live="polite">
      <div ref={verdictRef} className="flex scroll-mt-24 flex-wrap items-center gap-3">
        <span
          className={cn(
            "relative grid size-10 place-items-center rounded-full border-2 border-line shadow-[2px_2px_0_var(--color-line)]",
            correct && !rightButShaky ? "bg-good text-white" : "bg-redpen text-white",
          )}
          style={{ animation: "pop-in 420ms cubic-bezier(.2,.9,.3,1.3) both" }}
        >
          {correct && !rightButShaky ? <Check className="size-5" strokeWidth={3} /> : <X className="size-5" strokeWidth={3} />}
          {correct && !rightButShaky && <ConfettiBurst />}
        </span>
        <h3 className="display text-[24px] font-extrabold text-navy">{title}</h3>
        {after - before >= 0.01 && (
          <span
            className="tabular inline-flex h-8 items-center rounded-full border-2 border-line bg-ink px-3 text-[13.5px] font-extrabold text-white shadow-[2px_2px_0_var(--color-line)]"
            style={{ animation: "pop-in 520ms cubic-bezier(.2,.9,.3,1.2) 150ms both" }}
          >
            +{Math.round((after - before) * 100)}% mastery
          </span>
        )}
        {a?.engine === "gemini" && a.language && a.language !== "English" && <Pill tone="ink">Understood {a.language}</Pill>}
      </div>

      {wins.map((w) => (
        <MisconceptionWin key={w.id} title={w.title} fixed={w.to === "resolved"} streak={w.streak} />
      ))}

      {(reasoningShown || hasNotes) && (
        <div className="grid gap-4 md:grid-cols-[1fr_minmax(0,240px)] md:gap-6" style={enter(100)}>
          <div className="rounded-[14px] border-2 border-dashed border-line/40 bg-white px-4 py-3">
            {reasoningShown ? (
              <>
                <p className="mb-1 text-[12.5px] font-semibold text-slate">
                  {attempt.reasoningMode === "photo" ? "What Gemini read from your photo" : attempt.reasoningMode === "voice" ? "What you said" : "Your reasoning"}
                </p>
                <Handwriting>
                  {hl && mis.length + (a?.novelMisconception ? 1 : 0) > 0 ? (
                    <>
                      {hl.before}
                      <RedPenMark text={hl.match} delay={penDelay}>
                        {hl.match}
                      </RedPenMark>
                      {hl.after}
                    </>
                  ) : (
                    reasoningShown
                  )}
                </Handwriting>
              </>
            ) : (
              <p className="text-[15px] text-navy">
                You chose <strong>&ldquo;{question.options.find((o) => o.id === attempt.chosen)?.text}&rdquo;</strong>.
              </p>
            )}
            {a?.faultyStep && !hl && hasNotes && (
              <p className="mt-2 text-[14px] text-slate">
                Where it breaks:{" "}
                <RedPenMark text={a.faultyStep} delay={penDelay}>
                  <span className="text-navy">{a.faultyStep}</span>
                </RedPenMark>
              </p>
            )}
          </div>
          {hasNotes && (
            <div>
              {mis.map((m, i) => (
                <div
                  key={m.id}
                  className="sticky-note mb-3 rounded-[6px] p-3.5"
                  style={reduce ? undefined : { animation: `stick 520ms cubic-bezier(.2,.9,.3,1.2) ${700 + i * 150}ms both` }}
                >
                  <p className="text-[11.5px] font-extrabold text-redpen">
                    {studentMis[m.id]?.status === "suspected" ? "Possible misconception" : "Misconception detected"}
                    {a?.engine === "gemini" && a.confidence ? ` · ${Math.round(a.confidence * 100)}%` : ""}
                  </p>
                  <p className="display mt-0.5 text-[18px] font-extrabold leading-tight text-navy">{m.title}</p>
                  {i === 0 && receiptLine && <p className="mt-2 text-[11px] font-bold text-navy/55">{receiptLine}</p>}
                  {!reasoningShown && (
                    <p className="mt-1.5 text-[12.5px] font-semibold leading-snug text-navy/70">
                      This option is the trap for that idea. Explain your thinking next time and I can confirm it.
                    </p>
                  )}
                </div>
              ))}
              {a?.novelMisconception && (
                <div
                  className="sticky-note rounded-[6px] bg-[#e7ddff] p-3.5"
                  style={reduce ? undefined : { animation: `stick 520ms cubic-bezier(.2,.9,.3,1.2) ${700 + mis.length * 150}ms both` }}
                >
                  <p className="text-[11.5px] font-extrabold text-ink-deep">New idea spotted</p>
                  <p className="display mt-0.5 text-[18px] font-extrabold leading-tight text-navy">{a.novelMisconception.title}</p>
                  {mis.length === 0 && receiptLine && <p className="mt-2 text-[11px] font-bold text-navy/55">{receiptLine}</p>}
                  <p className="mt-1.5 text-[12.5px] font-semibold leading-snug text-navy/70">
                    Not in our list yet, so it has gone to your teacher to review. If approved, Samajh will look for it in every student.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {a?.feedback && (a.engine === "gemini" || !correct) && (
        <div className="grid gap-2" style={enter(850)}>
          <p className="text-[16.5px] leading-relaxed text-navy" style={{ textWrap: "pretty" }}>
            {a.feedback}
          </p>
          {a.hint && (
            <p className="flex items-start gap-2 rounded-[10px] bg-highlight-wash px-3 py-2 text-[15px] text-navy">
              <Lightbulb className="mt-0.5 size-4 shrink-0" aria-hidden />
              <span>
                <span className="font-semibold">Think about this: </span>
                {a.hint}
              </span>
            </p>
          )}
          {!hasNotes && receipt && (
            <p className="text-[11.5px] font-bold text-navy/55">
              Reasoning checked by {receipt.by} {`in ${receipt.s} s`}
            </p>
          )}
        </div>
      )}

      <div ref={panelRef} className="grid gap-3 rounded-[14px] border-2 border-line bg-ink-wash p-4" style={enter(1000)}>
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className="text-[14.5px] font-extrabold text-navy">Your learner model just updated</p>
          <p className="text-[12.5px] text-slate">Bayesian Knowledge Tracing, then spread through the prerequisite graph</p>
        </div>
        <div className="grid gap-1.5">
          <div className="flex items-center justify-between gap-3 text-[14.5px]">
            <span className="font-semibold text-navy">{concept?.title}</span>
            {unchanged ? (
              <span className="tabular shrink-0 font-extrabold text-ink">
                {pct(after)}
                <span className="font-semibold text-slate"> · {after >= 0.75 ? "already secure" : "no change"}</span>
              </span>
            ) : (
              <span className={cn("tabular shrink-0 font-extrabold", up ? "text-ink" : "text-redpen")}>
                {pct(before)} → <TweenNumber from={before} to={after} delay={1.2} />
              </span>
            )}
          </div>
          <InkBar p={barP} from={before} height={12} />
        </div>
        {moved.length > 0 && (
          <div>
            <p className="text-[13px] font-semibold text-navy">Also moved through the concept graph</p>
            <ul className="mt-1.5 flex flex-wrap gap-1.5">
              {moved.slice(0, 6).map((c, i) => {
                const cc = CONCEPT_BY_ID[c.conceptId];
                if (!cc) return null;
                return (
                  <li
                    key={c.conceptId}
                    className="inline-flex h-7 items-center gap-1.5 rounded-full border-[1.5px] border-line bg-white px-2.5 text-[12.5px] font-bold text-navy"
                    style={reduce ? undefined : { animation: pop(1500 + i * 80) }}
                  >
                    <InkDot
                      p={c.to}
                      size={12}
                      color={CHAPTER_BY_ID[cc.chapter]?.color}
                      estimated={(states[c.conceptId]?.attempts ?? 0) === 0}
                    />
                    {cc.short}
                    <span className={cn("tabular", c.to > c.from ? "text-ink" : "text-redpen")}>
                      {pct(c.from)}→{pct(c.to)}
                    </span>
                  </li>
                );
              })}
              {moved.length > 6 && (
                <li
                  className="inline-flex h-7 items-center rounded-full border-[1.5px] border-dashed border-line/50 bg-white px-2.5 text-[12.5px] font-bold text-slate"
                  style={reduce ? undefined : { animation: pop(1500 + 6 * 80) }}
                >
                  +{moved.length - 6} more
                </li>
              )}
            </ul>
          </div>
        )}
      </div>

      <details className="group rounded-[10px] px-1" style={enter(1100)}>
        <summary className="cursor-pointer list-none text-[14.5px] font-semibold text-ink hover:underline">
          Show the worked solution
        </summary>
        <p className="mt-2 text-[15px] leading-relaxed text-navy">{question.explanation}</p>
      </details>

      <div className="flex justify-end" style={enter(1100)}>
        <Button size="lg" onClick={onNext}>
          {nextLabel} <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

/**
 * The moment a misconception gives way where the student is looking: a trap beaten (1 of 2), or, on the
 * second clean answer in a row, "fixed" with a green strike through its name, a stamp and confetti.
 */
function MisconceptionWin({ title, fixed, streak }: { title: string; fixed: boolean; streak: number }) {
  const reduce = useReducedMotion();
  const [burst, setBurst] = useState(false);
  useEffect(() => {
    if (!fixed || reduce) return;
    const t = setTimeout(() => setBurst(true), 950);
    return () => clearTimeout(t);
  }, [fixed, reduce]);
  return (
    <div
      className="relative flex flex-wrap items-center gap-x-5 gap-y-2 rounded-[14px] border-2 border-line bg-good-wash px-4 py-3 shadow-[3px_3px_0_var(--color-line)]"
      style={reduce ? undefined : { animation: rise(200) }}
    >
      <div className="min-w-0 flex-1 basis-55">
        <p className="text-[12px] font-extrabold uppercase tracking-wide text-good">{fixed ? "Misconception fixed" : "Trap beaten"}</p>
        <StruckTitle text={title} struck={fixed} />
        <p className="mt-1 text-[13.5px] leading-snug text-navy/80">
          {fixed
            ? "You got past its trap twice in a row. If it comes back, Samajh will catch it in a later review."
            : "1 of 2. Beat this trap once more and it’s marked fixed."}
        </p>
      </div>
      <TrapPips n={Math.min(2, streak)} />
      {fixed && (
        <span className="relative">
          <FixedStamp />
          {burst && <ConfettiBurst />}
        </span>
      )}
    </div>
  );
}

/** A misconception's name in red pen. Once fixed, a green stroke is drawn through each line of it (wrapping-safe). */
function StruckTitle({ text, struck }: { text: string; struck: boolean }) {
  const boxRef = useRef<HTMLParagraphElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [lines, setLines] = useState<{ left: number; top: number; width: number }[]>([]);
  useLayoutEffect(() => {
    const box = boxRef.current;
    const span = textRef.current;
    if (!struck || !box || !span) return;
    const measure = () => {
      const b = box.getBoundingClientRect();
      setLines(
        Array.from(span.getClientRects())
          .filter((r) => r.width > 2)
          .map((r) => ({ left: r.left - b.left, top: r.top - b.top + r.height / 2, width: r.width })),
      );
    };
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver(measure);
    ro.observe(box);
    return () => ro.disconnect();
  }, [struck, text]);
  return (
    <p ref={boxRef} className="hand relative text-[22px] leading-tight text-redpen">
      <span ref={textRef}>{text}</span>
      {struck &&
        lines.map((l, i) => (
          <StrikeThrough
            key={i}
            delay={600 + i * 260}
            duration={lines.length > 1 ? 420 : 600}
            style={{ left: l.left, right: "auto", width: l.width, top: l.top }}
          />
        ))}
    </p>
  );
}
