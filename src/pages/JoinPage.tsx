import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import { acceptInvite } from '../data/actions';
import { toErrorMessage } from '../lib/errors';
import { useAuth } from '../providers/AuthProvider';
import { useSyncReady } from '../providers/SyncProvider';
import { useToast } from '../providers/ToastProvider';
import { AuthPage } from './AuthPage';
import { Brand, BrandMark } from '../components/Brand';
import { SplashScreen } from '../components/SplashScreen';

type JoinState = { status: 'joining' } | { status: 'error'; message: string };

export function JoinPage() {
  const { token } = useParams<{ token: string }>();
  const { status, user } = useAuth();
  const ready = useSyncReady();
  const location = useLocation();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [state, setState] = useState<JoinState>({ status: 'joining' });
  const [attempt, setAttempt] = useState(0);
  const startedKey = useRef<string | null>(null);

  useEffect(() => {
    if (status !== 'signed-in' || !ready || !user || !token) return;
    const key = `${user.id}:${token}:${attempt}`;
    if (startedKey.current === key) return;
    startedKey.current = key;

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      setState({
        status: 'error',
        message:
          'Du må være tilkoblet for å bli med i en delt liste. Prøv igjen når nettet er tilbake.',
      });
      return;
    }

    setState({ status: 'joining' });
    void acceptInvite(token)
      .then((result) => {
        showToast({ message: `Du ble med i «${result.listName}».` });
        navigate(`/lister/${result.listId}`, { replace: true });
      })
      .catch((error: unknown) => {
        setState({ status: 'error', message: toErrorMessage(error) });
      });
  }, [attempt, navigate, ready, showToast, status, token, user]);

  if (status === 'unconfigured' || status === 'loading') {
    return <AuthPage embedded nextPath={location.pathname} />;
  }

  if (status === 'signed-out') {
    return (
      <AuthPage
        embedded
        nextPath={location.pathname}
        notice="Du må logge inn for å bli med i den delte listen."
      />
    );
  }

  if (!ready || !token) return <SplashScreen label="Forbereder listen …" />;

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-12">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(39,143,96,0.18),transparent_70%)]"
      />
      <div className="w-full max-w-md">
        <div className="flex justify-center">
          <Brand />
        </div>
        <div className="card mt-8 p-6 text-center sm:p-8">
          {state.status === 'joining' ? (
            <>
              <div className="mx-auto flex h-14 w-14 animate-pulse items-center justify-center rounded-[20px] bg-mint-100 dark:bg-mint-950">
                <BrandMark className="h-9 w-9" />
              </div>
              <h1 className="mt-4 font-display text-3xl font-semibold text-ink dark:text-paper">
                Blir med i listen …
              </h1>
              <p className="mt-2 text-sm text-ink/55 dark:text-paper/55">
                Vi kobler deg til den delte handlelisten. Dette tar vanligvis under et sekund.
              </p>
            </>
          ) : (
            <>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300">
                <svg
                  viewBox="0 0 24 24"
                  className="h-7 w-7"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                >
                  <path
                    d="M12 8v5M12 16.5v.5M10.3 4.3 2.8 18a1.6 1.6 0 0 0 1.4 2.4h15.6a1.6 1.6 0 0 0 1.4-2.4L13.7 4.3a1.9 1.9 0 0 0-3.4 0Z"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <h1 className="mt-4 font-display text-3xl font-semibold text-ink dark:text-paper">
                Kunne ikke bli med
              </h1>
              <p role="alert" className="mt-2 text-sm text-ink/55 dark:text-paper/55">
                {state.message}
              </p>
              <div className="mt-5 flex flex-col gap-2">
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => setAttempt((current) => current + 1)}
                >
                  Prøv igjen
                </button>
                <Link to="/" className="btn btn-secondary">
                  Til mine lister
                </Link>
              </div>
            </>
          )}
        </div>
        <p className="mt-4 text-center text-xs text-ink/35 dark:text-paper/35">
          Invitasjonslenker varer i 30 dager. Kun eier kan fjerne medlemmer.
        </p>
      </div>
    </div>
  );
}
