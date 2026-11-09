import { useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from 'react';
import { addItem } from '../data/actions';
import { rankSuggestions } from '../lib/autocomplete';
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
  const [busy, setBusy] = useState(false);
  const { showToast } = useToast();

  const suggestions = useMemo(() => {
    if (!name.trim()) return [];
    return rankSuggestions(catalog, name, { limit: 6 });
  }, [catalog, name]);

  const dropdownOpen = !suggestionsDismissed && suggestions.length > 0 && name.trim().length > 0;

  const focusInput = () => {
    window.requestAnimationFrame(() => inputRef.current?.focus());
  };

  const resetFields = () => {
    setName('');
    setQuantity('');
    setNote('');
    setActiveIndex(-1);
    setSuggestionsDismissed(false);
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
    if (activeIndex >= 0 && suggestions[activeIndex]) {
      void submitName(suggestions[activeIndex].displayName);
      return;
    }
    void submitName(name);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'ArrowDown') {
      if (suggestions.length === 0) return;
      event.preventDefault();
      setSuggestionsDismissed(false);
      setActiveIndex((current) => Math.min(current + 1, suggestions.length - 1));
      return;
    }
    if (event.key === 'ArrowUp') {
      if (suggestions.length === 0) return;
      event.preventDefault();
      setActiveIndex((current) => Math.max(current - 1, -1));
      return;
    }
    if (event.key === 'Escape') {
      setActiveIndex(-1);
      setSuggestionsDismissed(true);
      return;
    }
    if (event.key === 'Tab') {
      setActiveIndex(-1);
    }
  };

  return (
    <form
      className="card relative z-20 p-2.5 sm:p-3"
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
            className="field h-12 border-transparent bg-stone-50 pr-10 text-base shadow-inner dark:border-transparent dark:bg-stone-800/80"
            placeholder="Skriv en vare …"
            value={name}
            onChange={(event) => {
              setName(event.target.value);
              setSuggestionsDismissed(false);
              setActiveIndex(-1);
            }}
            onKeyDown={handleKeyDown}
            onFocus={() => setSuggestionsDismissed(false)}
            onBlur={() => {
              window.setTimeout(() => {
                setActiveIndex(-1);
                setSuggestionsDismissed(true);
              }, 120);
            }}
            role="combobox"
            aria-autocomplete="list"
            aria-haspopup="listbox"
            aria-expanded={dropdownOpen}
            aria-controls="quick-add-suggestions"
            aria-activedescendant={
              activeIndex >= 0 && suggestions[activeIndex]
                ? `quick-add-option-${suggestions[activeIndex].id}`
                : undefined
            }
            enterKeyHint="done"
            maxLength={200}
          />
          {dropdownOpen ? (
            <ul
              id="quick-add-suggestions"
              role="listbox"
              aria-label="Forslag fra historikken"
              className="absolute left-0 right-0 top-[calc(100%+0.4rem)] z-30 overflow-hidden rounded-2xl border border-stone-200 bg-white py-1 shadow-lift dark:border-stone-700 dark:bg-stone-900"
            >
              {suggestions.map((suggestion, index) => (
                <li
                  key={suggestion.id}
                  id={`quick-add-option-${suggestion.id}`}
                  role="option"
                  aria-selected={activeIndex === index}
                  className={`flex min-h-12 cursor-pointer items-center justify-between gap-3 px-3.5 text-left text-sm ${
                    activeIndex === index
                      ? 'bg-brand-50 text-brand-900 dark:bg-brand-950/60 dark:text-brand-100'
                      : 'text-stone-800 dark:text-stone-100'
                  }`}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => void submitName(suggestion.displayName)}
                >
                  <span className="truncate font-medium">{suggestion.displayName}</span>
                  <span className="shrink-0 text-xs text-stone-500 dark:text-stone-400">
                    {suggestion.useCount === 0
                      ? 'Nylig'
                      : suggestion.useCount === 1
                        ? '1 gang'
                        : `${suggestion.useCount} ganger`}
                  </span>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
        <button type="submit" className="btn btn-primary h-12 px-4" disabled={!name.trim() || busy}>
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
          className="inline-flex min-h-11 items-center gap-1 rounded-lg px-1.5 text-xs font-medium text-stone-500 transition-colors hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100"
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
        {name.trim() ? (
          <span className="text-xs text-stone-500 dark:text-stone-400">Enter for å legge til</span>
        ) : null}
      </div>

      {detailsOpen ? (
        <div
          id="quick-add-details"
          className="mt-2 grid gap-2 border-t border-stone-200/80 pt-3 dark:border-stone-800 sm:grid-cols-[10rem_1fr]"
        >
          <div>
            <label className="label mb-1 block text-xs" htmlFor="quick-add-quantity">
              Mengde
            </label>
            <input
              id="quick-add-quantity"
              className="field h-11 text-sm"
              placeholder="f.eks. 2 stk"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              maxLength={80}
              autoComplete="off"
            />
          </div>
          <div>
            <label className="label mb-1 block text-xs" htmlFor="quick-add-note">
              Notat
            </label>
            <input
              id="quick-add-note"
              className="field h-11 text-sm"
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
