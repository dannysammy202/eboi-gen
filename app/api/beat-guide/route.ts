import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";

type BeatGuideRequest = {
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

type NoteEvent = {
  step: number;
  note: string;
  length: string;
  glide?: string;
};

type BeatGuide = {
  title: string;
  summary: string;
  scale: string;
  timeSignature: string;
  chords: Array<{
    bar: number;
    chord: string;
    notes: string[];
    length: string;
  }>;
  melody: Array<{
    bar: number;
    notes: NoteEvent[];
    instruction: string;
  }>;
  bass808: Array<{
    bar: number;
    notes: NoteEvent[];
    instruction: string;
  }>;
  drumPatterns: Array<{
    name: string;
    useFor: string;
    kick: number[];
    snare: number[];
    clap: number[];
    closedHat: number[];
    openHat: number[];
    percussion: number[];
    notes: string;
  }>;
  arrangement: Array<{
    bars: string;
    section: string;
    elements: string[];
  }>;
  bandlabSetup: string[];
  mixNotes: string[];
};

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
  const models = Array.from(new Set([configured, "gemini-3.6-flash", "gemini-3.5-flash"]));
  let lastError: unknown;

  for (const model of models) {
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        const response = await ai.models.generateContent({
          model,
          contents,
          config: {
            maxOutputTokens: 6000,
            responseMimeType: "application/json",
          },
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

function clampSteps(value: unknown) {
  if (!Array.isArray(value)) return [];
  return Array.from(
    new Set(
      value
        .map((step) => Number(step))
        .filter((step) => Number.isInteger(step) && step >= 1 && step <= 16),
    ),
  ).sort((a, b) => a - b);
}

function normaliseNotes(value: unknown): NoteEvent[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      const note = item as Partial<NoteEvent>;
      const step = Number(note.step);
      if (!Number.isInteger(step) || step < 1 || step > 16 || !note.note) return null;
      return {
        step,
        note: String(note.note),
        length: String(note.length || "1/8"),
        ...(note.glide ? { glide: String(note.glide) } : {}),
      };
    })
    .filter((item): item is NoteEvent => Boolean(item));
}

function normaliseGuide(raw: BeatGuide): BeatGuide {
  return {
    title: String(raw.title || "BandLab Production Guide"),
    summary: String(raw.summary || ""),
    scale: String(raw.scale || ""),
    timeSignature: String(raw.timeSignature || "4/4"),
    chords: Array.isArray(raw.chords)
      ? raw.chords.slice(0, 8).map((item) => ({
          bar: Number(item.bar) || 1,
          chord: String(item.chord || ""),
          notes: Array.isArray(item.notes) ? item.notes.map(String).slice(0, 6) : [],
          length: String(item.length || "1 bar"),
        }))
      : [],
    melody: Array.isArray(raw.melody)
      ? raw.melody.slice(0, 8).map((item) => ({
          bar: Number(item.bar) || 1,
          notes: normaliseNotes(item.notes),
          instruction: String(item.instruction || ""),
        }))
      : [],
    bass808: Array.isArray(raw.bass808)
      ? raw.bass808.slice(0, 8).map((item) => ({
          bar: Number(item.bar) || 1,
          notes: normaliseNotes(item.notes),
          instruction: String(item.instruction || ""),
        }))
      : [],
    drumPatterns: Array.isArray(raw.drumPatterns)
      ? raw.drumPatterns.slice(0, 4).map((item) => ({
          name: String(item.name || "Pattern"),
          useFor: String(item.useFor || "Main section"),
          kick: clampSteps(item.kick),
          snare: clampSteps(item.snare),
          clap: clampSteps(item.clap),
          closedHat: clampSteps(item.closedHat),
          openHat: clampSteps(item.openHat),
          percussion: clampSteps(item.percussion),
          notes: String(item.notes || ""),
        }))
      : [],
    arrangement: Array.isArray(raw.arrangement)
      ? raw.arrangement.slice(0, 12).map((item) => ({
          bars: String(item.bars || ""),
          section: String(item.section || "Section"),
          elements: Array.isArray(item.elements) ? item.elements.map(String).slice(0, 10) : [],
        }))
      : [],
    bandlabSetup: Array.isArray(raw.bandlabSetup) ? raw.bandlabSetup.map(String).slice(0, 12) : [],
    mixNotes: Array.isArray(raw.mixNotes) ? raw.mixNotes.map(String).slice(0, 12) : [],
  };
}

function buildPrompt(data: BeatGuideRequest) {
  return `Act as a practical beat producer creating a manual BandLab production guide. Build an original beat blueprint from this brief.

BEAT BRIEF
Title: ${data.title || "Untitled beat"}
Genre / sound: ${data.genre}
Tempo: ${data.tempo} BPM
Key: ${data.songKey}
Feel / direction: ${data.feel}
Drum style: ${data.drumStyle}
Bass style: ${data.bassStyle}
Melody style: ${data.melodyStyle}
Instruments / textures: ${data.instruments || "Choose suitable instruments"}
Target length: ${data.duration}
Extra direction: ${data.description?.trim() || "None"}

BANDLAB RULES
- Make the guide practical for someone entering notes by hand in BandLab's piano roll and drum machine.
- Use 4/4 time unless the brief strongly requires otherwise.
- Treat each bar as a 16-step grid. Steps 1, 5, 9 and 13 are the four quarter-note beats. Every drum step must be an integer from 1 to 16.
- Give exact note names with octaves, for example B3, D4, F#4. Keep all notes consistent with the stated key and scale unless you intentionally use a passing tone.
- Give a four-bar chord loop where appropriate. For each chord, list the exact notes to place in the piano roll.
- Give a playable four-bar main melody pattern with note, step and note length.
- Give a four-bar 808 or bass pattern with note, step and note length. Add glide instructions only when suitable.
- Give at least two drum patterns: a main pattern and a variation or hook pattern.
- For every drum pattern list kick, snare, clap, closed hi-hat, open hi-hat and percussion step numbers. Use an empty array when an element should stay silent.
- Keep snare and clap placements genre-aware instead of forcing trap conventions onto every genre.
- Include a full-song arrangement with bar ranges and which elements enter or drop out.
- Include BandLab setup instructions such as project tempo, key/scale, grid resolution and suggested track order.
- Include concise mixing notes suitable for a rough beat mix.
- Leave enough frequency and rhythmic space for rap or melodic vocals.
- Do not copy an existing beat, melody, chord voicing or producer signature.

Return JSON only with this exact shape:
{
  "title": "string",
  "summary": "short production overview",
  "scale": "scale name",
  "timeSignature": "4/4",
  "chords": [
    { "bar": 1, "chord": "Bm", "notes": ["B3", "D4", "F#4"], "length": "1 bar" }
  ],
  "melody": [
    {
      "bar": 1,
      "notes": [
        { "step": 1, "note": "F#4", "length": "1/4" }
      ],
      "instruction": "short instruction"
    }
  ],
  "bass808": [
    {
      "bar": 1,
      "notes": [
        { "step": 1, "note": "B1", "length": "1/4", "glide": "optional glide instruction" }
      ],
      "instruction": "short instruction"
    }
  ],
  "drumPatterns": [
    {
      "name": "Main pattern",
      "useFor": "Verse / main loop",
      "kick": [1, 7, 11],
      "snare": [5, 13],
      "clap": [5, 13],
      "closedHat": [1, 3, 5, 7, 9, 11, 13, 15],
      "openHat": [12],
      "percussion": [],
      "notes": "short instruction"
    }
  ],
  "arrangement": [
    { "bars": "1-4", "section": "Intro", "elements": ["piano", "pad"] }
  ],
  "bandlabSetup": ["instruction"],
  "mixNotes": ["instruction"]
}`;
}

export async function POST(request: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY is missing." }, { status: 500 });
    }

    const data = (await request.json()) as BeatGuideRequest;
    if (!data.genre?.trim() || !data.tempo?.trim() || !data.songKey?.trim()) {
      return NextResponse.json({ error: "Genre, tempo and key are required." }, { status: 400 });
    }

    const ai = new GoogleGenAI({ apiKey });
    const generated = await generateWithFallback(ai, buildPrompt(data));
    const raw = generated.response.text?.trim();

    if (!raw) {
      return NextResponse.json({ error: "Gemini returned an empty production guide." }, { status: 502 });
    }

    let guide: BeatGuide;
    try {
      guide = JSON.parse(raw) as BeatGuide;
    } catch {
      return NextResponse.json({ error: "Gemini returned an invalid production guide. Generate it again." }, { status: 502 });
    }

    const cleanGuide = normaliseGuide(guide);
    if (!cleanGuide.chords.length || !cleanGuide.drumPatterns.length || !cleanGuide.arrangement.length) {
      return NextResponse.json({ error: "The production guide was incomplete. Generate it again." }, { status: 502 });
    }

    return NextResponse.json({ guide: cleanGuide, model: generated.model });
  } catch (error) {
    const transient = isTransientGeminiError(error);
    return NextResponse.json(
      {
        error: transient
          ? "Gemini is busy across the available models. Try again in a moment."
          : errorText(error) || "Something went wrong while generating the production guide.",
      },
      { status: transient ? 503 : 500 },
    );
  }
}
