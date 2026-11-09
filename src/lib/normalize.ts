/**
 * Normaliserer varenavn for matching mellom historikk og autocomplete.
 *
 * Reglene er bevisst enkle og norske:
 * - trim, lower-case (beholder æøå), kollaps av whitespace, fjerner avsluttende tegn
 * - fjerner vanlige flertalls-/bestemt-form-endelser iterativt, slik at
 *   «eggene», «egget» og «egg» alle blir «egg».
 *
 * Det er en heuristikk, ikke full morfologi. Den er lik på klient og i databasen
 * fordi klienten lagrer normalized_name sammen med varen.
 */
const SUFFIXES = ['ene', 'ane', 'er', 'ar', 'en', 'et', 'a', 'e'] as const;
const MIN_STEM_LENGTH = 2;

function stripOneSuffix(value: string): { value: string; suffix: string | null } {
  for (const suffix of SUFFIXES) {
    if (value.endsWith(suffix) && value.length - suffix.length >= MIN_STEM_LENGTH) {
      return { value: value.slice(0, -suffix.length), suffix };
    }
  }
  return { value, suffix: null };
}

export function normalizeItemName(raw: string): string {
  let value = raw
    .normalize('NFKC')
    .toLocaleLowerCase('nb-NO')
    .trim()
    .replace(/\s+/gu, ' ')
    .replace(/[.,;:!?]+$/u, '');

  // Gjenta til stammen er stabil. Det gjør at «potet»/«poteter» og
  // «sukker»/«sukkeret» havner på samme interne stamme. Visningsnavnet er
  // upåvirket; stammen brukes bare til matching.
  for (let round = 0; round < 4; round += 1) {
    const next = stripOneSuffix(value);
    if (next.suffix === null) break;
    value = next.value;
  }

  return value;
}

export function cleanDisplayName(raw: string): string {
  return raw.normalize('NFKC').trim().replace(/\s+/gu, ' ');
}
