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

const CARD_SURFACES = [
  'bg-mint-100 dark:bg-mint-950',
  'bg-blush-100 dark:bg-blush-950',
  'bg-lilac-100 dark:bg-lilac-950',
  'bg-butter-100 dark:bg-butter-950',
  'bg-sky-100 dark:bg-sky-950',
] as const;

function surfaceFor(id: string): string {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }
  return CARD_SURFACES[hash % CARD_SURFACES.length] ?? CARD_SURFACES[0];
}

function ListCard({ entry, now }: { entry: ListOverviewItem; now: number }) {
  const { list, total, checked, unchecked, updatedByProfile } = entry;
  const updatedBy = updatedByProfile ? `av ${updatedByProfile.displayName} ` : '';
  const percent = total === 0 ? 0 : Math.round((checked / total) * 100);

  return (
    <Link
      to={`/lister/${list.id}`}
      className={`group flex min-h-[200px] flex-col justify-between overflow-hidden rounded-[28px] p-5 text-ink shadow-card transition-transform hover:-translate-y-1 focus-visible:-translate-y-1 dark:text-paper ${surfaceFor(list.id)}`}
    >
      <div className="flex items-start justify-between gap-3">
        <span className="eyebrow !text-ink/40 dark:!text-paper/40">Handleliste</span>
        <span
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-ink text-paper transition-transform group-hover:-rotate-6 dark:bg-paper dark:text-ink"
          aria-hidden="true"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </div>

      <div className="mt-7">
        <h2 className="break-words font-display text-[1.7rem] font-semibold leading-[1.05] tracking-tight">
          {list.name}
        </h2>
        <p className="mt-2 text-sm text-ink/55 dark:text-paper/55">
          {total === 0
            ? 'Ingen varer ennå'
            : unchecked === 0
              ? `Alt er kjøpt · ${checked} ${pluralize(checked, 'vare', 'varer')}`
              : `${unchecked} ${pluralize(unchecked, 'vare', 'varer')} igjen · ${checked} av ${total} kjøpt`}
        </p>
      </div>

      <div className="mt-4">
        <div className="h-1 overflow-hidden rounded-full bg-ink/10 dark:bg-paper/15">
          <div
            className="h-full rounded-full bg-ink transition-[width] duration-300 dark:bg-paper"
            style={{ width: `${percent}%` }}
          />
        </div>
        <p className="mt-2 text-[11px] text-ink/40 dark:text-paper/40">
          Sist oppdatert {updatedBy}
          {formatRelativeTime(list.updatedAt, now)}
        </p>
      </div>
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
  const activeCount = overview?.active.length ?? 0;

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
      <section className="relative overflow-hidden rounded-[34px] bg-mint-100 p-5 text-ink dark:bg-mint-950 dark:text-paper sm:p-8">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-14 -top-16 h-56 w-56 rounded-full bg-white/40 blur-2xl dark:bg-white/5"
        />
        <div className="relative">
          <p className="eyebrow !text-ink/45 dark:!text-paper/45">Felles handleliste</p>
          <h1 className="mt-3 font-display text-[2.7rem] font-semibold leading-[0.92] tracking-tight sm:text-6xl">
            {firstName ? `Hei, ${firstName}.` : 'Hei.'}
            <br />
            <em className="font-normal italic text-ink/55 dark:text-paper/55">
              Hva skal vi handle?
            </em>
          </h1>
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="max-w-[16rem] text-sm leading-relaxed text-ink/55 dark:text-paper/55">
              {activeCount === 0
                ? 'Lag din første liste og få med hele familien.'
                : `${activeCount} ${pluralize(activeCount, 'aktiv liste', 'aktive lister')} · alle endringer synkes i sanntid.`}
            </p>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => setNewListOpen(true)}
              disabled={!ready}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
                <path d="M12 5v14M5 12h14" strokeLinecap="round" />
              </svg>
              Ny liste
            </button>
          </div>
        </div>
      </section>

      <div className="mt-8">
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
            <div className="mb-3 flex items-baseline justify-between">
              <h2 className="eyebrow">Dine lister</h2>
              <span className="text-[11px] text-ink/35 dark:text-paper/35">{activeCount} aktive</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              {overview.active.map((entry) => (
                <ListCard key={entry.list.id} entry={entry} now={now} />
              ))}
            </div>

            {overview.active.length === 0 ? (
              <div className="mt-4">
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
              </div>
            ) : null}

            {overview.archived.length > 0 ? (
              <details className="group mt-8 rounded-[28px] border border-ink/[0.06] bg-white/55 px-4 py-1 dark:border-white/10 dark:bg-white/[0.04]">
                <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 text-sm font-medium text-ink/70 [&::-webkit-details-marker]:hidden dark:text-paper/70">
                  <span>
                    Arkiverte lister
                    <span className="ml-2 rounded-full bg-ink/10 px-2 py-0.5 text-xs text-ink/60 dark:bg-paper/10 dark:text-paper/60">
                      {overview.archived.length}
                    </span>
                  </span>
                  <svg viewBox="0 0 24 24" className="h-4 w-4 transition-transform group-open:rotate-180" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                    <path d="M6 9l6 6 6-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </summary>
                <ul className="mb-3 space-y-2">
                  {overview.archived.map((entry) => (
                    <li
                      key={entry.list.id}
                      className="flex items-center gap-2 rounded-2xl border border-ink/[0.06] bg-white/70 px-3 py-2 dark:border-white/10 dark:bg-white/[0.05]"
                    >
                      <Link
                        to={`/lister/${entry.list.id}`}
                        className="min-w-0 flex-1 rounded-xl py-1.5 text-sm font-medium text-ink/80 hover:text-ink dark:text-paper/80 dark:hover:text-paper"
                      >
                        <span className="block truncate">{entry.list.name}</span>
                        <span className="block text-xs font-normal text-ink/40 dark:text-paper/40">
                          {entry.total} {pluralize(entry.total, 'vare', 'varer')} ·{' '}
                          {formatRelativeTime(entry.list.updatedAt, now)}
                        </span>
                      </Link>
                      <button
                        type="button"
                        className="btn btn-secondary min-h-11 px-3 text-xs"
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
              className="field mt-2"
              value={newListName}
              onChange={(event) => setNewListName(event.target.value)}
              placeholder="f.eks. Ukens handling"
              maxLength={120}
              required
            />
          </div>
          {createError ? (
            <p role="alert" className="rounded-2xl bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200">
              {createError}
            </p>
          ) : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" className="btn btn-secondary" onClick={() => setNewListOpen(false)} disabled={creating}>
              Avbryt
            </button>
            <button type="submit" className="btn btn-primary" disabled={creating || !newListName.trim()}>
              {creating ? 'Oppretter …' : 'Opprett liste'}
            </button>
          </div>
        </form>
      </Dialog>
    </AppShell>
  );
}
