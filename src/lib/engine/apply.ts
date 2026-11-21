// Pure state transition for one answered question: BKT + graph propagation, Elo calibration,
// misconception lifecycle, teacher-review proposals, and spaced-repetition scheduling.
import { MISCONCEPTION_BY_ID } from "../curriculum/misconceptions";
import type {
  Attempt,
  ConceptState,
  NovelMisconceptionProposal,
  OptionId,
  Question,
  ReasoningAnalysis,
  SrsCard,
  StudentMisconception,
} from "../types";
import {
  BKT,
  DAY,
  MASTERY_FOR_CARD,
  bktUpdate,
  difficultyToRating,
  effectiveTheta,
  eloUpdate,
  newCard,
  propagate,
  reviewCard,
  type Evidence,
} from "./learner";
import type { QuestionStat } from "./policy";

export interface LearnerSnapshot {
  states: Record<string, ConceptState>;
  theta: number;
  qstats: Record<string, QuestionStat>;
  misconceptions: Record<string, StudentMisconception>;
  proposals: NovelMisconceptionProposal[];
  cards: Record<string, SrsCard>;
}

export interface AttemptArgs {
  question: Question;
  chosen: OptionId;
  mode: Attempt["mode"];
  reasoningText?: string;
  reasoningMode?: Attempt["reasoningMode"];
  analysis?: ReasoningAnalysis;
  predicted?: number;
  studentName?: string;
}

export function evidenceFor(correct: boolean, analysis?: ReasoningAnalysis): Evidence {
  const v = analysis?.engine === "gemini" ? analysis.verdict : undefined;
  if (correct) return v === "sound" ? "correct-sound" : v === "misconception" ? "correct-misconception" : "correct";
  return v === "slip" ? "incorrect-slip" : "incorrect";
}

export function applyAttempt(
  snap: LearnerSnapshot,
  args: AttemptArgs,
  now: number,
): { snap: LearnerSnapshot; attempt: Attempt } {
  const { question: q, chosen, mode, reasoningText, reasoningMode, analysis } = args;
  const correct = chosen === q.answer;
  const evidence = evidenceFor(correct, analysis);

  // ── learner model ──
  const states = { ...snap.states };
  const prev: ConceptState = states[q.conceptId] ?? { p: BKT.pInit, attempts: 0, correct: 0, history: [] };
  const newP = bktUpdate(prev.p, evidence);
  states[q.conceptId] = {
    p: newP,
    attempts: prev.attempts + 1,
    correct: prev.correct + (correct ? 1 : 0),
    lastSeen: now,
    history: [...prev.history, { t: now, p: newP }].slice(-60),
  };
  const propagated = propagate(states, q.conceptId, newP);
  for (const ch of propagated) states[ch.conceptId] = { ...states[ch.conceptId], p: ch.to };

  // ── difficulty calibration ──
  const init = difficultyToRating(q.difficulty);
  const qstat = snap.qstats[q.id] ?? { rating: init, n: 0, correct: 0, initialRating: init };
  const eff = effectiveTheta(snap.theta, prev.p);
  const elo = eloUpdate(eff, qstat.rating, qstat.n, correct);
  const theta = snap.theta + (elo.theta - eff);
  const qstats = {
    ...snap.qstats,
    [q.id]: { ...qstat, rating: elo.rating, n: qstat.n + 1, correct: qstat.correct + (correct ? 1 : 0) },
  };

  // ── misconceptions ──
  const mis = { ...snap.misconceptions };
  const quote = (analysis?.evidenceQuote || analysis?.transcript || reasoningText || "").trim();
  const flagged = new Set<string>();
  const bump = (id: string, w: number, qt: string) => {
    if (!MISCONCEPTION_BY_ID[id] && !id.startsWith("disc-")) return;
    const ex = mis[id];
    const ev = (ex && ex.status !== "resolved" ? ex.evidence : 0) + w;
    mis[id] = {
      id,
      status: ev >= 1 ? "active" : "suspected",
      evidence: ev,
      firstSeen: ex?.firstSeen ?? now,
      lastSeen: now,
      quotes: qt ? [qt, ...(ex?.quotes ?? [])].slice(0, 5) : (ex?.quotes ?? []),
      cleanStreak: 0,
    };
    flagged.add(id);
  };
  const weight = analysis?.engine === "gemini" ? 1 : 0.5;
  for (const id of analysis?.misconceptionIds ?? []) bump(id, weight, quote);
  if (!correct && !flagged.size) {
    const opt = q.options.find((o) => o.id === chosen);
    if (opt?.misconceptionId) bump(opt.misconceptionId, 0.5, quote || `Chose "${opt.text}"`);
  }
  if (correct && evidence !== "correct-misconception") {
    for (const o of q.options) {
      const mid = o.misconceptionId;
      if (!mid || flagged.has(mid)) continue;
      const ex = mis[mid];
      if (!ex || ex.status === "resolved") continue;
      const streak = ex.cleanStreak + 1;
      mis[mid] = { ...ex, cleanStreak: streak, status: streak >= 2 ? "resolved" : "resolving" };
    }
  }

  // ── AI-discovered misconceptions go to the teacher for approval ──
  let proposals = snap.proposals;
  if (analysis?.novelMisconception?.title) {
    proposals = [
      {
        id: `nm-${now.toString(36)}-${Math.floor(Math.random() * 1e4)}`,
        conceptId: q.conceptId,
        title: analysis.novelMisconception.title,
        description: analysis.novelMisconception.description,
        evidenceQuote: quote,
        status: "pending",
        createdAt: now,
        studentName: args.studentName ?? "Student",
      },
      ...snap.proposals,
    ];
  }

  // ── spaced repetition ──
  const cards = { ...snap.cards };
  const success = correct && evidence !== "correct-misconception";
  const card = cards[q.conceptId];
  if (card) {
    if (mode === "review" || card.due <= now) cards[q.conceptId] = reviewCard(card, success, now);
    else if (!success) cards[q.conceptId] = { ...card, due: Math.min(card.due, now + DAY) };
  } else if (states[q.conceptId].p >= MASTERY_FOR_CARD) {
    cards[q.conceptId] = newCard(q.conceptId, now);
  }

  const attempt: Attempt = {
    id: `a-${now.toString(36)}-${Math.floor(Math.random() * 1e5)}`,
    questionId: q.id,
    conceptId: q.conceptId,
    chosen,
    correct,
    t: now,
    mode,
    reasoningText,
    reasoningMode,
    analysis,
    masteryBefore: prev.p,
    masteryAfter: newP,
    propagated,
    predictedCorrect: args.predicted ?? elo.expected,
  };

  return { snap: { states, theta, qstats, misconceptions: mis, proposals, cards }, attempt };
}
