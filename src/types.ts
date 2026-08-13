export type KidId = string;

export interface Kid {
  id: KidId;
  name: string;
  emoji: string;
  color: string;
  goal: SavingsGoal | null;
}

export interface SavingsGoal {
  label: string;
  emoji: string;
  targetCents: number;
}

export type ChoreKind = 'daily' | 'bonus';

/** A recurring chore template. `days` holds ISO weekday numbers (1 = Mon ... 7 = Sun). */
export interface Chore {
  id: string;
  kidId: KidId;
  name: string;
  emoji: string;
  amountCents: number;
  kind: ChoreKind;
  days: number[];
  order: number;
  archived: boolean;
}

/** A chore that exists only on one date, added by a parent on the fly. */
export interface OneOffChore {
  id: string;
  date: string;
  kidId: KidId;
  name: string;
  emoji: string;
  amountCents: number;
  kind: ChoreKind;
}

export interface Completion {
  /** `${date}|${kidId}|${choreId}` */
  id: string;
  date: string;
  kidId: KidId;
  choreId: string;
  name: string;
  emoji: string;
  amountCents: number;
  kind: ChoreKind;
  completedAt: string;
}

export type TxnType =
  | 'chore'
  | 'bonus'
  | 'perfect-day'
  | 'perfect-week'
  | 'team'
  | 'deposit'
  | 'withdrawal'
  | 'interest';

export interface Transaction {
  id: string;
  kidId: KidId;
  date: string;
  type: TxnType;
  amountCents: number;
  note: string;
  createdAt: string;
  /** Set for chore/bonus rows so un-ticking can reverse the exact payment. */
  completionId?: string;
}

export interface AwardedTrophy {
  id: string;
  trophyId: string;
  /** Kid id, or 'team' for shared trophies. */
  kidId: KidId | 'team';
  date: string;
  awardedAt: string;
}

export interface Settings {
  pin: string;
  currencySymbol: string;
  /** Hour (0-23) the chore day rolls over. */
  dayResetHour: number;
  /** Manual override: pin the app to this date instead of "now". */
  dateOverride: string | null;
  soundEnabled: boolean;
  perfectDayBonusCents: number;
  perfectWeekBonusCents: number;
  teamBonusCents: number;
  interest: {
    enabled: boolean;
    /** Percent per week, e.g. 5 = 5%. */
    weeklyRatePercent: number;
    lastAppliedWeek: string | null;
  };
}

export interface AppState {
  version: number;
  kids: Kid[];
  chores: Chore[];
  oneOffs: OneOffChore[];
  completions: Record<string, Completion>;
  transactions: Transaction[];
  trophies: AwardedTrophy[];
  settings: Settings;
  updatedAt: string;
}
