import { describe, expect, it } from 'vitest';
import { buildHistory } from './history';
import type { CatalogEntry, Item } from './types';

const item = (
  overrides: Partial<Item> & Pick<Item, 'id' | 'displayName' | 'normalizedName'>,
): Item => ({
  listId: 'list-1',
  name: overrides.displayName,
  quantity: null,
  note: null,
  isChecked: false,
  checkedAt: null,
  deletedAt: null,
  createdBy: 'user-1',
  updatedBy: 'user-1',
  createdAt: '2026-11-01T10:00:00.000Z',
  updatedAt: '2026-11-01T10:00:00.000Z',
  position: 1,
  ...overrides,
});

const catalog = (
  overrides: Partial<CatalogEntry> & Pick<CatalogEntry, 'id' | 'normalizedName' | 'displayName'>,
): CatalogEntry => ({
  householdId: 'household-1',
  useCount: 1,
  lastUsedAt: '2026-11-01T10:00:00.000Z',
  ...overrides,
});

describe('buildHistory', () => {
  it('tar med varer som ikke finnes i item_catalog', () => {
    const history = buildHistory(
      [],
      [item({ id: 'i1', displayName: 'Ost', normalizedName: 'ost' })],
    );
    expect(history).toHaveLength(1);
    expect(history[0]?.displayName).toBe('Ost');
    expect(history[0]?.useCount).toBe(0);
    expect(history[0]?.id).toBe('history:ost');
  });

  it('dupliserer ikke varer som allerede finnes i historikken', () => {
    const history = buildHistory(
      [catalog({ id: 'c1', displayName: 'Melk', normalizedName: 'melk', useCount: 3 })],
      [item({ id: 'i1', displayName: 'Melk', normalizedName: 'melk' })],
    );
    expect(history).toHaveLength(1);
    expect(history[0]?.useCount).toBe(3);
  });

  it('slår sammen samme vare fra flere husholdninger', () => {
    const history = buildHistory(
      [
        catalog({
          id: 'c1',
          householdId: 'h1',
          displayName: 'Melk',
          normalizedName: 'melk',
          useCount: 2,
          lastUsedAt: '2026-11-01T10:00:00.000Z',
        }),
        catalog({
          id: 'c2',
          householdId: 'h2',
          displayName: 'Melk',
          normalizedName: 'melk',
          useCount: 4,
          lastUsedAt: '2026-11-03T10:00:00.000Z',
        }),
      ],
      [],
    );
    expect(history).toHaveLength(1);
    expect(history[0]?.useCount).toBe(6);
    expect(history[0]?.lastUsedAt).toBe('2026-11-03T10:00:00.000Z');
  });

  it('bruker nyeste visningsnavn fra en vare', () => {
    const history = buildHistory(
      [catalog({ id: 'c1', displayName: 'melk', normalizedName: 'melk', useCount: 2 })],
      [
        item({
          id: 'i1',
          displayName: 'Melk',
          normalizedName: 'melk',
          updatedAt: '2026-11-05T10:00:00.000Z',
        }),
      ],
    );
    expect(history[0]?.displayName).toBe('Melk');
  });
});
