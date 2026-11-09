import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toErrorMessage } from '../lib/errors';
import { useAuth } from '../providers/AuthProvider';
import { SetupNotice } from '../components/SetupNotice';
import { SplashScreen } from '../components/SplashScreen';
import { Brand } from '../components/Brand';

type FeatureTone = 'mint' | 'blush' | 'lilac' | 'butter';

const FEATURE_TONES: Record<FeatureTone, string> = {
  mint: 'bg-mint-100 text-mint-700 dark:bg-mint-950 dark:text-mint-100',
  blush: 'bg-blush-100 text-blush-700 dark:bg-blush-950 dark:text-blush-100',
  lilac: 'bg-lilac-100 text-lilac-700 dark:bg-lilac-950 dark:text-lilac-100',
  butter: 'bg-butter-100 text-butter-700 dark:bg-butter-950 dark:text-butter-100',
};

function Feature({
  icon,
  title,
  children,
  tone,
}: {
  icon: ReactNode;
  title: string;
  children: string;
  tone: FeatureTone;
}) {
  return (
    <li className="flex gap-3">
      <span
        className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${FEATURE_TONES[tone]}`}
      >
        {icon}
      </span>
      <span>
        <span className="block text-sm font-semibold text-ink dark:text-paper">{title}</span>
        <span className="mt-0.5 block text-sm text-ink/55 dark:text-paper/55">{children}</span>
      </span>
    </li>
  );
}

export function AuthPage({
  notice,
  nextPath,
  embedded = false,
}: {
  notice?: string;
  nextPath?: string;
  embedded?: boolean;
}) {
  const { status, signInAsGuest, signInWithMagicLink } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const rawNext = nextPath ?? searchParams.get('next') ?? '/';
  const next = rawNext.startsWith('/') && !rawNext.startsWith('//') ? rawNext : '/';

  const [guestName, setGuestName] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState<'guest' | 'email' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'signed-in') {
      navigate(next, { replace: true });
    }
  }, [navigate, next, status]);

  if (status === 'unconfigured') return <SetupNotice />;
  if (status === 'loading') return <SplashScreen label="Sjekker innlogging …" />;

  const handleGuest = async (event: FormEvent) => {
    event.preventDefault();
    setBusy('guest');
    setError(null);
    try {
      await signInAsGuest(guestName);
    } catch (guestError) {
      setError(toErrorMessage(guestError));
      setBusy(null);
    }
  };

  const handleEmail = async (event: FormEvent) => {
    event.preventDefault();
    setBusy('email');
    setError(null);
    try {
      await signInWithMagicLink(email, next);
      setSentTo(email.trim());
    } catch (emailError) {
      setError(toErrorMessage(emailError));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="relative min-h-dvh overflow-hidden">
      <header
        className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8"
        style={{ paddingTop: 'calc(1.25rem + env(safe-area-inset-top))' }}
      >
        <Brand subtitle="felles handleliste" />
        <a
          href="https://supabase.com/docs"
          target="_blank"
          rel="noreferrer"
          className="hidden text-xs font-medium text-ink/45 hover:text-ink dark:text-paper/45 dark:hover:text-paper sm:block"
        >
          Drevet av Supabase
        </a>
      </header>

      <main className="mx-auto grid max-w-6xl gap-10 px-5 pb-16 pt-4 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16 lg:pb-24 lg:pt-10">
        <section className="hidden lg:block">
          <p className="inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white/60 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/55 shadow-sm dark:border-white/10 dark:bg-white/5 dark:text-paper/55">
            <span className="h-1.5 w-1.5 rounded-full bg-ink dark:bg-paper" aria-hidden="true" />
            Husker alt du handler
          </p>
          <h1 className="mt-5 max-w-xl font-display text-5xl font-light leading-[0.96] tracking-tight text-ink dark:text-paper sm:text-6xl lg:text-7xl">
            Felles handleliste.
            <br />
            <em className="font-light italic text-ink/55 dark:text-paper/55">Null glemte varer.</em>
          </h1>
          <p className="mt-5 max-w-lg text-base leading-relaxed text-ink/55 dark:text-paper/55 sm:text-lg">
            Skriv «mel», få «Melk» fra historikken, huk av med ett trykk og la resten av
            husholdningen se det med en gang.
          </p>
          <ul className="mt-8 grid max-w-lg gap-4 sm:grid-cols-2">
            <Feature
              tone="mint"
              title="Husker varene"
              icon={
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                >
                  <path
                    d="M4 5v5h5M4.5 10a8 8 0 1 1 2 8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              }
            >
              Ofte og nylig brukt, rett i listen.
            </Feature>
            <Feature
              tone="butter"
              title="Ett trykk"
              icon={
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                >
                  <path d="M5 12.5l4.5 4.5L19 6.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              }
            >
              Hele raden hukes av. Angre i fem sekunder.
            </Feature>
            <Feature
              tone="lilac"
              title="Delt i sanntid"
              icon={
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                >
                  <circle cx="9" cy="8" r="3" />
                  <path
                    d="M3.5 19a5.5 5.5 0 0 1 11 0M16 5.5a3 3 0 0 1 0 5.8M17.5 19a5.6 5.6 0 0 0-2-4.3"
                    strokeLinecap="round"
                  />
                </svg>
              }
            >
              Alle ser endringer uten refresh.
            </Feature>
            <Feature
              tone="blush"
              title="Fungerer offline"
              icon={
                <svg
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  aria-hidden="true"
                >
                  <path
                    d="M5 12a7 7 0 0 1 11.5-5.4M19 12a7 7 0 0 1-11.5 5.4M4 4l16 16"
                    strokeLinecap="round"
                  />
                </svg>
              }
            >
              Legg til varer uten nett – de synkes etterpå.
            </Feature>
          </ul>

          <div className="mt-8 hidden max-w-sm rotate-[-1.5deg] rounded-[28px] bg-mint-100 p-5 text-ink shadow-card dark:bg-mint-950 dark:text-paper lg:block">
            <p className="eyebrow">Handleliste</p>
            <ul className="mt-3 space-y-2 text-sm">
              <li className="flex items-center gap-2.5">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-ink text-paper dark:bg-paper dark:text-ink">
                  <svg
                    viewBox="0 0 24 24"
                    className="h-3 w-3"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                  >
                    <path d="M5 12.5l4 4L19 7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                <span className="text-ink/40 line-through dark:text-paper/40">Brød</span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="h-5 w-5 rounded-full border-2 border-ink/25 dark:border-paper/25" />
                Melk{' '}
                <span className="rounded-full bg-ink/10 px-2 py-0.5 text-[10px] font-semibold text-ink dark:bg-paper/15 dark:text-paper">
                  2 stk
                </span>
              </li>
              <li className="flex items-center gap-2.5">
                <span className="h-5 w-5 rounded-full border-2 border-ink/25 dark:border-paper/25" />
                Egg
              </li>
            </ul>
          </div>
        </section>

        <section className="mx-auto w-full max-w-md">
          <div className="card rounded-[32px] p-5 sm:p-8">
            <h2 className="font-display text-3xl font-light tracking-tight text-ink dark:text-paper">
              {embedded ? 'Logg inn for å bli med' : 'Kom i gang'}
            </h2>
            <p className="mt-2 text-sm text-ink/55 dark:text-paper/55">
              {embedded
                ? 'Invitasjonen venter. Velg hvordan du vil logge inn.'
                : 'Velg gjest for å komme raskt i gang, eller bruk e-post for innlogging på flere enheter.'}
            </p>

            {notice ? (
              <p className="mt-4 rounded-2xl bg-butter-100 px-3 py-2 text-sm text-ink dark:bg-butter-950 dark:text-butter-100">
                {notice}
              </p>
            ) : null}

            {sentTo ? (
              <div className="mt-5 rounded-[24px] bg-mint-100 px-4 py-4 text-ink dark:bg-mint-950 dark:text-mint-100">
                <p className="font-semibold">Sjekk e-posten</p>
                <p className="mt-1 text-sm opacity-75">
                  Vi sendte en innloggingslenke til <span className="font-medium">{sentTo}</span>.
                  Lenken kan åpnes på denne eller en annen enhet.
                </p>
                <button
                  type="button"
                  className="btn btn-secondary mt-3 w-full"
                  onClick={() => {
                    setSentTo(null);
                    setEmail('');
                  }}
                >
                  Bruk en annen e-post
                </button>
              </div>
            ) : (
              <>
                <form className="mt-5 space-y-3" onSubmit={(event) => void handleGuest(event)}>
                  <div>
                    <label className="label" htmlFor="guest-name">
                      Navn{' '}
                      <span className="font-normal text-ink/35 dark:text-paper/35">
                        (valgfritt)
                      </span>
                    </label>
                    <input
                      id="guest-name"
                      className="field mt-1.5"
                      value={guestName}
                      onChange={(event) => setGuestName(event.target.value)}
                      placeholder="f.eks. Kari"
                      autoComplete="given-name"
                      maxLength={60}
                    />
                  </div>
                  <button type="submit" className="btn btn-primary w-full" disabled={busy !== null}>
                    {busy === 'guest' ? 'Logger inn …' : 'Fortsett som gjest'}
                  </button>
                  <p className="text-center text-xs text-ink/45 dark:text-paper/45">
                    Du kan oppgradere til e-post senere uten å miste listen.
                  </p>
                </form>

                <div className="my-5 flex items-center gap-3" aria-hidden="true">
                  <span className="h-px flex-1 bg-ink/10 dark:bg-white/10" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink/35 dark:text-paper/35">
                    eller med e-post
                  </span>
                  <span className="h-px flex-1 bg-ink/10 dark:bg-white/10" />
                </div>

                <form className="space-y-3" onSubmit={(event) => void handleEmail(event)}>
                  <div>
                    <label className="label" htmlFor="login-email">
                      E-post for innloggingslenke
                    </label>
                    <input
                      id="login-email"
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
                    className="btn btn-secondary w-full"
                    disabled={busy !== null}
                  >
                    {busy === 'email' ? 'Sender …' : 'Send innloggingslenke'}
                  </button>
                </form>
              </>
            )}

            {error ? (
              <p
                role="alert"
                className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/50 dark:text-red-200"
              >
                {error}
              </p>
            ) : null}
          </div>

          <p className="mt-4 text-center text-xs leading-relaxed text-ink/40 dark:text-paper/40">
            Ingen passord. Handlelista bruker magiske innloggingslenker og anonyme gjestekontoer.
          </p>
        </section>
      </main>
    </div>
  );
}
