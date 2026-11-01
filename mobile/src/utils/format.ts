export function formatCents(cents: number): string {
  const dollars = Math.floor(cents / 100);
  const rest = String(cents % 100).padStart(2, '0');
  return `$${dollars.toLocaleString('en-US')}.${rest}`;
}

export function formatCompact(n: number): string {
  if (n < 1000) return String(n);
  if (n < 10000) return `${(n / 1000).toFixed(1).replace(/\.0$/, '')}k`;
  return `${Math.round(n / 1000)}k`;
}

export function formatRelative(minutesAgo: number): string {
  if (minutesAgo < 1) return 'now';
  if (minutesAgo < 60) return `${minutesAgo}m`;
  const hours = Math.floor(minutesAgo / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

/** "$210" for whole dollars, "$210.50" otherwise. */
export function formatDollars(cents: number): string {
  return cents % 100 === 0 ? `$${(cents / 100).toLocaleString('en-US')}` : formatCents(cents);
}

export function formatTimeAgo(minutesAgo: number): string {
  const unit = (n: number, name: string) => `${n} ${name}${n === 1 ? '' : 's'} ago`;
  if (minutesAgo < 1) return 'Just now';
  if (minutesAgo < 60) return unit(minutesAgo, 'minute');
  const hours = Math.floor(minutesAgo / 60);
  if (hours < 24) return unit(hours, 'hour');
  const days = Math.floor(hours / 24);
  if (days < 7) return unit(days, 'day');
  return unit(Math.floor(days / 7), 'week');
}
