# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Expo version note

This project uses **Expo SDK 54** (`expo@54.x`, `expo-router@6.x`, React 19.1, React Native 0.81). Before writing any code that touches Expo APIs, check the versioned docs at https://docs.expo.dev/versions/v54.0.0/ — the API surface changes between SDK versions.

**Import gotcha:** `ThemeProvider`, `DarkTheme`, and `DefaultTheme` must come from `@react-navigation/native`, not `expo-router` (expo-router only re-exported these from SDK 55+).

## Commands

```bash
npx expo start                 # start dev server (scan QR with Expo Go)
npx expo start --clear         # also clear Metro cache (use after dep changes)
npx expo install <pkg>         # always prefer this over npm install for Expo deps
```

You can also double-click `start.bat` at the project root to launch the dev server in a fresh terminal window.

No tests or linter are configured. TypeScript checks run via the editor against `tsconfig.json`.

## Architecture

The app is a single-user idea inbox with two tab screens backed by Supabase.

**Data flow:** `useEntries` in `hooks/useEntries.js` is the single source of truth. Both tab screens (`app/(tabs)/index.tsx`, `app/(tabs)/kanban.tsx`) call the hook independently — they stay in sync via a Supabase `postgres_changes` realtime subscription. No global store.

**Realtime channel uniqueness:** the hook uses `useId()` to suffix each channel name (`entries-changes-:r0:`, etc.). Supabase reuses channels by name, so two tabs mounting the hook would otherwise collide and throw "cannot add callbacks after subscribe()".

**Add-entry flow (fire-and-forget classification):**
1. `DropInput` → `addEntry(text)` in the hook
2. Row is inserted into Supabase with `category: null, score: null` — card renders with "Processing…"
3. `addEntry` returns immediately after the insert, so the user can submit more entries without waiting
4. `classifyEntry(text)` runs in the background (not awaited); when it resolves, the row is patched with `{ category, score }` and local state is updated
5. Multiple entries submitted in parallel all classify concurrently

**Edit flow:** `editEntry(id, newText)` clears category/score, persists the new text, then re-runs classification in the background — same pattern as add.

**AI layer swap point (v2):** `services/gemini.js` exports one function `classifyEntry(text) → Promise<{ category, score }>`. Replace the `fetch` body to swap in a local LLM — no other file changes. The current implementation:
- Calls `gemini-2.5-flash` via REST
- Retries up to 3× with exponential backoff (1s → 2s → 4s) on `429/500/502/503/504`
- Falls back to `{ category: 'Task', score: 50 }` only after retries exhaust
- Logs every failure path with the `[gemini]` prefix in the Metro terminal

**Routing:** Expo Router v6 with a `(tabs)` group. Root layout `app/_layout.tsx` is customized — splash hides on mount (no font load blocking it) and the app is locked to dark mode via `ThemeProvider value={DarkTheme}`.

**Constants:** All shared enums live in `lib/constants.js` — `USER_ID`, `CATEGORIES`, `STATES`, and color maps. Adding a new category means appending to `CATEGORIES` and `CATEGORY_COLORS` there only.

## Environment

Requires a `.env` file (copy from `.env.example`):
- `EXPO_PUBLIC_GEMINI_API_KEY` — Gemini 2.5 Flash, free tier
- `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`

The Supabase `entries` table schema and the required Realtime enable step are documented in `README.md`.

## Git workflow

- Default branch is `main`. Remote is `origin` → `https://github.com/nourhalawaa/Drop-Personal-Ai-inbox`.
- Tag `mvp-baseline` marks the first known-good MVP commit (`604e8a1`).
- Rollback patterns:
  - Last commit only: `git reset --hard HEAD~1`
  - Back to baseline: `git reset --hard mvp-baseline`
- When committing, follow the existing style: short imperative subject, blank line, bulleted body explaining *why* and the user-visible effect.
