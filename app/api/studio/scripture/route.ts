import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export const maxDuration = 45;

export async function POST(request: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) return NextResponse.json({ error: "Gemini API key is not configured." }, { status: 503 });
    const body = (await request.json()) as { mode?: string; theme?: string; reference?: string };
    const mode = body.mode === "verse" ? "verse" : "theme";
    const input = String(mode === "verse" ? body.reference : body.theme || "").trim().slice(0, 500);
    if (!input) return NextResponse.json({ error: "Enter a Bible reference or song theme." }, { status: 400 });
    const prompt = [
      "You are a Scripture-aware creative director for Eboi, a Nigerian Christian melodic trap artist.",
      mode === "verse" ? "Use this Bible reference: " + input : "Recommend ONE appropriate Bible passage for this theme: " + input,
      "Explain what the passage means in its immediate literary and historical context. Avoid treating isolated words as promises out of context. If the reference is ambiguous or unfamiliar, indicate uncertainty; do not invent Scripture.",
      "Develop an ORIGINAL song concept and short title capturing the meaning naturally, with smooth hooks and energetic rap. The song need not quote Scripture directly. Do not reproduce any existing artist's lyrics.",
      'Return JSON only, keys: "reference" (book chapter:verses), "insight" (2-4 sentences explaining context), "theme" (core message in one sentence), "title" (2-5 words), "concept" (2-3 sentences with a song narrative).',
      "Do not include copyrighted Bible translation excerpts."
    ].join("\n\n");
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const models = [...new Set([process.env.GEMINI_MODEL || "gemini-3.7-flash", "gemini-3.6-flash"])];
    let error = "";
    for (const model of models) {
      try {
        const output = await ai.models.generateContent({ model, contents: prompt, config: { responseMimeType: "application/json", maxOutputTokens: 1300 } });
        const parsed = JSON.parse(output.text || "{}") as Record<string, unknown>;
        const field = (name: string, limit: number) => String(parsed[name] || "").trim().slice(0, limit);
        const result = { reference: field("reference", 100), insight: field("insight", 1600), theme: field("theme", 500), title: field("title", 120), concept: field("concept", 1000) };
        if (!result.reference || !result.insight || !result.title || !result.concept) throw new Error("Incomplete Scripture response.");
        return NextResponse.json({ ...result, model });
      } catch (err) { error = err instanceof Error ? err.message : String(err); }
    }
    return NextResponse.json({ error: "Scripture analysis failed: " + error }, { status: 502 });
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "Unable to interpret the passage." }, { status: 500 });
  }
}
