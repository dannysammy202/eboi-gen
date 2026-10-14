import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { generateStudioJson, studioGeminiResponse } from "../../../../lib/studio-gemini";

export const maxDuration = 60;

type ScriptureConcept = {
  reference: string;
  insight: string;
  theme: string;
  title: string;
  concept: string;
};

function validConcept(parsed: unknown): ScriptureConcept | null {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const data = parsed as Record<string, unknown>;
  const text = (name: string, limit: number) =>
    typeof data[name] === "string" ? data[name].trim().slice(0, limit) : "";
  const result = {
    reference: text("reference", 100),
    insight: text("insight", 1600),
    theme: text("theme", 500),
    title: text("title", 120),
    concept: text("concept", 1000),
  };
  return Object.values(result).every(Boolean) ? result : null;
}

export async function POST(request: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "The AI service is not configured. Contact the app administrator.", retryable: false },
        { status: 503 },
      );
    }

    const body = (await request.json()) as { mode?: string; theme?: string; reference?: string };
    const mode = body.mode === "verse" ? "verse" : "theme";
    const input = String((mode === "verse" ? body.reference : body.theme) ?? "").trim().slice(0, 500);
    if (!input) return NextResponse.json({ error: "Enter a Bible reference or song theme." }, { status: 400 });

    const prompt = [
      "You are a Scripture-aware creative director for Eboi, a Nigerian Christian melodic trap artist.",
      mode === "verse" ? "Use this Bible reference: " + input : "Recommend ONE appropriate Bible passage for this theme: " + input,
      "Explain what the passage means in its immediate literary and historical context. Avoid treating isolated words as promises out of context. If the reference is ambiguous or unfamiliar, indicate uncertainty; do not invent Scripture.",
      "Develop an ORIGINAL song concept and short title capturing the meaning naturally, with smooth hooks and energetic rap. The song need not quote Scripture directly. Do not reproduce any existing artist's lyrics.",
      'Return JSON only, keys: "reference" (book chapter:verses), "insight" (2-4 sentences explaining context), "theme" (core message in one sentence), "title" (2-5 words), "concept" (2-3 sentences with a song narrative).',
      "Do not include copyrighted Bible translation excerpts.",
    ].join("\n\n");

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const { value, model } = await generateStudioJson({
      ai,
      prompt,
      maxOutputTokens: 2400,
      validate: validConcept,
    });
    return NextResponse.json({ ...value, model });
  } catch (err) {
    const response = studioGeminiResponse(err);
    return NextResponse.json(response.body, { status: response.status });
  }
}
