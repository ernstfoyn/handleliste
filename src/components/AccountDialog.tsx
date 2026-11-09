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
  const { user, signOut, upgradeWithEmail, setPassword } = useAuth();
  const profile = useMyProfile();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [upgradePassword, setUpgradePassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [busy, setBusy] = useState<'name' | 'upgrade' | 'password' | 'signout' | null>(null);
  const wasOpen = useRef(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open && !wasOpen.current) {
      setName(profile?.displayName ?? '');
      setEmail('');
      setUpgradePassword('');
      setNewPassword('');
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
      await upgradeWithEmail(email, upgradePassword || undefined);
      setMessage(
        upgradePassword
          ? 'Sjekk e-posten for å bekrefte. Etterpå kan du logge inn med e-post og passord.'
          : 'Sjekk e-posten for å bekrefte. Du beholder listen, historikken og medlemskapene dine.',
      );
      setEmail('');
      setUpgradePassword('');
    } catch (submitError) {
      setError(toErrorMessage(submitError));
    } finally {
      setBusy(null);
    }
  };

  const handleSetPassword = async (event: FormEvent) => {
    event.preventDefault();
    setBusy('password');
    setError(null);
    setMessage(null);
    try {
      await setPassword(newPassword);
      setNewPassword('');
      setMessage('Passordet er lagret. Du kan nå logge inn med e-post og passord.');
    } catch (passwordError) {
      setError(toErrorMessage(passwordError));
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
      <div className="flex items-center gap-3 rounded-[24px] bg-ink/5 p-3 dark:bg-white/5">
        <Avatar name={profile?.displayName ?? 'Gjest'} id={user.id} size="lg" />
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink dark:text-paper">
            {profile?.displayName ?? (anonymous ? 'Gjest' : (user.email ?? 'Bruker'))}
          </p>
          <p className="meta truncate">
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
          className="mt-6 border-t border-ink/10 pt-5 dark:border-white/10"
          onSubmit={handleUpgrade}
        >
          <h3 className="font-semibold text-ink dark:text-paper">Koble til e-post</h3>
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
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              required
            />
          </div>
          <div className="mt-3">
            <label className="label" htmlFor="account-upgrade-password">
              Passord{' '}
              <span className="font-normal text-ink/35 dark:text-paper/35">(valgfritt)</span>
            </label>
            <input
              id="account-upgrade-password"
              type="password"
              className="field mt-1.5"
              value={upgradePassword}
              onChange={(event) => setUpgradePassword(event.target.value)}
              placeholder="Minst 8 tegn"
              autoComplete="new-password"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              minLength={8}
            />
            <p className="mt-1 text-[11px] text-ink/40 dark:text-paper/40">
              Velger du passord, kan du logge inn med e-post og passord etter at e-posten er
              bekreftet.
            </p>
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

      {!anonymous ? (
        <form
          className="mt-6 border-t border-ink/10 pt-5 dark:border-white/10"
          onSubmit={handleSetPassword}
        >
          <h3 className="font-semibold text-ink dark:text-paper">Sett eller endre passord</h3>
          <p className="meta mt-1">
            Etterpå kan du logge inn med e-post og passord på alle enheter.
          </p>
          <div className="mt-3">
            <label className="label" htmlFor="account-new-password">
              Nytt passord
            </label>
            <input
              id="account-new-password"
              type="password"
              className="field mt-1.5"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              placeholder="Minst 8 tegn"
              autoComplete="new-password"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              minLength={8}
              required
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary mt-3 w-full sm:w-auto"
            disabled={busy !== null}
          >
            {busy === 'password' ? 'Lagrer …' : 'Lagre passord'}
          </button>
        </form>
      ) : null}

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

      <div className="mt-6 flex items-center justify-between border-t border-ink/10 pt-4 dark:border-white/10">
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
