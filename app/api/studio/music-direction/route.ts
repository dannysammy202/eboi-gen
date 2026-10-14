import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { generateStudioJson, studioGeminiResponse } from "../../../../lib/studio-gemini";

export const maxDuration = 60;

const roots = ["C", "C#", "D", "Eb", "E", "F", "F#", "G", "Ab", "A", "Bb", "B"];
const keys = new Set(roots.flatMap(root => [root + " minor", root + " major"]));
const validBpm = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 60 && (n as number) <= 200;

function validDirection(parsed: unknown): { bpm: number; key: string; reason: string } | null {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
  const data = parsed as Record<string, unknown>;
  const key = String(data.key ?? "");
  if (!validBpm(data.bpm) || !keys.has(key)) return null;
  return {
    bpm: data.bpm,
    key,
    reason: String(data.reason || "Suggested for this song direction.").trim().slice(0, 400),
  };
}

export async function POST(request: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) {
      return NextResponse.json({ error: "The AI service is not configured. Contact the app administrator.", retryable: false }, { status: 503 });
    }
    const data = (await request.json()) as { title?: string; theme?: string; sound?: string; feels?: string[] };
    const title = String(data.title || "").trim().slice(0, 120);
    const theme = String(data.theme || "").trim().slice(0, 600);
    const sound = String(data.sound || "Melodic trap").trim().slice(0, 100);
    const feels = Array.isArray(data.feels) ? data.feels.slice(0, 5).map(v => String(v).slice(0, 40)) : [];
    if (!title && !theme) return NextResponse.json({ error: "Add a song title or concept before requesting a recommendation." }, { status: 400 });

    const prompt = [
      "Act as a creative music director for Eboi, a Nigerian melodic trap and faith-rooted rap artist.",
      "Recommend an appropriate TEMPO (integer BPM) and musical KEY for a NEW composition, based on the song concept, mood and primary genre. These are creative suggestions, not analysis of existing audio.",
      "Song title: " + title,
      "Concept: " + theme,
      "Genre: " + sound,
      "Feel: " + (feels.join(", ") || "Open direction"),
      "Respect a plausible groove for the genre, including half-time/double-time trap conventions. Explain your rationale in one or two brief sentences, not an unsupported claim of objective optimality.",
      'Return ONLY JSON: {"bpm": 136, "key":"F minor", "reason":"A brief musical reason for both choices."}.',
      "The key MUST be one of: " + [...keys].join(", ") + ". BPM must be an integer from 60 to 200.",
    ].join("\n");

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const { value, model } = await generateStudioJson({
      ai,
      prompt,
      maxOutputTokens: 900,
      temperature: 0.45,
      validate: validDirection,
    });
    return NextResponse.json({ ...value, model });
  } catch (error) {
    const response = studioGeminiResponse(error);
    return NextResponse.json(response.body, { status: response.status });
  }
}
