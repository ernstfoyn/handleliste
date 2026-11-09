/**
 * Ren synkelogikk som kan testes uten nettleser eller Supabase.
 */

export interface Identifiable {
  id: string;
}

export interface ReconcileResult<T> {
  toPut: T[];
  toRemove: string[];
}

/**
 * Full-pull-reconciliation:
 * - rader med ventende lokale endringer overskrives ikke
 * - rader som er slettet på serveren fjernes lokalt, med mindre de har ventende endringer
 * - nye/oppdaterte serverrader legges inn
 */
export function reconcileRows<T extends Identifiable>(
  local: readonly T[],
  remote: readonly T[],
  pendingIds: ReadonlySet<string>,
): ReconcileResult<T> {
  const remoteIds = new Set(remote.map((row) => row.id));
  return {
    toPut: remote.filter((row) => !pendingIds.has(row.id)),
    toRemove: local
      .filter((row) => !remoteIds.has(row.id) && !pendingIds.has(row.id))
      .map((row) => row.id),
  };
}

/**
 * Nettverksfeil kan prøves igjen automatisk. PostgREST-/RLS-feil er permanente
 * til brukeren eller skjemaet endres, og skal ikke hamres på.
 */
export function isRetryableSyncError(error: unknown): boolean {
  if (typeof error === 'object' && error !== null) {
    const maybe = error as { code?: unknown; status?: unknown };
    if (typeof maybe.code === 'string' && maybe.code.length > 0) return false;
    if (typeof maybe.status === 'number' && maybe.status >= 400 && maybe.status < 500) return false;
  }

  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : typeof error === 'object' && error !== null && 'message' in error
          ? String(error.message)
          : '';

  return /fetch|network|offline|load failed|connection|timeout|timed out/i.test(message);
}
