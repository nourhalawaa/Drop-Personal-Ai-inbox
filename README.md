# DROP

**Paste a raw idea. AI classifies it, scores it, and queues it. You just execute.**

![React Native](https://img.shields.io/badge/React_Native-20232A?style=flat&logo=react&logoColor=61DAFB)
![Expo SDK 54](https://img.shields.io/badge/Expo_SDK_54-000020?style=flat&logo=expo&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=flat&logo=supabase&logoColor=white)
![Gemini AI](https://img.shields.io/badge/Gemini_AI-4285F4?style=flat&logo=google&logoColor=white)
![MIT License](https://img.shields.io/badge/License-MIT-yellow.svg)

---

## The Problem

I had ideas scattered across 5 different notes apps with no way to prioritize or act on them. Half were duplicates. None had any structure. The ones that mattered got buried under the ones that didn't.

DROP is a personal AI-powered inbox — drop anything in, the AI does the sorting. Every entry gets a category and a score the moment it lands. You open the app to a ranked queue, not a pile of noise.

---

## How It Works

```
Drop raw text  →  Gemini classifies + scores 1–100  →  Clean ranked queue ready to execute
```

1. **Drop** — paste or type any idea, task, or thought into the input
2. **Classify** — Gemini assigns a category and a composite score (excitement, effort vs impact, momentum, time sensitivity)
3. **Execute** — sorted list and Kanban view let you see exactly what to work on next

---

## Features

- AI classification into 5 categories: `Project` · `Startup Idea` · `Research` · `Tool` · `Task`
- Composite score 1–100 based on excitement, effort vs impact, momentum, and time sensitivity
- List view sorted by score + Kanban view grouped by category
- Inbox → Active → Done state flow
- Star marker for high-priority items
- Instant UI — entry appears immediately, AI processes in background
- Inline edit that re-triggers classification on save
- Retry logic with exponential backoff on Gemini 429/5xx errors

---

## Screenshots

| List View | Kanban View | Card Detail |
|-----------|-------------|-------------|
| ![List](assets/screenshots/list.png) | ![Kanban](assets/screenshots/kanban.png) | ![Detail](assets/screenshots/detail.png) |

> *(Screenshots coming soon — app running on Android via Expo Go)*

---

## Why This Architecture

The entire AI layer lives in one file: `services/gemini.js`.

It exports a single function: `classifyEntry(text) → { category, score }`

Swapping to a local LLM in v3.0 means replacing only that file — zero changes elsewhere. Every component, hook, and database call is completely unaware of which model is running underneath.

This was a deliberate design decision to make the system AI-provider agnostic from day one. The swap point is documented, tested, and ready.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React Native + Expo SDK 54 |
| Database | Supabase (PostgreSQL + Realtime) |
| AI Layer | Google Gemini 2.0 Flash (free tier) |
| Navigation | Expo Router v6 |

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

## Project Structure

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
  gemini.js         # AI layer — swap this file for v3.0
  supabase.js       # Database client + CRUD helpers
hooks/
  useEntries.js     # Data fetching, realtime, addEntry, setState, toggleStar
lib/
  constants.js      # USER_ID, CATEGORIES, STATES, colors
```

---

## Roadmap

<details>
<summary><strong>v1.0 — MVP (shipped)</strong></summary>

### What shipped
- AI classification into 5 categories with composite 1–100 scoring
- List view sorted by score, Kanban view grouped by category
- Inbox → Active → Done state flow with star markers
- Supabase Realtime sync across tabs
- Fire-and-forget classification — UI updates instantly, AI processes in background
- Inline edit that re-triggers classification on save
- Retry logic with exponential backoff on Gemini errors

### Fixes & decisions during development
- Fixed SDK 54 / Expo Go compatibility issue — downgraded from SDK 56 which had breaking changes not yet stable in Expo Go
- Resolved Babel and Metro config missing files causing bundle 500 error
- Dark mode locked via `app.json` `userInterfaceStyle: "dark"` — consistent across OS theme changes
- Gemini AI layer isolated and verified swappable — single file, single function, zero coupling

</details>

<details>
<summary><strong>v1.1 — Soft Delete & Deleted Entries Tab</strong></summary>

### What
Deleting an entry moves it to a "Deleted" bucket instead of destroying it permanently. A fourth tab shows deleted entries with two actions: **Restore** (moves back to Inbox) or **Delete Forever**.

### Why
Accidental deletes are common when reviewing a long list. Soft delete costs almost nothing in Supabase and removes the anxiety of the current destructive confirm dialog.

### Implementation
- Add a `deleted_at timestamptz` column to `entries`. `NULL` = live, timestamp = deleted.
- `listEntries()` adds `.is('deleted_at', null)` filter. New `listDeletedEntries()` uses `.not('deleted_at', 'is', null)`.
- `deleteEntry(id)` becomes `softDeleteEntry(id)` — patches `deleted_at: new Date().toISOString()`.
- Add `restoreEntry(id)` (patches `deleted_at: null`) and `permanentDeleteEntry(id)` (actual `.delete()`).
- New tab: `app/(tabs)/deleted.tsx` — Restore / Delete Forever actions instead of standard card actions.
- Remove the `Alert.alert` confirmation from the Card delete button since the action is now reversible.

```sql
-- Migration
alter table entries add column deleted_at timestamptz;
create index on entries (user_id, deleted_at);
```

</details>

<details>
<summary><strong>v1.2 — Light / Dark Mode Toggle</strong></summary>

### What
A switch in a settings area (or header) that toggles between the current dark theme and a light theme. Preference saved to `AsyncStorage`.

### Why
Dark mode is great at night; some users prefer light in daylight. Low-effort quality-of-life improvement.

### Implementation
- Create a `ThemeContext` that exposes `{ theme, toggleTheme }`.
- Extract all hardcoded hex colors into `lib/theme.ts` — exports `darkTheme` and `lightTheme` token objects.
- Components consume theme via `useTheme()` hook instead of inline style literals.
- Persist with `AsyncStorage.setItem('theme', 'light'|'dark')`, read on startup.
- Toggle button in the tab bar header or a dedicated Settings modal.

</details>

<details>
<summary><strong>v1.3 — Chat-Style UI Redesign</strong></summary>

### What
Replace the plain list + top input with a messenger-style interface. The text input sits fixed at the bottom. Each submission triggers an AI "response" message inline in the thread — e.g., *"Got it — classified as **Startup Idea**, score **82**. I'll add it to your Inbox."* Errors surface as inline retry messages rather than silent fallbacks.

### Why
The current UI feels like a database form. A chat thread makes the AI feel present and responsive, and surfaces what the AI decided without requiring the user to scan a card header.

### Implementation
- Thread is a `FlatList` rendered inverted (`inverted` prop) so new messages appear at the bottom.
- Each "message" is a discriminated union: `user_entry` (submitted text bubble) or `ai_response` (classification result or error).
- `ai_response` messages inserted into local state by `classifyInBackground` once classification resolves.
- `DropInput` moves to a sticky footer container outside the `FlatList`.
- Kanban and Deleted tabs remain unchanged — they are not conversation views.

</details>

<details>
<summary><strong>v1.4 — Gemini Token Usage Tracker</strong></summary>

### What
A small indicator (header badge or settings row) showing estimated tokens consumed today out of the 1M daily free-tier limit, plus a per-entry token cost log.

### Why
The free tier is generous but not infinite. Knowing your burn rate helps avoid surprise 429 errors mid-day.

### Implementation
- Track usage in `AsyncStorage`: `{ date: 'YYYY-MM-DD', totalTokens: number }`. Reset when date changes.
- Gemini REST response includes `usageMetadata.totalTokenCount`. Read this after each successful call in `classifyEntry()`.
- A `useTokenUsage()` hook reads/writes the daily counter.
- Display as a progress bar: `"342k / 1M tokens used today"`.
- 7-day history accessible from a Stats or Settings screen.

</details>

<details>
<summary><strong>v2.0 — Scoring System Rework</strong></summary>

### What
A deterministic, auditable scoring system that explains its score rather than returning a single opaque integer.

### Why
The current single-number score is inconsistent — same text can produce different scores across calls because `temperature` is not set to 0. A structured breakdown is more trustworthy and actionable.

### Changes
- Score becomes a composite of four sub-scores (each 1–25):
  - **Excitement** — personal energy and novelty
  - **Impact vs Effort** — estimated ROI
  - **Momentum** — urgency and time sensitivity
  - **Clarity** — how well-defined the idea is
- `classifyEntry` returns `{ category, score, breakdown: { excitement, impact, momentum, clarity } }` plus a one-sentence `rationale`.
- Card shows total score with expandable breakdown panel.
- Set `temperature: 0` in the Gemini call to maximize reproducibility.

```sql
-- Migration
alter table entries add column breakdown jsonb;
alter table entries add column rationale text;
```

</details>

<details>
<summary><strong>v2.1 — Agentic Features</strong></summary>

### What
Move from passive classification toward active assistance.

### Entry Expansion
Long-press a card → "Expand" → Gemini returns a structured breakdown: problem statement, potential next steps, risks, related ideas already in the inbox.

### Duplicate / Similarity Detection
On each new entry, embed the text (or use keyword matching as a lightweight proxy) and flag if a similar entry already exists. Show a *"This looks like X — merge?"* prompt.

### Weekly Digest
A scheduled summary grouping entries by category, surfacing the top 5 by score, and listing entries stuck in Inbox for more than 7 days.

### Smart State Transitions
Gemini can suggest moving an entry from Inbox → Active based on recency, score, and the number of times the user has viewed it.

</details>

<details>
<summary><strong>v2.2 — Customization & Settings Screen</strong></summary>

### What
A dedicated Settings tab (or modal) for user-controlled configuration.

### Planned options
- Rename or add/remove categories (stored in `AsyncStorage`, passed to Gemini prompt dynamically)
- Customize the scoring rubric weights (e.g., "I care more about impact than excitement")
- Set a default state for new entries (currently hardcoded to `Inbox`)
- Choose sort order for List view (score desc, created desc, alpha)
- Configure the Gemini model (flash vs pro) and set your own API key in-app instead of via `.env`

</details>

<details>
<summary><strong>v3.0 — Local LLM Swap (Offline Mode)</strong></summary>

### What
Replace `services/gemini.js` with a `services/local-llm.js` that calls a locally-running model (Ollama, LM Studio, or a bundled GGUF via `llama.rn`).

### Why
Zero API cost. Works offline. No token limits.

### The swap is one file
`classifyEntry(text) → { category, score }` signature is unchanged. Only the transport layer changes. All other code is unaffected — this is the swap point the architecture was designed around from v1.0.

### Implementation path
1. Test with Ollama running locally on the same Wi-Fi network — point the fetch URL at `http://192.168.x.x:11434`
2. For on-device inference, evaluate `llama.rn` with a quantized Phi-3 or Gemma 2B model
3. Keep Gemini as a fallback if the local model is unreachable

</details>

<details>
<summary><strong>v3.1 — Standalone APK (EAS Build)</strong></summary>

### What
Compile a real APK via Expo EAS Build so the app runs directly on the phone without needing a laptop or Expo Go.

### Why
Makes DROP a real standalone app you can share or use anywhere. No dev server dependency, no Expo Go requirement — just install and run.

### Implementation
```bash
expo eas build --platform android
```

Distribute via direct APK download or internal testing track on Play Store. EAS Build handles the signing, bundling, and compilation pipeline — no local Android SDK setup required.

</details>

---

## Navigation Structure (v1.1+)

| Tab | Screen |
|-----|--------|
| 1 | List (chat-style after v1.3) |
| 2 | Kanban |
| 3 | Deleted Entries |
| 4 | Settings / Stats |

---

Built by Nour Halawa · [github.com/nourhalawaa](https://github.com/nourhalawaa)
