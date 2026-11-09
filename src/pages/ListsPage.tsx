import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createList, setListArchived } from '../data/actions';
import { formatRelativeTime, pluralize } from '../lib/format';
import { toErrorMessage } from '../lib/errors';
import { useMyProfile } from '../hooks/useMyProfile';
import { useListsOverview, type ListOverviewItem } from '../hooks/useListsOverview';
import { useNow } from '../hooks/useNow';
import { useAuth } from '../providers/AuthProvider';
import { useSyncReady } from '../providers/SyncProvider';
import { useSyncStore } from '../lib/sync-store';
import { useToast } from '../providers/ToastProvider';
import { AppShell } from '../components/AppShell';
import { Dialog } from '../components/Dialog';
import { EmptyState } from '../components/EmptyState';
import { ListSkeleton } from '../components/ListSkeleton';

function ProgressBar({ checked, total }: { checked: number; total: number }) {
  const percent = total === 0 ? 0 : Math.round((checked / total) * 100);
  return (
    <div
      className="mt-3 h-1.5 overflow-hidden rounded-full bg-stone-200/90 dark:bg-stone-800"
      aria-hidden="true"
    >
      <div
        className="h-full rounded-full bg-brand-500 transition-[width] duration-300 dark:bg-brand-400"
        style={{ width: `${percent}%` }}
      />
    </div>
  );
}

function ListCard({ entry, now }: { entry: ListOverviewItem; now: number }) {
  const { list, total, checked, unchecked, updatedByProfile } = entry;
  const updatedBy = updatedByProfile ? `av ${updatedByProfile.displayName} ` : '';

  return (
    <Link
      to={`/lister/${list.id}`}
      className="card group flex flex-col p-4 transition hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lift focus-visible:-translate-y-0.5 dark:hover:border-brand-800"
    >
      <div className="flex items-start justify-between gap-3">
        <h2 className="min-w-0 break-words font-display text-lg font-semibold leading-snug text-stone-900 dark:text-stone-50">
          {list.name}
        </h2>
        <span
          className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-stone-100 text-stone-500 transition-colors group-hover:bg-brand-100 group-hover:text-brand-700 dark:bg-stone-800 dark:text-stone-400 dark:group-hover:bg-brand-950 dark:group-hover:text-brand-300"
          aria-hidden="true"
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
      <p className="mt-1.5 text-sm text-stone-600 dark:text-stone-300">
        {total === 0
          ? 'Ingen varer ennå'
          : unchecked === 0
            ? `Alt er kjøpt · ${checked} ${pluralize(checked, 'vare', 'varer')}`
            : `${unchecked} ${pluralize(unchecked, 'vare', 'varer')} igjen · ${checked} av ${total} kjøpt`}
      </p>
      <ProgressBar checked={checked} total={total} />
      <p className="mt-2.5 text-xs text-stone-500 dark:text-stone-400">
        Sist oppdatert {updatedBy}
        {formatRelativeTime(list.updatedAt, now)}
      </p>
    </Link>
  );
}

export function ListsPage() {
  const { user } = useAuth();
  const profile = useMyProfile();
  const overview = useListsOverview();
  const ready = useSyncReady();
  const initialPullDone = useSyncStore((state) => state.initialPullDone);
  const { showToast } = useToast();
  const navigate = useNavigate();
  const now = useNow(30_000);

  const [newListOpen, setNewListOpen] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [restoringId, setRestoringId] = useState<string | null>(null);

  if (!user) return null;

  const loading =
    !ready ||
    overview === undefined ||
    (!initialPullDone && overview.active.length === 0 && overview.archived.length === 0);

  const firstName = profile?.displayName?.trim().split(/\s+/u)[0] ?? '';

  const handleCreate = async (event: FormEvent) => {
    event.preventDefault();
    if (!newListName.trim()) return;
    setCreating(true);
    setCreateError(null);
    try {
      const id = await createList(user.id, newListName);
      setNewListOpen(false);
      setNewListName('');
      navigate(`/lister/${id}`);
    } catch (error) {
      setCreateError(toErrorMessage(error));
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async (entry: ListOverviewItem) => {
    setRestoringId(entry.list.id);
    try {
      await setListArchived(entry.list.id, false, user.id);
      showToast({ message: `«${entry.list.name}» er gjenopprettet.` });
    } catch (error) {
      showToast({ message: toErrorMessage(error) });
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <AppShell>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-50 sm:text-4xl">
            {firstName ? `Hei, ${firstName}!` : 'Hei!'}
          </h1>
          <p className="mt-1.5 text-stone-600 dark:text-stone-300">Hva skal handles i dag?</p>
        </div>
        <button
          type="button"
          className="btn btn-primary self-start sm:self-auto"
          onClick={() => setNewListOpen(true)}
          disabled={!ready}
        >
          <svg
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            aria-hidden="true"
          >
            <path d="M12 5v14M5 12h14" strokeLinecap="round" />
          </svg>
          Ny liste
        </button>
      </div>

      <div className="mt-7">
        {loading ? (
          <ListSkeleton />
        ) : overview.active.length === 0 && overview.archived.length === 0 ? (
          <EmptyState
            title="Ingen lister ennå"
            description="Lag en liste for ukens handling. Du kan dele den med flere og bruke den om igjen."
          >
            <button type="button" className="btn btn-primary" onClick={() => setNewListOpen(true)}>
              Lag din første liste
            </button>
          </EmptyState>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              {overview.active.map((entry) => (
                <ListCard key={entry.list.id} entry={entry} now={now} />
              ))}
            </div>

            {overview.active.length === 0 ? (
              <EmptyState
                title="Alle lister er arkivert"
                description="Gjenopprett en liste under, eller lag en ny."
              >
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setNewListOpen(true)}
                >
                  Ny liste
                </button>
              </EmptyState>
            ) : null}

            {overview.archived.length > 0 ? (
              <details className="group mt-8 rounded-2xl border border-stone-200/80 bg-white/50 px-4 py-1 dark:border-stone-800 dark:bg-stone-900/40">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium text-stone-700 [&::-webkit-details-marker]:hidden dark:text-stone-200">
                  <span>
                    Arkiverte lister
                    <span className="ml-2 rounded-full bg-stone-200/80 px-2 py-0.5 text-xs text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                      {overview.archived.length}
                    </span>
                  </span>
                  <svg
                    viewBox="0 0 24 24"
                    className="h-4 w-4 transition-transform group-open:rotate-180"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    aria-hidden="true"
                  >
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </summary>
                <ul className="mb-3 space-y-2">
                  {overview.archived.map((entry) => (
                    <li
                      key={entry.list.id}
                      className="flex items-center gap-2 rounded-xl border border-stone-200/70 bg-white px-3 py-2 dark:border-stone-800 dark:bg-stone-900"
                    >
                      <Link
                        to={`/lister/${entry.list.id}`}
                        className="min-w-0 flex-1 rounded-lg py-1.5 text-sm font-medium text-stone-800 hover:text-brand-700 dark:text-stone-100 dark:hover:text-brand-300"
                      >
                        <span className="block truncate">{entry.list.name}</span>
                        <span className="block text-xs font-normal text-stone-500 dark:text-stone-400">
                          {entry.total} {pluralize(entry.total, 'vare', 'varer')} ·{' '}
                          {formatRelativeTime(entry.list.updatedAt, now)}
                        </span>
                      </Link>
                      <button
                        type="button"
                        className="btn btn-secondary min-h-11 px-2.5 text-xs"
                        onClick={() => void handleRestore(entry)}
                        disabled={restoringId === entry.list.id}
                      >
                        {restoringId === entry.list.id ? 'Gjenoppretter …' : 'Gjenopprett'}
                      </button>
                    </li>
                  ))}
                </ul>
              </details>
            ) : null}
          </>
        )}
      </div>

      <Dialog
        open={newListOpen}
        onClose={() => {
          if (creating) return;
          setNewListOpen(false);
          setCreateError(null);
        }}
        title="Ny liste"
        description="Du kan gi den nytt navn og dele den senere."
      >
        <form onSubmit={(event) => void handleCreate(event)} className="space-y-4">
          <div>
            <label className="label" htmlFor="new-list-name">
              Navn på listen
            </label>
            <input
              id="new-list-name"
              className="field mt-1.5"
              value={newListName}
              onChange={(event) => setNewListName(event.target.value)}
              placeholder="f.eks. Ukens handling"
              maxLength={120}
              required
            />
          </div>
          {createError ? (
            <p
              role="alert"
              className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200"
            >
              {createError}
            </p>
          ) : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => setNewListOpen(false)}
              disabled={creating}
            >
              Avbryt
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={creating || !newListName.trim()}
            >
              {creating ? 'Oppretter …' : 'Opprett liste'}
            </button>
          </div>
        </form>
      </Dialog>
    </AppShell>
  );
}
