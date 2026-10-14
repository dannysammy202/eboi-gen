# Eboi Lyric Studio

A Next.js lyric-writing workspace connected to Google Gemini through a server-side route.

## Features

- Title, theme, tempo and key controls
- Optional intro and outro, each with line count
- Verse count and lines per verse
- Hook count and lines per hook
- Hook-first or verse-first arrangement
- Live structure preview and total lyric-line count
- Gemini generation through `/api/generate`
- Copy and regenerate actions
- Responsive dark studio UI

## Run locally

1. Install dependencies:

```bash
npm install
```

2. Copy the environment file:

```bash
cp .env.example .env.local
```

3. Add your Google AI Studio API key to `.env.local`:

```env
GEMINI_API_KEY=your_key_here
GEMINI_MODEL=gemini-3.7-flash
```

4. Start the app:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Deploy to Vercel

Import the repository into Vercel, then add these Environment Variables:

- `GEMINI_API_KEY`
- `GEMINI_MODEL` (optional, defaults to `gemini-3.7-flash`)

The Gemini key stays server-side and never ships to the browser bundle.


## Production House workspace (2026)

The home route opens the new production-house interface at /studio.html.
The previous generator interface remains available at /classic.

The new workspace includes:
- Dashboard and Song Library with local project archive, save, import and export.
- Start from an idea, Scripture or instrumental.
- Custom Feel and Sound controls. Feel supports up to five choices.
- Song Structure: 1-6 verses, 1-8 hooks, hook-first or verse-first, optional intro/outro/bridge, per-section bar lengths, reorder and duration estimates.
- Song Workspace, AI-assisted Lyrics, Beat Direction and Lyria generation.
- Scripture context and creative concept generation through /api/studio/scripture.
- Vocal Direction and BandLab production hand-off, without microphone recording.
- Release preparation, settings, custom modals and responsive layouts.

The Scripture and Lyrics APIs require the existing GEMINI_API_KEY, and Lyria generation requires an eligible account/model. Never expose API keys in browser JavaScript.

### Project storage

Song projects and settings currently persist in the browser's localStorage, not a shared cloud database. Use the Song Library's export and import controls for backups and transfers between devices. There is no cross-device sync or authentication in this release. A future cloud data layer must include ownership and access control before enabling server-side project storage.

### Scope

Built-in audio recording and AI mastering are deliberately excluded. Record, edit, mix and master in BandLab or another DAW.

### Rollback

The existing Classic tools remain at /classic. To revert the default experience, restore app/page.tsx from the previous commit. Production APIs remain separate.
