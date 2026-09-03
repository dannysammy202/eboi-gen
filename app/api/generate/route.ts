import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

type SongRequest = {
  title: string;
  theme: string;
  tempo: string;
  songKey: string;
  includeIntro: boolean;
  introLines: number;
  includeOutro: boolean;
  outroLines: number;
  verseCount: number;
  verseLines: number;
  hookCount: number;
  hookLines: number;
  startsWith: "hook" | "verse";
  structure: string[];
};

function buildPrompt(data: SongRequest) {
  const structureText = data.structure
    .map((section, index) => `${index + 1}. ${section}`)
    .join("\n");

  return `Write an original hard-hitting energy song for Eboi, a Nigerian Christian rap artist. Use a melodic trap sound with fluid pocket-focused rap delivery, sung melodic phrases, hard-hitting anthem energy, and a mix of singing and rapping.

SONG DETAILS
Title: ${data.title}
Tempo: ${data.tempo} BPM
Theme: ${data.theme}
Key: ${data.songKey}

STRUCTURE
${structureText}

SECTION LENGTHS
- Intro: ${data.includeIntro ? `${data.introLines} lines` : "None"}
- Verses: ${data.verseCount} total, exactly ${data.verseLines} lines each
- Hooks: ${data.hookCount} total, exactly ${data.hookLines} lines each
- Outro: ${data.includeOutro ? `${data.outroLines} lines` : "None"}

STYLE REQUIREMENTS
- Write fully original lyrics. Do not imitate or copy any specific artist, song, melody, lyrics, signature phrases, or recognisable lyrical mannerisms.
- Melodic, sung hooks with one catchy repeatable anchor line.
- Verses should be mood and cadence driven rather than narrative. Use short reflective lines about faith, ambition, discipline, growth, pressure, purpose, and the come-up.
- Prioritise pocket, bounce, melody, internal rhyme, and repeatable phrasing over packing new information into every line.
- State the Christian faith message clearly and directly while keeping the writing confident, cool, and edgy rather than preachy.
- Use only a little Nigerian Pidgin where it fits naturally.
- Avoid worn-out worship clichés and generic church language.
- Keep the hook simple enough for a crowd to shout back live.
- Let the title and theme influence the central phrase and recurring imagery.
- Keep line lengths performance-friendly. Avoid long prose-like bars.
- Use tasteful ad-libs in brackets only where they help the pocket.

OUTPUT RULES
- Output lyrics only.
- Label every section exactly, for example [Hook 1], [Verse 1], [Intro], [Outro].
- Follow the supplied structure in the exact order shown.
- Respect every requested line count exactly. A section label does not count as a lyric line.
- Do not add commentary before or after the lyrics.`;
}

function validateStructure(lyrics: string, structure: string[]) {
  const expected = structure.map((item) => {
    const match = item.match(/^(.*?) \((\d+) lines\)$/);
    return {
      label: match?.[1] ?? item,
      lines: Number(match?.[2] ?? 0),
    };
  });

  const sections = new Map<string, string[]>();
  let current = "";

  for (const rawLine of lyrics.split("\n")) {
    const line = rawLine.trim();
    const label = line.match(/^\[(.+?)\]$/)?.[1];
    if (label) {
      current = label;
      sections.set(current, []);
      continue;
    }
    if (current && line) sections.get(current)?.push(line);
  }

  return expected.every(({ label, lines }) => sections.get(label)?.length === lines);
}

function errorText(error: unknown) {
  if (error instanceof Error) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function isTransientGeminiError(error: unknown) {
  const text = errorText(error).toLowerCase();
  return (
    text.includes("503") ||
    text.includes("unavailable") ||
    text.includes("high demand") ||
    text.includes("overloaded") ||
    text.includes("resource exhausted") ||
    text.includes("429")
  );
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateWithFallback(
  ai: GoogleGenAI,
  contents: string,
  maxOutputTokens: number,
  preferredModel?: string,
) {
  const configured = preferredModel || process.env.GEMINI_MODEL || "gemini-3.7-flash";
  const models = Array.from(
    new Set([configured, "gemini-3.6-flash", "gemini-3.5-flash"]),
  );

  let lastError: unknown;

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: { maxOutputTokens },
        });
        return { response, model };
      } catch (error) {
        lastError = error;
        if (!isTransientGeminiError(error)) throw error;
        if (attempt === 0) await sleep(700);
      }
    }
  }

  throw lastError || new Error("Gemini is temporarily unavailable.");
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY is missing. Add it to your environment variables." },
        { status: 500 },
      );
    }

    const data = (await request.json()) as SongRequest;

    if (!data.title?.trim() || !data.theme?.trim() || !data.tempo?.trim() || !data.songKey?.trim()) {
      return NextResponse.json({ error: "Title, theme, tempo and key are required." }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey });
    const prompt = buildPrompt(data);
    const first = await generateWithFallback(ai, prompt, 4096);

    let lyrics = first.response.text?.trim();
    let model = first.model;

    if (!lyrics) {
      return NextResponse.json({ error: "Gemini returned an empty response." }, { status: 502 });
    }

    if (!validateStructure(lyrics, data.structure)) {
      const correction = await generateWithFallback(
        ai,
        `${prompt}\n\nREVISION TASK\nThe previous draft did not follow every requested section length exactly. Rewrite the full song from scratch. Follow the structure labels and exact lyric-line counts with zero exceptions.`,
        4096,
        model,
      );
      lyrics = correction.response.text?.trim() || lyrics;
      model = correction.model;
    }

    return NextResponse.json({ lyrics, model });
  } catch (error) {
    const transient = isTransientGeminiError(error);
    return NextResponse.json(
      {
        error: transient
          ? "Gemini is busy across the available models. Please try again in a moment."
          : errorText(error) || "Something went wrong while generating lyrics.",
      },
      { status: transient ? 503 : 500 },
    );
  }
}
