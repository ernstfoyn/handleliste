import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { updateProfileName } from '../data/actions';
import { toErrorMessage } from '../lib/errors';
import { useMyProfile } from '../hooks/useMyProfile';
import { useAuth } from '../providers/AuthProvider';
import { useToast } from '../providers/ToastProvider';
import { Avatar } from './Avatar';
import { Dialog } from './Dialog';

export function AccountDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, signOut, upgradeWithEmail } = useAuth();
  const profile = useMyProfile();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState<'name' | 'upgrade' | 'signout' | null>(null);
  const wasOpen = useRef(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && !wasOpen.current) {
      setName(profile?.displayName ?? '');
      setEmail('');
      setMessage(null);
      setError(null);
      setBusy(null);
    }
    wasOpen.current = open;
  }, [open, profile?.displayName]);

  if (!user) return null;

  const anonymous = user.is_anonymous === true || !user.email;

  const handleName = async (event: FormEvent) => {
    event.preventDefault();
    setBusy('name');
    setError(null);
    setMessage(null);
    try {
      await updateProfileName(user.id, name);
      showToast({ message: 'Navnet er oppdatert.' });
      setMessage('Navnet er lagret.');
    } catch (submitError) {
      setError(toErrorMessage(submitError));
    } finally {
      setBusy(null);
    }
  };

  const handleUpgrade = async (event: FormEvent) => {
    event.preventDefault();
    setBusy('upgrade');
    setError(null);
    setMessage(null);
    try {
      await upgradeWithEmail(email);
      setMessage(
        'Sjekk e-posten for å bekrefte. Du beholder listen, historikken og medlemskapene dine.',
      );
      setEmail('');
    } catch (submitError) {
      setError(toErrorMessage(submitError));
    } finally {
      setBusy(null);
    }
  };

  const handleSignOut = async () => {
    setBusy('signout');
    setError(null);
    try {
      await signOut();
      onClose();
      navigate('/logg-inn', { replace: true });
    } catch (signOutError) {
      setError(toErrorMessage(signOutError));
    } finally {
      setBusy(null);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      title="Konto"
      description="Navnet vises for andre i listen."
    >
      <div className="flex items-center gap-3 rounded-2xl bg-stone-100/80 p-3 dark:bg-stone-800/60">
        <Avatar name={profile?.displayName ?? 'Gjest'} id={user.id} size="lg" />
        <div className="min-w-0">
          <p className="truncate font-semibold text-stone-900 dark:text-stone-50">
            {profile?.displayName ?? (anonymous ? 'Gjest' : (user.email ?? 'Bruker'))}
          </p>
          <p className="truncate text-sm text-stone-500 dark:text-stone-400">
            {anonymous ? 'Anonym gjestekonto' : (user.email ?? 'Innlogget')}
          </p>
        </div>
      </div>

      <form className="mt-5 space-y-3" onSubmit={handleName}>
        <div>
          <label className="label" htmlFor="account-name">
            Visningsnavn
          </label>
          <input
            id="account-name"
            className="field mt-1.5"
            value={name}
            onChange={(event) => setName(event.target.value)}
            maxLength={60}
            autoComplete="name"
          />
        </div>
        <button type="submit" className="btn btn-primary w-full sm:w-auto" disabled={busy !== null}>
          {busy === 'name' ? 'Lagrer …' : 'Lagre navn'}
        </button>
      </form>

      {anonymous ? (
        <form
          className="mt-6 border-t border-stone-200 pt-5 dark:border-stone-800"
          onSubmit={handleUpgrade}
        >
          <h3 className="font-semibold text-stone-900 dark:text-stone-50">Koble til e-post</h3>
          <p className="meta mt-1">
            Oppgrader gjestekontoen slik at du kan logge inn på nye enheter. Innholdet blir med.
          </p>
          <div className="mt-3">
            <label className="label" htmlFor="account-email">
              E-post
            </label>
            <input
              id="account-email"
              type="email"
              className="field mt-1.5"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="navn@eksempel.no"
              autoComplete="email"
              required
            />
          </div>
          <button
            type="submit"
            className="btn btn-secondary mt-3 w-full sm:w-auto"
            disabled={busy !== null}
          >
            {busy === 'upgrade' ? 'Sender …' : 'Send bekreftelseslenke'}
          </button>
        </form>
      ) : null}

      {message ? (
        <p
          role="status"
          className="mt-4 rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-900 dark:bg-brand-950/60 dark:text-brand-100"
        >
          {message}
        </p>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200"
        >
          {error}
        </p>
      ) : null}

      <div className="mt-6 flex items-center justify-between border-t border-stone-200 pt-4 dark:border-stone-800">
        <p className="meta">Logg ut sletter ikke listen eller historikken.</p>
        <button
          type="button"
          className="btn btn-danger px-3"
          onClick={() => void handleSignOut()}
          disabled={busy !== null}
        >
          {busy === 'signout' ? 'Logger ut …' : 'Logg ut'}
        </button>
      </div>
    </Dialog>
  );
}
