import { NextResponse } from "next/server";
import type { Part } from "@google/genai";
import { CONCEPT_BY_ID } from "@/lib/curriculum/concepts";
import { MISCONCEPTION_BY_ID, misconceptionsForConcept } from "@/lib/curriculum/misconceptions";
import { generateJSON, hasGemini } from "@/lib/server/gemini";
import { allow, base64Bytes, clientKey } from "@/lib/server/ratelimit";
import { fallbackAnalysis } from "@/lib/engine/fallback";
import type { Misconception, OptionId, Question, ReasoningAnalysis } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  question: Question;
  chosen: OptionId;
  correct: boolean;
  reasoningText?: string;
  media?: { kind: "audio" | "image"; mimeType: string; data: string };
  extraMisconceptions?: Misconception[];
}

const SYSTEM = `You are the misconception detective inside Samajh, an adaptive tutor for CBSE Class 10 Physics students in India.
Your job is to analyse HOW the student reasoned — not just whether the final answer was right.

Rules:
- Base every judgement on the student's own words, speech or handwriting. Put an exact quote of the decisive part in evidenceQuote.
- Students may write or speak in English, Hindi or Hinglish. Understand all three. Reply in the same language mix the student used (default: simple English).
- Prefer the curated misconception list. Only fill novelMisconception when the reasoning shows a clear, specific faulty mental model that none of the listed ones describes.
- A correct final answer can still hide a misconception. If the reasoning is physically wrong, the verdict is "misconception" even though the answer is correct.
- Verdicts: "sound" = correct physics reasoning; "misconception" = a faulty mental model; "slip" = right method but an arithmetic, unit or reading mistake; "incomplete" = partly right but missing a key idea; "guess" = no real physics reasoning.
- feedback: 2–3 short sentences, warm and direct, like a good teacher writing in the margin. Refer to what the student actually said. Do not lecture and do not just hand over the answer — point at the step that breaks.
- hint: one short question that makes the student confront the contradiction in their idea (cognitive conflict). Empty if the reasoning is sound.
- faultyStep: the exact step or sentence where the reasoning breaks (empty if sound).
- confidence: 0 to 1, how sure you are about the diagnosis.`;

const SCHEMA = {
  type: "object",
  properties: {
    transcript: {
      type: "string",
      description:
        "Verbatim transcription of the student's spoken or handwritten reasoning (empty if they typed it).",
    },
    verdict: { type: "string", enum: ["sound", "misconception", "slip", "incomplete", "guess"] },
    misconceptionIds: {
      type: "array",
      items: { type: "string" },
      description: "ids from the curated list that the reasoning shows (usually 0 or 1)",
    },
    novelMisconception: {
      type: "object",
      description: "Only if a clear faulty idea is NOT in the curated list.",
      properties: {
        title: { type: "string", description: "≤ 7 words, plain language" },
        description: { type: "string", description: "one sentence describing the faulty mental model" },
      },
      required: ["title", "description"],
    },
    faultyStep: { type: "string" },
    evidenceQuote: { type: "string" },
    confidence: { type: "number" },
    feedback: { type: "string" },
    hint: { type: "string" },
    language: { type: "string", description: "English, Hindi or Hinglish" },
  },
  required: ["verdict", "misconceptionIds", "confidence", "feedback"],
};

function describeQuestion(q: Question) {
  return [
    `Question: ${q.stem}`,
    ...q.options.map(
      (o) =>
        `  ${o.id}) ${o.text}${o.id === q.answer ? "   ← correct" : o.misconceptionId ? `   (trap for: ${o.misconceptionId})` : ""}`,
    ),
    `Worked solution: ${q.explanation}`,
  ].join("\n");
}

export async function POST(req: Request) {
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const { question, chosen, correct, reasoningText, media, extraMisconceptions = [] } = body;
  if (!question?.stem || !chosen) return NextResponse.json({ error: "Missing question" }, { status: 400 });

  const concept = CONCEPT_BY_ID[question.conceptId];
  const candidates = new Map<string, Misconception>();
  for (const m of misconceptionsForConcept(question.conceptId)) candidates.set(m.id, m);
  for (const o of question.options) {
    if (o.misconceptionId && MISCONCEPTION_BY_ID[o.misconceptionId])
      candidates.set(o.misconceptionId, MISCONCEPTION_BY_ID[o.misconceptionId]);
  }
  for (const m of extraMisconceptions) if (m.conceptIds?.includes(question.conceptId)) candidates.set(m.id, m);

  const hasReasoning = Boolean(reasoningText?.trim()) || Boolean(media?.data);
  if (!hasGemini() || !hasReasoning) {
    return NextResponse.json(fallbackAnalysis(question, chosen, correct, reasoningText));
  }
  if (base64Bytes(media?.data) > 3_500_000 || (reasoningText?.length ?? 0) > 4000) {
    return NextResponse.json({ error: "That recording or photo is too large. Try a shorter clip or a smaller photo." }, { status: 413 });
  }
  if (!allow(`analyze:${clientKey(req)}`, 40, 10 * 60_000)) {
    return NextResponse.json({ ...fallbackAnalysis(question, chosen, correct, reasoningText), meta: { error: "rate-limited" } });
  }

  const chosenText = question.options.find((o) => o.id === chosen)?.text ?? "";
  const brief = [
    `Concept: ${concept?.title ?? question.conceptId} — ${concept?.summary ?? ""}`,
    describeQuestion(question),
    `Student chose: ${chosen}) ${chosenText} — this is ${correct ? "CORRECT" : "WRONG"}.`,
    "",
    "Curated misconceptions to check against:",
    ...[...candidates.values()].map(
      (m) => `- ${m.id}: ${m.title}. ${m.description} Typical phrasing: "${m.studentVoice}"`,
    ),
    "",
    media?.kind === "audio"
      ? "The student's reasoning is in the attached audio recording. Transcribe it into transcript first (keep Hindi/Hinglish as spoken, in Latin script), then analyse it."
      : media?.kind === "image"
        ? "The student's reasoning is the handwritten working in the attached photo. Transcribe the relevant lines into transcript first, then analyse them step by step."
        : `Student's reasoning (typed): """${reasoningText}"""`,
  ].join("\n");

  const parts: Part[] = [{ text: brief }];
  if (media?.data) parts.push({ inlineData: { mimeType: media.mimeType, data: media.data } });

  try {
    const { data, model, ms } = await generateJSON<Omit<ReasoningAnalysis, "engine">>({
      system: SYSTEM,
      parts,
      schema: SCHEMA,
      thinking: "low",
      label: "analyze",
    });
    const known = new Set([...candidates.keys(), ...Object.keys(MISCONCEPTION_BY_ID)]);
    const analysis: ReasoningAnalysis = {
      verdict: data.verdict ?? "incomplete",
      transcript: data.transcript || (media ? "" : reasoningText),
      misconceptionIds: (data.misconceptionIds ?? []).filter((id) => known.has(id)).slice(0, 2),
      novelMisconception:
        data.novelMisconception?.title && (data.misconceptionIds ?? []).length === 0
          ? data.novelMisconception
          : null,
      faultyStep: data.faultyStep ?? "",
      evidenceQuote: data.evidenceQuote ?? "",
      confidence: Math.max(0, Math.min(1, Number(data.confidence) || 0.6)),
      feedback: data.feedback ?? "",
      hint: data.hint ?? "",
      language: data.language ?? "English",
      engine: "gemini",
    };
    if (analysis.verdict === "misconception" && !analysis.misconceptionIds.length && !analysis.novelMisconception) {
      analysis.verdict = correct ? "incomplete" : "misconception";
    }
    return NextResponse.json({ ...analysis, meta: { model, ms } });
  } catch (e) {
    console.error("[analyze] falling back", e);
    return NextResponse.json({ ...fallbackAnalysis(question, chosen, correct, reasoningText), meta: { error: "gemini-unavailable" } });
  }
}
