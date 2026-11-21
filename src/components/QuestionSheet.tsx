"use client";

import { ArrowRight, Check, Compass, Lightbulb, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CONCEPT_BY_ID } from "@/lib/curriculum/concepts";
import { MISCONCEPTION_BY_ID } from "@/lib/curriculum/misconceptions";
import { fallbackAnalysis } from "@/lib/engine/fallback";
import { ratingToDifficulty } from "@/lib/engine/learner";
import { questionRating } from "@/lib/engine/policy";
import { useMisconceptionDef, useSamajh } from "@/lib/store";
import type { Attempt, Misconception, OptionId, Question, ReasoningAnalysis } from "@/lib/types";
import { cn, pct } from "@/lib/utils";
import { InkBar } from "./Ink";
import { Handwriting, MarginNote, RedPenMark } from "./RedPen";
import { ReasoningInput, type Reasoning } from "./ReasoningInput";
import { Button, Pill } from "./ui";

type Phase = "answer" | "analyzing" | "feedback";

export function QuestionSheet({
  question,
  why,
  predicted,
  mode,
  header,
  onNext,
  nextLabel = "Next question",
  onAnswered,
}: {
  question: Question;
  why?: string;
  predicted?: number;
  mode: Attempt["mode"];
  header?: React.ReactNode;
  onNext: (attempt: Attempt) => void;
  nextLabel?: string;
  onAnswered?: (attempt: Attempt) => void;
}) {
  const commitAttempt = useSamajh((s) => s.commitAttempt);
  const discovered = useSamajh((s) => s.discovered);
  const qstats = useSamajh((s) => s.qstats);
  const [chosen, setChosen] = useState<OptionId | null>(null);
  const [reasoning, setReasoning] = useState<Reasoning>(null);
  const [phase, setPhase] = useState<Phase>("answer");
  const [attempt, setAttempt] = useState<Attempt | null>(null);

  useEffect(() => {
    setChosen(null);
    setReasoning(null);
    setPhase("answer");
    setAttempt(null);
  }, [question.id]);

  const stat = qstats[question.id];
  const calibrated = ratingToDifficulty(questionRating(question, qstats));

  async function check() {
    if (!chosen) return;
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
    const a = commitAttempt({
      question,
      chosen,
      mode,
      reasoningText: reasoning?.mode === "text" ? reasoning.text : analysis.transcript || undefined,
      reasoningMode: reasoning?.mode,
      analysis,
      predicted,
    });
    setAttempt(a);
    setPhase("feedback");
    onAnswered?.(a);
  }

  const concept = CONCEPT_BY_ID[question.conceptId];

  return (
    <div className="graph-paper-faint overflow-hidden rounded-[16px] border border-rule shadow-[0_18px_40px_-28px_rgba(22,32,74,.45)]">
      <div className="bg-white/92 px-4 pb-5 pt-4 backdrop-blur-[1px] sm:px-7 sm:pb-7 sm:pt-6">
        {header}
        <div className="flex flex-wrap items-center gap-2">
          <Pill tone="ink">{concept?.title}</Pill>
          <span className="inline-flex items-center gap-1.5 text-[12.5px] text-slate" title="Difficulty is re-estimated from every answer (Elo calibration)">
            <DifficultyDots value={calibrated} />
            Difficulty {calibrated.toFixed(1)}
            {stat?.n ? ` · calibrated from ${stat.n} answers` : " · AI estimate"}
          </span>
          {question.source === "generated" && (
            <Pill tone="highlight">
              <Sparkles className="size-3.5" /> New question, written by Gemini and checked by a second AI
            </Pill>
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

        <h2 className="mt-4 text-[20px] font-semibold leading-snug text-navy sm:text-[22px]" style={{ textWrap: "pretty" }}>
          {question.stem}
        </h2>

        <div className="mt-5 grid gap-2.5" role="radiogroup" aria-label="Answer options">
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
                  "group flex w-full items-start gap-3 rounded-[12px] border bg-white px-3.5 py-3 text-left transition-colors",
                  !done && (isChosen ? "border-ink bg-ink-wash ring-2 ring-ink/20" : "border-navy/15 hover:border-navy/40"),
                  done && isAnswer && "border-good/60 bg-good-wash",
                  done && isChosen && !isAnswer && "border-redpen/50 bg-redpen-wash",
                  done && !isChosen && !isAnswer && "border-navy/10 opacity-60",
                )}
              >
                <span
                  className={cn(
                    "grid size-7 shrink-0 place-items-center rounded-full border text-[13.5px] font-bold",
                    isChosen && !done ? "border-ink bg-ink text-white" : "border-navy/25 text-navy",
                    done && isAnswer && "border-good bg-good text-white",
                    done && isChosen && !isAnswer && "border-redpen bg-redpen text-white",
                  )}
                >
                  {done && isAnswer ? <Check className="size-4" /> : done && isChosen ? <X className="size-4" /> : o.id}
                </span>
                <span className="pt-0.5 text-[16px] leading-snug text-navy">
                  {trapHit ? <RedPenMark text={o.text}>{o.text}</RedPenMark> : o.text}
                </span>
              </button>
            );
          })}
        </div>

        {phase === "answer" && (
          <>
            <div className="mt-5">
              <ReasoningInput value={reasoning} onChange={setReasoning} />
            </div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[13.5px] text-slate">
                {chosen ? (reasoning ? "Samajh will read your reasoning before marking." : "Tip: add your reasoning so Samajh can check how you got there.") : "Pick an answer to continue."}
              </p>
              <Button size="lg" onClick={check} disabled={!chosen}>
                Check my answer
              </Button>
            </div>
          </>
        )}

        {phase === "analyzing" && reasoning && <AnalyzingTrace mode={reasoning.mode} conceptId={question.conceptId} />}

        {phase === "feedback" && attempt && (
          <Feedback attempt={attempt} question={question} onNext={() => onNext(attempt)} nextLabel={nextLabel} />
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

function AnalyzingTrace({ mode, conceptId }: { mode: "text" | "voice" | "photo"; conceptId: string }) {
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
  return (
    <div className="mt-6 rounded-[12px] border border-ink/15 bg-ink-wash/60 p-4" aria-live="polite">
      <p className="text-[14px] font-semibold text-navy">Samajh is checking your reasoning with Gemini</p>
      <ol className="mt-3 grid gap-2">
        {steps.map((s, k) => (
          <li key={s} className={cn("flex items-center gap-2.5 text-[14px] transition-opacity", k > i ? "opacity-35" : "opacity-100")}>
            <span
              className={cn(
                "grid size-5 place-items-center rounded-full border text-[11px]",
                k < i ? "border-ink bg-ink text-white" : k === i ? "border-ink text-ink" : "border-navy/20",
              )}
            >
              {k < i ? <Check className="size-3" /> : k === i ? <span className="size-1.5 animate-pulse rounded-full bg-ink" /> : null}
            </span>
            {s}
          </li>
        ))}
      </ol>
    </div>
  );
}

function highlightQuote(text: string, quote?: string) {
  if (!quote) return null;
  const q = quote.replace(/^["“”']+|["“”']+$/g, "").trim();
  if (q.length < 4) return null;
  const idx = text.toLowerCase().indexOf(q.toLowerCase());
  if (idx < 0) return null;
  return { before: text.slice(0, idx), match: text.slice(idx, idx + q.length), after: text.slice(idx + q.length) };
}

function Feedback({
  attempt,
  question,
  onNext,
  nextLabel,
}: {
  attempt: Attempt;
  question: Question;
  onNext: () => void;
  nextLabel: string;
}) {
  const a = attempt.analysis;
  const correct = attempt.correct;
  const lookup = useMisconceptionDef();
  const misIds = a?.misconceptionIds ?? [];
  const mis = misIds.map(lookup).filter((m): m is Misconception => Boolean(m));
  const studentMis = useSamajh((s) => s.misconceptions);
  const rightButShaky = correct && a?.engine === "gemini" && a.verdict === "misconception";
  const sound = correct && a?.engine === "gemini" && a.verdict === "sound";
  const reasoningShown = (attempt.reasoningMode === "text" ? attempt.reasoningText : a?.transcript) ?? "";
  const hl = highlightQuote(reasoningShown, a?.evidenceQuote);
  const concept = CONCEPT_BY_ID[attempt.conceptId];
  const up = attempt.masteryAfter >= attempt.masteryBefore;

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
    <div className="mt-6 grid gap-5 border-t border-dashed border-navy/15 pt-5" aria-live="polite">
      <div className="flex flex-wrap items-center gap-3">
        <span
          className={cn(
            "grid size-9 place-items-center rounded-full",
            correct && !rightButShaky ? "bg-good text-white" : "bg-redpen text-white",
          )}
        >
          {correct && !rightButShaky ? <Check className="size-5" /> : <X className="size-5" />}
        </span>
        <h3 className="text-[21px] font-semibold text-navy display" style={{ fontVariationSettings: '"wdth" 108' }}>
          {title}
        </h3>
        {a?.engine === "gemini" && a.language && a.language !== "English" && <Pill tone="ink">Understood {a.language}</Pill>}
      </div>

      {(reasoningShown || mis.length > 0 || a?.novelMisconception) && (
        <div className="grid gap-4 md:grid-cols-[1fr_minmax(0,240px)] md:gap-6">
          <div className="rounded-[12px] bg-white px-4 py-3 ring-1 ring-navy/10">
            {reasoningShown ? (
              <>
                <p className="mb-1 text-[12.5px] font-semibold text-slate">
                  {attempt.reasoningMode === "photo" ? "What Gemini read from your photo" : attempt.reasoningMode === "voice" ? "What you said" : "Your reasoning"}
                </p>
                <Handwriting>
                  {hl && mis.length + (a?.novelMisconception ? 1 : 0) > 0 ? (
                    <>
                      {hl.before}
                      <RedPenMark text={hl.match} delay={250}>
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
            {a?.faultyStep && !hl && (mis.length > 0 || a.novelMisconception) && (
              <p className="mt-2 text-[14px] text-slate">
                Where it breaks:{" "}
                <RedPenMark text={a.faultyStep} delay={250}>
                  <span className="text-navy">{a.faultyStep}</span>
                </RedPenMark>
              </p>
            )}
          </div>
          {(mis.length > 0 || a?.novelMisconception) && (
            <div>
              {mis.map((m) => (
                <div key={m.id} className="mb-2">
                  <MarginNote>
                    {studentMis[m.id]?.status === "suspected" ? "Possible misconception:" : "Misconception:"} {m.title}
                  </MarginNote>
                  {!reasoningShown && (
                    <p className="mt-1 text-[13.5px] text-slate">
                      This option is the trap for that idea. Explain your thinking next time and I can confirm it.
                    </p>
                  )}
                </div>
              ))}
              {a?.novelMisconception && (
                <div>
                  <MarginNote>New idea spotted: {a.novelMisconception.title}</MarginNote>
                  <p className="mt-1 text-[13.5px] text-slate">
                    Not in our list yet, so it has gone to your teacher to review. If approved, Samajh will look for it in every student.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {a?.feedback && (a.engine === "gemini" || !correct) && (
        <div className="grid gap-2">
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
        </div>
      )}

      <div className="grid gap-3 rounded-[12px] bg-ink-wash/70 p-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <p className="text-[14.5px] font-semibold text-navy">Your learner model updated</p>
          <p className="text-[13px] text-slate">after every answer, using Bayesian Knowledge Tracing</p>
        </div>
        <div className="grid gap-1.5">
          <div className="flex items-center justify-between text-[14.5px]">
            <span className="text-navy">{concept?.title}</span>
            <span className={cn("tabular font-semibold", up ? "text-ink" : "text-redpen")}>
              {pct(attempt.masteryBefore)} → {pct(attempt.masteryAfter)}
            </span>
          </div>
          <InkBar p={attempt.masteryAfter} from={attempt.masteryBefore} height={9} />
        </div>
        {attempt.propagated && attempt.propagated.length > 0 && (
          <div className="text-[13.5px] text-slate">
            <span className="font-semibold text-navy">Also adjusted through the concept graph: </span>
            {attempt.propagated.slice(0, 4).map((c, i) => (
              <span key={c.conceptId}>
                {i > 0 && ", "}
                {CONCEPT_BY_ID[c.conceptId]?.short}{" "}
                <span className={cn("tabular", c.to > c.from ? "text-ink" : "text-redpen")}>
                  {c.to > c.from ? "↑" : "↓"} {pct(c.to)}
                </span>
              </span>
            ))}
            {attempt.propagated.length > 4 && ` and ${attempt.propagated.length - 4} more`}
          </div>
        )}
      </div>

      <details className="group rounded-[10px] px-1">
        <summary className="cursor-pointer list-none text-[14.5px] font-semibold text-ink hover:underline">
          Show the worked solution
        </summary>
        <p className="mt-2 text-[15px] leading-relaxed text-navy">{question.explanation}</p>
      </details>

      <div className="flex justify-end">
        <Button size="lg" onClick={onNext}>
          {nextLabel} <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
