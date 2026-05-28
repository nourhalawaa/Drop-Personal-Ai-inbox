# DROP

A personal AI-powered idea inbox. Paste raw text — Gemini classifies it into a category and assigns a priority score. Entries appear in a sorted list and a category Kanban, ready to be starred and moved through Inbox → Active → Done.

---

## Prerequisites

- Node 20+
- [Expo Go](https://expo.dev/client) on your phone (or an iOS/Android simulator)
- A free [Supabase](https://supabase.com) project
- A free [Gemini API key](https://aistudio.google.com/apikey)

---

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in:

| Variable | Where to find it |
|---|---|
| `EXPO_PUBLIC_GEMINI_API_KEY` | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project → Settings → API → Project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase project → Settings → API → anon public key |

### 3. Create the Supabase table

Run this SQL in your Supabase project's **SQL Editor**:

```sql
create table entries (
  id uuid primary key default gen_random_uuid(),
  user_id text not null,
  text text not null,
  category text,
  score int,
  state text not null default 'Inbox',
  starred boolean not null default false,
  created_at timestamptz not null default now()
);

create index on entries (user_id, score desc);

alter table entries enable row level security;

-- MVP: open policy (no auth). Remove before sharing the app.
create policy "anon all access" on entries for all using (true) with check (true);
```

Also enable **Realtime** for the `entries` table:
- Supabase dashboard → Database → Replication → toggle `entries` on.

### 4. Run the app

```bash
npx expo start
```

Scan the QR code with Expo Go on your phone.

---

## Project structure

```
app/
  (tabs)/
    _layout.tsx     # Tab navigation (List | Kanban)
    index.tsx       # List view — sorted by score
    kanban.tsx      # Kanban view — columns by category
components/
  Card.js           # Entry card with category, score, star, state
  DropInput.js      # Paste/type + submit
  StarButton.js     # Star icon toggle
  StateSelector.js  # Inbox / Active / Done segmented control
services/
  gemini.js         # AI layer — swap this file for v2
  supabase.js       # Database client + CRUD helpers
hooks/
  useEntries.js     # Data fetching, realtime, addEntry, setState, toggleStar
lib/
  constants.js      # USER_ID, CATEGORIES, STATES, colors
```

---

## Swapping the AI layer (v2)

Everything AI-related lives in `services/gemini.js`. It exports one function:

```js
classifyEntry(text) → Promise<{ category: string, score: number }>
```

To switch to a local LLM, replace the `fetch` call in that file with your local endpoint. The signature stays identical — no other file changes.

---

## Categories

`Project` · `Startup Idea` · `Research` · `Tool` · `Task`

Add more in `lib/constants.js` → `CATEGORIES` array and add a color in `CATEGORY_COLORS`.

---

## Scoring

Gemini scores each entry 1–100 based on:
- **Excitement** — how interesting or motivating
- **Effort vs Impact** — high impact / low effort scores higher
- **Momentum** — clear next steps or existing progress
- **Time sensitivity** — urgent items score higher

The List view sorts highest-first. Entries show "Processing…" until Gemini responds (typically < 2s).
