import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { generateStudioJson, studioGeminiResponse } from "../../../../lib/studio-gemini";

export const maxDuration = 60;

type Section = { id: string; title: string; bars: number; phrasing?: number; delivery?: string; intent?: string };
type RequestBody = { title: string; theme: string; bpm: number; key?: string; sound?: string; feels?: string[]; scripture?: string; sections: Section[] };
const safe = (s: unknown, limit = 500) => String(s ?? "").trim().slice(0, limit);

export async function POST(request: Request) {
  try {
    if (!process.env.GEMINI_API_KEY) return NextResponse.json({ error: "Gemini API key is not configured." }, { status: 503 });
    const data = (await request.json()) as RequestBody;
    const sections = Array.isArray(data.sections) ? data.sections.slice(0, 20) : [];
    const bpm = Number(data.bpm);
    if (!safe(data.title, 160) || !safe(data.theme, 1200) || sections.length === 0 || !Number.isFinite(bpm) || bpm < 50 || bpm > 220) {
      return NextResponse.json({ error: "Add a title, song concept, valid BPM and at least one section." }, { status: 400 });
    }
    if (sections.some(s => !/^(intro|outro|bridge|verse[1-6]|hook[1-8])$/.test(s.id) || !Number.isFinite(Number(s.bars)) || s.bars < 4 || s.bars > 64)) {
      return NextResponse.json({ error: "One or more song sections are invalid." }, { status: 400 });
    }
    const specs = sections.map(s => ({
      id: s.id, label: safe(s.title, 50), bars: Number(s.bars),
      targetLines: Math.max(2, Math.min(64, Math.round(Number(s.bars) / (Number(s.phrasing) || 2)))),
      delivery: safe(s.delivery, 80), message: safe(s.intent, 450)
    }));
    const prompt = [
      "Write ORIGINAL, performance-ready, faith-rooted melodic trap lyrics for Eboi, a Nigerian artist.",
      "Eboi's identity: natural Nigerian English with occasional natural Pidgin, honest personal storytelling, smooth melodic phrasing and confident energetic rap. Do not imitate any artist, lyric or existing melody.",
      "Faith should feel lived-in rather than forced. No generic sermon lines. Reflect the supplied concept and song structure faithfully.",
      "Song: " + safe(data.title, 160),
      "Concept: " + safe(data.theme, 1200),
      "Tempo: " + bpm + " BPM",
      "Key: " + safe(data.key, 30),
      "Sound: " + safe(data.sound, 100),
      "Feel: " + (data.feels || []).slice(0, 5).map(x => safe(x, 35)).join(", "),
      data.scripture ? "Scripture inspiration: " + safe(data.scripture, 150) + ". Preserve the passage's meaning. Do not invent biblical quotations." : "",
      "SECTIONS IN EXACT ORDER:\n" + JSON.stringify(specs, null, 2),
      "Write the targetLines for each section, one lyrical phrase per line. The bars determine duration, not a guarantee of sung line count. Use clear melodic anchors for hooks, distinctive stories and internal rhyme for verses. Repeated hooks should share their main hook phrase, but verses should advance the narrative.",
      'Return JSON only, of shape {"sections":[{"id":"hook1","lyrics":"line one\\nline two"}]}. Include exactly the requested section ids and no others.'
    ].filter(Boolean).join("\n\n");
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const { value, model } = await generateStudioJson({
      ai,
      prompt,
      maxOutputTokens: 8192,
      validate: (parsed: unknown): Array<{ id: string; lyrics: string }> | null => {
        if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
        const all = (parsed as { sections?: unknown }).sections;
        if (!Array.isArray(all)) return null;
        const validated = specs.map(s => {
          const section = all.find(x => x && typeof x === "object" && (x as { id?: unknown }).id === s.id) as { lyrics?: unknown } | undefined;
          return { id: s.id, lyrics: typeof section?.lyrics === "string" ? safe(section.lyrics, 10000) : "" };
        });
        return validated.every(s => s.lyrics) ? validated : null;
      },
    });
    return NextResponse.json({ sections: value, model });
  } catch (err) {
    const response = studioGeminiResponse(err);
    return NextResponse.json(response.body, { status: response.status });
  }
}
