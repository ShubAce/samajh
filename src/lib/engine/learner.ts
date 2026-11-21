// The learner model: Bayesian Knowledge Tracing per concept + prerequisite-graph propagation,
// Elo-style difficulty calibration, and SM-2-style spaced repetition with a forgetting curve.
// Everything here is deterministic maths — the LLM is only used for language & judgement.

import {
  CONCEPTS,
  CONCEPT_BY_ID,
  ancestorsOf,
  descendantsOf,
} from "../curriculum/concepts";
import type { ConceptState, SrsCard } from "../types";

export const DAY = 86_400_000;
export const clamp = (x: number, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, x));

/* ───────────────────────── Bayesian Knowledge Tracing ───────────────────────── */

export const BKT = { pInit: 0.3, pTransit: 0.1, pSlip: 0.1, pGuess: 0.25 };

export type Evidence =
  | "correct-sound" // right answer + reasoning confirmed sound → strong evidence
  | "correct" // right answer, no reasoning to check
  | "correct-misconception" // right answer but reasoning reveals a misconception
  | "incorrect-slip" // wrong answer but reasoning was right (careless)
  | "incorrect";

/** posterior after one observation, then the learning transition */
export function bktUpdate(p: number, evidence: Evidence): number {
  let correct = true;
  let g = BKT.pGuess;
  let s = BKT.pSlip;
  switch (evidence) {
    case "correct-sound":
      g = 0.08; // reasoning shows it wasn't a guess
      break;
    case "correct":
      break;
    case "correct-misconception":
      correct = false; // treat as a miss: the mental model is wrong
      s = 0.2;
      break;
    case "incorrect-slip":
      correct = false;
      s = 0.45; // a slip says little about knowledge
      break;
    case "incorrect":
      correct = false;
      break;
  }
  const post = correct
    ? (p * (1 - s)) / (p * (1 - s) + (1 - p) * g)
    : (p * s) / (p * s + (1 - p) * (1 - g));
  return clamp(post + (1 - post) * BKT.pTransit, 0.02, 0.98);
}

export const isCorrectEvidence = (e: Evidence) => e === "correct" || e === "correct-sound";

/**
 * Prerequisite propagation. Knowledge of a concept is (softly) bounded by its prerequisites:
 *  - doing well on X pulls weaker prerequisites up towards X
 *  - doing badly on X pulls stronger dependents down towards X
 * Directly-measured concepts move less (their own evidence dominates).
 */
export function propagate(
  states: Record<string, ConceptState>,
  conceptId: string,
  newP: number,
): { conceptId: string; from: number; to: number }[] {
  const changes: { conceptId: string; from: number; to: number }[] = [];
  const w = (d: number) => 0.5 * Math.pow(0.6, d - 1); // success → prerequisites
  const wDown = (d: number) => 0.36 * Math.pow(0.55, d - 1); // failure → dependents (one miss is weaker evidence)
  const damp = (id: string) => 1 / (1 + 0.8 * (states[id]?.attempts ?? 0));

  for (const [anc, d] of ancestorsOf(conceptId)) {
    const from = states[anc]?.p ?? BKT.pInit;
    let to = from;
    if (from < newP) to = from + (newP - from) * w(d) * damp(anc);
    // failing X is weak evidence against its direct prerequisites
    else if (d === 1 && from > newP) to = from - (from - newP) * 0.15 * damp(anc);
    to = clamp(to, 0.02, 0.98);
    if (Math.abs(to - from) > 0.004) changes.push({ conceptId: anc, from, to });
  }
  for (const [desc, d] of descendantsOf(conceptId)) {
    const from = states[desc]?.p ?? BKT.pInit;
    let to = from;
    if (from > newP) to = from - (from - newP) * wDown(d) * damp(desc);
    // knowing X makes its direct dependents somewhat more likely (necessary, not sufficient)
    else if (d === 1 && from < newP) to = from + (newP - from) * 0.22 * damp(desc);
    to = clamp(to, 0.02, 0.98);
    if (Math.abs(to - from) > 0.004) changes.push({ conceptId: desc, from, to });
  }
  return changes;
}

export function initialStates(): Record<string, ConceptState> {
  return Object.fromEntries(
    CONCEPTS.map((c) => [c.id, { p: BKT.pInit, attempts: 0, correct: 0, history: [] }]),
  );
}

export type MasteryBand = "unseen" | "shaky" | "developing" | "secure";
export function band(state: ConceptState | undefined): MasteryBand {
  if (!state) return "unseen";
  if (state.attempts === 0 && state.history.length === 0) return "unseen";
  if (state.p < 0.45) return "shaky";
  if (state.p < 0.75) return "developing";
  return "secure";
}

export const bandLabel: Record<MasteryBand, string> = {
  unseen: "Not checked yet",
  shaky: "Shaky",
  developing: "Getting there",
  secure: "Secure",
};

/** Root cause: the most fundamental weak prerequisite behind a weak concept */
export function rootCause(
  states: Record<string, ConceptState>,
  conceptId: string,
  threshold = 0.5,
): string | null {
  // prefer weak prerequisites we have actual evidence for; among those, the most fundamental
  const anc = [...ancestorsOf(conceptId).entries()]
    .filter(([id]) => (states[id]?.p ?? BKT.pInit) < threshold)
    .map(([id, d]) => ({ id, d, p: states[id]?.p ?? BKT.pInit, seen: (states[id]?.attempts ?? 0) > 0 }))
    .sort((a, b) => Number(b.seen) - Number(a.seen) || a.p - b.p || b.d - a.d);
  return anc.length ? anc[0].id : null;
}

/* ───────────────────────── Elo difficulty calibration ───────────────────────── */

export const difficultyToRating = (d: number) => 700 + d * 100; // 1→800 … 5→1200
export const ratingToDifficulty = (r: number) => clamp((r - 700) / 100, 1, 5);

export function expectedCorrect(theta: number, rating: number) {
  return 1 / (1 + Math.pow(10, (rating - theta) / 400));
}

/** student's effective ability on one concept: global rating shifted by concept mastery */
export function effectiveTheta(theta: number, p: number) {
  return theta + 320 * (p - 0.5);
}

export function eloUpdate(theta: number, rating: number, n: number, correct: boolean) {
  const e = expectedCorrect(theta, rating);
  const o = correct ? 1 : 0;
  const kStudent = 28;
  const kItem = Math.max(8, 36 / Math.sqrt(1 + n));
  return {
    theta: theta + kStudent * (o - e),
    rating: rating - kItem * (o - e),
    expected: e,
  };
}

/* ───────────────────────── Spaced repetition ───────────────────────── */

/** predicted recall: 90% when the interval has elapsed, decaying exponentially */
export function retention(card: SrsCard, now: number) {
  const days = Math.max(0, (now - card.lastReview) / DAY);
  return Math.exp((Math.log(0.9) * days) / Math.max(0.5, card.interval));
}

export function newCard(conceptId: string, now: number): SrsCard {
  return { conceptId, interval: 1, ease: 2.5, reps: 0, due: now + DAY, lastReview: now, lapses: 0 };
}

export function reviewCard(card: SrsCard, success: boolean, now: number): SrsCard {
  if (!success) {
    return {
      ...card,
      reps: 0,
      lapses: card.lapses + 1,
      interval: 1,
      ease: Math.max(1.3, card.ease - 0.2),
      lastReview: now,
      due: now + DAY,
    };
  }
  const reps = card.reps + 1;
  const interval = reps === 1 ? 2 : reps === 2 ? 5 : Math.round(card.interval * card.ease);
  return {
    ...card,
    reps,
    interval,
    ease: Math.min(3, card.ease + 0.1),
    lastReview: now,
    due: now + interval * DAY,
  };
}

export const MASTERY_FOR_CARD = 0.7;

export function conceptTitle(id: string) {
  return CONCEPT_BY_ID[id]?.title ?? id;
}
