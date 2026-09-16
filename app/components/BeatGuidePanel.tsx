"use client";

import { Check, Clipboard, LoaderCircle, Music2 } from "lucide-react";
import { useState } from "react";
import styles from "./BeatGuidePanel.module.css";

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

function notesToText(notes: NoteEvent[]) {
  return notes
    .map((item) => `Step ${item.step}: ${item.note} (${item.length})${item.glide ? `, ${item.glide}` : ""}`)
    .join(" | ");
}

function guideToText(guide: BeatGuide, beat: BeatForm) {
  const lines: string[] = [
    `${guide.title} - BandLab Production Guide`,
    `${beat.tempo} BPM | ${beat.songKey} | ${guide.scale} | ${guide.timeSignature}`,
    "",
    guide.summary,
    "",
    "CHORD PROGRESSION",
    ...guide.chords.map((item) => `Bar ${item.bar}: ${item.chord} | ${item.notes.join(" - ")} | ${item.length}`),
    "",
    "MELODY",
    ...guide.melody.map((item) => `Bar ${item.bar}: ${notesToText(item.notes)}${item.instruction ? `\n${item.instruction}` : ""}`),
    "",
    "808 / BASS",
    ...guide.bass808.map((item) => `Bar ${item.bar}: ${notesToText(item.notes)}${item.instruction ? `\n${item.instruction}` : ""}`),
    "",
    "DRUMS - 16 STEP GRID",
  ];

  for (const pattern of guide.drumPatterns) {
    lines.push(
      `${pattern.name} (${pattern.useFor})`,
      `Kick: ${pattern.kick.join(", ") || "-"}`,
      `Snare: ${pattern.snare.join(", ") || "-"}`,
      `Clap: ${pattern.clap.join(", ") || "-"}`,
      `Closed Hat: ${pattern.closedHat.join(", ") || "-"}`,
      `Open Hat: ${pattern.openHat.join(", ") || "-"}`,
      `Percussion: ${pattern.percussion.join(", ") || "-"}`,
      pattern.notes,
      "",
    );
  }

  lines.push(
    "ARRANGEMENT",
    ...guide.arrangement.map((item) => `${item.bars}: ${item.section} | ${item.elements.join(", ")}`),
    "",
    "BANDLAB SETUP",
    ...guide.bandlabSetup.map((item, index) => `${index + 1}. ${item}`),
    "",
    "ROUGH MIX",
    ...guide.mixNotes.map((item, index) => `${index + 1}. ${item}`),
  );

  return lines.join("\n");
}

function DrumGrid({ pattern }: { pattern: BeatGuide["drumPatterns"][number] }) {
  const rows = [
    ["Kick", pattern.kick],
    ["Snare", pattern.snare],
    ["Clap", pattern.clap],
    ["Closed hat", pattern.closedHat],
    ["Open hat", pattern.openHat],
    ["Perc", pattern.percussion],
  ] as const;

  return (
    <div className={styles.patternCard}>
      <div className={styles.patternHead}>
        <div>
          <strong>{pattern.name}</strong>
          <span>{pattern.useFor}</span>
        </div>
        <small>16 steps = 1 bar</small>
      </div>
      <div className={styles.gridScroll}>
        <div className={styles.drumGrid}>
          <div className={styles.gridLabel}>Step</div>
          {Array.from({ length: 16 }, (_, index) => (
            <div className={`${styles.stepNumber} ${[0, 4, 8, 12].includes(index) ? styles.beatStart : ""}`} key={index}>{index + 1}</div>
          ))}
          {rows.map(([label, hits]) => (
            <div className={styles.gridRow} key={label}>
              <div className={styles.gridLabel}>{label}</div>
              {Array.from({ length: 16 }, (_, index) => {
                const active = hits.includes(index + 1);
                return <div className={`${styles.stepCell} ${active ? styles.hit : ""} ${[0, 4, 8, 12].includes(index) ? styles.beatStart : ""}`} key={index}>{active ? "●" : ""}</div>;
              })}
            </div>
          ))}
        </div>
      </div>
      {pattern.notes && <p className={styles.patternNote}>{pattern.notes}</p>}
    </div>
  );
}

export default function BeatGuidePanel({ beat }: { beat: BeatForm }) {
  const [guide, setGuide] = useState<BeatGuide | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [model, setModel] = useState("");
  const [copied, setCopied] = useState(false);

  async function generateGuide() {
    if (!beat.genre.trim() || !beat.tempo.trim() || !beat.songKey.trim()) {
      setError("Genre, tempo and key are required.");
      return;
    }

    setLoading(true);
    setError("");
    setCopied(false);

    try {
      const response = await fetch("/api/beat-guide", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(beat),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Production guide generation failed.");
      setGuide(data.guide);
      setModel(data.model || "Gemini");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Production guide generation failed.");
    } finally {
      setLoading(false);
    }
  }

  async function copyGuide() {
    if (!guide) return;
    await navigator.clipboard.writeText(guideToText(guide, beat));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <section className={styles.panel}>
      <div className={styles.heading}>
        <div>
          <p>BANDLAB PRODUCTION GUIDE</p>
          <h3>{guide ? guide.title : "Build the beat yourself"}</h3>
          <span>Exact notes, drum placements, 808 pattern and arrangement from the same production brief.</span>
        </div>
        <Music2 size={21} />
      </div>

      {!guide ? (
        <div className={styles.empty}>
          <div className={styles.icon}><Music2 size={28} /></div>
          <h4>Turn the brief into a BandLab blueprint</h4>
          <p>The guide uses a 16-step drum grid and exact note names with octaves, so you have something practical to place in the piano roll and drum machine.</p>
          <div className={styles.legend}>
            <span>1 = Beat 1</span><span>5 = Beat 2</span><span>9 = Beat 3</span><span>13 = Beat 4</span>
          </div>
          <button className={styles.generate} type="button" onClick={generateGuide} disabled={loading}>
            {loading ? <LoaderCircle className={styles.spin} size={18} /> : <Music2 size={18} />}
            {loading ? "Building production guide..." : "Generate BandLab guide"}
          </button>
          {error && <div className={styles.error}>{error}</div>}
        </div>
      ) : (
        <div className={styles.guide}>
          <div className={styles.summary}>
            <div>
              <p>{guide.summary}</p>
              <div className={styles.meta}>
                <span>{beat.tempo} BPM</span>
                <span>{beat.songKey}</span>
                <span>{guide.scale}</span>
                <span>{guide.timeSignature}</span>
                <span>{beat.genre}</span>
              </div>
            </div>
            <div className={styles.topActions}>
              <button type="button" onClick={copyGuide}>{copied ? <Check size={15} /> : <Clipboard size={15} />}{copied ? "Copied" : "Copy guide"}</button>
              <button type="button" onClick={generateGuide} disabled={loading}>{loading ? <LoaderCircle className={styles.spin} size={15} /> : null}Regenerate</button>
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHead}><span>01</span><h4>Chord progression</h4></div>
            <div className={styles.chordGrid}>
              {guide.chords.map((item, index) => (
                <div className={styles.chordCard} key={`${item.bar}-${index}`}>
                  <small>Bar {item.bar}</small>
                  <strong>{item.chord}</strong>
                  <p>{item.notes.join(" · ")}</p>
                  <span>{item.length}</span>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHead}><span>02</span><h4>Melody piano roll</h4></div>
            <div className={styles.noteBars}>
              {guide.melody.map((bar, index) => (
                <div className={styles.noteBar} key={`${bar.bar}-${index}`}>
                  <div className={styles.barLabel}>Bar {bar.bar}</div>
                  <div className={styles.noteList}>
                    {bar.notes.map((note, noteIndex) => <span key={`${note.step}-${note.note}-${noteIndex}`}><b>{note.note}</b> step {note.step} · {note.length}</span>)}
                  </div>
                  {bar.instruction && <p>{bar.instruction}</p>}
                </div>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHead}><span>03</span><h4>808 / bass piano roll</h4></div>
            <div className={styles.noteBars}>
              {guide.bass808.map((bar, index) => (
                <div className={styles.noteBar} key={`${bar.bar}-${index}`}>
                  <div className={styles.barLabel}>Bar {bar.bar}</div>
                  <div className={styles.noteList}>
                    {bar.notes.map((note, noteIndex) => <span key={`${note.step}-${note.note}-${noteIndex}`}><b>{note.note}</b> step {note.step} · {note.length}{note.glide ? ` · ${note.glide}` : ""}</span>)}
                  </div>
                  {bar.instruction && <p>{bar.instruction}</p>}
                </div>
              ))}
            </div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHead}><span>04</span><h4>Drum placement</h4></div>
            <div className={styles.gridLegend}>Each row is one bar split into 16 sixteenth-note steps. The darker dividers mark beats 1, 2, 3 and 4.</div>
            <div className={styles.patterns}>{guide.drumPatterns.map((pattern, index) => <DrumGrid pattern={pattern} key={`${pattern.name}-${index}`} />)}</div>
          </div>

          <div className={styles.section}>
            <div className={styles.sectionHead}><span>05</span><h4>Arrangement</h4></div>
            <div className={styles.arrangement}>
              {guide.arrangement.map((item, index) => (
                <div className={styles.arrangementRow} key={`${item.bars}-${index}`}>
                  <span>{item.bars}</span>
                  <strong>{item.section}</strong>
                  <p>{item.elements.join(" · ")}</p>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.twoCol}>
            <div className={styles.section}>
              <div className={styles.sectionHead}><span>06</span><h4>BandLab setup</h4></div>
              <ol>{guide.bandlabSetup.map((item, index) => <li key={index}>{item}</li>)}</ol>
            </div>
            <div className={styles.section}>
              <div className={styles.sectionHead}><span>07</span><h4>Rough mix</h4></div>
              <ol>{guide.mixNotes.map((item, index) => <li key={index}>{item}</li>)}</ol>
            </div>
          </div>

          <div className={styles.footer}><span>Guide model: {model || "Gemini"}</span><span>Based on the current Beat Generator brief</span></div>
          {error && <div className={styles.error}>{error}</div>}
        </div>
      )}
    </section>
  );
}
