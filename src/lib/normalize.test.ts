import { describe, expect, it } from 'vitest';
import { cleanDisplayName, normalizeItemName } from './normalize';

describe('normalizeItemName', () => {
  it('trimmer, lower-caser og kollapser whitespace', () => {
    expect(normalizeItemName('   Melk   ')).toBe('melk');
    expect(normalizeItemName('2   stk\tmelk')).toBe('2 stk melk');
    expect(normalizeItemName('MELK.')).toBe('melk');
  });

  it('beholder æøå og gjør matching case-insensitiv', () => {
    expect(normalizeItemName('BRØD')).toBe('brød');
    expect(normalizeItemName('Brødet')).toBe('brød');
    expect(normalizeItemName('LØKEN')).toBe('løk');
    expect(normalizeItemName('ØL')).toBe('øl');
    expect(normalizeItemName('ølet')).toBe('øl');
  });

  it('matcher enkle flertalls- og bestemt former', () => {
    const forms = ['egg', 'egget', 'eggene', 'EGGENE'];
    expect(new Set(forms.map(normalizeItemName))).toEqual(new Set(['egg']));

    const apples = ['eple', 'eplet', 'epler', 'eplene'];
    expect(new Set(apples.map(normalizeItemName))).toEqual(new Set(['epl']));

    const oranges = ['appelsin', 'appelsinen', 'appelsiner', 'appelsinene'];
    expect(new Set(oranges.map(normalizeItemName))).toEqual(new Set(['appelsin']));

    const potatoes = ['potet', 'poteten', 'poteter', 'potetene'];
    expect(new Set(potatoes.map(normalizeItemName)).size).toBe(1);

    const tomatoes = ['tomat', 'tomaten', 'tomater', 'tomatene'];
    expect(new Set(tomatoes.map(normalizeItemName))).toEqual(new Set(['tomat']));
  });

  it('håndterer dobbel endelse iterativt', () => {
    expect(normalizeItemName('sukker')).toBe(normalizeItemName('sukkeret'));
    expect(normalizeItemName('sukker')).toBe('sukk');
  });

  it('lar korte ord og ord uten kjent endelse være i fred', () => {
    expect(normalizeItemName('te')).toBe('te');
    expect(normalizeItemName('ris')).toBe('ris');
    expect(normalizeItemName('vann')).toBe('vann');
    expect(normalizeItemName('ost')).toBe('ost');
  });

  it('gir tom streng for tomt/ugyldig navn', () => {
    expect(normalizeItemName('   ')).toBe('');
    expect(normalizeItemName('...')).toBe('');
  });
});

describe('cleanDisplayName', () => {
  it('bevarer visningsnavnet men rydder whitespace', () => {
    expect(cleanDisplayName('  Melk   lett ')).toBe('Melk lett');
    expect(cleanDisplayName('Brød')).toBe('Brød');
  });
});
