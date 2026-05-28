import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { USER_ID } from '../lib/constants';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[supabase] Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. ' +
      'Add them to .env and restart with `npx expo start --clear`.'
  );
}

export const supabase = createClient(supabaseUrl ?? 'https://placeholder.supabase.co', supabaseAnonKey ?? 'placeholder', {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

export async function listEntries() {
  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .eq('user_id', USER_ID)
    .order('score', { ascending: false, nullsFirst: false });
  if (error) throw error;
  return data;
}

export async function insertEntry(row) {
  const { data, error } = await supabase
    .from('entries')
    .insert({ ...row, user_id: USER_ID })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateEntry(id, patch) {
  const { error } = await supabase
    .from('entries')
    .update(patch)
    .eq('id', id)
    .eq('user_id', USER_ID);
  if (error) throw error;
}

export async function deleteEntry(id) {
  const { error } = await supabase
    .from('entries')
    .delete()
    .eq('id', id)
    .eq('user_id', USER_ID);
  if (error) throw error;
}
