// Server-only Gemini wrapper: structured JSON output, a model chain with per-attempt timeouts,
// instant failover on overload / quota errors, and thinking control per model family.
import { GoogleGenAI, ThinkingLevel, type Part } from "@google/genai";

const KEY = process.env.GEMINI_API_KEY?.trim();

/** Ordered model chain. Override with GEMINI_MODELS="model-a,model-b" (or GEMINI_MODEL / GEMINI_FALLBACK_MODEL). */
export const MODEL_CHAIN: string[] = (() => {
  const list = process.env.GEMINI_MODELS?.split(",").map((s) => s.trim()).filter(Boolean);
  if (list?.length) return list;
  const one = [process.env.GEMINI_MODEL?.trim(), process.env.GEMINI_FALLBACK_MODEL?.trim()].filter(Boolean) as string[];
  const defaults = ["gemini-3.5-flash-lite", "gemini-2.5-flash", "gemini-3.8-flash"];
  return [...new Set([...one, ...defaults])];
})();

export const PRIMARY_MODEL = MODEL_CHAIN[0];
export const FALLBACK_MODEL = MODEL_CHAIN[1] ?? MODEL_CHAIN[0];

export const hasGemini = () => Boolean(KEY);

let _ai: GoogleGenAI | null = null;
export function gemini() {
  if (!KEY) throw new Error("GEMINI_API_KEY is not set");
  // v1beta: system instructions + JSON schema are supported across model families
  if (!_ai) _ai = new GoogleGenAI({ apiKey: KEY, apiVersion: "v1beta" });
  return _ai;
}

export type ThinkLevel = "minimal" | "low" | "medium" | "high";

function thinkingConfig(model: string, level?: ThinkLevel) {
  if (!level || model.startsWith("gemma")) return undefined;
  if (/gemini-(1\.|2\.0)/.test(model)) return undefined;
  if (/gemini-2\.5/.test(model)) {
    const pro = model.includes("pro");
    const budget = { minimal: pro ? 128 : 0, low: pro ? 512 : 0, medium: 1536, high: 6144 }[level];
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

const statusOf = (e: unknown) => {
  const s = (e as { status?: number; code?: number }).status ?? (e as { code?: number }).code;
  if (typeof s === "number") return s;
  const m = String((e as Error)?.message ?? e).match(/"code":\s*(\d{3})/);
  return m ? Number(m[1]) : undefined;
};

export async function generateJSON<T>(opts: {
  system: string;
  parts: Part[];
  schema: object;
  thinking?: ThinkLevel;
  label: string;
  /** per-attempt timeout */
  timeoutMs?: number;
  /** overall budget across the whole chain */
  budgetMs?: number;
  /** models to try first (e.g. the fastest one for audio), then the rest of the chain */
  prefer?: string[];
}): Promise<GenResult<T>> {
  const started = Date.now();
  const budget = opts.budgetMs ?? 45_000;
  const chain = [...new Set([...(opts.prefer ?? []), ...MODEL_CHAIN])];
  let lastErr: unknown = null;
  for (const model of chain) {
    for (let attempt = 0; attempt < 2; attempt++) {
      const left = budget - (Date.now() - started);
      if (left < 2500) throw lastErr ?? new Error("Gemini time budget exhausted");
      const t0 = Date.now();
      try {
        const res = await gemini().models.generateContent({
          model,
          contents: [{ role: "user", parts: opts.parts }],
          config: {
            systemInstruction: opts.system,
            responseMimeType: "application/json",
            responseJsonSchema: opts.schema,
            // second attempt on the same model drops thinking config in case the model rejects it
            thinkingConfig: attempt === 0 ? thinkingConfig(model, opts.thinking) : undefined,
            httpOptions: { timeout: Math.min(opts.timeoutMs ?? 20_000, left) },
          },
        });
        const data = JSON.parse(stripFences(res.text ?? "")) as T;
        return { data, model, ms: Date.now() - t0 };
      } catch (e) {
        lastErr = e;
        const status = statusOf(e);
        console.error(`[gemini:${opts.label}] ${model} attempt ${attempt + 1} failed (${status ?? "?"}) after ${Date.now() - t0}ms: ${String((e as Error)?.message ?? e).slice(0, 160)}`);
        // only a bad-request (e.g. unsupported thinking config) is worth retrying on the same model
        if (status !== 400) break;
      }
    }
  }
  throw lastErr ?? new Error("Gemini call failed");
}
