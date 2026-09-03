import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

type ThemeRequest = {
  title: string;
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

    if (!title) {
      return NextResponse.json({ error: "Enter a song title first." }, { status: 400 });
    }

    const direction = data.direction?.trim() || "Open direction";
    const soundNote = data.soundNote?.trim() || "No extra sound description supplied";

    const prompt = `You are developing song concepts for Eboi, a Nigerian Christian rap artist making original melodic trap and rap records.

SONG TITLE
${title}

SELECTED DIRECTION
${direction}

OPTIONAL SOUND NOTE
${soundNote}

Generate exactly 5 distinct theme ideas for this title.

Requirements:
- Each idea must feel suitable for a confident Nigerian Christian rap record.
- Keep the Christian foundation clear without turning every concept into worship language.
- Explore faith, ambition, discipline, pressure, purpose, winning, growth, identity, grace, resilience, relationships with God, the come-up, and everyday life where relevant.
- Match the selected direction and sound note when supplied.
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
    const model = process.env.GEMINI_MODEL || "gemini-3.7-flash";
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        temperature: 1.15,
        maxOutputTokens: 1600,
      },
    });

    const raw = response.text?.trim();
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

    return NextResponse.json({ themes: validThemes, model });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Something went wrong while generating themes.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
