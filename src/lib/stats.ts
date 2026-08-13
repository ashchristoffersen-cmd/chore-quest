import type { AppState, Chore, Completion, KidId, OneOffChore } from '../types';
import { addDays, isoWeekday, monthDates, weekDates } from './date';

export interface DayChore {
  id: string;
  name: string;
  emoji: string;
  amountCents: number;
  kind: 'daily' | 'bonus';
  oneOff: boolean;
}

export function choresForDay(state: AppState, kidId: KidId, date: string): DayChore[] {
  const weekday = isoWeekday(date);
  const fromTemplates: DayChore[] = state.chores
    .filter((c: Chore) => c.kidId === kidId && !c.archived && c.days.includes(weekday))
    .sort((a, b) => a.order - b.order)
    .map((c) => ({
      id: c.id,
      name: c.name,
      emoji: c.emoji,
      amountCents: c.amountCents,
      kind: c.kind,
      oneOff: false,
    }));
  const fromOneOffs: DayChore[] = state.oneOffs
    .filter((o: OneOffChore) => o.kidId === kidId && o.date === date)
    .map((o) => ({
      id: o.id,
      name: o.name,
      emoji: o.emoji,
      amountCents: o.amountCents,
      kind: o.kind,
      oneOff: true,
    }));
  return [...fromTemplates, ...fromOneOffs];
}

export function completionKey(date: string, kidId: KidId, choreId: string): string {
  return `${date}|${kidId}|${choreId}`;
}

export function isDone(state: AppState, kidId: KidId, date: string, choreId: string): boolean {
  return Boolean(state.completions[completionKey(date, kidId, choreId)]);
}

export interface DaySummary {
  date: string;
  dailyTotal: number;
  dailyDone: number;
  bonusDone: number;
  earnedCents: number;
  allDailyDone: boolean;
}

export function daySummary(state: AppState, kidId: KidId, date: string): DaySummary {
  const chores = choresForDay(state, kidId, date);
  const daily = chores.filter((c) => c.kind === 'daily');
  const dailyDone = daily.filter((c) => isDone(state, kidId, date, c.id));
  const bonusDone = chores.filter((c) => c.kind === 'bonus' && isDone(state, kidId, date, c.id));
  const earnedCents = state.transactions
    .filter((t) => t.kidId === kidId && t.date === date && t.amountCents > 0 && t.type !== 'deposit')
    .reduce((sum, t) => sum + t.amountCents, 0);
  return {
    date,
    dailyTotal: daily.length,
    dailyDone: dailyDone.length,
    bonusDone: bonusDone.length,
    earnedCents,
    allDailyDone: daily.length > 0 && dailyDone.length === daily.length,
  };
}

/** Consecutive days (ending on `date`) where every daily chore was done. */
export function streakLength(state: AppState, kidId: KidId, date: string): number {
  let count = 0;
  let cursor = date;
  for (let i = 0; i < 400; i += 1) {
    const summary = daySummary(state, kidId, cursor);
    if (summary.dailyTotal === 0) {
      cursor = addDays(cursor, -1);
      continue;
    }
    if (!summary.allDailyDone) break;
    count += 1;
    cursor = addDays(cursor, -1);
  }
  return count;
}

export function balanceCents(state: AppState, kidId: KidId): number {
  return state.transactions
    .filter((t) => t.kidId === kidId)
    .reduce((sum, t) => sum + t.amountCents, 0);
}

export function totalEarnedCents(state: AppState, kidId: KidId): number {
  return state.transactions
    .filter((t) => t.kidId === kidId && t.amountCents > 0)
    .reduce((sum, t) => sum + t.amountCents, 0);
}

export function completionsOn(state: AppState, kidId: KidId, date: string): Completion[] {
  return Object.values(state.completions)
    .filter((c) => c.kidId === kidId && c.date === date)
    .sort((a, b) => a.completedAt.localeCompare(b.completedAt));
}

export function totalChoresDone(state: AppState, kidId: KidId): number {
  return Object.values(state.completions).filter((c) => c.kidId === kidId).length;
}

export function bonusChoresDone(state: AppState, kidId: KidId): number {
  return Object.values(state.completions).filter((c) => c.kidId === kidId && c.kind === 'bonus').length;
}

/**
 * True when every chore day in the period was completed. Evaluated over the whole
 * period rather than up to `date`, so the answer is stable for any date inside it
 * and derived payouts are not clawed back when an earlier day is reconciled again.
 */
function isPerfectPeriod(state: AppState, kidId: KidId, dates: string[]): boolean {
  let active = 0;
  for (const d of dates) {
    const s = daySummary(state, kidId, d);
    if (s.dailyTotal === 0) continue;
    if (!s.allDailyDone) return false;
    active += 1;
  }
  return active > 0;
}

export function isPerfectWeek(state: AppState, kidId: KidId, date: string): boolean {
  return isPerfectPeriod(state, kidId, weekDates(date));
}

export function isPerfectMonth(state: AppState, kidId: KidId, date: string): boolean {
  return isPerfectPeriod(state, kidId, monthDates(date));
}

export function isTeamDay(state: AppState, date: string): boolean {
  return (
    state.kids.length > 0 &&
    state.kids.every((k) => {
      const s = daySummary(state, k.id, date);
      return s.dailyTotal > 0 && s.allDailyDone;
    })
  );
}

export function teamDayCount(state: AppState): number {
  const dates = new Set(Object.values(state.completions).map((c) => c.date));
  return [...dates].filter((d) => isTeamDay(state, d)).length;
}

/** Earliest completion time of the day, as minutes past midnight. */
export function lastCompletionMinutes(state: AppState, kidId: KidId, date: string): number | null {
  const items = completionsOn(state, kidId, date);
  if (items.length === 0) return null;
  const last = new Date(items[items.length - 1].completedAt);
  return last.getHours() * 60 + last.getMinutes();
}
