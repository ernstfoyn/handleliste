const relative = new Intl.RelativeTimeFormat('nb-NO', { numeric: 'auto' });
const shortDate = new Intl.DateTimeFormat('nb-NO', { day: 'numeric', month: 'short' });
const dateTime = new Intl.DateTimeFormat('nb-NO', {
  day: 'numeric',
  month: 'short',
  hour: '2-digit',
  minute: '2-digit',
});
const number = new Intl.NumberFormat('nb-NO');

export function formatRelativeTime(iso: string | null | undefined, now = Date.now()): string {
  if (!iso) return 'aldri';
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return 'ukjent';

  const diff = then - now;
  const abs = Math.abs(diff);

  if (abs < 30_000) return 'nå';
  if (abs < 60 * 60_000) return relative.format(Math.round(diff / 60_000), 'minute');
  if (abs < 24 * 60 * 60_000) return relative.format(Math.round(diff / 3_600_000), 'hour');
  if (abs < 7 * 24 * 60 * 60_000) return relative.format(Math.round(diff / 86_400_000), 'day');
  return shortDate.format(new Date(then));
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '–';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '–' : dateTime.format(date);
}

export function formatNumber(value: number): string {
  return number.format(value);
}

export function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}
