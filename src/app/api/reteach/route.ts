import { NextResponse } from "next/server";
import { CONCEPT_BY_ID } from "@/lib/curriculum/concepts";
import { MISCONCEPTION_BY_ID } from "@/lib/curriculum/misconceptions";
import { generateJSON, hasGemini } from "@/lib/server/gemini";
import { allow, clientKey } from "@/lib/server/ratelimit";
import type { Misconception, ReteachPlan } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Body {
  misconceptionId: string;
  misconception?: Misconception; // for teacher-approved, AI-discovered misconceptions
  affected: number;
  classSize: number;
  quotes: string[];
  weakConcepts?: string[];
}

const SYSTEM = `You are an experienced CBSE Class 10 physics teacher and teacher-coach in India.
You turn class-wide misconception data into a practical 10-minute reteach plan for a regular classroom (about 40 students, a blackboard, and only simple items: cells, bulbs, wires, a torch, mirrors, lenses, a glass of water, a compass).
Use cognitive conflict: first make students predict, then show the result that contradicts the faulty idea, then explain.
Be concrete and brief. No fluff, no generic advice.
Physics accuracy is non-negotiable. Every statement, step and exit question must be correct for ideal Class 10 circuits and optics. Never write a question with a false premise (for example, identical bulbs in series glow equally brightly, so never ask why one of them is dimmer). Before answering, re-check each exit question and its answer.
The activity should fit in 10 minutes in total.`;

const SCHEMA = {
  type: "object",
  properties: {
    headline: { type: "string", description: "one line the teacher reads first" },
    whyItHappens: { type: "string", description: "1–2 sentences on where this idea comes from" },
    activity: {
      type: "object",
      properties: {
        title: { type: "string" },
        minutes: { type: "integer" },
        steps: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 6 },
      },
      required: ["title", "minutes", "steps"],
    },
    boardExplanation: { type: "string", description: "what to write on the board, 2–3 lines" },
    checkQuestions: {
      type: "array",
      minItems: 3,
      maxItems: 3,
      items: {
        type: "object",
        properties: { question: { type: "string" }, answer: { type: "string" } },
        required: ["question", "answer"],
      },
    },
    grouping: { type: "string", description: "how to group or pair students for this reteach" },
  },
  required: ["headline", "whyItHappens", "activity", "boardExplanation", "checkQuestions", "grouping"],
};

function fallback(m: Misconception, affected: number, classSize: number): ReteachPlan {
  return {
    headline: `${affected} of ${classSize} students think: "${m.studentVoice}"`,
    whyItHappens: m.description,
    activity: {
      title: "Predict, observe, explain",
      minutes: 10,
      steps: [
        `Ask everyone to write a one-line prediction that tests the idea: "${m.studentVoice}"`,
        `Demonstrate it: ${m.remedy}`,
        "Have students compare the result with their prediction in pairs.",
        "Ask two students who changed their minds to explain why.",
      ],
    },
    boardExplanation: m.remedy,
    checkQuestions: [
      { question: `Explain in one line why "${m.studentVoice}" is not correct.`, answer: m.remedy },
      { question: "Predict the result of today's demonstration if we doubled the setup.", answer: "Apply the same principle." },
      { question: "Write one exam-style question where this idea would lose marks.", answer: "Peer-check." },
    ],
    grouping: "Pair each affected student with a classmate who has mastered this concept.",
    engine: "fallback",
  };
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.misconceptionId) return NextResponse.json({ error: "Missing misconception" }, { status: 400 });
  const m = MISCONCEPTION_BY_ID[body.misconceptionId] ?? body.misconception;
  if (!m) return NextResponse.json({ error: "Unknown misconception" }, { status: 400 });
  if (!hasGemini() || !allow(`reteach:${clientKey(req)}`, 15, 10 * 60_000)) {
    return NextResponse.json(fallback(m, body.affected, body.classSize));
  }

  const brief = [
    `Misconception: "${m.title}" — ${m.description}`,
    `Typical student phrasing: "${m.studentVoice}"`,
    `Concepts affected: ${m.conceptIds.map((c) => CONCEPT_BY_ID[c]?.title ?? c).join(", ")}`,
    `Students affected: ${body.affected} of ${body.classSize}.`,
    body.quotes?.length ? `What students actually wrote or said:\n${body.quotes.slice(0, 6).map((q) => `- "${q}"`).join("\n")}` : "",
    body.weakConcepts?.length ? `Other weak concepts in this group: ${body.weakConcepts.join(", ")}` : "",
    `Known remedy idea: ${m.remedy}`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const { data, model, ms } = await generateJSON<Omit<ReteachPlan, "engine">>({
      system: SYSTEM,
      parts: [{ text: brief }],
      schema: SCHEMA,
      thinking: "medium",
      label: "reteach",
      timeoutMs: 25_000,
      budgetMs: 45_000,
    });
    return NextResponse.json({ ...data, engine: "gemini", meta: { model, ms } });
  } catch (e) {
    console.error("[reteach] falling back", e);
    return NextResponse.json(fallback(m, body.affected, body.classSize));
  }
}
