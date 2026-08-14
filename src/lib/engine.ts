import type { AppState, AwardedTrophy, Completion, KidId, Transaction, TxnType } from '../types';
import { weekStart } from './date';
import type { DayChore } from './stats';
import { completionKey, daySummary, isPerfectWeek, isTeamDay } from './stats';
import { TROPHIES } from './trophies';

export type CelebrationEvent =
  | { kind: 'chore'; kidId: KidId; name: string; emoji: string; amountCents: number }
  | { kind: 'bonus'; kidId: KidId; label: string; emoji: string; amountCents: number }
  | { kind: 'trophy'; kidId: KidId | 'team'; trophyId: string; name: string; emoji: string };

export interface EngineResult {
  state: AppState;
  events: CelebrationEvent[];
}

function autoTxnId(type: TxnType, kidId: KidId, key: string): string {
  return `auto|${type}|${kidId}|${key}`;
}

function upsertAutoTxn(
  transactions: Transaction[],
  txn: Transaction,
  shouldExist: boolean,
): { list: Transaction[]; added: boolean } {
  const existing = transactions.find((t) => t.id === txn.id);
  if (shouldExist && !existing) return { list: [...transactions, txn], added: true };
  if (!shouldExist && existing) return { list: transactions.filter((t) => t.id !== txn.id), added: false };
  return { list: transactions, added: false };
}

/**
 * Recomputes derived payouts (perfect day/week, teamwork) and trophy awards for a date.
 * Safe to run repeatedly: derived rows are keyed deterministically and removed when
 * their condition no longer holds.
 */
export function reconcile(state: AppState, date: string): EngineResult {
  const events: CelebrationEvent[] = [];
  let transactions = state.transactions;
  const { perfectDayBonusCents, perfectWeekBonusCents, teamBonusCents } = state.settings;
  const now = new Date().toISOString();

  for (const kid of state.kids) {
    const summary = daySummary(state, kid.id, date);

    if (perfectDayBonusCents > 0) {
      const txn: Transaction = {
        id: autoTxnId('perfect-day', kid.id, date),
        kidId: kid.id,
        date,
        type: 'perfect-day',
        amountCents: perfectDayBonusCents,
        note: 'All chores done bonus',
        createdAt: now,
      };
      const res = upsertAutoTxn(transactions, txn, summary.allDailyDone);
      transactions = res.list;
      if (res.added) {
        events.push({
          kind: 'bonus',
          kidId: kid.id,
          label: 'All chores done!',
          emoji: '✨',
          amountCents: perfectDayBonusCents,
        });
      }
    }

    if (perfectWeekBonusCents > 0) {
      const week = weekStart(date);
      const txn: Transaction = {
        id: autoTxnId('perfect-week', kid.id, week),
        kidId: kid.id,
        date,
        type: 'perfect-week',
        amountCents: perfectWeekBonusCents,
        note: 'Perfect week bonus',
        createdAt: now,
      };
      const res = upsertAutoTxn(transactions, txn, isPerfectWeek(state, kid.id, date));
      transactions = res.list;
      if (res.added) {
        events.push({
          kind: 'bonus',
          kidId: kid.id,
          label: 'Perfect week!',
          emoji: '🗓️',
          amountCents: perfectWeekBonusCents,
        });
      }
    }

    if (teamBonusCents > 0) {
      const txn: Transaction = {
        id: autoTxnId('team', kid.id, date),
        kidId: kid.id,
        date,
        type: 'team',
        amountCents: teamBonusCents,
        note: 'Teamwork bonus',
        createdAt: now,
      };
      const res = upsertAutoTxn(transactions, txn, isTeamDay(state, date));
      transactions = res.list;
      if (res.added) {
        events.push({
          kind: 'bonus',
          kidId: kid.id,
          label: 'Teamwork bonus!',
          emoji: '🤝',
          amountCents: teamBonusCents,
        });
      }
    }
  }

  let working: AppState = { ...state, transactions };
  let trophies: AwardedTrophy[] = working.trophies;

  for (const def of TROPHIES) {
    const holders: (KidId | 'team')[] = def.scope === 'team' ? ['team'] : working.kids.map((k) => k.id);
    for (const holder of holders) {
      const testKid = def.scope === 'team' ? working.kids[0]?.id ?? '' : holder;
      const passes = def.test(working, testKid, date);
      const existing = trophies.find((t) => t.trophyId === def.id && t.kidId === holder);
      if (passes && !existing) {
        trophies = [
          ...trophies,
          {
            id: `${def.id}|${holder}`,
            trophyId: def.id,
            kidId: holder,
            date,
            awardedAt: now,
          },
        ];
        events.push({ kind: 'trophy', kidId: holder, trophyId: def.id, name: def.name, emoji: def.emoji });
        working = { ...working, trophies };
      } else if (!passes && existing && existing.date === date) {
        trophies = trophies.filter((t) => t !== existing);
        working = { ...working, trophies };
      }
    }
  }

  return { state: { ...working, trophies, updatedAt: now }, events };
}

export function tickChore(
  state: AppState,
  kidId: KidId,
  date: string,
  chore: DayChore,
): EngineResult {
  const key = completionKey(date, kidId, chore.id);
  const now = new Date().toISOString();
  const completion: Completion = {
    id: key,
    date,
    kidId,
    choreId: chore.id,
    name: chore.name,
    emoji: chore.emoji,
    amountCents: chore.amountCents,
    kind: chore.kind,
    completedAt: now,
  };
  const txn: Transaction = {
    id: `chore|${key}`,
    kidId,
    date,
    type: chore.kind === 'bonus' ? 'bonus' : 'chore',
    amountCents: chore.amountCents,
    note: `${chore.emoji} ${chore.name}`,
    createdAt: now,
    completionId: key,
  };
  const next: AppState = {
    ...state,
    completions: { ...state.completions, [key]: completion },
    transactions: [...state.transactions, txn],
  };
  const result = reconcile(next, date);
  return {
    state: result.state,
    events: [
      { kind: 'chore', kidId, name: chore.name, emoji: chore.emoji, amountCents: chore.amountCents },
      ...result.events,
    ],
  };
}

export function untickChore(state: AppState, kidId: KidId, date: string, choreId: string): EngineResult {
  const key = completionKey(date, kidId, choreId);
  const completions = { ...state.completions };
  delete completions[key];
  const next: AppState = {
    ...state,
    completions,
    transactions: state.transactions.filter((t) => t.completionId !== key),
  };
  const result = reconcile(next, date);
  return { state: result.state, events: [] };
}

export function addManualTransaction(
  state: AppState,
  kidId: KidId,
  date: string,
  type: 'deposit' | 'withdrawal',
  amountCents: number,
  note: string,
): AppState {
  const signed = type === 'withdrawal' ? -Math.abs(amountCents) : Math.abs(amountCents);
  const txn: Transaction = {
    id: `manual|${crypto.randomUUID()}`,
    kidId,
    date,
    type,
    amountCents: signed,
    note: note || (type === 'deposit' ? 'Money added' : 'Money taken out'),
    createdAt: new Date().toISOString(),
  };
  return { ...state, transactions: [...state.transactions, txn], updatedAt: new Date().toISOString() };
}
