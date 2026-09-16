import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

type BeatRequest = {
  mode: "preview" | "full";
  title: string;
  genre: string;
  tempo: string;
  songKey: string;
  feel: string;
  drumStyle: string;
  bassStyle: string;
  melodyStyle: string;
  instruments: string;
  duration: string;
  description?: string;
};

function errorText(error: unknown) {
  if (error instanceof Error) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function buildPrompt(data: BeatRequest) {
  const durationLine = data.mode === "preview"
    ? "Create a 30-second preview with a clear musical idea and enough development to judge the beat."
    : `Create a full instrumental beat. Aim for approximately ${data.duration}, with an intro, developed main section, variation, and an ending.`;

  return `Create an original instrumental beat for a Nigerian Christian rap artist.

BEAT BRIEF
Title / working name: ${data.title || "Untitled beat"}
Genre / sound: ${data.genre}
Tempo: ${data.tempo} BPM
Key: ${data.songKey}
Feel / direction: ${data.feel}
Drums: ${data.drumStyle}
Bass: ${data.bassStyle}
Melody: ${data.melodyStyle}
Instruments / textures: ${data.instruments || "Choose instruments that fit the brief"}
Extra direction: ${data.description?.trim() || "None"}

REQUIREMENTS
- Instrumental only. No vocals, spoken words, chants, humming, toplines, or lyrics.
- Keep enough open space for a rapper or melodic vocalist to perform over it later.
- Keep the groove locked to ${data.tempo} BPM and centre the harmony around ${data.songKey}.
- Let the selected genre, feel, drum style, bass style, and melody style shape the production.
- Use original musical material. Do not copy any existing song, beat, producer tag, melody, or recognisable artist-specific production.
- Build clear sections and transitions rather than one loop repeating unchanged.
- Make the low end controlled and leave headroom for future vocals.
- Avoid excessive lead melodies competing with a future vocal.
- ${durationLine}`;
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

    const data = (await request.json()) as BeatRequest;

    if (!data.genre?.trim() || !data.tempo?.trim() || !data.songKey?.trim()) {
      return NextResponse.json(
        { error: "Genre, tempo and key are required." },
        { status: 400 },
      );
    }

    const model = data.mode === "full" ? "lyria-3.5" : "lyria-3-clip-preview";
    const ai = new GoogleGenAI({ apiKey });

    const interaction = await ai.interactions.create({
      model,
      input: buildPrompt(data),
    });

    const audio = interaction.output_audio;
    if (!audio?.data) {
      return NextResponse.json(
        { error: "Lyria returned no audio. Try a different prompt or generate again." },
        { status: 502 },
      );
    }

    const bytes = Buffer.from(audio.data, "base64");
    const safeTitle = (data.title || "eboi-beat")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "eboi-beat";

    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": audio.mime_type || "audio/mpeg",
        "Content-Disposition": `inline; filename="${safeTitle}-${data.mode}.mp3"`,
        "Cache-Control": "no-store",
        "X-Lyria-Model": model,
        "X-Beat-Mode": data.mode,
      },
    });
  } catch (error) {
    const message = errorText(error);
    const lower = message.toLowerCase();
    const busy =
      lower.includes("503") ||
      lower.includes("429") ||
      lower.includes("overloaded") ||
      lower.includes("resource exhausted") ||
      lower.includes("high demand");

    return NextResponse.json(
      {
        error: busy
          ? "Lyria is busy right now. Try again in a moment."
          : message || "Something went wrong while generating the beat.",
      },
      { status: busy ? 503 : 500 },
    );
  }
}
