import { Brand } from './Brand';

export function SetupNotice() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-xl">
        <Brand subtitle="kom i gang" />
        <div className="card mt-8 rounded-[32px] p-6 sm:p-8">
          <p className="eyebrow">Oppsett</p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-tight text-ink dark:text-paper">
            Koble til Supabase
          </h1>
          <p className="mt-3 text-ink/55 dark:text-paper/55">
            Appen trenger en Supabase-instans for innlogging, sanntid og deling. Alt kan kjøres
            lokalt.
          </p>
          <ol className="mt-6 space-y-4 text-sm text-ink/70 dark:text-paper/70">
            <li>
              <span className="font-semibold text-ink dark:text-paper">1.</span> Start Supabase
              lokalt:
              <pre className="mt-2 overflow-x-auto rounded-2xl bg-ink px-3 py-2 text-xs text-paper">
                <code>npx supabase start</code>
              </pre>
            </li>
            <li>
              <span className="font-semibold text-ink dark:text-paper">2.</span> Kopier miljøfilen
              og lim inn URL + anon key fra{' '}
              <code className="rounded bg-ink/5 px-1 py-0.5 dark:bg-white/10">npx supabase status</code>
              :
              <pre className="mt-2 overflow-x-auto rounded-2xl bg-ink px-3 py-2 text-xs text-paper">
                <code>{'cp .env.example .env.local\n# VITE_SUPABASE_URL=...\n# VITE_SUPABASE_ANON_KEY=...'}</code>
              </pre>
            </li>
            <li>
              <span className="font-semibold text-ink dark:text-paper">3.</span> Kjør migrasjonene og
              start appen:
              <pre className="mt-2 overflow-x-auto rounded-2xl bg-ink px-3 py-2 text-xs text-paper">
                <code>{'npx supabase db reset\nnpm run dev'}</code>
              </pre>
            </li>
          </ol>
          <p className="mt-6 text-sm text-ink/40 dark:text-paper/40">
            Se README.md for cloud-deploy og testing av sanntid/offline.
          </p>
        </div>
      </div>
    </div>
  );
}
