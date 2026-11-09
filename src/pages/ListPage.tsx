import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { syncEngine } from '../data/engine';
import {
  addItem,
  clearCheckedItems,
  deleteItem,
  restoreItem,
  restoreItems,
  toggleItem,
} from '../data/actions';
import { formatRelativeTime, pluralize } from '../lib/format';
import { toErrorMessage } from '../lib/errors';
import type { Item } from '../lib/types';
import { useListData } from '../hooks/useListData';
import { useMyProfile } from '../hooks/useMyProfile';
import { useNow } from '../hooks/useNow';
import { usePresence } from '../hooks/usePresence';
import { useSyncStore } from '../lib/sync-store';
import { useAuth } from '../providers/AuthProvider';
import { useSyncReady } from '../providers/SyncProvider';
import { useToast } from '../providers/ToastProvider';
import { AppShell } from '../components/AppShell';
import { AvatarStack } from '../components/Avatar';
import { EmptyState } from '../components/EmptyState';
import { ItemRow } from '../components/ItemRow';
import { ListSettingsDialog } from '../components/ListSettingsDialog';
import { ListSkeleton } from '../components/ListSkeleton';
import { QuickAdd } from '../components/QuickAdd';
import { Suggestions } from '../components/Suggestions';

function ListNotFound() {
  return (
    <AppShell>
      <EmptyState
        title="Fant ikke listen"
        description="Listen finnes ikke, er slettet, eller du er ikke medlem lenger."
      >
        <Link to="/" className="btn btn-primary">
          Til listene
        </Link>
      </EmptyState>
    </AppShell>
  );
}

export function ListPage() {
  const { listId } = useParams<{ listId: string }>();
  const { user } = useAuth();
  const profile = useMyProfile();
  const ready = useSyncReady();
  const initialPullDone = useSyncStore((state) => state.initialPullDone);
  const data = useListData(listId);
  const presence = usePresence(
    data?.list ? listId : undefined,
    user?.id,
    profile?.displayName ?? 'Gjest',
  );
  const now = useNow(30_000);
  const { showToast } = useToast();
  const [settingsOpen, setSettingsOpen] = useState(false);

  useEffect(() => {
    if (ready && listId) void syncEngine.pullNow();
  }, [listId, ready]);

  if (!user) return null;

  if (!ready || data === undefined || (!data.list && !initialPullDone)) {
    return (
      <AppShell>
        <ListSkeleton />
      </AppShell>
    );
  }

  if (!data.list || data.list.deletedAt) {
    return <ListNotFound />;
  }

  const list = data.list;
  const unchecked = data.items.filter((item) => !item.isChecked);
  const checked = data.items
    .filter((item) => item.isChecked)
    .sort((a, b) => (b.checkedAt ?? b.updatedAt).localeCompare(a.checkedAt ?? a.updatedAt));
  const total = data.items.length;
  const updatedBy = list.updatedBy
    ? data.profiles.find((entry) => entry.id === list.updatedBy)?.displayName
    : null;
  const activePeople = presence;

  const handleToggle = async (item: Item) => {
    try {
      await toggleItem(item.id, user.id);
      // La fokus følge varen når den flyttes mellom «Å kjøpe» og «Kjøpt».
      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          document
            .querySelector<HTMLElement>(`[data-item-toggle-id="${item.id}"]`)
            ?.focus({ preventScroll: true });
        });
      });
    } catch (error) {
      showToast({ message: toErrorMessage(error) });
    }
  };

  const handleDelete = async (item: Item) => {
    try {
      const removed = await deleteItem(item.id, user.id);
      if (!removed) return;
      showToast({
        message: `«${removed.displayName}» er slettet.`,
        actionLabel: 'Angre',
        onAction: async () => {
          try {
            await restoreItem(removed, user.id);
          } catch (error) {
            showToast({ message: toErrorMessage(error) });
          }
        },
        durationMs: 5000,
      });
    } catch (error) {
      showToast({ message: toErrorMessage(error) });
    }
  };

  const handleClearChecked = async () => {
    try {
      const removed = await clearCheckedItems(list.id, user.id);
      if (removed.length === 0) return;
      showToast({
        message: `${removed.length} ${pluralize(removed.length, 'vare', 'varer')} fjernet fra listen.`,
        actionLabel: 'Angre',
        onAction: async () => {
          try {
            await restoreItems(removed, user.id);
          } catch (error) {
            showToast({ message: toErrorMessage(error) });
          }
        },
        durationMs: 5000,
      });
    } catch (error) {
      showToast({ message: toErrorMessage(error) });
    }
  };

  const handlePick = async (displayName: string) => {
    try {
      await addItem({ userId: user.id, listId: list.id, name: displayName });
    } catch (error) {
      showToast({ message: toErrorMessage(error) });
    }
  };

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-2xl">
        <div className="flex items-center justify-between gap-3">
          <Link
            to="/"
            className="inline-flex min-h-11 items-center gap-1.5 rounded-lg px-1 text-sm font-medium text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100"
          >
            <svg
              viewBox="0 0 24 24"
              className="h-4 w-4"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M15 6l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            Alle lister
          </Link>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="btn btn-secondary px-3"
              onClick={() => setSettingsOpen(true)}
            >
              <svg
                viewBox="0 0 24 24"
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.9"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="3.2" />
                <path
                  d="M12 3.5v2.2M12 18.3v2.2M20.5 12h-2.2M5.7 12H3.5M18 6l-1.6 1.6M7.6 16.4 6 18M18 18l-1.6-1.6M7.6 7.6 6 6"
                  strokeLinecap="round"
                />
              </svg>
              Del
            </button>
            <button
              type="button"
              className="icon-button"
              aria-label="Listemeny og innstillinger"
              onClick={() => setSettingsOpen(true)}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor" aria-hidden="true">
                <circle cx="5" cy="12" r="1.6" />
                <circle cx="12" cy="12" r="1.6" />
                <circle cx="19" cy="12" r="1.6" />
              </svg>
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h1 className="break-words font-display text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-50 sm:text-4xl">
              {list.name}
            </h1>
            <p className="mt-1.5 text-sm text-stone-500 dark:text-stone-400">
              Sist oppdatert {updatedBy ? `av ${updatedBy} ` : ''}
              {formatRelativeTime(list.updatedAt, now)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 pt-1">
            <AvatarStack people={activePeople} />
            {activePeople.length > 1 ? (
              <span className="hidden text-xs text-stone-500 dark:text-stone-400 sm:block">
                {activePeople.length} aktive
              </span>
            ) : null}
          </div>
        </div>

        {list.archivedAt ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
            <span>Denne listen er arkivert.</span>
            <button
              type="button"
              className="btn btn-secondary min-h-11 px-2.5 text-xs"
              onClick={() => setSettingsOpen(true)}
            >
              Gjenopprett
            </button>
          </div>
        ) : null}

        <div className="mt-5">
          <QuickAdd listId={list.id} userId={user.id} catalog={data.catalog} />
        </div>

        <Suggestions catalog={data.catalog} onPick={(name) => void handlePick(name)} />

        {total > 0 ? (
          <div className="mt-6">
            <div className="flex items-center justify-between text-xs font-medium text-stone-500 dark:text-stone-400">
              <span>
                {checked.length} av {total} kjøpt
              </span>
              <span>
                {unchecked.length === 0
                  ? 'Alt er kjøpt'
                  : `${unchecked.length} ${pluralize(unchecked.length, 'vare', 'varer')} igjen`}
              </span>
            </div>
            <div
              className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone-200/90 dark:bg-stone-800"
              aria-hidden="true"
            >
              <div
                className="h-full rounded-full bg-brand-500 transition-[width] duration-300 dark:bg-brand-400"
                style={{ width: `${Math.round((checked.length / total) * 100)}%` }}
              />
            </div>
          </div>
        ) : null}

        {total === 0 ? (
          <div className="mt-6">
            <EmptyState
              title="Legg til din første vare"
              description="Skriv i feltet over. Varer du huker av havner i historikken og blir ett-trykksforslag neste gang."
            />
          </div>
        ) : (
          <div className="mt-7 space-y-7">
            <section aria-labelledby="unchecked-heading">
              <h2
                id="unchecked-heading"
                className="mb-2 flex items-baseline gap-2 px-1 text-xs font-semibold uppercase tracking-[0.14em] text-stone-500 dark:text-stone-400"
              >
                Å kjøpe
                <span className="rounded-full bg-stone-200/80 px-2 py-0.5 text-[11px] font-medium tracking-normal text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                  {unchecked.length}
                </span>
              </h2>
              {unchecked.length === 0 ? (
                <div className="rounded-2xl border border-brand-200 bg-brand-50/70 px-4 py-4 text-sm text-brand-900 dark:border-brand-900/70 dark:bg-brand-950/40 dark:text-brand-100">
                  Alt er kjøpt. Godt jobbet!
                </div>
              ) : (
                <ul className="space-y-2">
                  {unchecked.map((item) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      onToggle={() => void handleToggle(item)}
                      onDelete={() => void handleDelete(item)}
                    />
                  ))}
                </ul>
              )}
            </section>

            {checked.length > 0 ? (
              <section aria-labelledby="checked-heading">
                <div className="mb-2 flex min-h-11 items-center justify-between gap-3 px-1">
                  <h2
                    id="checked-heading"
                    className="flex items-baseline gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-stone-500 dark:text-stone-400"
                  >
                    Kjøpt
                    <span className="rounded-full bg-stone-200/80 px-2 py-0.5 text-[11px] font-medium tracking-normal text-stone-600 dark:bg-stone-800 dark:text-stone-300">
                      {checked.length}
                    </span>
                  </h2>
                  <button
                    type="button"
                    className="btn btn-ghost px-2.5 text-xs"
                    onClick={() => void handleClearChecked()}
                  >
                    Rydd kjøpte varer
                  </button>
                </div>
                <ul className="space-y-2">
                  {checked.map((item) => (
                    <ItemRow
                      key={item.id}
                      item={item}
                      onToggle={() => void handleToggle(item)}
                      onDelete={() => void handleDelete(item)}
                    />
                  ))}
                </ul>
              </section>
            ) : null}
          </div>
        )}
      </div>

      <ListSettingsDialog
        key={list.id}
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        list={list}
        members={data.members}
        profiles={data.profiles}
        currentUserId={user.id}
      />
    </AppShell>
  );
}
