export function ListSkeleton() {
  return (
    <div className="animate-pulse space-y-3" aria-hidden="true">
      <div className="h-8 w-44 rounded-lg bg-stone-200/80 dark:bg-stone-800" />
      <div className="h-5 w-64 rounded bg-stone-200/60 dark:bg-stone-800/70" />
      <div className="mt-6 h-16 rounded-2xl bg-stone-200/70 dark:bg-stone-800/70" />
      {[0, 1, 2].map((index) => (
        <div key={index} className="h-24 rounded-2xl bg-stone-200/50 dark:bg-stone-800/50" />
      ))}
    </div>
  );
}
