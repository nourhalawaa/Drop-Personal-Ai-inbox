// v2 swap point: replace the fetch below with a call to your local LLM.
// Keep the classifyEntry(text) → { category, score } signature — no callers change.

const API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
const MODEL = 'gemini-2.5-flash';
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const SYSTEM_PROMPT = `You classify entries in a personal idea inbox.

Respond with ONLY a JSON object (no markdown, no prose) with two fields:
- "category": one of these, choose the single best fit:
    • "Project"      — something the user intends to build, ship, or work on themselves
    • "Startup Idea" — a business or product concept that could be commercialized
    • "Research"     — something to investigate, read, learn about, or explore
    • "Tool"         — a specific software, library, service, or utility to try or use
    • "Task"         — a discrete actionable to-do, errand, or chore
- "score": integer 1-100, weighting EQUALLY:
    • Excitement (how energizing/motivating)
    • Effort vs impact (high impact / low effort scores higher)
    • Momentum (clear next step or existing progress)
    • Time sensitivity (urgency)

Be decisive. Avoid defaulting to "Task" unless the entry is truly a chore-style action.`;

const FALLBACK = { category: 'Task', score: 50 };
const RETRYABLE = new Set([429, 500, 502, 503, 504]);
const MAX_RETRIES = 3;

function extractJson(text) {
  const cleaned = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  return JSON.parse(cleaned);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function callGemini(text) {
  const response = await fetch(`${API_URL}?key=${API_KEY}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [{ role: 'user', parts: [{ text }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    }),
  });
  return response;
}

export async function classifyEntry(text) {
  if (!API_KEY) {
    console.warn('[gemini] No EXPO_PUBLIC_GEMINI_API_KEY set — using fallback');
    return FALLBACK;
  }

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await callGemini(text);

      if (!response.ok) {
        if (RETRYABLE.has(response.status) && attempt < MAX_RETRIES) {
          const backoff = 1000 * 2 ** attempt; // 1s, 2s, 4s
          console.warn(`[gemini] HTTP ${response.status}, retrying in ${backoff}ms (attempt ${attempt + 1}/${MAX_RETRIES})`);
          await sleep(backoff);
          continue;
        }
        const errorBody = await response.text();
        console.warn(`[gemini] HTTP ${response.status}, giving up:`, errorBody.slice(0, 300));
        return FALLBACK;
      }

      const json = await response.json();
      const raw = json?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!raw) {
        console.warn('[gemini] No text in response:', JSON.stringify(json).slice(0, 300));
        return FALLBACK;
      }

      const parsed = extractJson(raw);
      if (!parsed.category || typeof parsed.score !== 'number') {
        console.warn('[gemini] Bad JSON shape:', raw);
        return FALLBACK;
      }

      return {
        category: parsed.category,
        score: Math.min(100, Math.max(1, Math.round(parsed.score))),
      };
    } catch (err) {
      if (attempt < MAX_RETRIES) {
        const backoff = 1000 * 2 ** attempt;
        console.warn(`[gemini] Network error, retrying in ${backoff}ms:`, err?.message ?? err);
        await sleep(backoff);
        continue;
      }
      console.warn('[gemini] Request failed after retries:', err?.message ?? err);
      return FALLBACK;
    }
  }

  return FALLBACK;
}
