export function createId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback for eldre nettlesere. ID-ene er fortsatt unike nok for MVP.
  const random = Math.random().toString(36).slice(2);
  return `${Date.now().toString(36)}-${random}`;
}

export function createPosition(existingPositions: readonly number[] = []): number {
  const now = Date.now() * 1000 + Math.floor(Math.random() * 1000);
  const max = existingPositions.length > 0 ? Math.max(...existingPositions) : 0;
  return Math.max(now, max + 1);
}
