import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toErrorMessage } from '../lib/errors';
import { useAuth } from '../providers/AuthProvider';
import { SetupNotice } from '../components/SetupNotice';
import { SplashScreen } from '../components/SplashScreen';
import { Brand } from '../components/Brand';

function Feature({ icon, title, children }: { icon: ReactNode; title: string; children: string }) {
  return (
    <li className="flex gap-3">
      <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-800 dark:bg-brand-950/70 dark:text-brand-200">
        {icon}
      </span>
      <span>
        <span className="block text-sm font-semibold text-stone-900 dark:text-stone-50">
          {title}
        </span>
        <span className="mt-0.5 block text-sm text-stone-600 dark:text-stone-400">{children}</span>
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
    <div className="relative min-h-dvh overflow-hidden bg-cream dark:bg-stone-950">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(70%_60%_at_15%_0%,rgba(39,143,96,0.18),transparent_65%),radial-gradient(50%_40%_at_90%_20%,rgba(231,180,84,0.14),transparent_60%)]"
      />
      <header
        className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8"
        style={{ paddingTop: 'calc(1.25rem + env(safe-area-inset-top))' }}
      >
        <Brand subtitle="felles handleliste" />
        <a
          href="https://supabase.com/docs"
          target="_blank"
          rel="noreferrer"
          className="hidden text-xs font-medium text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-100 sm:block"
        >
          Drevet av Supabase
        </a>
      </header>

      <main className="mx-auto grid max-w-6xl gap-10 px-5 pb-16 pt-4 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-16 lg:pb-24 lg:pt-10">
        <section className="hidden lg:block">
          <p className="inline-flex items-center gap-2 rounded-full border border-brand-200 bg-white/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-brand-800 shadow-sm dark:border-brand-900 dark:bg-stone-900/60 dark:text-brand-200">
            <span className="h-1.5 w-1.5 rounded-full bg-brand-500" aria-hidden="true" />
            Husker alt du handler
          </p>
          <h1 className="mt-4 max-w-xl font-display text-4xl font-semibold leading-[1.08] tracking-tight text-stone-900 dark:text-stone-50 sm:text-5xl lg:text-6xl">
            Felles handleliste.{' '}
            <span className="text-brand-700 dark:text-brand-400">Null glemte varer.</span>
          </h1>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-stone-600 dark:text-stone-300 sm:text-lg">
            Skriv «mel», få «Melk» fra historikken, huk av med ett trykk og la resten av
            husholdningen se det med en gang.
          </p>
          <ul className="mt-8 grid max-w-lg gap-4 sm:grid-cols-2">
            <Feature
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

          <div className="mt-8 hidden max-w-sm rotate-[-1.5deg] rounded-2xl border border-stone-200 bg-white p-4 shadow-soft dark:border-stone-800 dark:bg-stone-900 lg:block">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
              Handleliste
            </p>
            <ul className="mt-2 space-y-2 text-sm">
              <li className="flex items-center gap-2.5 text-stone-800 dark:text-stone-100">
                <span className="flex h-5 w-5 items-center justify-center rounded-full border-2 border-brand-600 bg-brand-600 text-white">
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
                <span className="text-stone-500 line-through">Brød</span>
              </li>
              <li className="flex items-center gap-2.5 text-stone-800 dark:text-stone-100">
                <span className="h-5 w-5 rounded-full border-2 border-stone-300 dark:border-stone-600" />
                Melk{' '}
                <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[10px] font-semibold text-brand-800 dark:bg-brand-900 dark:text-brand-200">
                  2 stk
                </span>
              </li>
              <li className="flex items-center gap-2.5 text-stone-800 dark:text-stone-100">
                <span className="h-5 w-5 rounded-full border-2 border-stone-300 dark:border-stone-600" />
                Egg
              </li>
            </ul>
          </div>
        </section>

        <section className="mx-auto w-full max-w-md">
          <div className="card p-5 sm:p-7">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
              {embedded ? 'Logg inn for å bli med' : 'Kom i gang'}
            </h2>
            <p className="mt-1.5 text-sm text-stone-600 dark:text-stone-300">
              {embedded
                ? 'Invitasjonen venter. Velg hvordan du vil logge inn.'
                : 'Velg gjest for å komme raskt i gang, eller bruk e-post for innlogging på flere enheter.'}
            </p>

            {notice ? (
              <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-100">
                {notice}
              </p>
            ) : null}

            {sentTo ? (
              <div className="mt-5 rounded-2xl border border-brand-200 bg-brand-50 px-4 py-4 dark:border-brand-900 dark:bg-brand-950/50">
                <p className="font-semibold text-brand-900 dark:text-brand-100">Sjekk e-posten</p>
                <p className="mt-1 text-sm text-brand-800 dark:text-brand-200">
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
                      Navn <span className="font-normal text-stone-500">(valgfritt)</span>
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
                  <p className="text-center text-xs text-stone-500 dark:text-stone-400">
                    Du kan oppgradere til e-post senere uten å miste listen.
                  </p>
                </form>

                <div className="my-5 flex items-center gap-3" aria-hidden="true">
                  <span className="h-px flex-1 bg-stone-200 dark:bg-stone-800" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-stone-500">
                    eller med e-post
                  </span>
                  <span className="h-px flex-1 bg-stone-200 dark:bg-stone-800" />
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

          <p className="mt-4 text-center text-xs leading-relaxed text-stone-500 dark:text-stone-400">
            Ingen passord. Handlelista bruker magiske innloggingslenker og anonyme gjestekontoer.
          </p>
        </section>
      </main>
    </div>
  );
}
