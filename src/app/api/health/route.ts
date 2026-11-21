import { NextResponse } from "next/server";
import { FALLBACK_MODEL, PRIMARY_MODEL, gemini, hasGemini } from "@/lib/server/gemini";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const base = { gemini: hasGemini(), model: PRIMARY_MODEL, fallback: FALLBACK_MODEL };
  if (!hasGemini() || url.searchParams.get("models") !== "1") return NextResponse.json(base);
  try {
    const names: string[] = [];
    const pager = await gemini().models.list({ config: { pageSize: 100 } });
    for await (const m of pager) {
      if (m.name && (m.supportedActions ?? []).includes("generateContent")) names.push(m.name);
    }
    return NextResponse.json({ ...base, models: names });
  } catch (e) {
    return NextResponse.json({ ...base, error: String(e).slice(0, 400) }, { status: 500 });
  }
}
