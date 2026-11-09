import { BrandMark } from './Brand';

export function SplashScreen({ label = 'Laster handlelista …' }: { label?: string }) {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 bg-cream dark:bg-stone-950">
      <div className="animate-pulse">
        <BrandMark className="h-14 w-14" />
      </div>
      <p className="text-sm font-medium text-stone-500 dark:text-stone-400">{label}</p>
    </div>
  );
}
