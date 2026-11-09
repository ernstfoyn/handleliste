import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  createInvite,
  deleteList,
  removeMember,
  renameList,
  setListArchived,
} from '../data/actions';
import { toErrorMessage } from '../lib/errors';
import { formatRelativeTime } from '../lib/format';
import type { ListMember, ListRecord, Profile } from '../lib/types';
import { useNow } from '../hooks/useNow';
import { useToast } from '../providers/ToastProvider';
import { Avatar } from './Avatar';
import { Dialog } from './Dialog';

function memberLabel(member: ListMember, profiles: readonly Profile[]): string {
  return profiles.find((profile) => profile.id === member.userId)?.displayName ?? 'Ukjent';
}

export function ListSettingsDialog({
  open,
  onClose,
  list,
  members,
  profiles,
  currentUserId,
}: {
  open: boolean;
  onClose: () => void;
  list: ListRecord;
  members: readonly ListMember[];
  profiles: readonly Profile[];
  currentUserId: string;
}) {
  const navigate = useNavigate();
  const { showToast } = useToast();
  const now = useNow(30_000);

  const [name, setName] = useState(list.name);
  const [inviteLink, setInviteLink] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const wasOpen = useRef(false);

  const myMembership = members.find((member) => member.userId === currentUserId);
  const isOwner = myMembership?.role === 'owner';
  const sortedMembers = [...members].sort((a, b) => {
    if (a.role !== b.role) return a.role === 'owner' ? -1 : 1;
    return a.joinedAt.localeCompare(b.joinedAt);
  });

  useEffect(() => {
    if (open && !wasOpen.current) {
      setName(list.name);
      setInviteLink('');
      setError(null);
      setMessage(null);
      setBusy(null);
      setConfirmDelete(false);
    }
    wasOpen.current = open;
  }, [list.name, open]);

  const handleRename = async (event: FormEvent) => {
    event.preventDefault();
    setBusy('rename');
    setError(null);
    setMessage(null);
    try {
      await renameList(list.id, name, currentUserId);
      setMessage('Navnet er oppdatert.');
      showToast({ message: 'Listen har fått nytt navn.' });
    } catch (renameError) {
      setError(toErrorMessage(renameError));
    } finally {
      setBusy(null);
    }
  };

  const handleInvite = async () => {
    setBusy('invite');
    setError(null);
    setMessage(null);
    try {
      const token = await createInvite(list.id, currentUserId);
      setInviteLink(`${window.location.origin}/join/${token}`);
    } catch (inviteError) {
      setError(toErrorMessage(inviteError));
    } finally {
      setBusy(null);
    }
  };

  const handleCopy = async () => {
    if (!inviteLink) return;
    try {
      await navigator.clipboard.writeText(inviteLink);
      setMessage('Lenken er kopiert.');
    } catch {
      setError('Kunne ikke kopiere automatisk. Merk teksten og kopier manuelt.');
    }
  };

  const handleNativeShare = async () => {
    if (!inviteLink) return;
    if (!navigator.share) {
      await handleCopy();
      return;
    }
    try {
      await navigator.share({
        title: `Bli med i ${list.name}`,
        text: 'Bli med på handlelisten vår.',
        url: inviteLink,
      });
    } catch {
      // Brukeren avbrøt delingen.
    }
  };

  const handleArchive = async () => {
    setBusy('archive');
    setError(null);
    try {
      await setListArchived(list.id, !list.archivedAt, currentUserId);
      showToast({ message: list.archivedAt ? 'Listen er gjenopprettet.' : 'Listen er arkivert.' });
      onClose();
      navigate('/');
    } catch (archiveError) {
      setError(toErrorMessage(archiveError));
      setBusy(null);
    }
  };

  const handleDelete = async () => {
    setBusy('delete');
    setError(null);
    try {
      await deleteList(list.id, currentUserId);
      showToast({ message: 'Listen er slettet.' });
      onClose();
      navigate('/', { replace: true });
    } catch (deleteError) {
      setError(toErrorMessage(deleteError));
      setBusy(null);
    }
  };

  const handleRemoveMember = async (member: ListMember) => {
    setBusy(`remove:${member.userId}`);
    setError(null);
    try {
      await removeMember(list.id, member.userId);
      showToast({ message: `${memberLabel(member, profiles)} er fjernet fra listen.` });
    } catch (removeError) {
      setError(toErrorMessage(removeError));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Listeinnstillinger"
      description={`«${list.name}» · sist oppdatert ${formatRelativeTime(list.updatedAt, now)}`}
      size="lg"
    >
      {!isOwner ? (
        <p className="rounded-2xl bg-ink/5 px-3 py-2 text-sm text-ink/55 dark:bg-white/5 dark:text-paper/55">
          Du er medlem. Eier kan invitere, fjerne medlemmer og slette listen.
        </p>
      ) : null}

      <form onSubmit={(event) => void handleRename(event)} className="mt-4">
        <label className="label" htmlFor="list-name">
          Navn på listen
        </label>
        <div className="mt-1.5 flex gap-2">
          <input
            id="list-name"
            className="field min-w-0"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={120}
          />
          <button type="submit" className="btn btn-secondary shrink-0" disabled={busy !== null}>
            {busy === 'rename' ? 'Lagrer …' : 'Lagre'}
          </button>
        </div>
      </form>

      <section
        className="mt-6 border-t border-ink/10 pt-5 dark:border-white/10"
        aria-labelledby="share-heading"
      >
        <h3 id="share-heading" className="font-semibold text-ink dark:text-paper">
          Del med flere
        </h3>
        <p className="meta mt-1">
          Alle medlemmer ser endringer i sanntid. Invitasjonslenken varer i 30 dager.
        </p>

        {isOwner ? (
          inviteLink ? (
            <div className="mt-3">
              <label className="label" htmlFor="invite-link">
                Invitasjonslenke
              </label>
              <div className="mt-1.5 flex gap-2">
                <input
                  id="invite-link"
                  className="field min-w-0 text-sm"
                  value={inviteLink}
                  readOnly
                  onFocus={(event) => event.currentTarget.select()}
                />
                <button
                  type="button"
                  className="btn btn-secondary shrink-0"
                  onClick={() => void handleCopy()}
                >
                  Kopier
                </button>
                <button
                  type="button"
                  className="btn btn-primary hidden shrink-0 sm:inline-flex"
                  onClick={() => void handleNativeShare()}
                >
                  Del
                </button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              className="btn btn-primary mt-3"
              onClick={() => void handleInvite()}
              disabled={busy !== null}
            >
              {busy === 'invite' ? 'Lager lenke …' : 'Lag invitasjonslenke'}
            </button>
          )
        ) : null}

        <ul className="mt-4 space-y-1.5">
          {sortedMembers.map((member) => {
            const profile = profiles.find((entry) => entry.id === member.userId);
            const label = profile?.displayName ?? 'Ukjent';
            const isMe = member.userId === currentUserId;
            return (
              <li
                key={member.userId}
                className="flex min-h-12 items-center gap-2.5 rounded-2xl bg-ink/5 px-2.5 dark:bg-white/5"
              >
                <Avatar id={member.userId} name={label} size="sm" />
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink dark:text-paper">
                  {label}
                  {isMe ? (
                    <span className="font-normal text-ink/35 dark:text-paper/35"> (deg)</span>
                  ) : null}
                </span>
                <span className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-semibold text-ink/55 shadow-sm dark:bg-white/10 dark:text-paper/60">
                  {member.role === 'owner' ? 'Eier' : 'Medlem'}
                </span>
                {isOwner && !isMe && member.role !== 'owner' ? (
                  <button
                    type="button"
                    className="btn btn-danger min-h-11 px-2.5 text-xs"
                    onClick={() => void handleRemoveMember(member)}
                    disabled={busy !== null}
                  >
                    {busy === `remove:${member.userId}` ? 'Fjerner …' : 'Fjern'}
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      </section>

      {message ? (
        <p
          role="status"
          className="mt-4 rounded-2xl bg-mint-100 px-3 py-2 text-sm text-ink dark:bg-mint-950 dark:text-mint-100"
        >
          {message}
        </p>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-2xl bg-blush-100 px-3 py-2 text-sm text-blush-700 dark:bg-blush-950 dark:text-blush-100"
        >
          {error}
        </p>
      ) : null}

      <section
        className="mt-6 border-t border-ink/10 pt-5 dark:border-white/10"
        aria-labelledby="danger-heading"
      >
        <h3 id="danger-heading" className="text-sm font-semibold text-ink/70 dark:text-paper/70">
          Lister
        </h3>
        <div className="mt-2 flex flex-wrap gap-2">
          <button
            type="button"
            className="btn btn-secondary"
            onClick={() => void handleArchive()}
            disabled={busy !== null}
          >
            {list.archivedAt ? 'Gjenopprett fra arkiv' : 'Arkivér listen'}
          </button>
          {isOwner ? (
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => setConfirmDelete(true)}
              disabled={busy !== null}
            >
              Slett listen
            </button>
          ) : null}
        </div>
        {confirmDelete ? (
          <div className="mt-3 rounded-2xl bg-blush-100 p-3 text-blush-700 dark:bg-blush-950 dark:text-blush-100">
            <p className="text-sm">
              Slette «{list.name}» for alle? Varene blir liggende i historikken, men listen
              forsvinner for alle medlemmer.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                className="btn bg-red-700 text-white hover:bg-red-800"
                onClick={() => void handleDelete()}
                disabled={busy !== null}
              >
                {busy === 'delete' ? 'Sletter …' : 'Ja, slett listen'}
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setConfirmDelete(false)}
                disabled={busy !== null}
              >
                Avbryt
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </Dialog>
  );
}
