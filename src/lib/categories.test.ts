import { describe, expect, it } from 'vitest';
import { groupByCategory, inferCategory } from './categories';

describe('inferCategory', () => {
  it('kategoriserer vanlige dagligvarer', () => {
    expect(inferCategory('Melk')).toBe('meieri');
    expect(inferCategory('Ost')).toBe('meieri');
    expect(inferCategory('Egg')).toBe('meieri');
    expect(inferCategory('Brød')).toBe('bakeri');
    expect(inferCategory('Knekkebrød')).toBe('bakeri');
    expect(inferCategory('Brokkoli')).toBe('gronnsaker');
    expect(inferCategory('Poteter')).toBe('gronnsaker');
    expect(inferCategory('Løk')).toBe('gronnsaker');
    expect(inferCategory('Eple')).toBe('frukt');
    expect(inferCategory('Bananer')).toBe('frukt');
    expect(inferCategory('Appelsin')).toBe('frukt');
    expect(inferCategory('Kyllingfilet')).toBe('kjott_fisk');
    expect(inferCategory('Laks')).toBe('kjott_fisk');
    expect(inferCategory('Ris')).toBe('torrvarer');
    expect(inferCategory('Pasta')).toBe('torrvarer');
    expect(inferCategory('Kaffe')).toBe('torrvarer');
    expect(inferCategory('Frossenpizza')).toBe('frys');
    expect(inferCategory('Iskrem')).toBe('frys');
    expect(inferCategory('Chips')).toBe('snacks');
    expect(inferCategory('Ostepop')).toBe('snacks');
    expect(inferCategory('Appelsinjuice')).toBe('drikke');
    expect(inferCategory('Dopapir')).toBe('husholdning');
    expect(inferCategory('Tannkrem')).toBe('husholdning');
  });

  it('håndterer æøå, store bokstaver og flertall', () => {
    expect(inferCategory('LØKEN')).toBe('gronnsaker');
    expect(inferCategory('Brødet')).toBe('bakeri');
    expect(inferCategory('Eplene')).toBe('frukt');
    expect(inferCategory('Eggene')).toBe('meieri');
  });

  it('faller tilbake til annet', () => {
    expect(inferCategory('XYZ-ting')).toBe('annet');
    expect(inferCategory('')).toBe('annet');
  });
});

describe('groupByCategory', () => {
  it('grupperer i fast rekkefølge og bevarer rekkefølgen innenfor gruppen', () => {
    const groups = groupByCategory([
      { displayName: 'Melk' },
      { displayName: 'Brokkoli' },
      { displayName: 'Ris' },
      { displayName: 'Ost' },
      { displayName: 'Ukjent vare' },
    ]);
    expect(groups.map((group) => group.category)).toEqual([
      'gronnsaker',
      'meieri',
      'torrvarer',
      'annet',
    ]);
    expect(
      groups.find((group) => group.category === 'meieri')?.items.map((item) => item.displayName),
    ).toEqual(['Melk', 'Ost']);
  });
});
