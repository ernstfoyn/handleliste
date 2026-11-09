import { Brand } from './Brand';

export function SetupNotice() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-cream px-4 py-12 dark:bg-stone-950">
      <div className="w-full max-w-xl">
        <Brand subtitle="kom i gang" />
        <div className="card mt-8 p-6 sm:p-8">
          <h1 className="font-display text-3xl font-semibold tracking-tight text-stone-900 dark:text-stone-50">
            Koble til Supabase
          </h1>
          <p className="mt-3 text-stone-600 dark:text-stone-300">
            Appen trenger en Supabase-instans for innlogging, sanntid og deling. Alt kan kjøres
            lokalt.
          </p>
          <ol className="mt-6 space-y-4 text-sm text-stone-700 dark:text-stone-300">
            <li>
              <span className="font-semibold">1.</span> Start Supabase lokalt:
              <pre className="mt-2 overflow-x-auto rounded-xl bg-stone-900 px-3 py-2 text-xs text-stone-100">
                <code>npx supabase start</code>
              </pre>
            </li>
            <li>
              <span className="font-semibold">2.</span> Kopier miljøfilen og lim inn URL + anon key
              fra{' '}
              <code className="rounded bg-stone-100 px-1 py-0.5 dark:bg-stone-800">
                npx supabase status
              </code>
              :
              <pre className="mt-2 overflow-x-auto rounded-xl bg-stone-900 px-3 py-2 text-xs text-stone-100">
                <code>
                  {
                    'cp .env.example .env.local\n# VITE_SUPABASE_URL=...\n# VITE_SUPABASE_ANON_KEY=...'
                  }
                </code>
              </pre>
            </li>
            <li>
              <span className="font-semibold">3.</span> Kjør migrasjonene og start appen:
              <pre className="mt-2 overflow-x-auto rounded-xl bg-stone-900 px-3 py-2 text-xs text-stone-100">
                <code>{'npx supabase db reset\nnpm run dev'}</code>
              </pre>
            </li>
          </ol>
          <p className="mt-6 text-sm text-stone-500 dark:text-stone-400">
            Se README.md for cloud-deploy og testing av sanntid/offline.
          </p>
        </div>
      </div>
    </div>
  );
}
