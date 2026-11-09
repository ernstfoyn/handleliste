import { BrandMark } from './Brand';

export function SplashScreen({ label = 'Laster handlelista …' }: { label?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4">
      <div className="animate-pulse">
        <BrandMark className="h-14 w-14" />
      </div>
      <p className="text-sm font-medium text-ink/45 dark:text-paper/45">{label}</p>
    </div>
  );
}
