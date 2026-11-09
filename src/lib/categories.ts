export const CATEGORY_ORDER = [
  'gronnsaker',
  'frukt',
  'meieri',
  'bakeri',
  'kjott_fisk',
  'torrvarer',
  'frys',
  'drikke',
  'snacks',
  'husholdning',
  'annet',
] as const;

export type CategoryId = (typeof CATEGORY_ORDER)[number];

// Prioritet for matching, ikke visningsrekkefølge.
const CATEGORY_PRIORITY: readonly Exclude<CategoryId, 'annet'>[] = [
  'husholdning',
  'snacks',
  'frys',
  'drikke',
  'meieri',
  'bakeri',
  'kjott_fisk',
  'gronnsaker',
  'frukt',
  'torrvarer',
];

export interface CategoryMeta {
  label: string;
  dotClass: string;
}

export const CATEGORY_META: Record<CategoryId, CategoryMeta> = {
  gronnsaker: { label: 'Grønnsaker', dotClass: 'bg-mint-300' },
  frukt: { label: 'Frukt', dotClass: 'bg-blush-300' },
  meieri: { label: 'Meieri', dotClass: 'bg-sky-300' },
  bakeri: { label: 'Bakeri', dotClass: 'bg-butter-300' },
  kjott_fisk: { label: 'Kjøtt & fisk', dotClass: 'bg-red-400' },
  torrvarer: { label: 'Tørrvarer', dotClass: 'bg-amber-500' },
  frys: { label: 'Frys', dotClass: 'bg-cyan-400' },
  drikke: { label: 'Drikke', dotClass: 'bg-teal-400' },
  snacks: { label: 'Snacks', dotClass: 'bg-violet-400' },
  husholdning: { label: 'Husholdning', dotClass: 'bg-stone-400' },
  annet: { label: 'Annet', dotClass: 'bg-ink/25' },
};

const KEYWORDS: Record<Exclude<CategoryId, 'annet'>, readonly string[]> = {
  husholdning: [
    'dopapir',
    'toalettpapir',
    'tørkepapir',
    'kjokkenpapir',
    'kjøkkenpapir',
    'vaskemiddel',
    'vaskepulver',
    'skyllemiddel',
    'oppvask',
    'oppvaskmiddel',
    'søppelpose',
    'soppelpose',
    'såpe',
    'sjampo',
    'shampoo',
    'tannkrem',
    'tannborste',
    'tannbørste',
    'bleier',
    'batterier',
    'stearinlys',
    'zalo',
  ],
  snacks: [
    'chips',
    'potetgull',
    'ostepop',
    'sjokolade',
    'godteri',
    'smågodt',
    'smagodt',
    'popcorn',
    'kjeks',
    'lakris',
    'nøtter',
    'notter',
    'mandler',
  ],
  frys: [
    'frossen',
    'fryst',
    'iskrem',
    'pommes',
    'fiskepinner',
    'nuggets',
    'frossenpizza',
    'grønnsaksblanding',
    'gronnsaksblanding',
    'is',
  ],
  meieri: [
    'melk',
    'ost',
    'yoghurt',
    'yogurt',
    'rømme',
    'romme',
    'fløte',
    'flote',
    'smør',
    'smor',
    'egg',
    'kesam',
    'kefir',
    'cultura',
  ],
  bakeri: [
    'brød',
    'brod',
    'rundstykke',
    'baguette',
    'knekkebrød',
    'knekkebrod',
    'bolle',
    'kake',
    'croissant',
    'wienerbrød',
    'wienerbrod',
    'lefse',
    'tortilla',
    'pita',
  ],
  kjott_fisk: [
    'kjott',
    'kjøtt',
    'kjottdeig',
    'kjøttdeig',
    'kylling',
    'kalkun',
    'biff',
    'svin',
    'bacon',
    'pølse',
    'polse',
    'skinke',
    'karbonade',
    'filet',
    'fisk',
    'laks',
    'torsk',
    'reker',
    'tunfisk',
    'sei',
    'ørret',
    'orret',
  ],
  gronnsaker: [
    'tomat',
    'agurk',
    'salat',
    'paprika',
    'løk',
    'lok',
    'gulrot',
    'potet',
    'brokkoli',
    'blomkål',
    'blomkal',
    'kål',
    'kal',
    'spinat',
    'purre',
    'hvitløk',
    'hvitlok',
    'sopp',
    'mais',
    'erter',
    'bønner',
    'bonner',
    'chili',
    'squash',
    'aubergine',
    'reddik',
    'asparges',
    'fennikel',
    'ingefær',
    'ingefaer',
    'basilikum',
    'persille',
    'koriander',
    'dill',
    'timian',
    'rosmarin',
    'avokado',
  ],
  frukt: [
    'eple',
    'pære',
    'paere',
    'banan',
    'appelsin',
    'sitron',
    'lime',
    'drue',
    'jordbær',
    'jordbaer',
    'blåbær',
    'blabaer',
    'bringebær',
    'bringebaer',
    'kiwi',
    'mango',
    'ananas',
    'melon',
    'fersken',
    'plomme',
    'aprikos',
    'nektarin',
    'bær',
    'baer',
  ],
  drikke: [
    'juice',
    'saft',
    'brus',
    'vann',
    'farris',
    'øl',
    'ol',
    'ølet',
    'olet',
    'rødvin',
    'rodvin',
    'hvitvin',
    'vinflaske',
    'cider',
    'smoothie',
    'energidrikk',
    'iste',
  ],
  torrvarer: [
    'ris',
    'pasta',
    'spaghetti',
    'makaroni',
    'mel',
    'sukker',
    'salt',
    'pepper',
    'krydder',
    'olje',
    'eddik',
    'saus',
    'ketchup',
    'sennep',
    'majones',
    'hermetikk',
    'linser',
    'havregryn',
    'müsli',
    'musli',
    'frokostblanding',
    'kaffe',
    'te',
    'kakao',
    'rosiner',
    'honning',
    'syltetøy',
    'syltetoy',
    'bakepulver',
    'vanilje',
    'potetmel',
  ],
};

const EXACT_WORDS = new Set(['vann', 'te', 'is', 'øl', 'vin']);

function keywordMatches(text: string, keyword: string): boolean {
  if (EXACT_WORDS.has(keyword) || keyword.length <= 2) {
    return text.split(/\s+/u).includes(keyword);
  }
  return text.includes(keyword);
}

/**
 * Enkel norsk dagligvareklassifisering basert på varenavnet.
 * Bevisst uten databasekolonne i denne versjonen; samme regler brukes
 * overalt i UI, så kategorien er alltid konsistent med navnet.
 */
export function inferCategory(displayName: string): CategoryId {
  const text = displayName.trim().toLocaleLowerCase('nb-NO').replace(/\s+/gu, ' ');
  if (!text) return 'annet';

  for (const category of CATEGORY_PRIORITY) {
    if (KEYWORDS[category].some((keyword) => keywordMatches(text, keyword))) {
      return category;
    }
  }
  return 'annet';
}

export function groupByCategory<T extends { displayName: string }>(
  items: readonly T[],
): { category: CategoryId; items: T[] }[] {
  const groups = new Map<CategoryId, T[]>();
  for (const item of items) {
    const category = inferCategory(item.displayName);
    const existing = groups.get(category);
    if (existing) {
      existing.push(item);
    } else {
      groups.set(category, [item]);
    }
  }

  return CATEGORY_ORDER.flatMap((category) => {
    const group = groups.get(category);
    return group && group.length > 0 ? [{ category, items: group }] : [];
  });
}
