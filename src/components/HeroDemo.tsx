"use client";

// The hero worksheet: one wrong idea arriving three ways (typed English, spoken Hinglish, a photo of Hindi
// working), each run through the same agent sequence: Gemini reads it, the red pen circles the faulty phrase,
// the diagnosis lands as a sticky note, the learner model updates, and the planner picks the next step.

import { ArrowRight, AudioLines, Camera, Keyboard, Pause, Play } from "lucide-react";
import { motion, useInView, useReducedMotion } from "motion/react";
import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import { CircuitIllustration } from "@/components/Illustrations";
import { InkBar } from "@/components/Ink";
import { Handwriting, RedPenCircle } from "@/components/RedPen";
import { Spinner } from "@/components/ui";
import { bktUpdate } from "@/lib/engine/learner";
import { cn, pct } from "@/lib/utils";

interface Script {
  key: "typed" | "voice" | "photo";
  label: string;
  Icon: typeof Keyboard;
  badge: string;
  before: string;
  mark: string;
  after: string;
  conf: number;
  note: string;
}

// The Hinglish lines are the demo seed's real transcript and feedback.
const SCRIPTS: Script[] = [
  {
    key: "typed",
    label: "Typed",
    Icon: Keyboard,
    badge: "Typed · English ✓",
    before: "The first one, because",
    mark: "it uses up the current",
    after: ", so less reaches the second bulb.",
    conf: 95,
    note: "The ammeters before and after the bulbs both read 0.5 A. A bulb transfers energy, not current.",
  },
  {
    key: "voice",
    label: "Spoken",
    Icon: AudioLines,
    badge: "Voice · Hinglish ✓",
    before: "pehla bulb thoda",
    mark: "current use kar leta hai",
    after: ", isliye doosre bulb tak kam current pahunchta hai",
    conf: 93,
    note: "Bulb energy use karta hai, current nahi. Jitna current andar jaata hai, utna hi bahar aata hai.",
  },
  {
    key: "photo",
    label: "Photo",
    Icon: Camera,
    badge: "Photo · हिंदी ✓",
    before: "पहला बल्ब ज़्यादा चमकेगा, क्योंकि वह",
    mark: "करंट खर्च कर देता है",
    after: ", दूसरे तक कम पहुँचता है।",
    conf: 90,
    note: "Bulb energy kharch karta hai, current nahi. Dono ammeter 0.5 A padhte hain.",
  },
];

const BEFORE = 0.62;
/** what the learner model itself does with one wrong answer at 62% mastery (Bayesian Knowledge Tracing): 26% */
const AFTER = bktUpdate(BEFORE, "incorrect");
const LOOP_MS = 8500;
const INTRO_MS = 650; // the first script waits for the card to rise in
const WAVE = [8, 14, 20, 12, 22, 16, 9, 18, 13, 21, 10, 6];
const STATUS = [
  { label: "Gemini is reading…", dot: "" },
  { label: "Misconception found", dot: "bg-redpen" },
  { label: "Learner model updated", dot: "bg-ink" },
  { label: "Next step planned", dot: "bg-highlight" },
];

const tokens = (s: string) => s.split(" ").filter(Boolean);
const isPunct = (t: string) => /^[,.;:!?।]+$/.test(t);
const wordCount = (s: Script) => tokens(s.before).length + tokens(s.mark).length + tokens(s.after).length;

/** The answer, written word by word. The faulty phrase sits inside the red pen from the first render. */
function AnswerWords({ s, wordAt, circleAt }: { s: Script; wordAt: (j: number) => number; circleAt: number }) {
  let j = 0;
  const word = (t: string) => {
    const k = j++;
    return (
      // 2px of padding (cancelled by the margin) keeps handwriting overhangs inside write's clip-path
      <span key={k} className="-mx-[2px] inline-block px-[2px] opacity-0" style={{ animation: `write 280ms ease-out ${wordAt(k)}ms forwards` }}>
        {t}
      </span>
    );
  };
  const atoms: { node: ReactNode; glue: boolean }[] = tokens(s.before).map((t) => ({ node: word(t), glue: isPunct(t) }));
  atoms.push({
    node: (
      <RedPenCircle delay={circleAt} className="whitespace-normal">
        {tokens(s.mark).map((t, m) => (
          <Fragment key={m}>
            {m > 0 && " "}
            {word(t)}
          </Fragment>
        ))}
      </RedPenCircle>
    ),
    glue: false,
  });
  for (const t of tokens(s.after)) atoms.push({ node: word(t), glue: isPunct(t) });

  // punctuation glues to the word before it, so it never wraps onto a line of its own
  const out: ReactNode[] = [];
  for (const a of atoms) {
    const prev = a.glue ? out.pop() : undefined;
    out.push(
      prev === undefined ? (
        a.node
      ) : (
        <span className="whitespace-nowrap">
          {prev}
          {a.node}
        </span>
      ),
    );
  }
  return (
    <>
      {out.map((n, k) => (
        <Fragment key={k}>
          {k > 0 && " "}
          {n}
        </Fragment>
      ))}
    </>
  );
}

export function HeroDemo() {
  const prefersReduced = useReducedMotion();
  // read after mount, so the server render and the first client render agree
  const [reduce, setReduce] = useState(false);
  useEffect(() => setReduce(Boolean(prefersReduced)), [prefersReduced]);

  const [i, setI] = useState(0);
  const [run, setRun] = useState(0); // bumps when an example is picked by hand, so it replays
  const [shown, setShown] = useState(0); // examples shown so far: only the first waits for the intro
  const [paused, setPaused] = useState(false);
  const [stage, setStage] = useState(0);
  const cardRef = useRef<HTMLDivElement>(null);
  const inView = useInView(cardRef, { amount: 0.3 });

  const s = SCRIPTS[i];
  const writeEnd = 120 + wordCount(s) * 60 + 280;
  const lead = shown === 0 ? INTRO_MS : 0;
  const at = (ms: number) => (reduce ? 0 : lead + ms);

  // reduced motion: show the final state and never advance on our own (Play opts back in)
  useEffect(() => {
    if (reduce) setPaused(true);
  }, [reduce]);

  // the agent sequence for this example
  useEffect(() => {
    if (reduce) {
      setStage(3);
      return;
    }
    const ts = [
      setTimeout(() => setStage(1), lead + writeEnd + 700),
      setTimeout(() => setStage(2), lead + writeEnd + 2100),
      setTimeout(() => setStage(3), lead + writeEnd + 2500),
    ];
    return () => ts.forEach(clearTimeout);
  }, [i, run, reduce, lead, writeEnd]);

  // the loop: typed → spoken → photo, paused off screen
  useEffect(() => {
    if (paused || !inView) return;
    const t = setTimeout(() => {
      setI((n) => (n + 1) % SCRIPTS.length);
      setStage(0);
      setShown((n) => n + 1);
    }, lead + LOOP_MS);
    return () => clearTimeout(t);
  }, [i, run, paused, inView, lead]);

  const pick = (k: number) => {
    setI(k);
    setRun((n) => n + 1);
    setStage(0);
    setShown((n) => n + 1);
    setPaused(true);
  };

  const status = STATUS[stage];
  const listening = !reduce && stage === 0; // the waveform moves only while Gemini is still listening

  return (
    <div className="relative" style={{ animation: "rise 750ms 150ms cubic-bezier(.2,.8,.2,1) both" }}>
      <div ref={cardRef} className="glass relative rounded-[26px] p-5 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
          <span className="rounded-full border-2 border-line bg-ink px-2.5 py-0.5 text-[12px] font-extrabold text-white">Q4 · Electricity</span>
          <span key={stage} className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-navy" style={{ animation: "pop-in 320ms both" }}>
            {stage === 0 ? <Spinner className="size-3.5 text-ink" /> : <span className={cn("size-2 rounded-full border border-line", status.dot)} />}
            {status.label}
          </span>
        </div>
        <p className="mt-3 text-[17px] font-bold leading-snug text-navy">
          Two identical bulbs are in series with a cell. Which glows brighter, and why?
        </p>
        {/* capped on laptops so the diagnosis, the learner model and the next step all land above the fold */}
        <div className="mt-3 rounded-[16px] border-2 border-line bg-paper px-3 py-2">
          <CircuitIllustration className="mx-auto max-h-[200px] lg:max-h-[164px]" />
        </div>

        {/* the loop can be paused, and any example replayed (WCAG 2.2.2) */}
        <div className="mt-4 flex items-center justify-between gap-3">
          <div role="group" aria-label="Example answer" className="flex items-center gap-1.5">
            {SCRIPTS.map((x, k) => (
              <button
                key={x.key}
                type="button"
                aria-pressed={k === i}
                aria-label={`${x.label} answer`}
                onClick={() => pick(k)}
                className={cn(
                  "inline-flex h-8 items-center gap-1.5 rounded-full border-[1.5px] border-line px-2.5 text-[12.5px] font-bold transition-colors sm:px-3",
                  k === i ? "bg-ink text-white" : "bg-white text-navy hover:bg-ink-wash",
                )}
              >
                <x.Icon className="size-3.5" aria-hidden />
                <span className="hidden sm:inline">{x.label}</span>
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setPaused((p) => !p)}
            aria-label={paused ? "Play example" : "Pause example"}
            className="relative grid size-8 shrink-0 place-items-center rounded-full border-2 border-line bg-white text-navy transition-colors hover:bg-ink-wash"
          >
            {/* time until the next example, drawn round the button */}
            {!paused && inView && (
              <svg
                key={`${i}-${run}`}
                aria-hidden
                viewBox="0 0 36 36"
                className="pointer-events-none absolute -left-[2px] -top-[2px] size-[calc(100%_+_4px)] -rotate-90"
              >
                <circle
                  cx={18}
                  cy={18}
                  r={17}
                  fill="none"
                  stroke="var(--color-ink)"
                  strokeWidth={2.5}
                  pathLength={1}
                  style={{ strokeDasharray: 1, strokeDashoffset: 1, animation: `draw ${lead + LOOP_MS}ms linear forwards` }}
                />
              </svg>
            )}
            {paused ? <Play className="size-3.5" aria-hidden /> : <Pause className="size-3.5" aria-hidden />}
          </button>
        </div>

        {/* everything below remounts per example, so its CSS choreography replays */}
        <div key={`${i}-${run}`}>
          <div
            className={cn(
              "mt-2.5 min-h-[180px] rounded-[16px] border-2 border-dashed border-line/40 bg-white px-4 py-3 sm:min-h-[132px] lg:min-h-[150px] xl:min-h-[132px]",
              s.key === "photo" && "rotate-[-1deg]",
            )}
            style={
              s.key === "photo"
                ? { backgroundImage: "repeating-linear-gradient(transparent 0 30px, rgb(51 85 255 / .16) 30px 31px)" }
                : undefined
            }
          >
            {s.key === "voice" ? (
              <div className="flex items-center gap-2">
                <span aria-hidden className="flex h-[22px] items-center gap-[3px]">
                  {WAVE.map((h, j) => (
                    <motion.span
                      key={j}
                      className="w-[3px] rounded-full bg-ink"
                      style={{ height: h }}
                      animate={{ scaleY: listening ? [0.35, 1, 0.35] : 1 }}
                      transition={
                        listening ? { duration: 0.9, repeat: Infinity, delay: j * 0.07, ease: "easeInOut" } : { duration: 0.25 }
                      }
                    />
                  ))}
                </span>
                <span className="text-[11.5px] font-bold text-faint">Voice note · transcribed by Gemini</span>
              </div>
            ) : (
              <p className="flex items-center gap-1.5 text-[11.5px] font-bold text-faint">
                {s.key === "photo" && <Camera className="size-3.5" aria-hidden />}
                {s.key === "photo" ? "Read from a notebook photo" : "Typed answer"}
              </p>
            )}
            <Handwriting className={cn("mt-0.5 block text-[18px] leading-[31px] sm:text-[20px]", s.key === "photo" && "text-[#3a3a46]")}>
              <AnswerWords s={s} wordAt={(j) => at(120 + j * 60)} circleAt={at(writeEnd + 700)} />
            </Handwriting>
          </div>

          {/* the learner model: the fill drains over the red hatch */}
          <div
            className="mt-4 grid gap-1.5 px-1 sm:max-w-[min(54%,calc(100%_-_224px))]"
            style={{ animation: `rise 450ms ease-out ${at(writeEnd + 1800)}ms both` }}
          >
            <div className="flex items-baseline justify-between gap-2 text-[12.5px] font-bold">
              <span className="text-slate">Learner model · Series circuits</span>
              <span className={cn("tabular shrink-0", stage >= 2 ? "text-redpen" : "text-navy")}>
                {stage >= 2 ? `${pct(BEFORE)} → ${pct(AFTER)}` : pct(BEFORE)}
              </span>
            </div>
            <InkBar p={stage >= 2 ? AFTER : BEFORE} from={BEFORE} height={11} />
          </div>

          {/* the AI's diagnosis lands as a sticky note */}
          <div
            className="sticky-note relative ml-auto mt-3 w-[88%] rounded-[6px] p-4 sm:absolute sm:-bottom-10 sm:-right-4 sm:ml-0 sm:mt-0 sm:w-[250px]"
            style={{ animation: `stick 520ms cubic-bezier(.2,.9,.3,1.2) ${at(writeEnd + 1300)}ms both` }}
          >
            <p className="text-[11.5px] font-extrabold text-redpen">Misconception detected · {s.conf}%</p>
            <p className="display mt-1 text-[19px] font-extrabold leading-tight text-navy">Current gets used up</p>
            <p className="mt-1.5 text-[13px] font-semibold leading-snug text-navy/75">{s.note}</p>
          </div>

          {/* the planner's decision: pinned under the note, or (on wide screens) to the card's bottom-left edge, mirroring the badge */}
          <div className="mt-4 flex justify-end sm:absolute sm:-bottom-[84px] sm:right-0 sm:mt-0 xl:-bottom-4 xl:left-5 xl:right-auto xl:-rotate-[1.5deg] xl:justify-start">
            <p
              className="inline-flex items-center gap-1.5 rounded-full border-2 border-line bg-highlight px-3 py-1 text-[13px] font-extrabold text-navy shadow-[2px_2px_0_var(--color-line)]"
              style={{ animation: `pop-in 400ms ${at(writeEnd + 2500)}ms both` }}
            >
              Next step: Fix &ldquo;Current gets used up&rdquo;
              <ArrowRight className="size-4 shrink-0" aria-hidden />
            </p>
          </div>
        </div>
      </div>

      <div
        key={i}
        className="absolute -left-4 -top-5 hidden rotate-[-6deg] rounded-full border-2 border-line bg-white px-3 py-1 text-[12.5px] font-extrabold text-navy shadow-[2px_2px_0_var(--color-line)] sm:block"
        style={{ animation: `pop-in 400ms ${shown === 0 ? 1200 : 150}ms both` }}
      >
        {s.badge}
      </div>
    </div>
  );
}
