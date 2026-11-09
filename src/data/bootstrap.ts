import { supabase } from '../lib/supabase';

/**
 * Idempotent bootstrap. Auth-triggeren oppretter profil, husholdning og en
 * standardliste, men denne RPC-en reparerer også eksisterende brukere dersom
 * triggeren mangler eller data er slettet.
 */
export async function ensureBootstrap(): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.rpc('ensure_bootstrap');
  if (error) throw error;
}
