import { NextResponse } from "next/server";
import { CONCEPT_BY_ID } from "@/lib/curriculum/concepts";
import { MISCONCEPTION_BY_ID, misconceptionsForConcept } from "@/lib/curriculum/misconceptions";
import { generateJSON, hasGemini } from "@/lib/server/gemini";
import { allow, clientKey } from "@/lib/server/ratelimit";
import type { Misconception, OptionId, Question, QuestionOption } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  conceptId: string;
  targetDifficulty: number;
  focusMisconceptionId?: string;
  avoidStems?: string[];
  extraMisconceptions?: Misconception[];
}

const GEN_SYSTEM = `You write diagnostic multiple-choice questions for CBSE Class 10 Physics (NCERT, rationalised syllabus — no electric motor, generator or electromagnetic induction).
Your questions are used by an adaptive tutor that diagnoses misconceptions, so every wrong option must be a meaningful trap.

Rules:
- Exactly 4 options with ids A, B, C, D and exactly one correct answer.
- Each wrong option should be precisely what a student holding a specific misconception would choose. Tag it with that misconception id from the list provided, or an empty string if it is a generic distractor. The correct option's misconceptionId is an empty string.
- Write every option as plausibly and confidently as the correct one, in the student's own way of thinking. Never name the error inside an option (no "because current is consumed"), and never include an absurd option nobody would pick. Options should be similar in length.
- Physics must be exactly right. For numeric questions, compute the answer yourself and double-check, including New Cartesian sign convention (real object: u negative; concave mirror f negative; convex lens f positive; mirror 1/v + 1/u = 1/f, m = −v/u; lens 1/v − 1/u = 1/f, m = v/u).
- No images. Describe circuits and ray setups precisely in words. Use Unicode symbols (Ω, ², ₁, ×, ⁻) — never LaTeX.
- Stem ≤ 45 words. Options ≤ 18 words. Indian context is welcome (220 V mains, 50 Hz, household appliances, kWh bills).
- Difficulty scale: 1 = direct recall, 2 = simple application, 3 = standard board question, 4 = multi-step, 5 = hardest board / HOTS.
- explanation: at most 2 short sentences — the reasoning a teacher would say.`;

const GEN_SCHEMA = {
  type: "object",
  properties: {
    stem: { type: "string" },
    options: {
      type: "array",
      minItems: 4,
      maxItems: 4,
      items: {
        type: "object",
        properties: {
          id: { type: "string", enum: ["A", "B", "C", "D"] },
          text: { type: "string" },
          misconceptionId: { type: "string", description: "misconception id this distractor catches, or an empty string" },
        },
        required: ["id", "text", "misconceptionId"],
      },
    },
    answer: { type: "string", enum: ["A", "B", "C", "D"] },
    difficulty: { type: "integer", minimum: 1, maximum: 5 },
    explanation: { type: "string" },
  },
  required: ["stem", "options", "answer", "difficulty", "explanation"],
};

const SOLVER_SYSTEM = `You are an independent physics examiner. Solve the multiple-choice question from scratch, carefully, as a CBSE Class 10 topper would. Do not trust any hints in the wording. Give brief working and the single best option letter. If no option is correct or more than one is, set valid to false.`;

const SOLVER_SCHEMA = {
  type: "object",
  properties: {
    working: { type: "string" },
    answer: { type: "string", enum: ["A", "B", "C", "D"] },
    valid: { type: "boolean" },
  },
  required: ["working", "answer", "valid"],
};

type Draft = {
  stem: string;
  options: QuestionOption[];
  answer: OptionId;
  difficulty: number;
  explanation: string;
};

const IDS: OptionId[] = ["A", "B", "C", "D"];

function shuffleDraft(d: Draft): Draft {
  const order = [...d.options].sort(() => Math.random() - 0.5);
  const correctText = d.options.find((o) => o.id === d.answer)?.text;
  const options = order.map((o, i) => ({ ...o, id: IDS[i] }));
  const answer = options.find((o) => o.text === correctText)?.id ?? d.answer;
  return { ...d, options, answer };
}

export async function POST(req: Request) {
  if (!hasGemini()) return NextResponse.json({ error: "no-gemini" }, { status: 503 });
  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const concept = CONCEPT_BY_ID[body.conceptId];
  if (!concept) return NextResponse.json({ error: "Unknown concept" }, { status: 400 });
  if (!allow(`generate:${clientKey(req)}`, 12, 10 * 60_000)) {
    return NextResponse.json({ error: "rate-limited" }, { status: 429 });
  }

  const target = Math.max(1, Math.min(5, Math.round(body.targetDifficulty || 3)));
  const mis = [
    ...misconceptionsForConcept(concept.id),
    ...(body.extraMisconceptions ?? []).filter((m) => m.conceptIds?.includes(concept.id)),
  ];
  const focus = body.focusMisconceptionId
    ? MISCONCEPTION_BY_ID[body.focusMisconceptionId] ??
      body.extraMisconceptions?.find((m) => m.id === body.focusMisconceptionId)
    : undefined;
  const allowed = new Set(mis.map((m) => m.id).concat(focus ? [focus.id] : []));

  const brief = [
    `Concept: ${concept.title}. ${concept.summary}${concept.formula ? ` Key relation: ${concept.formula}.` : ""}`,
    `Target difficulty: ${target}/5.`,
    focus
      ? `This question must specifically test the misconception "${focus.title}" (${focus.id}): ${focus.description} One distractor must be exactly what that student would pick.`
      : "",
    "Misconceptions you can target with distractors:",
    ...mis.map((m) => `- ${m.id}: ${m.title}. ${m.description}`),
    body.avoidStems?.length
      ? `Do not repeat or closely paraphrase these existing questions:\n${body.avoidStems.slice(0, 12).map((s) => `- ${s}`).join("\n")}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const t0 = Date.now();
  const left = () => 55_000 - (Date.now() - t0);
  for (let attempt = 0; attempt < 2; attempt++) {
    if (left() < 20_000) break;
    try {
      const gen = await generateJSON<Draft>({
        system: GEN_SYSTEM,
        parts: [{ text: brief + (attempt ? "\nThe previous draft failed independent verification. Be extra careful with the physics." : "") }],
        schema: GEN_SCHEMA,
        thinking: "medium",
        label: "generate",
        timeoutMs: 22_000,
        budgetMs: Math.min(30_000, left() - 12_000),
      });
      const draft = gen.data;
      if (!draft?.options || draft.options.length !== 4 || !IDS.includes(draft.answer)) continue;
      draft.options = draft.options.map((o, i) => ({
        id: IDS[i],
        text: String(o.text),
        misconceptionId:
          o.id === draft.answer || !o.misconceptionId || !allowed.has(o.misconceptionId) ? null : o.misconceptionId,
      }));
      const shuffled = shuffleDraft(draft);

      const solver = await generateJSON<{ working: string; answer: OptionId; valid: boolean }>({
        system: SOLVER_SYSTEM,
        parts: [
          {
            text: `${shuffled.stem}\n${shuffled.options.map((o) => `${o.id}) ${o.text}`).join("\n")}`,
          },
        ],
        schema: SOLVER_SCHEMA,
        thinking: "medium",
        label: "verify",
        timeoutMs: 18_000,
        budgetMs: Math.max(5_000, left() - 2_000),
      });
      const agreed = solver.data.valid && solver.data.answer === shuffled.answer;
      if (!agreed) continue;

      const question: Question = {
        id: `gen-${concept.id}-${Date.now().toString(36)}`,
        conceptId: concept.id,
        stem: shuffled.stem,
        options: shuffled.options,
        answer: shuffled.answer,
        difficulty: Math.max(1, Math.min(5, Math.round(shuffled.difficulty || target))) as Question["difficulty"],
        explanation: shuffled.explanation,
        source: "generated",
        verified: true,
        createdAt: Date.now(),
      };
      return NextResponse.json({
        question,
        meta: {
          model: gen.model,
          verifierModel: solver.model,
          verifierWorking: solver.data.working,
          attempts: attempt + 1,
          ms: Date.now() - t0,
        },
      });
    } catch (e) {
      console.error("[generate] attempt failed", e);
    }
  }
  return NextResponse.json({ error: "verification-failed" }, { status: 422 });
}
