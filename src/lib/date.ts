export const WEEKDAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
export const ALL_DAYS = [1, 2, 3, 4, 5, 6, 7];
export const WEEKEND_DAYS = [6, 7];

export function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

/** The active chore date, shifted back by the configured reset hour. */
export function choreDate(resetHour: number, override: string | null, now = new Date()): string {
  if (override) return override;
  const shifted = new Date(now.getTime() - resetHour * 60 * 60 * 1000);
  return toISODate(shifted);
}

/** ISO weekday: 1 = Monday ... 7 = Sunday. */
export function isoWeekday(iso: string): number {
  const day = fromISODate(iso).getDay();
  return day === 0 ? 7 : day;
}

export function isWeekend(iso: string): boolean {
  return WEEKEND_DAYS.includes(isoWeekday(iso));
}

export function addDays(iso: string, delta: number): string {
  const d = fromISODate(iso);
  d.setDate(d.getDate() + delta);
  return toISODate(d);
}

/** Monday of the week containing `iso`. */
export function weekStart(iso: string): string {
  return addDays(iso, -(isoWeekday(iso) - 1));
}

export function weekDates(iso: string): string[] {
  const start = weekStart(iso);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function monthDates(iso: string): string[] {
  const d = fromISODate(iso);
  const days = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  return Array.from({ length: days }, (_, i) => toISODate(new Date(d.getFullYear(), d.getMonth(), i + 1)));
}

export function formatDay(iso: string, today: string): string {
  if (iso === today) return 'Today';
  if (iso === addDays(today, -1)) return 'Yesterday';
  const d = fromISODate(iso);
  return d.toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'short' });
}

export function formatShortDay(iso: string): string {
  return fromISODate(iso).toLocaleDateString(undefined, { weekday: 'short' });
}

export function formatTime(isoTimestamp: string): string {
  return new Date(isoTimestamp).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
