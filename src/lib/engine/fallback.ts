// Deterministic diagnosis used when there is no reasoning to read, or when Gemini is unavailable.
// Every wrong option is a designed trap mapped to a misconception, so even a bare MCQ answer says *why*.
import { MISCONCEPTION_BY_ID } from "../curriculum/misconceptions";
import type { OptionId, Question, ReasoningAnalysis } from "../types";

export function fallbackAnalysis(
  q: Question,
  chosen: OptionId,
  correct: boolean,
  reasoningText?: string,
): ReasoningAnalysis {
  const opt = q.options.find((o) => o.id === chosen);
  const m = opt?.misconceptionId ? MISCONCEPTION_BY_ID[opt.misconceptionId] : undefined;
  const hasText = Boolean(reasoningText?.trim());
  if (correct) {
    return {
      verdict: hasText ? "incomplete" : "none",
      transcript: reasoningText,
      misconceptionIds: [],
      confidence: 0.5,
      feedback: q.explanation,
      engine: "fallback",
    };
  }
  if (m) {
    return {
      verdict: "misconception",
      transcript: reasoningText,
      misconceptionIds: [m.id],
      // without the model we know which trap was picked, not which step of the reasoning broke
      faultyStep: "",
      evidenceQuote: "",
      confidence: hasText ? 0.55 : 0.45,
      feedback: `This option is the one students pick when they think "${m.studentVoice}" ${m.remedy}`,
      hint: "",
      engine: "fallback",
    };
  }
  return {
    verdict: hasText ? "incomplete" : "none",
    transcript: reasoningText,
    misconceptionIds: [],
    confidence: 0.4,
    feedback: q.explanation,
    engine: "fallback",
  };
}
