"use client";

import {
  Check,
  Clipboard,
  Disc3,
  LoaderCircle,
  Music2,
  RotateCcw,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

type StartMode = "hook" | "verse";

type FormState = {
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
  startsWith: StartMode;
};

const initialState: FormState = {
  title: "Locked In",
  theme: "Sold out to God, moving how He says I should move, putting the Word in me, rising with purpose and expecting to win.",
  tempo: "122",
  songKey: "Bm",
  includeIntro: false,
  introLines: 4,
  includeOutro: false,
  outroLines: 4,
  verseCount: 1,
  verseLines: 12,
  hookCount: 2,
  hookLines: 4,
  startsWith: "hook",
};

function getStructure(form: FormState) {
  const sections: string[] = [];
  let verses = 0;
  let hooks = 0;

  if (form.includeIntro) sections.push(`Intro (${form.introLines} lines)`);

  while (verses < form.verseCount || hooks < form.hookCount) {
    if (form.startsWith === "hook") {
      if (hooks < form.hookCount) {
        hooks += 1;
        sections.push(`Hook ${hooks} (${form.hookLines} lines)`);
      }
      if (verses < form.verseCount) {
        verses += 1;
        sections.push(`Verse ${verses} (${form.verseLines} lines)`);
      }
    } else {
      if (verses < form.verseCount) {
        verses += 1;
        sections.push(`Verse ${verses} (${form.verseLines} lines)`);
      }
      if (hooks < form.hookCount) {
        hooks += 1;
        sections.push(`Hook ${hooks} (${form.hookLines} lines)`);
      }
    }
  }

  if (form.includeOutro) sections.push(`Outro (${form.outroLines} lines)`);
  return sections;
}

function Stepper({ value, onChange, min = 1, max = 8 }: { value: number; onChange: (next: number) => void; min?: number; max?: number }) {
  return (
    <div className="stepper">
      <button type="button" aria-label="Decrease" onClick={() => onChange(Math.max(min, value - 1))}>−</button>
      <span>{value}</span>
      <button type="button" aria-label="Increase" onClick={() => onChange(Math.min(max, value + 1))}>+</button>
    </div>
  );
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <button
      type="button"
      className={`toggle ${checked ? "toggle-on" : ""}`}
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
    >
      <span />
    </button>
  );
}

export default function Home() {
  const [form, setForm] = useState<FormState>(initialState);
  const [lyrics, setLyrics] = useState("");
  const [model, setModel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const structure = useMemo(() => getStructure(form), [form]);
  const totalLines = useMemo(() => {
    return (
      (form.includeIntro ? form.introLines : 0) +
      form.verseCount * form.verseLines +
      form.hookCount * form.hookLines +
      (form.includeOutro ? form.outroLines : 0)
    );
  }, [form]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  async function generate(event?: FormEvent) {
    event?.preventDefault();
    setLoading(true);
    setError("");
    setCopied(false);

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, structure }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Generation failed.");

      setLyrics(data.lyrics);
      setModel(data.model || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed.");
    } finally {
      setLoading(false);
    }
  }

  async function copyLyrics() {
    if (!lyrics) return;
    await navigator.clipboard.writeText(lyrics);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <main className="shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"><Disc3 size={20} /></div>
          <div>
            <p className="eyebrow">EBOI</p>
            <h1>Lyric Studio</h1>
          </div>
        </div>
        <div className="status"><span /> Gemini connected through server API</div>
      </header>

      <section className="workspace">
        <form className="panel controls" onSubmit={generate}>
          <div className="panel-heading">
            <div>
              <p className="kicker">Song brief</p>
              <h2>Set the record</h2>
            </div>
            <Music2 size={20} />
          </div>

          <div className="field-grid two">
            <label className="field">
              <span>Title</span>
              <input value={form.title} onChange={(e) => update("title", e.target.value)} placeholder="Locked In" required />
            </label>
            <label className="field">
              <span>Key</span>
              <input value={form.songKey} onChange={(e) => update("songKey", e.target.value)} placeholder="Bm" required />
            </label>
          </div>

          <div className="field-grid two">
            <label className="field">
              <span>Tempo</span>
              <div className="suffix-field">
                <input type="number" min="50" max="220" value={form.tempo} onChange={(e) => update("tempo", e.target.value)} required />
                <span>BPM</span>
              </div>
            </label>
            <div className="field">
              <span>Starts with</span>
              <div className="segmented">
                <button type="button" className={form.startsWith === "hook" ? "active" : ""} onClick={() => update("startsWith", "hook")}>Hook</button>
                <button type="button" className={form.startsWith === "verse" ? "active" : ""} onClick={() => update("startsWith", "verse")}>Verse</button>
              </div>
            </div>
          </div>

          <label className="field">
            <span>Theme</span>
            <textarea rows={4} value={form.theme} onChange={(e) => update("theme", e.target.value)} placeholder="What is the song about?" required />
          </label>

          <div className="divider" />

          <div className="section-title">
            <div><p className="kicker">Structure</p><h3>Build the arrangement</h3></div>
            <span className="line-count">{totalLines} lyric lines</span>
          </div>

          <div className="structure-card">
            <div className="row-main">
              <div><strong>Intro</strong><small>Optional opening section</small></div>
              <Toggle checked={form.includeIntro} onChange={(value) => update("includeIntro", value)} />
            </div>
            {form.includeIntro && (
              <div className="sub-row"><span>Lines</span><Stepper value={form.introLines} min={2} max={8} onChange={(value) => update("introLines", value)} /></div>
            )}
          </div>

          <div className="structure-card">
            <div className="row-main">
              <div><strong>Verses</strong><small>Cadence-driven rap sections</small></div>
              <Stepper value={form.verseCount} max={4} onChange={(value) => update("verseCount", value)} />
            </div>
            <div className="sub-row"><span>Lines per verse</span><Stepper value={form.verseLines} min={4} max={24} onChange={(value) => update("verseLines", value)} /></div>
          </div>

          <div className="structure-card">
            <div className="row-main">
              <div><strong>Hooks</strong><small>Melodic crowd-ready sections</small></div>
              <Stepper value={form.hookCount} max={5} onChange={(value) => update("hookCount", value)} />
            </div>
            <div className="sub-row"><span>Lines per hook</span><Stepper value={form.hookLines} min={2} max={12} onChange={(value) => update("hookLines", value)} /></div>
          </div>

          <div className="structure-card">
            <div className="row-main">
              <div><strong>Outro</strong><small>Optional closing section</small></div>
              <Toggle checked={form.includeOutro} onChange={(value) => update("includeOutro", value)} />
            </div>
            {form.includeOutro && (
              <div className="sub-row"><span>Lines</span><Stepper value={form.outroLines} min={2} max={8} onChange={(value) => update("outroLines", value)} /></div>
            )}
          </div>

          <div className="structure-preview">
            <p>Generated order</p>
            <div className="chips">
              {structure.map((section) => <span key={section}>{section}</span>)}
            </div>
          </div>

          <button className="generate" type="submit" disabled={loading}>
            {loading ? <LoaderCircle className="spin" size={19} /> : <WandSparkles size={19} />}
            {loading ? "Writing..." : "Generate song"}
          </button>
        </form>

        <section className="panel output">
          <div className="panel-heading output-heading">
            <div>
              <p className="kicker">Generated lyrics</p>
              <h2>{lyrics ? form.title || "Untitled" : "Your song appears here"}</h2>
            </div>
            {lyrics && (
              <div className="output-actions">
                <button type="button" onClick={copyLyrics}>{copied ? <Check size={17} /> : <Clipboard size={17} />}{copied ? "Copied" : "Copy"}</button>
                <button type="button" onClick={() => generate()} disabled={loading}><RotateCcw size={17} />Regenerate</button>
              </div>
            )}
          </div>

          <div className={`lyric-sheet ${lyrics ? "has-lyrics" : ""}`}>
            {error ? (
              <div className="error-state"><strong>Generation failed</strong><p>{error}</p></div>
            ) : lyrics ? (
              <pre>{lyrics}</pre>
            ) : (
              <div className="empty-state">
                <div className="empty-icon"><Sparkles size={27} /></div>
                <h3>Ready for the beat</h3>
                <p>Set your song brief, choose the section order and lengths, then generate.</p>
                <div className="mini-structure">
                  {structure.slice(0, 5).map((section) => <span key={section}>{section.split(" (")[0]}</span>)}
                </div>
              </div>
            )}
          </div>

          <footer className="output-footer">
            <span>{model ? `Model: ${model}` : "Google Gemini"}</span>
            <span>Original melodic Christian trap preset</span>
          </footer>
        </section>
      </section>
    </main>
  );
}
