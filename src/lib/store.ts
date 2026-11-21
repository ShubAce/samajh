"use client";

import { useEffect, useMemo, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { MISCONCEPTION_BY_ID } from "./curriculum/misconceptions";
import { SEED_QUESTIONS } from "./curriculum/questions";
import { applyAttempt, type AttemptArgs } from "./engine/apply";
import { DAY, initialStates } from "./engine/learner";
import type { QuestionStat } from "./engine/policy";
import { classCalibration } from "./seed/class";
import { CLASSMATE_PROPOSALS, buildDemo } from "./seed/demo";
import type {
  Attempt,
  ConceptState,
  Misconception,
  NovelMisconceptionProposal,
  Question,
  SrsCard,
  StudentMisconception,
} from "./types";

interface Data {
  student: { name: string; createdAt: number } | null;
  isDemo: boolean;
  states: Record<string, ConceptState>;
  theta: number;
  qstats: Record<string, QuestionStat>;
  generated: Question[];
  attempts: Attempt[];
  misconceptions: Record<string, StudentMisconception>;
  proposals: NovelMisconceptionProposal[];
  discovered: Misconception[];
  cards: Record<string, SrsCard>;
  diagnostic: { status: "idle" | "running" | "done"; asked: string[]; startedAt?: number; finishedAt?: number };
  clockOffsetDays: number;
}

interface Actions {
  start: (name: string) => void;
  loadDemo: () => void;
  reset: () => void;
  startDiagnostic: () => void;
  finishDiagnostic: () => void;
  commitAttempt: (args: Omit<AttemptArgs, "studentName">) => Attempt;
  addGenerated: (q: Question) => void;
  approveProposal: (id: string) => void;
  rejectProposal: (id: string) => void;
  timeTravel: (days: number) => void;
}

export type SamajhState = Data & Actions;

function empty(): Data {
  return {
    student: null,
    isDemo: false,
    states: initialStates(),
    theta: 1000,
    qstats: { ...classCalibration() },
    generated: [],
    attempts: [],
    misconceptions: {},
    proposals: [...CLASSMATE_PROPOSALS],
    discovered: [],
    cards: {},
    diagnostic: { status: "idle", asked: [] },
    clockOffsetDays: 0,
  };
}

export const useSamajh = create<SamajhState>()(
  persist(
    (set, get) => ({
      ...empty(),
      start: (name) => set({ ...empty(), student: { name: name.trim() || "Student", createdAt: Date.now() } }),
      loadDemo: () => {
        const now = Date.now();
        const demo = buildDemo(now);
        set({
          ...empty(),
          ...demo.snap,
          student: { name: "Aarav", createdAt: now - 21 * DAY },
          isDemo: true,
          attempts: demo.attempts,
          diagnostic: { status: "done", asked: demo.asked, startedAt: now - 20 * DAY, finishedAt: now - 20 * DAY },
        });
      },
      reset: () => set(empty()),
      startDiagnostic: () =>
        set({ diagnostic: { status: "running", asked: [], startedAt: Date.now() + get().clockOffsetDays * DAY } }),
      finishDiagnostic: () =>
        set((s) => ({
          diagnostic: { ...s.diagnostic, status: "done", finishedAt: Date.now() + s.clockOffsetDays * DAY },
        })),
      commitAttempt: (args) => {
        const s = get();
        const now = Date.now() + s.clockOffsetDays * DAY;
        const { snap, attempt } = applyAttempt(
          {
            states: s.states,
            theta: s.theta,
            qstats: s.qstats,
            misconceptions: s.misconceptions,
            proposals: s.proposals,
            cards: s.cards,
          },
          { ...args, studentName: s.student?.name ?? "Student" },
          now,
        );
        set({
          ...snap,
          attempts: [...s.attempts, attempt].slice(-300),
          diagnostic:
            args.mode === "diagnostic"
              ? { ...s.diagnostic, asked: [...s.diagnostic.asked, args.question.id] }
              : s.diagnostic,
        });
        return attempt;
      },
      addGenerated: (q) => set((s) => ({ generated: [...s.generated, q].slice(-80) })),
      approveProposal: (id) =>
        set((s) => {
          const p = s.proposals.find((x) => x.id === id);
          if (!p) return {};
          const m: Misconception = {
            id: `disc-${id}`,
            title: p.title,
            description: p.description,
            studentVoice: p.evidenceQuote,
            conceptIds: [p.conceptId],
            remedy: "Teacher-approved. Plan a predict–observe–explain demonstration that contradicts this idea.",
            origin: "discovered",
          };
          return {
            proposals: s.proposals.map((x) => (x.id === id ? { ...x, status: "approved" } : x)),
            discovered: [...s.discovered.filter((d) => d.id !== m.id), m],
          };
        }),
      rejectProposal: (id) =>
        set((s) => ({ proposals: s.proposals.map((x) => (x.id === id ? { ...x, status: "rejected" } : x)) })),
      timeTravel: (days) => set((s) => ({ clockOffsetDays: s.clockOffsetDays + days })),
    }),
    {
      name: "samajh-v1",
      version: 1,
      partialize: (s) => {
        const { start, loadDemo, reset, startDiagnostic, finishDiagnostic, commitAttempt, addGenerated, approveProposal, rejectProposal, timeTravel, ...data } = s;
        void start; void loadDemo; void reset; void startDiagnostic; void finishDiagnostic; void commitAttempt;
        void addGenerated; void approveProposal; void rejectProposal; void timeTravel;
        return data;
      },
    },
  ),
);

/** true once persisted state has been loaded on the client (avoids SSR hydration mismatch) */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const unsub = useSamajh.persist.onFinishHydration(() => setHydrated(true));
    if (useSamajh.persist.hasHydrated()) setHydrated(true);
    return unsub;
  }, []);
  return hydrated;
}

/** look up a misconception in the curated library or among teacher-approved discoveries */
export function useMisconceptionDef() {
  const discovered = useSamajh((s) => s.discovered);
  return useMemo(() => {
    const extra = Object.fromEntries(discovered.map((d) => [d.id, d]));
    return (id: string): Misconception | undefined => MISCONCEPTION_BY_ID[id] ?? extra[id];
  }, [discovered]);
}

export function usePool(): Question[] {
  const generated = useSamajh((s) => s.generated);
  return useMemo(() => [...SEED_QUESTIONS, ...generated], [generated]);
}

export function useNow() {
  const offset = useSamajh((s) => s.clockOffsetDays);
  return useMemo(() => Date.now() + offset * DAY, [offset]);
}

export function nowFor(offsetDays: number) {
  return Date.now() + offsetDays * DAY;
}
