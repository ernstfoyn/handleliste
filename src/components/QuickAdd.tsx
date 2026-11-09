import { useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { addItem } from '../data/actions';
import { rankSuggestions } from '../lib/autocomplete';
import { CATEGORY_META, inferCategory } from '../lib/categories';
import { toErrorMessage } from '../lib/errors';
import type { CatalogEntry } from '../lib/types';
import { useToast } from '../providers/ToastProvider';

export function QuickAdd({
  listId,
  userId,
  catalog,
}: {
  listId: string;
  userId: string;
  catalog: readonly CatalogEntry[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');
  const [note, setNote] = useState('');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [suggestionsDismissed, setSuggestionsDismissed] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();

  const options = useMemo(() => {
    const query = name.trim();
    if (query) return rankSuggestions(catalog, query, { limit: 500 });
    return [...catalog].sort(
      (a, b) =>
        b.useCount - a.useCount ||
        new Date(b.lastUsedAt).getTime() - new Date(a.lastUsedAt).getTime() ||
        a.displayName.localeCompare(b.displayName, 'nb-NO'),
    );
  }, [catalog, name]);

  const dropdownOpen = historyOpen && !suggestionsDismissed && options.length > 0;
  const inferredCategory = name.trim() ? inferCategory(name) : null;

  const focusInput = () => {
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  const resetFields = () => {
    setName('');
    setQuantity('');
    setNote('');
    setActiveIndex(-1);
    setSuggestionsDismissed(false);
    setHistoryOpen(true);
    setDetailsOpen(false);
    focusInput();
  };

  const submitName = async (value: string) => {
    const displayName = value.trim();
    if (!displayName || busy) return;
    setBusy(true);
    const snapshot = { name, quantity, note, detailsOpen };
    resetFields();
    try {
      await addItem({ userId, listId, name: displayName, quantity, note });
    } catch (error) {
      setName(snapshot.name);
      setQuantity(snapshot.quantity);
      setNote(snapshot.note);
      setDetailsOpen(snapshot.detailsOpen);
      showToast({ message: toErrorMessage(error) });
    } finally {
      setBusy(false);
      focusInput();
    }
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (activeIndex >= 0 && options[activeIndex]) {
      void submitName(options[activeIndex].displayName);
      return;
    }
    void submitName(name);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      if (options.length === 0) return;
      event.preventDefault();
      setHistoryOpen(true);
      setSuggestionsDismissed(false);
      setActiveIndex((current) => Math.min(current + 1, options.length - 1));
      return;
    }
    if (event.key === 'ArrowUp') {
      if (options.length === 0) return;
      event.preventDefault();
      setHistoryOpen(true);
      setActiveIndex((current) => Math.max(current - 1, -1));
      return;
    }
    if (event.key === 'Escape') {
      setActiveIndex(-1);
      setSuggestionsDismissed(true);
      setHistoryOpen(false);
      return;
    }
    if (event.key === 'Tab') {
      setActiveIndex(-1);
      setHistoryOpen(false);
    }
  };

  return (
    <form
      className="relative z-20 rounded-[28px] border border-white/5 bg-ink p-2.5 text-paper shadow-card dark:border-white/10 dark:bg-[#1A1A1A] sm:p-3"
      onSubmit={(event) => void handleSubmit(event)}
      autoComplete="off"
    >
      <div className="flex items-stretch gap-2">
        <div className="relative min-w-0 flex-1">
          <label className="sr-only" htmlFor="quick-add-name">
            Legg til vare
          </label>
          <input
            ref={inputRef}
            id="quick-add-name"
            className="field h-12 border-white/10 bg-white/10 pr-10 text-base text-paper shadow-none placeholder:text-paper/40 focus:border-white/30 focus:ring-white/10 dark:border-white/10 dark:bg-white/10"
            placeholder="Skriv en vare …"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setSuggestionsDismissed(false);
              setHistoryOpen(true);
              setActiveIndex(-1);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => {
              setSuggestionsDismissed(false);
              setHistoryOpen(true);
            }}
            onBlur={() => {
              window.setTimeout(() => {
                setActiveIndex(-1);
                setSuggestionsDismissed(true);
                setHistoryOpen(false);
              }, 120);
            }}
            role="combobox"
            aria-autocomplete="list"
            aria-haspopup="listbox"
            aria-expanded={dropdownOpen}
            aria-controls="quick-add-suggestions"
            aria-activedescendant={
              activeIndex >= 0 && options[activeIndex]
                ? `quick-add-option-${options[activeIndex].id}`
                : undefined
            }
            enterKeyHint="done"
            maxLength={200}
          />
          {dropdownOpen ? (
            <div className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-30 overflow-hidden rounded-3xl border border-ink/10 bg-paper text-ink shadow-card dark:border-white/10 dark:bg-[#1A1A1A] dark:text-paper">
              <div className="flex items-center justify-between gap-2 border-b border-ink/[0.06] px-3.5 py-2 dark:border-white/10">
                <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink/40 dark:text-paper/40">
                  {name.trim() ? 'Forslag' : 'Alle tidligere varer'}
                </span>
                <span className="text-[10px] text-ink/30 dark:text-paper/30">{options.length}</span>
              </div>
              <ul
                id="quick-add-suggestions"
                role="listbox"
                aria-label={name.trim() ? 'Forslag fra historikken' : 'Alle tidligere varer'}
                className="max-h-[min(60vh,22rem)] overflow-y-auto py-1"
              >
                {options.map((suggestion, index) => (
                  <li
                    key={suggestion.id}
                    id={`quick-add-option-${suggestion.id}`}
                    role="option"
                    aria-selected={activeIndex === index}
                    className={`flex min-h-12 cursor-pointer items-center justify-between gap-3 px-3.5 text-left text-sm ${
                      activeIndex === index
                        ? 'bg-mint-100 text-ink dark:bg-mint-950 dark:text-mint-100'
                        : 'text-ink/80 dark:text-paper/80'
                    }`}
                    onMouseDown={(event) => event.preventDefault()}
                    onMouseEnter={() => setActiveIndex(index)}
                    onClick={() => void submitName(suggestion.displayName)}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      <span
                        className={`h-1.5 w-1.5 shrink-0 rounded-full ${CATEGORY_META[inferCategory(suggestion.displayName)].dotClass}`}
                        aria-hidden="true"
                      />
                      <span className="truncate font-medium">{suggestion.displayName}</span>
                    </span>
                    <span className="shrink-0 text-xs text-ink/45 dark:text-paper/45">
                      {suggestion.useCount === 0
                        ? 'Nylig'
                        : suggestion.useCount === 1
                          ? '1 gang'
                          : `${suggestion.useCount} ganger`}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
        <button
          type="submit"
          className="btn h-12 shrink-0 rounded-full bg-paper px-4 text-ink hover:bg-paper/90 dark:bg-paper dark:text-ink"
          disabled={!name.trim() || busy}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          <span className="hidden sm:inline">Legg til</span>
          <span className="sr-only sm:hidden">Legg til vare</span>
        </button>
      </div>

      <div className="mt-1.5 flex items-center justify-between gap-2 px-1">
        <button
          type="button"
          className="inline-flex min-h-11 items-center gap-1 rounded-full px-2 text-xs font-medium text-paper/55 transition-colors hover:text-paper"
          onClick={() => setDetailsOpen((open) => !open)}
          aria-expanded={detailsOpen}
          aria-controls="quick-add-details"
        >
          <svg
            viewBox="0 0 24 24"
            className={`h-3.5 w-3.5 transition-transform ${detailsOpen ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          Mengde og notat
        </button>
        <div className="flex items-center gap-3">
          {inferredCategory ? (
            <span className="flex items-center gap-1.5 text-xs text-paper/45">
              <span
                className={`h-1.5 w-1.5 rounded-full ${CATEGORY_META[inferredCategory].dotClass}`}
                aria-hidden="true"
              />
              {CATEGORY_META[inferredCategory].label}
            </span>
          ) : null}
          {name.trim() ? (
            <span className="hidden text-xs text-paper/35 sm:inline">Enter for å legge til</span>
          ) : catalog.length > 0 ? (
            <span className="text-xs text-paper/35">Trykk for historikk</span>
          ) : null}
        </div>
      </div>

      {detailsOpen ? (
        <div
          id="quick-add-details"
          className="mt-2 grid gap-2 border-t border-white/10 pt-3 sm:grid-cols-[10rem_1fr]"
        >
          <div>
            <label
              className="mb-1 block text-xs font-medium text-paper/50"
              htmlFor="quick-add-quantity"
            >
              Mengde
            </label>
            <input
              id="quick-add-quantity"
              className="field h-11 border-white/10 bg-white/10 text-sm text-paper placeholder:text-paper/35 dark:border-white/10 dark:bg-white/10"
              placeholder="f.eks. 2 stk"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              maxLength={80}
              autoComplete="off"
            />
          </div>
          <div>
            <label
              className="mb-1 block text-xs font-medium text-paper/50"
              htmlFor="quick-add-note"
            >
              Notat
            </label>
            <input
              id="quick-add-note"
              className="field h-11 border-white/10 bg-white/10 text-sm text-paper placeholder:text-paper/35 dark:border-white/10 dark:bg-white/10"
              placeholder="Valgfritt"
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={500}
              autoComplete="off"
            />
          </div>
        </div>
      ) : null}
    </form>
  );
}
