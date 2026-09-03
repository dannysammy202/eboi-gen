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
