import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import type { AppState, Transaction } from './types';
import { defaultState } from './lib/defaults';
import { choreDate, weekStart } from './lib/date';
import { balanceCents } from './lib/stats';
import { pullState, pushState, syncEnabled } from './lib/sync';

const STORAGE_KEY = 'chore-quest-state-v1';

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw) as AppState;
    return { ...defaultState(), ...parsed, settings: { ...defaultState().settings, ...parsed.settings } };
  } catch {
    return defaultState();
  }
}

function save(state: AppState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/** Pays weekly interest on the vault balance, at most once per week. */
function applyInterest(state: AppState, date: string): AppState {
  const { interest } = state.settings;
  const week = weekStart(date);
  if (!interest.enabled || interest.lastAppliedWeek === week) return state;
  const now = new Date().toISOString();
  const payments: Transaction[] = state.kids
    .map((kid): Transaction | null => {
      const amount = Math.round((balanceCents(state, kid.id) * interest.weeklyRatePercent) / 100);
      if (amount <= 0) return null;
      return {
        id: `auto|interest|${kid.id}|${week}`,
        kidId: kid.id,
        date,
        type: 'interest' as const,
        amountCents: amount,
        note: `Vault interest (${interest.weeklyRatePercent}%)`,
        createdAt: now,
      };
    })
    .filter((t): t is Transaction => t !== null)
    .filter((t) => !state.transactions.some((existing) => existing.id === t.id));
  return {
    ...state,
    transactions: [...state.transactions, ...payments],
    settings: { ...state.settings, interest: { ...interest, lastAppliedWeek: week } },
    updatedAt: now,
  };
}

interface StoreValue {
  state: AppState;
  today: string;
  setState: (updater: (prev: AppState) => AppState) => void;
  syncStatus: 'off' | 'ok' | 'error' | 'syncing';
  resetAll: () => void;
}

const StoreContext = createContext<StoreValue | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setStateRaw] = useState<AppState>(load);
  const [syncStatus, setSyncStatus] = useState<StoreValue['syncStatus']>(syncEnabled ? 'syncing' : 'off');
  const [nowTick, setNowTick] = useState(() => Date.now());
  const lastPushed = useRef<string>('');

  const today = useMemo(
    () => choreDate(state.settings.dayResetHour, state.settings.dateOverride, new Date(nowTick)),
    [state.settings.dayResetHour, state.settings.dateOverride, nowTick],
  );

  const setState = useCallback((updater: (prev: AppState) => AppState) => {
    setStateRaw((prev) => {
      const next = updater(prev);
      return next === prev ? prev : { ...next, updatedAt: new Date().toISOString() };
    });
  }, []);

  useEffect(() => {
    save(state);
  }, [state]);

  // Roll the day over without a refresh.
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    setStateRaw((prev) => applyInterest(prev, today));
  }, [today]);

  // Pull remote state on start and whenever the app regains focus.
  useEffect(() => {
    if (!syncEnabled) return;
    let cancelled = false;
    const pull = async () => {
      try {
        const remote = await pullState();
        if (cancelled) return;
        setStateRaw((prev) => (remote && remote.updatedAt > prev.updatedAt ? remote : prev));
        setSyncStatus('ok');
      } catch {
        if (!cancelled) setSyncStatus('error');
      }
    };
    void pull();
    const id = setInterval(pull, 15_000);
    const onFocus = () => void pull();
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
    };
  }, []);

  // Push local changes (debounced).
  useEffect(() => {
    if (!syncEnabled) return;
    if (lastPushed.current === state.updatedAt) return;
    const id = setTimeout(async () => {
      try {
        setSyncStatus('syncing');
        await pushState(state);
        lastPushed.current = state.updatedAt;
        setSyncStatus('ok');
      } catch {
        setSyncStatus('error');
      }
    }, 800);
    return () => clearTimeout(id);
  }, [state]);

  const resetAll = useCallback(() => setStateRaw(defaultState()), []);

  const value = useMemo<StoreValue>(
    () => ({ state, today, setState, syncStatus, resetAll }),
    [state, today, setState, syncStatus, resetAll],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore(): StoreValue {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used inside StoreProvider');
  return ctx;
}
