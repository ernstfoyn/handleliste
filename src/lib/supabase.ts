import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from './database.types';

const url = import.meta.env.VITE_SUPABASE_URL?.trim();
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();
const hasPlaceholderKey = anonKey?.toLocaleLowerCase('nb-NO').includes('din-anon-key') ?? false;

export const isSupabaseConfigured = Boolean(url && anonKey && !hasPlaceholderKey);

let client: SupabaseClient<Database> | null = null;

if (url && anonKey && !hasPlaceholderKey) {
  client = createClient<Database>(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  });
}

export const supabase = client;

export function requireSupabase(): SupabaseClient<Database> {
  if (!client) {
    throw new Error(
      'Supabase er ikke konfigurert. Kopier .env.example til .env.local og fyll inn URL og anon key.',
    );
  }
  return client;
}
