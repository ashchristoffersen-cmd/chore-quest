import type { AppState, Chore } from '../types';
import { ALL_DAYS, WEEKEND_DAYS } from './date';

const DAILY = [
  { name: 'Get dressed', emoji: '👕', amountCents: 50 },
  { name: 'Make bed', emoji: '🛏️', amountCents: 50 },
  { name: 'Brush teeth', emoji: '🪥', amountCents: 50 },
  { name: 'Pack school bag', emoji: '🎒', amountCents: 50 },
  { name: 'Tidy toys', emoji: '🧸', amountCents: 50 },
  { name: 'Put clothes in basket', emoji: '🧺', amountCents: 50 },
];

const BONUS = [
  { name: "Clean Mum's bathroom", emoji: '🚿', amountCents: 200 },
  { name: 'Clean my bathroom', emoji: '🛁', amountCents: 150 },
  { name: "Clean brother/sister's bathroom", emoji: '🧽', amountCents: 150 },
  { name: 'Clean the bath', emoji: '🫧', amountCents: 150 },
  { name: 'Clean windows', emoji: '🪟', amountCents: 200 },
  { name: 'Clean pool fence', emoji: '🏊', amountCents: 250 },
  { name: 'Sweep the floor', emoji: '🧹', amountCents: 100 },
  { name: 'Wipe the table', emoji: '🍽️', amountCents: 100 },
];

function choresFor(kidId: string): Chore[] {
  const daily = DAILY.map((c, i) => ({
    id: `${kidId}-daily-${i}`,
    kidId,
    ...c,
    kind: 'daily' as const,
    days: ALL_DAYS,
    order: i,
    archived: false,
  }));
  const bonus = BONUS.map((c, i) => ({
    id: `${kidId}-bonus-${i}`,
    kidId,
    ...c,
    kind: 'bonus' as const,
    days: WEEKEND_DAYS,
    order: i,
    archived: false,
  }));
  return [...daily, ...bonus];
}

export function defaultState(): AppState {
  return {
    version: 1,
    kids: [
      {
        id: 'remy',
        name: 'Remy',
        emoji: '🦁',
        color: '#f97316',
        goal: { label: 'Lego set', emoji: '🧱', targetCents: 4000 },
      },
      {
        id: 'amelie',
        name: 'Amelie',
        emoji: '🦄',
        color: '#a855f7',
        goal: { label: 'Art kit', emoji: '🎨', targetCents: 3000 },
      },
    ],
    chores: [...choresFor('remy'), ...choresFor('amelie')],
    oneOffs: [],
    completions: {},
    transactions: [],
    trophies: [],
    settings: {
      pin: '1234',
      currencySymbol: '$',
      dayResetHour: 0,
      dateOverride: null,
      soundEnabled: true,
      perfectDayBonusCents: 100,
      perfectWeekBonusCents: 500,
      teamBonusCents: 100,
      interest: { enabled: false, weeklyRatePercent: 5, lastAppliedWeek: null },
    },
    updatedAt: new Date().toISOString(),
  };
}

export const AVATAR_CHOICES = ['🦁', '🦄', '🐼', '🦊', '🐸', '🐨', '🐯', '🦖', '🐙', '🦉', '🐝', '🐢'];

export const CHORE_EMOJI_CHOICES = [
  '👕', '🛏️', '🪥', '🎒', '🧸', '🧺', '🍽️', '🧹', '🚿', '🛁', '🧽', '🪟',
  '🏊', '🐕', '🌱', '📚', '🧴', '🚮', '🍎', '🧼', '🪣', '🚲',
];
