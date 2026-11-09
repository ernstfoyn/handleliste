import { Link } from 'react-router-dom';
import { Brand } from '../components/Brand';

export function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-cream px-4 py-12 dark:bg-stone-950">
      <Brand />
      <div className="card mt-8 w-full max-w-sm p-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-stone-500">404</p>
        <h1 className="mt-2 font-display text-2xl font-semibold text-stone-900 dark:text-stone-50">
          Siden finnes ikke
        </h1>
        <p className="mt-2 text-sm text-stone-600 dark:text-stone-300">
          Lenken kan være feil, eller innholdet er flyttet.
        </p>
        <Link to="/" className="btn btn-primary mt-5 w-full">
          Til listene
        </Link>
      </div>
    </div>
  );
}
