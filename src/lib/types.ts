// Shared domain types for Samajh

export type ChapterId = "light" | "eye" | "electricity" | "magnetism";

export interface Chapter {
  id: ChapterId;
  title: string;
  short: string;
  color: string;
}

export interface Concept {
  id: string;
  chapter: ChapterId;
  title: string;
  /** short label for graph nodes */
  short: string;
  /** what mastering this concept means */
  summary: string;
  prereqs: string[];
  formula?: string;
}

export interface Misconception {
  id: string;
  title: string;
  /** precise description of the faulty mental model */
  description: string;
  /** how a student typically phrases it (used for detection + UI) */
  studentVoice: string;
  conceptIds: string[];
  /** cognitive-conflict style remediation idea */
  remedy: string;
  /** "taxonomy" = curated from physics-education research; "discovered" = proposed by AI, approved by teacher */
  origin?: "taxonomy" | "discovered";
}

export type OptionId = "A" | "B" | "C" | "D";

export interface QuestionOption {
  id: OptionId;
  text: string;
  /** misconception this distractor is designed to catch (null for the key / generic distractors) */
  misconceptionId?: string | null;
}

export interface Question {
  id: string;
  conceptId: string;
  stem: string;
  options: QuestionOption[];
  answer: OptionId;
  /** author / AI estimated difficulty 1 (easy) .. 5 (hard) */
  difficulty: 1 | 2 | 3 | 4 | 5;
  /** short worked solution */
  explanation: string;
  source: "seed" | "generated";
  /** for generated questions: did an independent solver agree with the key? */
  verified?: boolean;
  createdAt?: number;
}

export type ReasoningVerdict =
  | "sound" // correct reasoning
  | "misconception" // faulty mental model identified
  | "slip" // right idea, arithmetic / reading slip
  | "incomplete" // partial reasoning
  | "guess" // no real reasoning
  | "none"; // no reasoning given

export interface ReasoningAnalysis {
  verdict: ReasoningVerdict;
  /** what the student said / wrote, transcribed (for audio / photo input) */
  transcript?: string;
  misconceptionIds: string[];
  novelMisconception?: { title: string; description: string } | null;
  /** the exact step / sentence where reasoning breaks */
  faultyStep?: string;
  /** quote from the student's own reasoning that is the evidence */
  evidenceQuote?: string;
  confidence: number;
  /** short, warm, Socratic feedback for the student */
  feedback: string;
  /** a nudge question to create cognitive conflict */
  hint?: string;
  language?: string;
  /** produced by the AI model or by deterministic fallback */
  engine: "gemini" | "fallback";
}

export interface Attempt {
  id: string;
  questionId: string;
  conceptId: string;
  chosen: OptionId;
  correct: boolean;
  t: number;
  mode: "diagnostic" | "practice" | "review" | "fix";
  reasoningText?: string;
  reasoningMode?: "text" | "voice" | "photo";
  analysis?: ReasoningAnalysis;
  masteryBefore: number;
  masteryAfter: number;
  /** concepts whose mastery moved via graph propagation */
  propagated?: { conceptId: string; from: number; to: number }[];
  predictedCorrect?: number;
}

export interface ConceptState {
  p: number; // BKT probability concept is learned
  attempts: number;
  correct: number;
  lastSeen?: number;
  history: { t: number; p: number }[];
}

export interface SrsCard {
  conceptId: string;
  interval: number; // days
  ease: number;
  reps: number;
  due: number; // epoch ms
  lastReview: number;
  lapses: number;
}

/** suspected = only a misconception-mapped distractor was picked; active = confirmed by reasoning or repeated */
export type MisconceptionStatus = "suspected" | "active" | "resolving" | "resolved";

export interface StudentMisconception {
  id: string;
  status: MisconceptionStatus;
  evidence: number;
  firstSeen: number;
  lastSeen: number;
  quotes: string[];
  /** consecutive clean answers on targeted questions since last evidence */
  cleanStreak: number;
}

export interface ReteachPlan {
  headline: string;
  whyItHappens: string;
  activity: { title: string; minutes: number; steps: string[] };
  boardExplanation: string;
  checkQuestions: { question: string; answer: string }[];
  grouping: string;
  engine: "gemini" | "fallback";
}

export interface NovelMisconceptionProposal {
  id: string;
  conceptId: string;
  title: string;
  description: string;
  evidenceQuote: string;
  status: "pending" | "approved" | "rejected";
  createdAt: number;
  studentName: string;
}
