"use client";

import {
  Check,
  Clipboard,
  Disc3,
  Download,
  FileText,
  Headphones,
  Lightbulb,
  LoaderCircle,
  Music2,
  RotateCcw,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { FormEvent, useMemo, useState } from "react";

type StartMode = "hook" | "verse";
type ToolView = "lyrics" | "themes" | "beats";
type BeatMode = "preview" | "full";

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

type BeatForm = {
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
  description: string;
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

const beatGenreOptions = [
  "Melodic Trap",
  "Trap",
  "Drill",
  "Afro-trap",
  "Afrobeats",
  "Afro-R&B",
  "R&B",
  "Jersey",
  "Boom bap",
  "Gospel Trap",
  "Ambient Trap",
  "PluggnB",
  "Rage",
  "Soul Trap",
  "Lo-fi",
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

const initialBeat: BeatForm = {
  title: "Locked In",
  genre: "Melodic Trap",
  tempo: "122",
  songKey: "Bm",
  feel: "Melodic",
  drumStyle: "Hard trap drums, crisp hi-hats and a punchy snare",
  bassStyle: "Deep controlled 808s with tasteful glides",
  melodyStyle: "Dark melodic keys with space for vocals",
  instruments: "Piano, airy pads and subtle synth textures",
  duration: "2 minutes",
  description: "",
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

  const [beat, setBeat] = useState<BeatForm>(initialBeat);
  const [beatLoading, setBeatLoading] = useState<BeatMode | null>(null);
  const [beatError, setBeatError] = useState("");
  const [beatAudioUrl, setBeatAudioUrl] = useState("");
  const [beatOutputMode, setBeatOutputMode] = useState<BeatMode | null>(null);
  const [beatModel, setBeatModel] = useState("");

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

  const updateBeat = <K extends keyof BeatForm>(key: K, value: BeatForm[K]) => {
    setBeat((current) => ({ ...current, [key]: value }));
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

  function useThemeInBeat(theme: ThemeIdea) {
    setBeat((current) => ({
      ...current,
      title: themeTitle,
      tempo: themeTempo,
      feel: direction === "Open" ? current.feel : direction,
      description: theme.theme,
    }));
    setActiveTool("beats");
  }

  function openBeatFromLyrics() {
    setBeat((current) => ({
      ...current,
      title: form.title,
      tempo: form.tempo,
      songKey: form.songKey,
      feel: form.feel === "Open" ? current.feel : form.feel,
      description: form.theme,
    }));
    setActiveTool("beats");
  }

  function useBeatInLyrics() {
    setForm((current) => ({
      ...current,
      title: beat.title || current.title,
      tempo: beat.tempo,
      songKey: beat.songKey,
      feel: beat.feel,
    }));
    setActiveTool("lyrics");
  }

  async function generateBeat(mode: BeatMode) {
    if (!beat.genre.trim() || !beat.tempo.trim() || !beat.songKey.trim()) {
      setBeatError("Genre, tempo and key are required.");
      return;
    }

    setBeatLoading(mode);
    setBeatError("");

    try {
      const response = await fetch("/api/beats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...beat, mode }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: "Beat generation failed." }));
        throw new Error(data.error || "Beat generation failed.");
      }

      const blob = await response.blob();
      if (beatAudioUrl) URL.revokeObjectURL(beatAudioUrl);
      const url = URL.createObjectURL(blob);
      setBeatAudioUrl(url);
      setBeatOutputMode(mode);
      setBeatModel(response.headers.get("x-lyria-model") || (mode === "preview" ? "lyria-3-clip-preview" : "lyria-3.5"));
    } catch (err) {
      setBeatError(err instanceof Error ? err.message : "Beat generation failed.");
    } finally {
      setBeatLoading(null);
    }
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

  const pageTitle = activeTool === "lyrics" ? "Lyrics Generator" : activeTool === "themes" ? "Theme Generator" : "Beat Generator";
  const pageDescription = activeTool === "lyrics"
    ? "Set the song brief, feel, structure and section lengths, then generate the full record."
    : activeTool === "themes"
      ? "Start with a title, tempo and direction, then generate five themes to choose from."
      : "Shape the production brief, test a 30-second preview, then generate a longer instrumental beat.";

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
          <button className={activeTool === "beats" ? "active" : ""} onClick={() => setActiveTool("beats")}>
            <Headphones size={18} />
            <span><strong>Beat Generator</strong><small>Generate instrumental beats</small></span>
          </button>
        </nav>

        <div className="sidebar-status">
          <span className="status-dot" />
          <div><strong>Google AI connected</strong><small>{activeTool === "beats" ? beatModel || "Gemini + Lyria" : model || "Gemini"}</small></div>
        </div>
      </aside>

      <main className="main-content">
        <header className="page-header">
          <div>
            <p className="kicker">EBOI STUDIO</p>
            <h2>{pageTitle}</h2>
            <p>{pageDescription}</p>
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

              <div className="flow-links">
                <button className="text-link" type="button" onClick={() => { setThemeTitle(form.title); setThemeTempo(form.tempo); setDirection(form.feel); setActiveTool("themes"); }}>
                  <Lightbulb size={15} /> Need a theme for this title?
                </button>
                <button className="text-link" type="button" onClick={openBeatFromLyrics}>
                  <Headphones size={15} /> Build a beat for this song
                </button>
              </div>

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

              <footer className="output-footer"><span>{model ? `Model: ${model}` : "Google Gemini"}</span><span>Original melodic Christian rap preset</span></footer>
            </section>
          </section>
        ) : activeTool === "themes" ? (
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
                      <div className="theme-actions">
                        <button type="button" onClick={() => useTheme(theme)}>Use in Lyrics <FileText size={14} /></button>
                        <button type="button" onClick={() => useThemeInBeat(theme)}>Use in Beat <Headphones size={14} /></button>
                      </div>
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
        ) : (
          <section className="theme-workspace beat-workspace">
            <section className="panel theme-controls-panel beat-controls-panel">
              <div className="panel-heading">
                <div><p className="kicker">Production brief</p><h3>Shape the beat</h3></div>
                <Headphones size={20} />
              </div>

              <div className="field-grid two">
                <label className="field">
                  <span>Title / working name</span>
                  <input value={beat.title} onChange={(e) => updateBeat("title", e.target.value)} placeholder="Locked In" />
                </label>
                <label className="field">
                  <span>Key</span>
                  <input value={beat.songKey} onChange={(e) => updateBeat("songKey", e.target.value)} placeholder="Bm" required />
                </label>
              </div>

              <div className="field-grid two">
                <label className="field">
                  <span>Tempo</span>
                  <div className="suffix-field">
                    <input type="number" min="50" max="220" value={beat.tempo} onChange={(e) => updateBeat("tempo", e.target.value)} required />
                    <span>BPM</span>
                  </div>
                </label>
                <label className="field">
                  <span>Full beat length</span>
                  <select value={beat.duration} onChange={(e) => updateBeat("duration", e.target.value)}>
                    <option>1 minute 30 seconds</option>
                    <option>2 minutes</option>
                    <option>2 minutes 30 seconds</option>
                    <option>3 minutes</option>
                  </select>
                </label>
              </div>

              <div className="field">
                <span>Genre / sound</span>
                <div className="direction-pills">
                  {beatGenreOptions.map((option) => (
                    <button key={option} type="button" className={beat.genre === option ? "active" : ""} onClick={() => updateBeat("genre", option)}>{option}</button>
                  ))}
                </div>
              </div>

              <div className="field">
                <span>Feel / direction</span>
                <div className="direction-pills">
                  {directionOptions.filter((option) => !["Open", "Trap", "Drill", "Afro-trap", "Afrobeats", "Afro-R&B", "R&B", "Jersey", "Boom bap"].includes(option)).map((option) => (
                    <button key={option} type="button" className={beat.feel === option ? "active" : ""} onClick={() => updateBeat("feel", option)}>{option}</button>
                  ))}
                </div>
              </div>

              <label className="field">
                <span>Drum style</span>
                <input value={beat.drumStyle} onChange={(e) => updateBeat("drumStyle", e.target.value)} placeholder="Hard drums, crisp hats, punchy snare" />
              </label>

              <label className="field">
                <span>Bass style</span>
                <input value={beat.bassStyle} onChange={(e) => updateBeat("bassStyle", e.target.value)} placeholder="Deep controlled 808 with glides" />
              </label>

              <label className="field">
                <span>Melody style</span>
                <input value={beat.melodyStyle} onChange={(e) => updateBeat("melodyStyle", e.target.value)} placeholder="Dark melodic keys with space for vocals" />
              </label>

              <label className="field">
                <span>Instruments / textures</span>
                <input value={beat.instruments} onChange={(e) => updateBeat("instruments", e.target.value)} placeholder="Piano, pads, bells, synth textures" />
              </label>

              <label className="field">
                <span>Extra description <small>Optional</small></span>
                <textarea rows={5} value={beat.description} onChange={(e) => updateBeat("description", e.target.value)} placeholder="Example: victorious but calm, wide intro, drums hit harder after eight bars, leave room for a melodic hook" />
              </label>

              <div className="beat-generate-actions">
                <button className="generate secondary-generate" type="button" onClick={() => generateBeat("preview")} disabled={Boolean(beatLoading)}>
                  {beatLoading === "preview" ? <LoaderCircle className="spin" size={19} /> : <Headphones size={19} />}
                  {beatLoading === "preview" ? "Generating preview..." : "Generate 30s preview"}
                </button>
                <button className="generate" type="button" onClick={() => generateBeat("full")} disabled={Boolean(beatLoading)}>
                  {beatLoading === "full" ? <LoaderCircle className="spin" size={19} /> : <Sparkles size={19} />}
                  {beatLoading === "full" ? "Generating full beat..." : "Generate full beat"}
                </button>
              </div>

              {beatError && <div className="inline-error">{beatError}</div>}
            </section>

            <section className="panel theme-results-panel beat-output-panel">
              <div className="panel-heading results-heading">
                <div>
                  <p className="kicker">Generated beat</p>
                  <h3>{beatAudioUrl ? `${beat.title || "Untitled"} ${beatOutputMode === "preview" ? "preview" : "beat"}` : "Your beat appears here"}</h3>
                </div>
              </div>

              {beatAudioUrl ? (
                <div className="beat-result">
                  <div className="beat-cover">
                    <Disc3 size={42} />
                    <div>
                      <p>{beat.genre}</p>
                      <h3>{beat.title || "Untitled beat"}</h3>
                      <span>{beat.tempo} BPM · {beat.songKey} · {beat.feel}</span>
                    </div>
                  </div>
                  <audio controls src={beatAudioUrl} className="beat-audio" />
                  <div className="beat-output-actions">
                    <a className="beat-download" href={beatAudioUrl} download={`${(beat.title || "eboi-beat").replace(/\s+/g, "-").toLowerCase()}-${beatOutputMode || "beat"}.mp3`}>
                      <Download size={16} /> Download MP3
                    </a>
                    <button type="button" onClick={useBeatInLyrics}><FileText size={16} /> Use setup in Lyrics</button>
                  </div>
                  <div className="beat-specs">
                    <span>{beatModel || "Google Lyria"}</span>
                    <span>{beatOutputMode === "preview" ? "30-second preview" : beat.duration}</span>
                    <span>Instrumental only</span>
                  </div>
                </div>
              ) : (
                <div className="theme-empty beat-empty">
                  <div className="empty-icon"><Headphones size={27} /></div>
                  <h3>Build around the pocket</h3>
                  <p>Set the production brief, generate a 30-second preview first, then create the longer beat when the direction feels right.</p>
                  <div className="mini-structure">
                    <span>{beat.genre}</span>
                    <span>{beat.tempo} BPM</span>
                    <span>{beat.songKey}</span>
                  </div>
                </div>
              )}
            </section>
          </section>
        )}
      </main>
    </div>
  );
}
