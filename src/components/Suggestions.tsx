import { mostUsed, recentlyUsed } from '../lib/autocomplete';
import type { CatalogEntry } from '../lib/types';

const CHIP_SURFACES = [
  'bg-mint-100 dark:bg-mint-950',
  'bg-blush-100 dark:bg-blush-950',
  'bg-lilac-100 dark:bg-lilac-950',
  'bg-butter-100 dark:bg-butter-950',
  'bg-sky-100 dark:bg-sky-950',
] as const;

function SuggestionRow({
  title,
  entries,
  onPick,
  hint,
}: {
  title: string;
  entries: readonly CatalogEntry[];
  onPick: (displayName: string) => void;
  hint: string;
}) {
  if (entries.length === 0) return null;

  return (
    <section
      aria-labelledby={`suggestion-${title.replace(/\s+/gu, '-').toLocaleLowerCase('nb-NO')}`}
    >
      <div className="mb-1.5 flex items-baseline justify-between gap-2 px-1">
        <h2
          id={`suggestion-${title.replace(/\s+/gu, '-').toLocaleLowerCase('nb-NO')}`}
          className="eyebrow"
        >
          {title}
        </h2>
        <span className="text-[11px] text-ink/35 dark:text-paper/35">{hint}</span>
      </div>
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {entries.map((entry, index) => (
          <button
            key={entry.id}
            type="button"
            className={`chip shrink-0 border-transparent ${CHIP_SURFACES[index % CHIP_SURFACES.length]}`}
            onClick={() => onPick(entry.displayName)}
            aria-label={`Legg til ${entry.displayName} fra ${title.toLocaleLowerCase('nb-NO')}`}
          >
            <span>{entry.displayName}</span>
            {entry.useCount > 1 ? (
              <span className="text-[11px] font-normal text-ink/35 dark:text-paper/40">
                {entry.useCount}×
              </span>
            ) : null}
          </button>
        ))}
      </div>
    </section>
  );
}

export function Suggestions({
  catalog,
  onPick,
}: {
  catalog: readonly CatalogEntry[];
  onPick: (displayName: string) => void;
}) {
  if (catalog.length === 0) return null;

  const often = mostUsed(catalog);
  const recent = recentlyUsed(catalog, often);

  if (often.length === 0 && recent.length === 0) return null;

  return (
    <div className="mt-5 space-y-4">
      <SuggestionRow
        title="Ofte brukt"
        entries={often}
        onPick={onPick}
        hint="Ett trykk for å legge til"
      />
      <SuggestionRow
        title="Nylig brukt"
        entries={recent}
        onPick={onPick}
        hint="Fra historikken din"
      />
    </div>
  );
}
