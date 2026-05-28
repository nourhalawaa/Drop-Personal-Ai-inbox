# DROP — Roadmap

Planned improvements, roughly ordered by priority. Each section describes the feature, the motivation, and the key implementation notes.

---

## v1.1 — Soft Delete & Deleted Entries Tab

**What:** Deleting an entry moves it to a "Deleted" bucket instead of destroying it permanently. A fourth tab shows deleted entries with two actions: **Restore** (moves back to Inbox) or **Delete Forever**.

**Why:** Accidental deletes are common when reviewing a long list. Soft delete costs almost nothing in Supabase and removes the anxiety of the current destructive confirm dialog.

**Implementation notes:**
- Add a `deleted_at timestamptz` column to the `entries` table. `NULL` = live, timestamp = deleted.
- `listEntries()` adds `.is('deleted_at', null)` filter. A new `listDeletedEntries()` query uses `.not('deleted_at', 'is', null)`.
- `deleteEntry(id)` becomes `softDeleteEntry(id)` — patches `deleted_at: new Date().toISOString()`.
- Add a `restoreEntry(id)` helper that patches `deleted_at: null`.
- Add a `permanentDeleteEntry(id)` that actually calls `.delete()`.
- New tab: `app/(tabs)/deleted.tsx` — list of soft-deleted cards with Restore / Delete Forever actions instead of the standard card actions.
- Remove the `Alert.alert` confirmation from the Card delete button since the action is now reversible.

---

## v1.2 — Light / Dark Mode Toggle

**What:** A switch in a settings area (or header) that toggles between the current dark theme and a light theme. Preference saved to `AsyncStorage`.

**Why:** Dark mode is great at night; some users prefer light in daylight. This is a low-effort quality-of-life feature.

**Implementation notes:**
- Create a `ThemeContext` (or use Zustand/context) that exposes `{ theme, toggleTheme }`.
- Extract all hardcoded hex colors from components into a `lib/theme.ts` file that exports `darkTheme` and `lightTheme` token objects.
- Components consume theme via `useTheme()` hook instead of inline style literals.
- Persist the preference with `AsyncStorage.setItem('theme', 'light'|'dark')` and read it on startup.
- Toggle button lives in the tab bar header or a dedicated Settings modal.

---

## v1.3 — Chat-Style UI Redesign

**What:** Replace the plain list + top input with a messenger-style interface. The text input sits fixed at the bottom. Each submission triggers an AI "response" message inline in the thread — e.g., "Got it — classified as **Startup Idea**, score **82**. I'll add it to your Inbox." Errors surface as inline retry messages rather than silent fallbacks.

**Why:** The current UI feels like a database form. A chat thread makes the AI feel present and responsive, and surfaces what the AI decided without requiring the user to scan a card header.

**Implementation notes:**
- The thread is a `FlatList` rendered inverted (`inverted` prop) so new messages appear at the bottom.
- Each "message" is a discriminated union type: `user_entry` (the submitted text bubble) or `ai_response` (classification result or error).
- `ai_response` messages are inserted into local state by `classifyInBackground` once classification resolves.
- The `DropInput` component moves to a sticky footer container outside the `FlatList`.
- Cards in the thread replace the current standalone `Card` component — same data, new layout that fits a chat bubble width.
- Kanban and Deleted tabs remain unchanged (they are not conversation views).

---

## v1.4 — Gemini Token Usage Tracker

**What:** A small indicator (header badge or settings row) showing estimated tokens consumed today out of the 1 M daily free-tier limit, plus a per-entry token cost log.

**Why:** The free tier is generous but not infinite. Knowing your burn rate helps avoid surprise 429 errors mid-day.

**Implementation notes:**
- Track token usage in a local `AsyncStorage` key: `{ date: 'YYYY-MM-DD', totalTokens: number }`. Reset when date changes.
- Gemini's REST response includes `usageMetadata.totalTokenCount`. Read this after each successful call in `classifyEntry()` and post it via an event or callback.
- A `useTokenUsage()` hook reads/writes the daily counter.
- Display as a progress bar or text label: `"342 k / 1 M tokens used today"`.
- Add a history log (last 7 days) accessible from a Stats or Settings screen.

---

## v2.0 — Scoring System Rework

**What:** A deterministic, auditable scoring system that explains its score rather than returning a single opaque integer.

**Why:** The current single-number score is inconsistent (same text → different scores across calls) because it depends on LLM temperature and vague instructions. A structured breakdown is more trustworthy and actionable.

**Changes:**
- Score becomes a composite of four sub-scores (each 1–25):
  - **Excitement** — personal energy and novelty
  - **Impact vs Effort** — estimated ROI
  - **Momentum** — urgency and time sensitivity
  - **Clarity** — how well-defined the idea is
- `classifyEntry` returns `{ category, score, breakdown: { excitement, impact, momentum, clarity } }` plus a one-sentence `rationale`.
- Card shows the total score with an expandable breakdown panel.
- Set `temperature: 0` in the Gemini call to maximize reproducibility.
- Supabase schema: add `breakdown jsonb` and `rationale text` columns to `entries`.

---

## v2.1 — Agentic Features

**What:** Move from passive classification toward active assistance.

**Planned capabilities:**

### Entry Expansion
Long-press a card → "Expand" → Gemini returns a structured breakdown: problem statement, potential next steps, risks, related ideas already in the inbox.

### Duplicate / Similarity Detection
On each new entry, embed the text (or use keyword matching as a lightweight proxy) and flag if a similar entry already exists. Show a "This looks like X — merge?" prompt.

### Weekly Digest
A scheduled summary (generated on demand or via a background task) grouping entries by category, surfacing the top 5 by score, and listing entries stuck in Inbox for more than 7 days.

### Smart State Transitions
Gemini can suggest moving an entry from Inbox → Active based on recency, score, and the number of times the user has viewed it.

---

## v2.2 — Customization & Settings Screen

**What:** A dedicated Settings tab (or modal) for user-controlled configuration.

**Planned options:**
- Rename or add/remove categories (stored in `AsyncStorage`, passed to Gemini prompt dynamically)
- Customize the scoring rubric weights (e.g., "I care more about impact than excitement")
- Set a default state for new entries (currently hardcoded to `Inbox`)
- Choose sort order for List view (score desc, created desc, alpha)
- Configure the Gemini model (flash vs pro) and set your own API key in-app instead of via `.env`

---

## v3.0 — Local LLM Swap (Offline Mode)

**What:** Replace `services/gemini.js` with a `services/local-llm.js` that calls a locally-running model (Ollama, LM Studio, or a bundled GGUF via `llama.rn`).

**Why:** Zero API cost, works offline, no token limits.

**The swap is one file.** `classifyEntry(text) → { category, score }` signature is unchanged. Only the transport layer changes. All other code is unaffected — this is the v2 swap point documented in the architecture.

**Implementation path:**
1. Test with Ollama running locally on the same Wi-Fi network (point the fetch URL at `http://192.168.x.x:11434`).
2. For on-device inference, evaluate `llama.rn` with a quantized Phi-3 or Gemma 2B model.
3. Keep Gemini as a fallback if the local model is unreachable.

---

## Navigation Structure (target: v1.1+)

| Tab | Screen |
|-----|--------|
| 1 | List (chat-style after v1.3) |
| 2 | Kanban |
| 3 | Deleted Entries |
| 4 | Settings / Stats |

---

## Supabase Schema Migrations

Track these alongside version milestones:

```sql
-- v1.1: soft delete
alter table entries add column deleted_at timestamptz;
create index on entries (user_id, deleted_at);

-- v2.0: score breakdown
alter table entries add column breakdown jsonb;
alter table entries add column rationale text;
```
