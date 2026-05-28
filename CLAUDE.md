# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Expo version note

This project uses **Expo SDK 54** (`expo@54.x`, `expo-router@6.x`, React 19.1, React Native 0.81). Before writing any code that touches Expo APIs, check the versioned docs at https://docs.expo.dev/versions/v54.0.0/ — the API surface changes between SDK versions.

**Important:** `ThemeProvider`, `DarkTheme`, and `DefaultTheme` must be imported from `@react-navigation/native`, not from `expo-router` (they were re-exported by expo-router only from SDK 55+).

## Commands

```bash
npx expo start          # start dev server (scan QR with Expo Go)
npx expo start --android
npx expo start --ios
npx expo install <pkg>  # always use this instead of npm install for Expo packages — it pins compatible versions
```

There are no tests or a linter configured. TypeScript checking runs via the editor using `tsconfig.json`.

## Architecture

The app is a single-user idea inbox with two tab screens backed by Supabase.

**Data flow:** `useEntries` (hooks/useEntries.js) is the single source of truth. Both tab screens call it independently — they stay in sync via a Supabase `postgres_changes` realtime subscription. No global state store.

**Add-entry flow (optimistic):**
1. `DropInput` calls `addEntry(text)` from the hook
2. Row is inserted to Supabase immediately with `category: null, score: null` — card renders with "Processing…"
3. `classifyEntry(text)` in `services/gemini.js` calls Gemini in the background
4. Row is patched with `{ category, score }` — card updates; falls back to `{ category: "Task", score: 50 }` on any error

**AI layer swap point:** `services/gemini.js` exports one function `classifyEntry(text) → Promise<{ category, score }>`. v2 replaces the `fetch` body with a local LLM call — no other file changes needed.

**Routing:** Expo Router v3 with a `(tabs)` group. Two screens: `index.tsx` (List, sorted by score) and `kanban.tsx` (columns by category). Root layout `app/_layout.tsx` is the unmodified template — handles font loading and splash.

**Constants:** All shared enums live in `lib/constants.js` — `USER_ID`, `CATEGORIES`, `STATES`, and color maps. Adding a new category means adding it to `CATEGORIES` and `CATEGORY_COLORS` there only.

## Environment

Requires a `.env` file (copy from `.env.example`):
- `EXPO_PUBLIC_GEMINI_API_KEY` — Gemini 2.0 Flash, free tier
- `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_ANON_KEY`

The Supabase `entries` table schema and the required Realtime enable step are documented in `README.md`.
