// Server-only Gemini wrapper: structured JSON output, thinking control, retries and model fallback.
import { GoogleGenAI, ThinkingLevel, type Part } from "@google/genai";

const KEY = process.env.GEMINI_API_KEY?.trim();
export const PRIMARY_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-2.5-flash";
export const FALLBACK_MODEL = process.env.GEMINI_FALLBACK_MODEL?.trim() || "gemini-2.5-flash-lite";

export const hasGemini = () => Boolean(KEY);

let _ai: GoogleGenAI | null = null;
export function gemini() {
  if (!KEY) throw new Error("GEMINI_API_KEY is not set");
  if (!_ai) _ai = new GoogleGenAI({ apiKey: KEY });
  return _ai;
}

export type ThinkLevel = "minimal" | "low" | "medium" | "high";

function thinkingConfig(model: string, level?: ThinkLevel) {
  if (!level) return undefined;
  if (/gemini-(1\.|2\.0)/.test(model)) return undefined;
  if (/gemini-2\.5/.test(model)) {
    const pro = model.includes("pro");
    const budget = { minimal: pro ? 128 : 0, low: 512, medium: 2048, high: 8192 }[level];
    return { thinkingBudget: budget };
  }
  const map = {
    minimal: ThinkingLevel.MINIMAL,
    low: ThinkingLevel.LOW,
    medium: ThinkingLevel.MEDIUM,
    high: ThinkingLevel.HIGH,
  } as const;
  return { thinkingLevel: map[level] };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function stripFences(text: string) {
  const t = text.trim();
  if (t.startsWith("```")) return t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/, "");
  return t;
}

export interface GenResult<T> {
  data: T;
  model: string;
  ms: number;
}

export async function generateJSON<T>(opts: {
  system: string;
  parts: Part[];
  schema: object;
  thinking?: ThinkLevel;
  label: string;
}): Promise<GenResult<T>> {
  const models = [PRIMARY_MODEL, FALLBACK_MODEL].filter((m, i, a) => m && a.indexOf(m) === i);
  let lastErr: unknown = null;
  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const t0 = Date.now();
      try {
        const res = await gemini().models.generateContent({
          model,
          contents: [{ role: "user", parts: opts.parts }],
          config: {
            systemInstruction: opts.system,
            responseMimeType: "application/json",
            responseJsonSchema: opts.schema,
            // second attempt drops thinking config in case the model rejects it
            thinkingConfig: attempt === 0 ? thinkingConfig(model, opts.thinking) : undefined,
          },
        });
        const text = res.text ?? "";
        const data = JSON.parse(stripFences(text)) as T;
        return { data, model, ms: Date.now() - t0 };
      } catch (e) {
        lastErr = e;
        const status = (e as { status?: number }).status;
        console.error(`[gemini:${opts.label}] ${model} attempt ${attempt + 1} failed`, status, String(e).slice(0, 300));
        if (status === 429 || status === 500 || status === 503) await sleep(900 * (attempt + 1));
      }
    }
  }
  throw lastErr ?? new Error("Gemini call failed");
}
