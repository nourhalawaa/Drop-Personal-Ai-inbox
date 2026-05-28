import { useState, useEffect, useCallback, useId } from 'react';
import { supabase, listEntries, insertEntry, updateEntry } from '../services/supabase';
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

  const addEntry = useCallback(async (text) => {
    // Insert immediately so the card appears at once (optimistic with nulls)
    const row = await insertEntry({ text, state: 'Inbox', category: null, score: null, starred: false });
    setEntries((prev) => [row, ...prev]);

    // Classify in background; update the row when done
    const { category, score } = await classifyEntry(text);
    await updateEntry(row.id, { category, score });
    // Real-time subscription will pick up the update, but patch local state too for speed
    setEntries((prev) => prev.map((e) => (e.id === row.id ? { ...e, category, score } : e)));
  }, []);

  const setState = useCallback(async (id, state) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, state } : e)));
    await updateEntry(id, { state });
  }, []);

  const toggleStar = useCallback(async (id) => {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, starred: !e.starred } : e))
    );
    const entry = entries.find((e) => e.id === id);
    if (entry) await updateEntry(id, { starred: !entry.starred });
  }, [entries]);

  return { entries, loading, addEntry, setState, toggleStar };
}
