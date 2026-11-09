import { describe, expect, it } from 'vitest';
import { isRetryableSyncError, reconcileRows } from './sync-core';

interface Row {
  id: string;
  value: string;
}

const local: Row[] = [
  { id: 'a', value: 'lokal' },
  { id: 'b', value: 'lokal b' },
  { id: 'c', value: 'ventende sletting' },
];

const remote: Row[] = [
  { id: 'b', value: 'server b' },
  { id: 'd', value: 'ny på server' },
];

describe('reconcileRows', () => {
  it('legger inn serverrader, fjerner server-slettede rader og bevarer ventende rader', () => {
    const result = reconcileRows(local, remote, new Set(['c']));
    expect(result.toRemove).toEqual(['a']);
    expect(result.toPut).toEqual([
      { id: 'b', value: 'server b' },
      { id: 'd', value: 'ny på server' },
    ]);
  });

  it('overskriver ikke lokale rader med ventende endringer', () => {
    const result = reconcileRows(local, remote, new Set(['b', 'c']));
    expect(result.toPut.map((row) => row.id)).toEqual(['d']);
    expect(result.toPut.find((row) => row.id === 'b')).toBeUndefined();
    expect(result.toRemove).toEqual(['a']);
  });

  it('sletting vinner når det ikke finnes ventende lokal endring', () => {
    const result = reconcileRows([{ id: 'slettet', value: 'finnes lokalt' }], [], new Set());
    expect(result.toRemove).toEqual(['slettet']);
    expect(result.toPut).toEqual([]);
  });

  it('idempotent replay: samme serverrad legges bare inn én gang', () => {
    const once = reconcileRows([], remote, new Set());
    const twice = reconcileRows(once.toPut, remote, new Set());
    expect(twice.toPut).toHaveLength(2);
    expect(new Set(twice.toPut.map((row) => row.id)).size).toBe(2);
    expect(twice.toRemove).toEqual([]);
  });
});

describe('isRetryableSyncError', () => {
  it('behandler nettverksfeil som midlertidige', () => {
    expect(isRetryableSyncError(new TypeError('Failed to fetch'))).toBe(true);
    expect(isRetryableSyncError('NetworkError when attempting to fetch resource')).toBe(true);
  });

  it('behandler RLS- og PostgREST-feil som permanente', () => {
    expect(isRetryableSyncError({ code: '42501', message: 'permission denied' })).toBe(false);
    expect(isRetryableSyncError({ code: 'PGRST301', message: 'JWT expired' })).toBe(false);
    expect(isRetryableSyncError({ status: 401, message: 'Unauthorized' })).toBe(false);
  });
});
