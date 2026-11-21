// Tutor policy: graph-adaptive diagnostic, Elo-matched question selection, and next-best-action planning.
// Every decision carries a plain-language "why" so the student (and judges) can see the agent's reasoning.

import {
  CHAPTER_BY_ID,
  CONCEPTS,
  CONCEPT_BY_ID,
  ancestorsOf,
  descendantsOf,
} from "../curriculum/concepts";
import { MISCONCEPTION_BY_ID } from "../curriculum/misconceptions";
import type { ConceptState, Question, SrsCard, StudentMisconception } from "../types";
import {
  BKT,
  difficultyToRating,
  effectiveTheta,
  expectedCorrect,
  retention,
  rootCause,
} from "./learner";

export const DIAGNOSTIC_LENGTH = 10;

export interface QuestionStat {
  rating: number;
  n: number;
  correct: number;
  /** rating before any responses (from AI / author difficulty estimate) */
  initialRating: number;
}

export function questionRating(q: Question, stats: Record<string, QuestionStat>) {
  return stats[q.id]?.rating ?? difficultyToRating(q.difficulty);
}

export function predictCorrect(
  q: Question,
  stats: Record<string, QuestionStat>,
  theta: number,
  p: number,
) {
  return expectedCorrect(effectiveTheta(theta, p), questionRating(q, stats));
}

const title = (id: string) => CONCEPT_BY_ID[id]?.title ?? id;
const pOf = (states: Record<string, ConceptState>, id: string) => states[id]?.p ?? BKT.pInit;

export interface Pick {
  question: Question;
  conceptId: string;
  why: string;
  predicted: number;
}

/* ───────────────────────── Graph-adaptive diagnostic ───────────────────────── */

export function pickDiagnostic(params: {
  states: Record<string, ConceptState>;
  asked: string[];
  history: { conceptId: string; correct: boolean }[];
  pool: Question[];
  stats: Record<string, QuestionStat>;
  theta: number;
}): Pick | null {
  const { states, asked, history, pool, stats, theta } = params;
  const askedSet = new Set(asked);
  const probed = new Set(history.map((h) => h.conceptId));
  const probedChapters = new Set(history.map((h) => CONCEPT_BY_ID[h.conceptId]?.chapter));
  const last = history[history.length - 1];
  // limit root-cause chasing to 3 probes in a row, then widen coverage again
  let trailingMisses = 0;
  for (let i = history.length - 1; i >= 0 && !history[i].correct; i--) trailingMisses++;
  const chaseRoot = trailingMisses > 0 && trailingMisses < 3;
  const lastAnc = last ? ancestorsOf(last.conceptId) : new Map<string, number>();
  const lastDesc = last ? descendantsOf(last.conceptId) : new Map<string, number>();

  type Cand = { id: string; score: number; reason: "root" | "climb" | "chapter" | "uncertain" };
  const cands: Cand[] = [];
  for (const c of CONCEPTS) {
    if (!pool.some((q) => q.conceptId === c.id && !askedSet.has(q.id))) continue;
    const p = pOf(states, c.id);
    const uncertainty = 1 - Math.abs(2 * p - 1);
    const links = ancestorsOf(c.id).size + descendantsOf(c.id).size;
    let score = (0.25 + uncertainty) * (0.6 + 0.08 * links);
    let reason: Cand["reason"] = "uncertain";
    if (probed.has(c.id)) score *= 0.2;
    if (!probedChapters.has(c.chapter)) {
      score *= 1.7;
      reason = "chapter";
    }
    if (last && !last.correct && chaseRoot && lastAnc.has(c.id) && !probed.has(c.id)) {
      score *= 2.4 / lastAnc.get(c.id)!;
      reason = "root";
    } else if (last && last.correct && lastDesc.get(c.id) === 1 && !probed.has(c.id)) {
      score *= 1.35;
      reason = "climb";
    }
    cands.push({ id: c.id, score, reason });
  }
  if (!cands.length) return null;
  cands.sort((a, b) => b.score - a.score);
  const best = cands[0];
  const p = pOf(states, best.id);

  const qs = pool.filter((q) => q.conceptId === best.id && !askedSet.has(q.id));
  // diagnostic aims a little below the comfort zone (≈60% predicted success) to be informative
  const question = qs
    .map((q) => ({ q, e: predictCorrect(q, stats, theta, p) }))
    .sort((a, b) => Math.abs(a.e - 0.6) - Math.abs(b.e - 0.6))[0];

  const links = ancestorsOf(best.id).size + descendantsOf(best.id).size;
  let why = "";
  switch (best.reason) {
    case "root":
      why = `You missed ${title(last!.conceptId)}, so I'm checking ${title(best.id)}, one of its prerequisites, to find the root cause.`;
      break;
    case "climb":
      why = `You got ${title(last!.conceptId)} right, so I'm moving up to ${title(best.id)}, which builds on it.`;
      break;
    case "chapter":
      why = `First look at ${CHAPTER_BY_ID[CONCEPT_BY_ID[best.id].chapter].short}. ${title(best.id)} links to ${links} other concepts, so one answer tells me a lot.`;
      break;
    default:
      why = `I'm least sure about ${title(best.id)} right now, so this answer will teach me the most.`;
  }
  return { question: question.q, conceptId: best.id, why, predicted: question.e };
}

/* ───────────────────────── Practice selection ───────────────────────── */

export function pickPractice(params: {
  conceptId: string;
  states: Record<string, ConceptState>;
  pool: Question[];
  stats: Record<string, QuestionStat>;
  theta: number;
  seen: Set<string>;
  focusMisconceptionId?: string;
  /** with a focus misconception: only return questions that contain its trap */
  requireTrap?: boolean;
}): { question: Question; predicted: number; why: string } | null {
  const { conceptId, states, pool, stats, theta, seen, focusMisconceptionId, requireTrap } = params;
  const p = pOf(states, conceptId);
  let qs = pool.filter((q) => q.conceptId === conceptId && !seen.has(q.id));
  let hasTrap = false;
  if (focusMisconceptionId) {
    const traps = qs.filter((q) => q.options.some((o) => o.misconceptionId === focusMisconceptionId));
    if (traps.length) {
      qs = traps;
      hasTrap = true;
    } else if (requireTrap) return null;
  }
  if (!qs.length) return null;
  const best = qs
    .map((q) => ({ q, e: predictCorrect(q, stats, theta, p) }))
    .sort((a, b) => Math.abs(a.e - 0.7) - Math.abs(b.e - 0.7))[0];
  const pct = Math.round(best.e * 100);
  const why =
    focusMisconceptionId && hasTrap
      ? `One of these options is the trap that "${MISCONCEPTION_BY_ID[focusMisconceptionId]?.title}" falls into. Let's see if it still catches you.`
      : focusMisconceptionId
        ? `A check on ${title(conceptId)}, the concept this idea damages most.`
        : best.e < 0.55
          ? `The most approachable question at your current level (about a ${pct}% chance). Get it right and your mastery jumps.`
          : best.e > 0.85
            ? `A quick confidence check (about a ${pct}% chance) before the harder ones.`
            : `Picked so you have about a ${pct}% chance of getting it right: hard enough to learn from, easy enough to keep going.`;
  return { question: best.q, predicted: best.e, why };
}

/* ───────────────────────── Next best action ───────────────────────── */

export type ActionKind = "diagnostic" | "fix" | "review" | "learn" | "stretch";

export interface NextAction {
  kind: ActionKind;
  conceptId?: string;
  misconceptionId?: string;
  dueConceptIds?: string[];
  title: string;
  why: string;
  cta: string;
}

export function actionHref(a: NextAction) {
  switch (a.kind) {
    case "diagnostic":
      return "/diagnostic";
    case "fix":
      return `/practice?mode=fix&mis=${a.misconceptionId}`;
    case "review":
      return "/practice?mode=review";
    case "learn":
      return `/practice?mode=learn&concept=${a.conceptId}`;
    case "stretch":
      return `/practice?mode=stretch&concept=${a.conceptId}`;
  }
}

export function dueCards(cards: Record<string, SrsCard>, now: number) {
  return Object.values(cards)
    .filter((c) => c.due <= now)
    .sort((a, b) => retention(a, now) - retention(b, now));
}

export function nextBestAction(params: {
  diagnosticDone: boolean;
  states: Record<string, ConceptState>;
  misconceptions: Record<string, StudentMisconception>;
  cards: Record<string, SrsCard>;
  now: number;
}): NextAction {
  const { diagnosticDone, states, misconceptions, cards, now } = params;
  if (!diagnosticDone) {
    return {
      kind: "diagnostic",
      title: "Take the 10-question diagnostic",
      why: "Ten questions are enough to estimate all 31 concepts, because each answer also tells me about the concepts linked to it.",
      cta: "Start diagnostic",
    };
  }

  const active = Object.values(misconceptions)
    .filter((m) => m.status === "active" || m.status === "suspected")
    .sort((a, b) => b.evidence - a.evidence || b.lastSeen - a.lastSeen);
  if (active.length && active[0].evidence >= 1) {
    const m = active[0];
    const def = MISCONCEPTION_BY_ID[m.id];
    const conceptId = def
      ? [...def.conceptIds].sort((a, b) => pOf(states, a) - pOf(states, b))[0]
      : undefined;
    return {
      kind: "fix",
      misconceptionId: m.id,
      conceptId,
      title: `Fix "${def?.title ?? m.id}"`,
      why: `This idea has shown up ${m.evidence >= 2 ? `${Math.round(m.evidence)} times` : "in your answers"}. Until it's fixed, it will keep costing marks in ${conceptId ? title(conceptId) : "this chapter"}. The next questions are built to challenge it.`,
      cta: "Start fixing",
    };
  }

  const due = dueCards(cards, now);
  if (due.length) {
    const r = Math.round(retention(due[0], now) * 100);
    return {
      kind: "review",
      dueConceptIds: due.map((d) => d.conceptId),
      title: `Review ${due.length} concept${due.length > 1 ? "s" : ""} before they fade`,
      why: `Your recall of ${title(due[0].conceptId)} has dropped to about ${r}%. A quick review now pushes the next one further out.`,
      cta: "Start review",
    };
  }

  // frontier: not yet secure, but prerequisites are in place
  const notSecure = CONCEPTS.filter((c) => pOf(states, c.id) < 0.75);
  if (notSecure.length) {
    const frontier = notSecure.filter((c) => c.prereqs.every((p) => pOf(states, p) >= 0.6));
    if (frontier.length) {
      const best = frontier
        .map((c) => ({ c, v: descendantsOf(c.id).size * 0.02 + (0.75 - pOf(states, c.id)) }))
        .sort((a, b) => b.v - a.v)[0].c;
      const unlocks = descendantsOf(best.id).size;
      return {
        kind: "learn",
        conceptId: best.id,
        title: `Learn ${best.title}`,
        why:
          unlocks > 0
            ? `You have its prerequisites in place, and it unlocks ${unlocks} more concept${unlocks > 1 ? "s" : ""}.`
            : `You have its prerequisites in place. It's one of the last gaps in ${CHAPTER_BY_ID[best.chapter].short}.`,
        cta: "Practise this",
      };
    }
    const weakest = [...notSecure].sort((a, b) => pOf(states, a.id) - pOf(states, b.id))[0];
    const root = rootCause(states, weakest.id) ?? weakest.id;
    return {
      kind: "learn",
      conceptId: root,
      title: `Learn ${title(root)}`,
      why:
        root !== weakest.id
          ? `${title(root)} is the root of your trouble with ${title(weakest.id)}. Fix the foundation first.`
          : `${title(root)} is your weakest concept right now.`,
      cta: "Practise this",
    };
  }

  const hardest = [...CONCEPTS].sort((a, b) => pOf(states, a.id) - pOf(states, b.id))[0];
  return {
    kind: "stretch",
    conceptId: hardest.id,
    title: "Stretch yourself",
    why: "Everything is secure. Board-level questions on your least-practised concept will keep it that way.",
    cta: "Take a challenge",
  };
}

export function chapterMastery(states: Record<string, ConceptState>) {
  const out: Record<string, number> = {};
  for (const ch of Object.keys(CHAPTER_BY_ID)) {
    const cs = CONCEPTS.filter((c) => c.chapter === ch);
    out[ch] = cs.reduce((s, c) => s + pOf(states, c.id), 0) / cs.length;
  }
  return out;
}

export function overallMastery(states: Record<string, ConceptState>) {
  return CONCEPTS.reduce((s, c) => s + pOf(states, c.id), 0) / CONCEPTS.length;
}
