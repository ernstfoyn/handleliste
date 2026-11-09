import { Link } from 'react-router-dom';
import { Brand } from '../components/Brand';

export function NotFoundPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <Brand />
      <div className="card mt-8 w-full max-w-sm p-6 text-center">
        <p className="eyebrow">404</p>
        <h1 className="mt-2 font-display text-3xl font-light text-ink dark:text-paper">
          Siden finnes ikke
        </h1>
        <p className="mt-2 text-sm text-ink/55 dark:text-paper/55">
          Lenken kan være feil, eller innholdet er flyttet.
        </p>
        <Link to="/" className="btn btn-primary mt-5 w-full">
          Til listene
        </Link>
      </div>
    </div>
  );
}
