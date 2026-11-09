export function ListSkeleton() {
  return (
    <div className="animate-pulse space-y-3" aria-hidden="true">
      <div className="h-8 w-44 rounded-full bg-ink/10 dark:bg-white/10" />
      <div className="h-5 w-64 rounded-full bg-ink/5 dark:bg-white/5" />
      <div className="mt-6 h-16 rounded-[24px] bg-white/50 dark:bg-white/[0.04]" />
      {[0, 1, 2].map((index) => (
        <div key={index} className="h-24 rounded-[24px] bg-white/40 dark:bg-white/[0.04]" />
      ))}
    </div>
  );
}
