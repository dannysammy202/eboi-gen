import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

type ThemeRequest = {
  title: string;
  tempo?: string;
  direction?: string;
  soundNote?: string;
};

type ThemeIdea = {
  name: string;
  theme: string;
  angle: string;
};

function cleanJson(text: string) {
  return text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/, "");
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

async function generateWithFallback(ai: GoogleGenAI, contents: string) {
  const configured = process.env.GEMINI_MODEL || "gemini-3.7-flash";
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
          config: { maxOutputTokens: 1600 },
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

    const data = (await request.json()) as ThemeRequest;
    const title = data.title?.trim();
    const tempo = data.tempo?.trim();

    if (!title) {
      return NextResponse.json({ error: "Enter a song title first." }, { status: 400 });
    }

    if (!tempo) {
      return NextResponse.json({ error: "Enter the song tempo first." }, { status: 400 });
    }

    const direction = data.direction?.trim() || "Open direction";
    const soundNote = data.soundNote?.trim() || "No extra sound description supplied";

    const prompt = `You are developing song concepts for Eboi, a Nigerian Christian rap artist making original melodic trap and rap records.

SONG TITLE
${title}

TEMPO
${tempo} BPM

SELECTED DIRECTION / SOUND
${direction}

OPTIONAL SOUND NOTE
${soundNote}

Generate exactly 5 distinct theme ideas for this title.

Requirements:
- Each idea must feel suitable for a confident Nigerian Christian rap record.
- Keep the Christian foundation clear without turning every concept into worship language.
- Explore faith, ambition, discipline, pressure, purpose, winning, growth, identity, grace, resilience, relationships with God, love, relationships, the come-up, and everyday life where relevant.
- Treat the selected direction as either a mood, lyrical angle, genre, or sonic reference. For example, Love should shape the subject and emotion, while Drill should shape the intensity, attitude, pacing, and type of concept.
- Use the BPM as an energy and pacing constraint. Let tempo influence intensity, emotional movement, hook potential, lyrical density, and the type of concept you suggest.
- Do not make speed or BPM itself the subject of the song unless the title naturally points there.
- Match the selected direction, tempo, and sound note when supplied.
- Keep every idea meaningfully different from the others.
- Avoid generic concepts such as simply "trust God" or "God is good".
- Make each theme specific enough to guide a full song.
- Do not imitate any living artist's exact lyrical style.

Return JSON only, with no markdown and no commentary, using this exact shape:
[
  {
    "name": "short concept name, 2 to 5 words",
    "theme": "one or two sentences describing what the full song is about",
    "angle": "a short phrase describing the emotional or lyrical angle"
  }
]`;

    const ai = new GoogleGenAI({ apiKey });
    const generated = await generateWithFallback(ai, prompt);
    const raw = generated.response.text?.trim();

    if (!raw) {
      return NextResponse.json({ error: "Gemini returned an empty response." }, { status: 502 });
    }

    let themes: ThemeIdea[];
    try {
      themes = JSON.parse(cleanJson(raw)) as ThemeIdea[];
    } catch {
      return NextResponse.json({ error: "Gemini returned an invalid theme response. Try again." }, { status: 502 });
    }

    const validThemes = Array.isArray(themes)
      ? themes
          .filter((item) => item?.name && item?.theme)
          .slice(0, 5)
          .map((item) => ({
            name: String(item.name).trim(),
            theme: String(item.theme).trim(),
            angle: String(item.angle || "").trim(),
          }))
      : [];

    if (validThemes.length !== 5) {
      return NextResponse.json({ error: "Gemini did not return five complete themes. Regenerate the set." }, { status: 502 });
    }

    return NextResponse.json({ themes: validThemes, model: generated.model });
  } catch (error) {
    const transient = isTransientGeminiError(error);
    return NextResponse.json(
      {
        error: transient
          ? "Gemini is busy across the available models. Please try again in a moment."
          : errorText(error) || "Something went wrong while generating themes.",
      },
      { status: transient ? 503 : 500 },
    );
  }
}
