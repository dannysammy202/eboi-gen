import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL || "gemini-3.7-flash";

  if (!apiKey) {
    return NextResponse.json(
      { ok: false, configured: false, model, error: "GEMINI_API_KEY is missing." },
      { status: 500 },
    );
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model,
      contents: "Reply with exactly: OK",
      config: { maxOutputTokens: 16 },
    });

    return NextResponse.json({
      ok: Boolean(response.text?.trim()),
      configured: true,
      model,
      response: response.text?.trim() || "",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gemini request failed.";
    return NextResponse.json(
      { ok: false, configured: true, model, error: message },
      { status: 502 },
    );
  }
}
