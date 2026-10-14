import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
export const maxDuration = 40;

const roots = ["C","C#","D","Eb","E","F","F#","G","Ab","A","Bb","B"];
const keys = new Set(roots.flatMap(root => [root + " minor",root + " major"]));
const validBpm = (n: unknown): n is number => Number.isInteger(n) && (n as number) >= 60 && (n as number) <= 200;

export async function POST(request: Request) {
  try {
    const data = (await request.json()) as { title?: string; theme?: string; sound?: string; feels?: string[] };
    const title = String(data.title || "").trim().slice(0,120);
    const theme = String(data.theme || "").trim().slice(0,600);
    const sound = String(data.sound || "Melodic trap").trim().slice(0,100);
    const feels = Array.isArray(data.feels) ? data.feels.slice(0,5).map(v => String(v).slice(0,40)) : [];
    if (!title && !theme) return NextResponse.json({error:"Add a song title or concept before requesting a recommendation."},{status:400});
    const key = process.env.GEMINI_API_KEY;
    if (!key) return NextResponse.json({error:"Gemini is not configured."},{status:503});
    const ai = new GoogleGenAI({apiKey:key});
    const prompt = [
      "Act as a creative music director for Eboi, a Nigerian melodic trap and faith-rooted rap artist.",
      "Recommend an appropriate TEMPO (integer BPM) and musical KEY for a NEW composition, based on the song concept, mood and primary genre. These are creative suggestions, not analysis of existing audio.",
      "Song title: "+title, "Concept: "+theme,"Genre: "+sound,"Feel: "+(feels.join(", ")||"Open direction"),
      "Respect a plausible groove for the genre, including half-time/double-time trap conventions. Explain your rationale in one or two brief sentences, not an unsupported claim of objective optimality.",
      "Return ONLY JSON: {\"bpm\": 136, \"key\":\"F minor\", \"reason\":\"A brief musical reason for both choices.\"}.",
      "The key MUST be one of: "+[...keys].join(", ")+". BPM must be an integer from 60 to 200."
    ].join("\n");
    let last = "";
    for (const model of [...new Set([process.env.GEMINI_MODEL || "gemini-3.7-flash","gemini-3.6-flash"])]) {
      try {
        const result = await ai.models.generateContent({model,contents:prompt,config:{responseMimeType:"application/json",maxOutputTokens:320,temperature:0.45}});
        const parsed=JSON.parse(result.text||"{}") as {bpm?:number;key?:string;reason?:string};
        if (!validBpm(parsed.bpm) || !keys.has(String(parsed.key))) throw new Error("Invalid recommendation returned.");
        return NextResponse.json({bpm:parsed.bpm,key:parsed.key,reason:String(parsed.reason||"Recommended for the selected song direction.").trim().slice(0,400),model});
      } catch(e) {last=e instanceof Error?e.message:"Could not generate a recommendation.";}
    }
    return NextResponse.json({error:"Recommendation unavailable right now. Choose your own tempo and key. "+last},{status:502});
  } catch(e){return NextResponse.json({error:e instanceof Error?e.message:"Unable to recommend music direction."},{status:500});}
}
