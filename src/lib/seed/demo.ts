// Builds a realistic 3-week learner history for the demo student by replaying scripted answers
// through the exact same engine the live app uses.
import { SEED_QUESTIONS } from "../curriculum/questions";
import { applyAttempt, type LearnerSnapshot } from "../engine/apply";
import { DAY, initialStates } from "../engine/learner";
import type { Attempt, NovelMisconceptionProposal, OptionId, Question, ReasoningAnalysis } from "../types";
import { classCalibration } from "./class";

type Outcome = "right" | "wrong" | "trap";
interface Step {
  c: string;
  o: Outcome;
  mis?: string;
  d: number; // days ago
  mode?: Attempt["mode"];
  reasoning?: { mode: "text" | "voice" | "photo"; text: string; analysis: Omit<ReasoningAnalysis, "engine"> };
}

const SCRIPT: Step[] = [
  // diagnostic, 20 days ago
  { c: "ohms-law", o: "right", d: 20, mode: "diagnostic" },
  { c: "parallel-circuits", o: "trap", mis: "parallel-adds-like-series", d: 20, mode: "diagnostic" },
  { c: "series-circuits", o: "right", d: 20, mode: "diagnostic" },
  {
    c: "current-charge",
    o: "trap",
    mis: "current-consumed",
    d: 20,
    mode: "diagnostic",
    reasoning: {
      mode: "voice",
      text: "pehla bulb thoda current use kar leta hai, isliye doosre bulb tak kam current pahunchta hai",
      analysis: {
        verdict: "misconception",
        transcript: "pehla bulb thoda current use kar leta hai, isliye doosre bulb tak kam current pahunchta hai",
        misconceptionIds: ["current-consumed"],
        faultyStep: "“pehla bulb thoda current use kar leta hai”",
        evidenceQuote: "pehla bulb thoda current use kar leta hai",
        confidence: 0.93,
        feedback:
          "Tumne socha ki bulb current ‘use’ kar leta hai. Bulb energy use karta hai, current nahi — jitna current andar jaata hai, utna hi bahar aata hai.",
        hint: "Agar bulb ke pehle aur baad mein ek-ek ammeter lagayein, toh dono kya padhenge?",
        language: "Hinglish",
      },
    },
  },
  { c: "reflection-laws", o: "right", d: 20, mode: "diagnostic" },
  { c: "mirror-formula", o: "trap", mis: "ignores-sign-convention", d: 20, mode: "diagnostic" },
  { c: "lens-ray-diagrams", o: "right", d: 20, mode: "diagnostic" },
  { c: "magnetic-field-lines", o: "right", d: 20, mode: "diagnostic" },
  { c: "force-on-conductor", o: "trap", mis: "hand-rule-swap", d: 20, mode: "diagnostic" },
  { c: "dispersion", o: "right", d: 20, mode: "diagnostic" },
  // practice over the following weeks
  { c: "parallel-circuits", o: "right", d: 18 },
  { c: "lens-ray-diagrams", o: "trap", mis: "half-lens-half-image", d: 16 },
  { c: "ohms-law", o: "right", d: 15 },
  { c: "refraction-laws", o: "right", d: 15 },
  { c: "lens-ray-diagrams", o: "right", d: 13 },
  { c: "reflection-laws", o: "right", d: 12 },
  { c: "plane-mirror", o: "right", d: 12 },
  { c: "lens-ray-diagrams", o: "right", d: 10 },
  { c: "heating-effect", o: "right", d: 9 },
  { c: "electric-power", o: "right", d: 8 },
  { c: "refractive-index", o: "right", d: 8 },
  { c: "vision-defects", o: "trap", mis: "myopia-convex", d: 7 },
  { c: "eye-accommodation", o: "right", d: 6 },
  { c: "vision-defects", o: "right", d: 5 },
  { c: "series-circuits", o: "right", d: 5 },
  { c: "electric-power", o: "wrong", d: 4 },
  { c: "scattering", o: "right", d: 4 },
  {
    c: "combined-circuits",
    o: "trap",
    mis: "current-consumed",
    d: 2,
    reasoning: {
      mode: "text",
      text: "The first bulb uses up some of the current, so less reaches the second bulb and it glows dimmer.",
      analysis: {
        verdict: "misconception",
        misconceptionIds: ["current-consumed"],
        faultyStep: "“uses up some of the current”",
        evidenceQuote: "The first bulb uses up some of the current",
        confidence: 0.95,
        feedback:
          "You said the first bulb uses up current. Bulbs in series carry exactly the same current. What the bulb uses up is energy, not charge.",
        hint: "If current were used up, what would an ammeter placed after the last bulb read?",
        language: "English",
      },
    },
  },
  { c: "mirror-formula", o: "wrong", d: 1 },
  { c: "ohms-law", o: "right", d: 1 },
];

function pickQuestion(step: Step, used: Map<string, number>): { q: Question; chosen: OptionId } | null {
  const qs = SEED_QUESTIONS.filter((q) => q.conceptId === step.c);
  if (!qs.length) return null;
  let q: Question | undefined;
  let chosen: OptionId | undefined;
  if (step.o === "trap" && step.mis) {
    q = qs.find((x) => x.options.some((o) => o.misconceptionId === step.mis));
    chosen = q?.options.find((o) => o.misconceptionId === step.mis)?.id;
  }
  if (!q || !chosen) {
    const n = used.get(step.c) ?? 0;
    q = qs[n % qs.length];
    used.set(step.c, n + 1);
    chosen =
      step.o === "right"
        ? q.answer
        : (q.options.find((o) => o.id !== q!.answer && !o.misconceptionId) ?? q.options.find((o) => o.id !== q!.answer))!.id;
  }
  return { q, chosen };
}

export const CLASSMATE_PROPOSALS: NovelMisconceptionProposal[] = [
  {
    id: "nm-seed-1",
    conceptId: "domestic-circuits",
    title: "An MCB stores extra current",
    description:
      "Believes an MCB or fuse stores the excess current and releases it later, instead of breaking the circuit when the current exceeds a limit.",
    evidenceQuote: "MCB extra current ko store kar leta hai aur baad mein dheere dheere chhodta hai",
    status: "pending",
    createdAt: Date.now() - 2 * DAY,
    studentName: "Fatima Shaikh",
  },
];

export function buildDemo(now: number) {
  let snap: LearnerSnapshot = {
    states: initialStates(),
    theta: 1000,
    qstats: { ...classCalibration() },
    misconceptions: {},
    proposals: [
      {
        id: "nm-seed-2",
        conceptId: "scattering",
        title: "Clouds are white because water is white",
        description:
          "Explains the white colour of clouds by the colour of water itself, instead of large droplets scattering all wavelengths about equally.",
        evidenceQuote: "clouds are white because they are made of water and water vapour is white",
        status: "pending",
        createdAt: now - 4 * DAY,
        studentName: "Aarav",
      },
      ...CLASSMATE_PROPOSALS,
    ],
    cards: {},
  };
  const attempts: Attempt[] = [];
  const asked: string[] = [];
  const used = new Map<string, number>();
  SCRIPT.forEach((step, i) => {
    const pick = pickQuestion(step, used);
    if (!pick) return;
    const t = now - step.d * DAY + i * 7 * 60_000 - 10 * 3600_000;
    const analysis: ReasoningAnalysis | undefined = step.reasoning
      ? { ...step.reasoning.analysis, engine: "gemini" }
      : undefined;
    const res = applyAttempt(
      snap,
      {
        question: pick.q,
        chosen: pick.chosen,
        mode: step.mode ?? "practice",
        reasoningText: step.reasoning?.text,
        reasoningMode: step.reasoning?.mode,
        analysis,
        studentName: "Aarav",
      },
      t,
    );
    snap = res.snap;
    attempts.push(res.attempt);
    if (step.mode === "diagnostic") asked.push(pick.q.id);
  });

  // A diligent student has kept up with reviews: most cards are scheduled ahead, a few are due now.
  const cards = { ...snap.cards };
  Object.keys(cards)
    .sort()
    .forEach((id, i) => {
      const interval = [2, 5, 8, 13, 5, 8][i % 6];
      const reps = 1 + (i % 3);
      const lastReview = i < 3 ? now - interval * DAY * 1.25 : now - Math.max(1, Math.floor(interval * 0.45)) * DAY;
      cards[id] = { ...cards[id], interval, reps, ease: 2.5, lastReview, due: lastReview + interval * DAY };
    });
  snap = { ...snap, cards };
  return { snap, attempts, asked };
}
