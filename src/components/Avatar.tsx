const COLORS = [
  'bg-mint-200 text-ink dark:bg-mint-950 dark:text-mint-100',
  'bg-blush-200 text-ink dark:bg-blush-950 dark:text-blush-100',
  'bg-lilac-200 text-ink dark:bg-lilac-950 dark:text-lilac-100',
  'bg-butter-200 text-ink dark:bg-butter-950 dark:text-butter-100',
  'bg-sky-200 text-ink dark:bg-sky-950 dark:text-sky-100',
  'bg-ink text-paper dark:bg-paper dark:text-ink',
] as const;

function initials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/u)
    .filter(Boolean)
    .slice(0, 2);
  if (words.length === 0) return '?';
  return words.map((word) => word[0]?.toLocaleUpperCase('nb-NO') ?? '').join('');
}

function colorFor(id: string): string {
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) {
    hash = (hash * 31 + id.charCodeAt(index)) >>> 0;
  }
  return COLORS[hash % COLORS.length] ?? COLORS[0];
}

export function Avatar({
  name,
  id,
  size = 'md',
  className = '',
}: {
  name: string;
  id: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}) {
  const dimensions =
    size === 'sm'
      ? 'h-7 w-7 text-[11px]'
      : size === 'lg'
        ? 'h-12 w-12 text-base'
        : 'h-9 w-9 text-xs';
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-semibold ring-2 ring-paper dark:ring-[#0D0D0C] ${dimensions} ${colorFor(id)} ${className}`}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

export function AvatarStack({
  people,
}: {
  people: readonly { userId: string; displayName: string }[];
}) {
  if (people.length === 0) return null;
  const label = `Aktive nå: ${people.map((person) => person.displayName).join(', ')}`;
  return (
    <div className="flex items-center -space-x-2" role="img" aria-label={label} title={label}>
      {people.slice(0, 4).map((person) => (
        <Avatar key={person.userId} id={person.userId} name={person.displayName} size="sm" />
      ))}
      {people.length > 4 ? (
        <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full bg-ink px-1 text-[11px] font-semibold text-paper ring-2 ring-paper dark:bg-paper dark:text-ink dark:ring-[#0D0D0C]">
          +{people.length - 4}
        </span>
      ) : null}
    </div>
  );
}
