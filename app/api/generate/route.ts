import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

type SongRequest = {
  title: string;
  theme: string;
  feel?: string;
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

  const feel = data.feel?.trim() || "Open";

  return `Write an original song for Eboi, a Nigerian Christian rap artist. Eboi's writing identity blends melodic trap instincts with reflective, cadence-led rap. The result should feel musical, fluid, personal, confident and performance-ready, while remaining unmistakably Eboi.

SONG DETAILS
Title: ${data.title}
Tempo: ${data.tempo} BPM
Theme: ${data.theme}
Feel / direction: ${feel}
Key: ${data.songKey}

STRUCTURE
${structureText}

SECTION LENGTHS
- Intro: ${data.includeIntro ? `${data.introLines} lines` : "None"}
- Verses: ${data.verseCount} total, exactly ${data.verseLines} lines each
- Hooks: ${data.hookCount} total, exactly ${data.hookLines} lines each
- Outro: ${data.includeOutro ? `${data.outroLines} lines` : "None"}

EBOI WRITING AND FLOW DIRECTION
- Keep the melodic side smooth and pocket-focused. Use natural melodic phrasing, fluid cadence, internal rhyme, bounce and lines that sit comfortably on a trap beat.
- Add a reflective rap side built around conversational phrasing, emotional honesty, purposeful line construction and verses that develop naturally from one thought into the next.
- Let flows evolve inside a verse. Shift cadence, line length, rhyme placement and intensity where it keeps the performance alive instead of locking every bar into the same pattern.
- Balance melody and straight rapping naturally. Some lines should glide, some should land firmly, and transitions should feel intentional.
- Use concise lines with room for delivery. Avoid overcrowding bars with explanations or too many ideas.
- Build memorable pockets through internal rhymes, repeated sounds, strategic repetition and connected phrases rather than forcing end-rhyme on every line.
- Reflect on faith, ambition, discipline, pressure, purpose, growth, setbacks, gratitude and the come-up from a personal point of view.
- Let Christian conviction appear naturally in the writing. Keep faith clear without turning verses into sermons or generic worship language.
- Keep the voice grounded and conversational. Lines should sound natural when spoken or performed, not like formal poetry.
- Do not introduce choir, gospel-production, spacious-production or other instrumental assumptions from lyrical references. This prompt concerns lyrics, phrasing and flow. The user's tempo, key, theme and feel define the song context.

STYLE REQUIREMENTS
- Write fully original lyrics. Do not imitate or copy any specific artist, song, melody, lyrics, signature phrases, or recognisable lyrical mannerisms.
- Let the selected feel / direction shape the energy, word choice, cadence, imagery, hook delivery and emotional tone across the whole song.
- Write melodic hooks with one catchy repeatable anchor line when the song direction supports it.
- Prioritise pocket, flow, melody, internal rhyme, emotional clarity and repeatable phrasing over packing new information into every line.
- State the Christian faith message clearly while keeping the writing confident and natural rather than preachy.
- Use only a little Nigerian Pidgin where it fits naturally.
- Avoid worn-out worship clichés and generic church language.
- Keep hooks simple enough to remember after one or two listens.
- Let the title, theme and selected feel influence the central phrase and recurring imagery.
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
