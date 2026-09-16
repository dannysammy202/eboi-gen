"use client";

import {
  Check,
  Clipboard,
  Disc3,
  FileText,
  Lightbulb,
  LoaderCircle,
  Music2,
  RotateCcw,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

type StartMode = "hook" | "verse";
type ToolView = "lyrics" | "themes";

type FormState = {
  title: string;
  theme: string;
  feel: string;
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

type ThemeIdea = {
  name: string;
  theme: string;
  angle: string;
};

const directionOptions = [
  "Open",
  "Hard-hitting",
  "Anthemic",
  "Energetic",
  "Aggressive",
  "Confident",
  "Melodic",
  "Smooth",
  "Chill",
  "Late-night",
  "Dark & focused",
  "Reflective",
  "Introspective",
  "Vulnerable",
  "Love",
  "Romantic",
  "Heartfelt",
  "Grateful",
  "Hopeful",
  "Victory",
  "Come-up",
  "Resilient",
  "Street faith",
  "Prayerful",
  "Testimony",
  "Joyful",
  "Motivational",
  "Drill",
  "Trap",
  "Afro-trap",
  "Afrobeats",
  "Afro-R&B",
  "R&B",
  "Jersey",
  "Boom bap",
  "Club-ready",
  "Soulful",
  "Dreamy",
  "Gritty",
  "Storytelling",
  "Celebratory",
];

const initialState: FormState = {
  title: "Locked In",
  theme: "Sold out to God, moving how He says I should move, putting the Word in me, rising with purpose and expecting to win.",
  feel: "Open",
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
    <button type="button" className={`toggle ${checked ? "toggle-on" : ""}`} role="switch" aria-checked={checked} onClick={() => onChange(!checked)}>
      <span />
    </button>
  );
}

export default function Home() {
  const [activeTool, setActiveTool] = useState<ToolView>("lyrics");
  const [form, setForm] = useState<FormState>(initialState);
  const [lyrics, setLyrics] = useState("");
  const [model, setModel] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const [themeTitle, setThemeTitle] = useState(initialState.title);
  const [themeTempo, setThemeTempo] = useState(initialState.tempo);
  const [direction, setDirection] = useState("Open");
  const [soundNote, setSoundNote] = useState("");
  const [themes, setThemes] = useState<ThemeIdea[]>([]);
  const [themeLoading, setThemeLoading] = useState(false);
  const [themeError, setThemeError] = useState("");

  const structure = useMemo(() => getStructure(form), [form]);
  const totalLines = useMemo(() => (
    (form.includeIntro ? form.introLines : 0) +
    form.verseCount * form.verseLines +
    form.hookCount * form.hookLines +
    (form.includeOutro ? form.outroLines : 0)
  ), [form]);

  const update = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  async function generateThemes() {
    if (!themeTitle.trim()) {
      setThemeError("Enter a title before generating themes.");
      return;
    }

    if (!themeTempo.trim()) {
      setThemeError("Enter a tempo before generating themes.");
      return;
    }

    setThemeLoading(true);
    setThemeError("");

    try {
      const response = await fetch("/api/themes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: themeTitle, tempo: themeTempo, direction, soundNote }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Theme generation failed.");

      setThemes(data.themes || []);
      setModel(data.model || model);
    } catch (err) {
      setThemeError(err instanceof Error ? err.message : "Theme generation failed.");
    } finally {
      setThemeLoading(false);
    }
  }

  function useTheme(theme: ThemeIdea) {
    setForm((current) => ({ ...current, title: themeTitle, theme: theme.theme, feel: direction, tempo: themeTempo }));
    setActiveTool("lyrics");
  }

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
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-mark"><Disc3 size={20} /></div>
          <div>
            <p className="eyebrow">EBOI</p>
            <h1>Studio</h1>
          </div>
        </div>

        <nav className="sidebar-nav">
          <button className={activeTool === "lyrics" ? "active" : ""} onClick={() => setActiveTool("lyrics")}>
            <FileText size={18} />
            <span><strong>Lyrics Generator</strong><small>Write the full song</small></span>
          </button>
          <button className={activeTool === "themes" ? "active" : ""} onClick={() => setActiveTool("themes")}>
            <Lightbulb size={18} />
            <span><strong>Theme Generator</strong><small>Find the song direction</small></span>
          </button>
        </nav>

        <div className="sidebar-status">
          <span className="status-dot" />
          <div><strong>Gemini connected</strong><small>{model || "Google AI"}</small></div>
        </div>
      </aside>

      <main className="main-content">
        <header className="page-header">
          <div>
            <p className="kicker">EBOI LYRIC STUDIO</p>
            <h2>{activeTool === "lyrics" ? "Lyrics Generator" : "Theme Generator"}</h2>
            <p>{activeTool === "lyrics" ? "Set the song brief, feel, structure and section lengths, then generate the full record." : "Start with a title, tempo and direction, then generate five themes to choose from."}</p>
          </div>
        </header>

        {activeTool === "lyrics" ? (
          <section className="workspace">
            <form className="panel controls" onSubmit={generate}>
              <div className="panel-heading">
                <div><p className="kicker">Song brief</p><h3>Set the record</h3></div>
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
                <textarea rows={4} value={form.theme} onChange={(e) => update("theme", e.target.value)} placeholder="Write your theme, or select one from Theme Generator." required />
              </label>

              <div className="field">
                <span>How should it feel / sound? <small>Optional</small></span>
                <div className="direction-pills">
                  {directionOptions.map((option) => (
                    <button key={option} type="button" className={form.feel === option ? "active" : ""} onClick={() => update("feel", option)}>{option}</button>
                  ))}
                </div>
              </div>

              <button className="text-link" type="button" onClick={() => { setThemeTitle(form.title); setThemeTempo(form.tempo); setDirection(form.feel); setActiveTool("themes"); }}>
                <Lightbulb size={15} /> Need a theme for this title?
              </button>

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
                {form.includeIntro && <div className="sub-row"><span>Lines</span><Stepper value={form.introLines} min={2} max={8} onChange={(value) => update("introLines", value)} /></div>}
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
                {form.includeOutro && <div className="sub-row"><span>Lines</span><Stepper value={form.outroLines} min={2} max={8} onChange={(value) => update("outroLines", value)} /></div>}
              </div>

              <div className="structure-preview">
                <p>Generated order</p>
                <div className="chips">{structure.map((section) => <span key={section}>{section}</span>)}</div>
              </div>

              <button className="generate" type="submit" disabled={loading}>
                {loading ? <LoaderCircle className="spin" size={19} /> : <WandSparkles size={19} />}
                {loading ? "Writing..." : "Generate song"}
              </button>
            </form>

            <section className="panel output">
              <div className="panel-heading output-heading">
                <div><p className="kicker">Generated lyrics</p><h3>{lyrics ? form.title || "Untitled" : "Your song appears here"}</h3></div>
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
                    <p>Set your song brief and structure, then generate.</p>
                    <div className="mini-structure">{structure.slice(0, 5).map((section) => <span key={section}>{section.split(" (")[0]}</span>)}</div>
                  </div>
                )}
              </div>

              <footer className="output-footer"><span>{model ? `Model: ${model}` : "Google Gemini"}</span><span>Original melodic Christian trap preset</span></footer>
            </section>
          </section>
        ) : (
          <section className="theme-workspace">
            <section className="panel theme-controls-panel">
              <div className="panel-heading">
                <div><p className="kicker">Theme brief</p><h3>Start with the title</h3></div>
                <Lightbulb size={20} />
              </div>

              <div className="field-grid two">
                <label className="field">
                  <span>Title</span>
                  <input value={themeTitle} onChange={(e) => setThemeTitle(e.target.value)} placeholder="Locked In" />
                </label>
                <label className="field">
                  <span>Tempo</span>
                  <div className="suffix-field">
                    <input type="number" min="50" max="220" value={themeTempo} onChange={(e) => setThemeTempo(e.target.value)} required />
                    <span>BPM</span>
                  </div>
                </label>
              </div>

              <div className="field">
                <span>How should it feel / sound? <small>Optional</small></span>
                <div className="direction-pills">
                  {directionOptions.map((option) => (
                    <button key={option} type="button" className={direction === option ? "active" : ""} onClick={() => setDirection(option)}>{option}</button>
                  ))}
                </div>
              </div>

              <label className="field">
                <span>Describe the sound <small>Optional</small></span>
                <textarea rows={5} value={soundNote} onChange={(e) => setSoundNote(e.target.value)} placeholder="Example: 140 BPM drill bounce, dark keys, melodic hook, calm delivery over hard drums" />
              </label>

              <button className="generate" type="button" onClick={generateThemes} disabled={themeLoading}>
                {themeLoading ? <LoaderCircle className="spin" size={19} /> : <Sparkles size={19} />}
                {themeLoading ? "Finding themes..." : themes.length ? "Regenerate 5 themes" : "Generate 5 themes"}
              </button>

              {themeError && <div className="inline-error">{themeError}</div>}
            </section>

            <section className="panel theme-results-panel">
              <div className="panel-heading results-heading">
                <div><p className="kicker">Theme ideas</p><h3>{themes.length ? `5 directions for “${themeTitle}” at ${themeTempo} BPM` : "Your theme ideas appear here"}</h3></div>
              </div>

              {themes.length ? (
                <div className="theme-results">
                  {themes.map((theme, index) => (
                    <article className="theme-option" key={`${theme.name}-${index}`}>
                      <div className="theme-option-top"><span className="theme-number">0{index + 1}</span><strong>{theme.name}</strong></div>
                      <p>{theme.theme}</p>
                      {theme.angle && <small>{theme.angle}</small>}
                      <button type="button" onClick={() => useTheme(theme)}>Use this theme <FileText size={14} /></button>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="theme-empty">
                  <div className="empty-icon"><Lightbulb size={27} /></div>
                  <h3>Give the title a direction</h3>
                  <p>Enter the title and tempo, add an optional direction or sound note, then generate five different themes.</p>
                </div>
              )}
            </section>
          </section>
        )}
      </main>
    </div>
  );
}