import { useState, useEffect, useCallback, useId } from 'react';
import {
  supabase,
  listEntries,
  insertEntry,
  updateEntry,
  deleteEntry as dbDelete,
} from '../services/supabase';
import { classifyEntry } from '../services/gemini';
import { USER_ID } from '../lib/constants';

export function useEntries() {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  // Unique channel name per hook instance — Supabase reuses channels by name,
  // so both tab screens mounting useEntries() would otherwise share one channel.
  const channelId = useId();

  const refresh = useCallback(async () => {
    try {
      const data = await listEntries();
      setEntries(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();

    const channel = supabase
      .channel(`entries-changes-${channelId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'entries', filter: `user_id=eq.${USER_ID}` },
        () => refresh()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refresh, channelId]);

  // Fire-and-forget classification — caller doesn't wait, so multiple entries
  // can be submitted in parallel without queueing up.
  const classifyInBackground = useCallback((id, text) => {
    classifyEntry(text)
      .then(async ({ category, score }) => {
        await updateEntry(id, { category, score });
        setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, category, score } : e)));
      })
      .catch((err) => console.warn('[useEntries] classify failed', err?.message ?? err));
  }, []);

  const addEntry = useCallback(
    async (text) => {
      // Returns as soon as the row is persisted — user can submit the next entry
      // immediately. Classification continues asynchronously.
      const row = await insertEntry({
        text,
        state: 'Inbox',
        category: null,
        score: null,
        starred: false,
      });
      setEntries((prev) => [row, ...prev]);
      classifyInBackground(row.id, text);
    },
    [classifyInBackground]
  );

  const editEntry = useCallback(
    async (id, newText) => {
      // Optimistic: clear category/score so the card shows "Processing…" again
      setEntries((prev) =>
        prev.map((e) => (e.id === id ? { ...e, text: newText, category: null, score: null } : e))
      );
      await updateEntry(id, { text: newText, category: null, score: null });
      classifyInBackground(id, newText);
    },
    [classifyInBackground]
  );

  const deleteEntry = useCallback(async (id) => {
    setEntries((prev) => prev.filter((e) => e.id !== id));
    await dbDelete(id);
  }, []);

  const setState = useCallback(async (id, state) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, state } : e)));
    await updateEntry(id, { state });
  }, []);

  const toggleStar = useCallback((id) => {
    // Compute the new value inside setEntries so we never read a stale closure.
    setEntries((prev) => {
      let nextStarred = false;
      const next = prev.map((e) => {
        if (e.id === id) {
          nextStarred = !e.starred;
          return { ...e, starred: nextStarred };
        }
        return e;
      });
      updateEntry(id, { starred: nextStarred }).catch((err) =>
        console.warn('[useEntries] toggleStar failed', err?.message ?? err)
      );
      return next;
    });
  }, []);

  return { entries, loading, addEntry, editEntry, deleteEntry, setState, toggleStar };
}
