import type { AppState, KidId } from '../types';
import { addDays, isWeekend } from './date';
import {
  balanceCents,
  bonusChoresDone,
  choresForDay,
  daySummary,
  isDone,
  isPerfectMonth,
  isPerfectWeek,
  isTeamDay,
  lastCompletionMinutes,
  streakLength,
  teamDayCount,
  totalChoresDone,
  totalEarnedCents,
} from './stats';

export type TrophyScope = 'kid' | 'team';

export interface TrophyDef {
  id: string;
  name: string;
  emoji: string;
  description: string;
  scope: TrophyScope;
  group: 'Getting started' | 'Streaks' | 'Perfect' | 'Bonus Blitz' | 'Money' | 'Teamwork';
  /** Extra cents paid out when the trophy is unlocked. */
  rewardCents?: number;
  test: (state: AppState, kidId: KidId, date: string) => boolean;
}

const streakTrophy = (
  days: number,
  name: string,
  emoji: string,
): TrophyDef => ({
  id: `streak-${days}`,
  name,
  emoji,
  description: `${days} days in a row with every chore done`,
  scope: 'kid',
  group: 'Streaks',
  test: (state, kidId, date) => streakLength(state, kidId, date) >= days,
});

const choreCountTrophy = (count: number, name: string, emoji: string): TrophyDef => ({
  id: `chores-${count}`,
  name,
  emoji,
  description: `${count} chores completed all up`,
  scope: 'kid',
  group: 'Getting started',
  test: (state, kidId) => totalChoresDone(state, kidId) >= count,
});

const savedTrophy = (dollars: number, name: string, emoji: string): TrophyDef => ({
  id: `saved-${dollars}`,
  name,
  emoji,
  description: `Have $${dollars} in the vault at once`,
  scope: 'kid',
  group: 'Money',
  test: (state, kidId) => balanceCents(state, kidId) >= dollars * 100,
});

const earnedTrophy = (dollars: number, name: string, emoji: string): TrophyDef => ({
  id: `earned-${dollars}`,
  name,
  emoji,
  description: `Earn $${dollars} from chores in total`,
  scope: 'kid',
  group: 'Money',
  test: (state, kidId) => totalEarnedCents(state, kidId) >= dollars * 100,
});

const bonusCountTrophy = (count: number, name: string, emoji: string): TrophyDef => ({
  id: `bonus-${count}`,
  name,
  emoji,
  description: `${count} Bonus Blitz jobs smashed`,
  scope: 'kid',
  group: 'Bonus Blitz',
  test: (state, kidId) => bonusChoresDone(state, kidId) >= count,
});

export const TROPHIES: TrophyDef[] = [
  {
    id: 'first-chore',
    name: 'First Steps',
    emoji: '👣',
    description: 'Tick off your very first chore',
    scope: 'kid',
    group: 'Getting started',
    test: (state, kidId) => totalChoresDone(state, kidId) >= 1,
  },
  choreCountTrophy(10, 'Getting Good', '🌟'),
  choreCountTrophy(50, 'Chore Champ', '🏅'),
  choreCountTrophy(100, 'Century Club', '💯'),
  choreCountTrophy(250, 'Chore Legend', '🐉'),
  choreCountTrophy(500, 'Hall of Fame', '🏛️'),

  {
    id: 'perfect-day',
    name: 'Perfect Day',
    emoji: '✨',
    description: 'Every chore done in one day',
    scope: 'kid',
    group: 'Perfect',
    test: (state, kidId, date) => daySummary(state, kidId, date).allDailyDone,
  },
  {
    id: 'perfect-week',
    name: 'Perfect Week',
    emoji: '🗓️',
    description: 'Every chore, every day, for a whole week',
    scope: 'kid',
    group: 'Perfect',
    test: (state, kidId, date) => isPerfectWeek(state, kidId, date),
  },
  {
    id: 'perfect-month',
    name: 'Perfect Month',
    emoji: '🌝',
    description: 'A whole month without missing a chore',
    scope: 'kid',
    group: 'Perfect',
    test: (state, kidId, date) => isPerfectMonth(state, kidId, date),
  },
  {
    id: 'early-bird',
    name: 'Early Bird',
    emoji: '🐤',
    description: 'All chores finished before 8am',
    scope: 'kid',
    group: 'Perfect',
    test: (state, kidId, date) => {
      const summary = daySummary(state, kidId, date);
      const minutes = lastCompletionMinutes(state, kidId, date);
      return summary.allDailyDone && minutes !== null && minutes < 8 * 60;
    },
  },
  {
    id: 'before-school',
    name: 'Beat the Bell',
    emoji: '🔔',
    description: 'All chores done before school on a school day',
    scope: 'kid',
    group: 'Perfect',
    test: (state, kidId, date) => {
      if (isWeekend(date)) return false;
      const summary = daySummary(state, kidId, date);
      const minutes = lastCompletionMinutes(state, kidId, date);
      return summary.allDailyDone && minutes !== null && minutes < 9 * 60;
    },
  },
  {
    id: 'comeback',
    name: 'Comeback Kid',
    emoji: '🔥',
    description: 'A perfect day right after a missed day',
    scope: 'kid',
    group: 'Streaks',
    test: (state, kidId, date) => {
      const today = daySummary(state, kidId, date);
      const prev = addDays(date, -1);
      const yesterday = daySummary(state, kidId, prev);
      const startedYesterday = yesterday.dailyDone > 0 || yesterday.bonusDone > 0;
      return today.allDailyDone && startedYesterday && !yesterday.allDailyDone;
    },
  },

  streakTrophy(3, 'Triple Threat', '3️⃣'),
  streakTrophy(7, 'Week Warrior', '🛡️'),
  streakTrophy(14, 'Fortnight Force', '⚡'),
  streakTrophy(30, 'Monthly Master', '🥇'),
  streakTrophy(60, 'Unstoppable', '🚀'),
  streakTrophy(100, 'Hundred Hero', '👑'),

  {
    id: 'weekend-warrior',
    name: 'Weekend Warrior',
    emoji: '🧹',
    description: 'Do a Bonus Blitz job on a weekend',
    scope: 'kid',
    group: 'Bonus Blitz',
    test: (state, kidId, date) => isWeekend(date) && daySummary(state, kidId, date).bonusDone >= 1,
  },
  {
    id: 'blitz-clean-sweep',
    name: 'Clean Sweep',
    emoji: '🌪️',
    description: 'Finish every Bonus Blitz job available in one day',
    scope: 'kid',
    group: 'Bonus Blitz',
    test: (state, kidId, date) => {
      const bonus = choresForDay(state, kidId, date).filter((c) => c.kind === 'bonus');
      return bonus.length > 0 && bonus.every((c) => isDone(state, kidId, date, c.id));
    },
  },
  {
    id: 'blitz-triple',
    name: 'Blitz Triple',
    emoji: '🥉',
    description: '3 Bonus Blitz jobs in a single day',
    scope: 'kid',
    group: 'Bonus Blitz',
    test: (state, kidId, date) => daySummary(state, kidId, date).bonusDone >= 3,
  },
  bonusCountTrophy(5, 'Sparkle Squad', '🫧'),
  bonusCountTrophy(20, 'Bathroom Boss', '🚿'),
  bonusCountTrophy(50, 'Master Cleaner', '🧼'),

  savedTrophy(10, 'Piggy Starter', '🐷'),
  savedTrophy(25, 'Saver', '💰'),
  savedTrophy(50, 'Big Saver', '🏦'),
  savedTrophy(100, 'Vault Keeper', '🔐'),
  earnedTrophy(20, 'Working Hard', '💪'),
  earnedTrophy(100, 'Big Earner', '💸'),
  {
    id: 'goal-reached',
    name: 'Goal Getter',
    emoji: '🎯',
    description: 'Save enough to reach your savings goal',
    scope: 'kid',
    group: 'Money',
    test: (state, kidId) => {
      const kid = state.kids.find((k) => k.id === kidId);
      if (!kid?.goal) return false;
      return balanceCents(state, kidId) >= kid.goal.targetCents;
    },
  },
  {
    id: 'big-day',
    name: 'Payday',
    emoji: '🤑',
    description: 'Earn $5 or more in a single day',
    scope: 'kid',
    group: 'Money',
    test: (state, kidId, date) => daySummary(state, kidId, date).earnedCents >= 500,
  },

  {
    id: 'team-day',
    name: 'Team Trophy',
    emoji: '🤝',
    description: 'Both kids finish all their chores on the same day',
    scope: 'team',
    group: 'Teamwork',
    test: (state, _kidId, date) => isTeamDay(state, date),
  },
  {
    id: 'team-week',
    name: 'Dream Team',
    emoji: '🌈',
    description: 'Both kids have a perfect week together',
    scope: 'team',
    group: 'Teamwork',
    test: (state, _kidId, date) => state.kids.every((k) => isPerfectWeek(state, k.id, date)),
  },
  {
    id: 'team-10',
    name: 'Tag Team Ten',
    emoji: '🔟',
    description: '10 days where both kids finished everything',
    scope: 'team',
    group: 'Teamwork',
    test: (state) => teamDayCount(state) >= 10,
  },
  {
    id: 'team-blitz',
    name: 'Blitz Buddies',
    emoji: '🧽',
    description: 'Both kids do a Bonus Blitz job on the same day',
    scope: 'team',
    group: 'Teamwork',
    test: (state, _kidId, date) => state.kids.every((k) => daySummary(state, k.id, date).bonusDone >= 1),
  },
];

export const TROPHY_GROUPS: TrophyDef['group'][] = [
  'Getting started',
  'Streaks',
  'Perfect',
  'Bonus Blitz',
  'Money',
  'Teamwork',
];

export function trophyById(id: string): TrophyDef | undefined {
  return TROPHIES.find((t) => t.id === id);
}
