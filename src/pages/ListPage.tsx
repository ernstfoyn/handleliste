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
import { CATEGORY_META, groupByCategory } from '../lib/categories';
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
  const uncheckedGroups = groupByCategory(unchecked);
  const checkedGroups = groupByCategory(checked);
  const updatedBy = list.updatedBy
    ? data.profiles.find((entry) => entry.id === list.updatedBy)?.displayName
    : null;
  const activePeople = presence;
  const percent = total === 0 ? 0 : Math.round((checked.length / total) * 100);

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
            className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-1 text-sm font-medium text-ink/55 hover:text-ink dark:text-paper/55 dark:hover:text-paper"
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
              className="btn btn-primary min-h-11 px-4"
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
                <circle cx="18" cy="5" r="2.6" />
                <circle cx="6" cy="12" r="2.6" />
                <circle cx="18" cy="19" r="2.6" />
                <path d="M8.4 13.3l7.2 4.2M15.6 6.5 8.4 10.7" strokeLinecap="round" />
              </svg>
              Del
            </button>
            <button
              type="button"
              className="icon-button border border-ink/10 bg-white/60 dark:border-white/10 dark:bg-white/[0.06]"
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

        <section className="relative mt-3 overflow-hidden rounded-[34px] bg-mint-100 p-5 text-ink dark:bg-mint-950 dark:text-paper sm:p-6">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full bg-white/35 blur-2xl dark:bg-white/5"
          />
          <div className="relative">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="eyebrow !text-ink/45 dark:!text-paper/45">Handleliste</p>
                <h1 className="mt-2 break-words font-display text-[2.4rem] font-light leading-[0.94] tracking-tight text-ink dark:text-paper sm:text-5xl">
                  {list.name}
                </h1>
                <p className="mt-2 text-sm text-ink/55 dark:text-paper/55">
                  Sist oppdatert {updatedBy ? `av ${updatedBy} ` : ''}
                  {formatRelativeTime(list.updatedAt, now)}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <AvatarStack people={activePeople} />
                {activePeople.length > 1 ? (
                  <span className="text-[10px] uppercase tracking-[0.12em] text-ink/40 dark:text-paper/40">
                    {activePeople.length} aktive
                  </span>
                ) : null}
              </div>
            </div>

            <div className="mt-6 flex items-end justify-between gap-3 text-[11px] font-medium uppercase tracking-[0.14em] text-ink/45 dark:text-paper/45">
              <span>
                {total === 0 ? 'Ingen varer ennå' : `${checked.length} av ${total} kjøpt`}
              </span>
              <span>
                {total > 0 && unchecked.length === 0
                  ? 'Alt er kjøpt'
                  : `${unchecked.length} ${pluralize(unchecked.length, 'vare', 'varer')} igjen`}
              </span>
            </div>
            {total > 0 ? (
              <div
                className="mt-2 h-1.5 overflow-hidden rounded-full bg-ink/10 dark:bg-paper/15"
                aria-hidden="true"
              >
                <div
                  className="h-full rounded-full bg-ink transition-[width] duration-300 dark:bg-paper"
                  style={{ width: `${percent}%` }}
                />
              </div>
            ) : null}
          </div>
        </section>

        {list.archivedAt ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-[22px] bg-butter-100 px-4 py-3 text-sm text-ink dark:bg-butter-950 dark:text-butter-100">
            <span>Denne listen er arkivert.</span>
            <button
              type="button"
              className="btn btn-secondary min-h-11 px-3 text-xs"
              onClick={() => setSettingsOpen(true)}
            >
              Gjenopprett
            </button>
          </div>
        ) : null}

        <div className="mt-4">
          <QuickAdd listId={list.id} userId={user.id} catalog={data.catalog} />
        </div>

        <Suggestions catalog={data.catalog} onPick={(name) => void handlePick(name)} />

        {total === 0 ? (
          <div className="mt-6">
            <EmptyState
              title="Legg til din første vare"
              description="Skriv i feltet over. Varer du huker av havner i historikken og blir ett-trykksforslag neste gang."
            />
          </div>
        ) : (
          <div className="mt-8 space-y-8">
            <section aria-labelledby="unchecked-heading">
              <div className="mb-2 flex items-center justify-between gap-3 px-1">
                <h2 id="unchecked-heading" className="eyebrow">
                  Å kjøpe
                  <span className="ml-2 rounded-full bg-ink/5 px-2 py-0.5 text-[11px] font-medium tracking-normal text-ink/55 dark:bg-paper/10 dark:text-paper/55">
                    {unchecked.length}
                  </span>
                </h2>
                <span className="text-[11px] text-ink/30 dark:text-paper/30">
                  Ett trykk huker av
                </span>
              </div>
              {unchecked.length === 0 ? (
                <div className="rounded-[24px] bg-mint-100 px-4 py-5 text-sm text-ink dark:bg-mint-950 dark:text-mint-100">
                  Alt er kjøpt. Godt jobbet!
                </div>
              ) : (
                <div className="space-y-5">
                  {uncheckedGroups.map((group) => (
                    <div key={group.category}>
                      <h3 className="mb-2 flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/45 dark:text-paper/45">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${CATEGORY_META[group.category].dotClass}`}
                          aria-hidden="true"
                        />
                        {CATEGORY_META[group.category].label}
                        <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[10px] font-medium tracking-normal text-ink/55 dark:bg-paper/10 dark:text-paper/55">
                          {group.items.length}
                        </span>
                      </h3>
                      <ul className="space-y-2">
                        {group.items.map((item) => (
                          <ItemRow
                            key={item.id}
                            item={item}
                            onToggle={() => void handleToggle(item)}
                            onDelete={() => void handleDelete(item)}
                          />
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {checked.length > 0 ? (
              <section aria-labelledby="checked-heading">
                <div className="mb-2 flex min-h-11 items-center justify-between gap-3 px-1">
                  <h2 id="checked-heading" className="eyebrow">
                    Kjøpt
                    <span className="ml-2 rounded-full bg-ink/5 px-2 py-0.5 text-[11px] font-medium tracking-normal text-ink/55 dark:bg-paper/10 dark:text-paper/55">
                      {checked.length}
                    </span>
                  </h2>
                  <button
                    type="button"
                    className="btn btn-ghost min-h-11 px-3 text-xs"
                    onClick={() => void handleClearChecked()}
                  >
                    Rydd kjøpte varer
                  </button>
                </div>
                <div className="space-y-5">
                  {checkedGroups.map((group) => (
                    <div key={group.category}>
                      <h3 className="mb-2 flex items-center gap-2 px-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/45 dark:text-paper/45">
                        <span
                          className={`h-1.5 w-1.5 rounded-full ${CATEGORY_META[group.category].dotClass}`}
                          aria-hidden="true"
                        />
                        {CATEGORY_META[group.category].label}
                        <span className="rounded-full bg-ink/5 px-2 py-0.5 text-[10px] font-medium tracking-normal text-ink/55 dark:bg-paper/10 dark:text-paper/55">
                          {group.items.length}
                        </span>
                      </h3>
                      <ul className="space-y-2">
                        {group.items.map((item) => (
                          <ItemRow
                            key={item.id}
                            item={item}
                            onToggle={() => void handleToggle(item)}
                            onDelete={() => void handleDelete(item)}
                          />
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
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
