import { useState } from 'react';
import { useStore } from '../store';
import { useCelebrate } from '../celebrationContext';
import { tickChore, untickChore } from '../lib/engine';
import { choresForDay, daySummary, isDone, streakLength } from '../lib/stats';
import { formatDay, isWeekend } from '../lib/date';
import { formatMoney } from '../lib/money';
import type { DayChore } from '../lib/stats';
import type { Kid } from '../types';

function ProgressRing({ value, total, color }: { value: number; total: number; color: string }) {
  const pct = total === 0 ? 0 : value / total;
  return (
    <div
      className="ring"
      style={{ background: `conic-gradient(${color} ${pct * 360}deg, rgba(255,255,255,0.12) 0deg)` }}
    >
      <div className="ring-inner">
        {value}/{total}
      </div>
    </div>
  );
}

function ChoreRow({
  chore,
  kid,
  done,
  onToggle,
  currencySymbol,
}: {
  chore: DayChore;
  kid: Kid;
  done: boolean;
  onToggle: () => void;
  currencySymbol: string;
}) {
  return (
    <button
      type="button"
      className={`chore-row${done ? ' done' : ''}`}
      onClick={onToggle}
      style={{ '--kid-color': kid.color } as React.CSSProperties}
    >
      <span className="chore-emoji">{chore.emoji}</span>
      <span className="chore-text">
        <span className="chore-name">{chore.name}</span>
        <span className="chore-amount">{formatMoney(chore.amountCents, currencySymbol)}</span>
      </span>
      <span className={`checkbox${done ? ' checked' : ''}`}>{done ? '✓' : ''}</span>
    </button>
  );
}

export function TodayView({ kidFilter }: { kidFilter: string | null }) {
  const { state, today, setState } = useStore();
  const celebrate = useCelebrate();
  const [selected, setSelected] = useState<string | null>(kidFilter);

  const kids = selected ? state.kids.filter((k) => k.id === selected) : state.kids;
  const symbol = state.settings.currencySymbol;

  const toggle = (kidId: string, chore: DayChore, done: boolean) => {
    if (done) {
      setState((prev) => untickChore(prev, kidId, today, chore.id).state);
      return;
    }
    let events: ReturnType<typeof tickChore>['events'] = [];
    setState((prev) => {
      const result = tickChore(prev, kidId, today, chore);
      events = result.events;
      return result.state;
    });
    setTimeout(() => celebrate(events), 0);
  };

  return (
    <div className="view">
      <header className="view-header">
        <div>
          <h1>{formatDay(today, today)}</h1>
          <p className="muted">{isWeekend(today) ? '🎉 Bonus Blitz weekend!' : 'Chore time'}</p>
        </div>
        <div className="kid-switch">
          <button type="button" className={selected === null ? 'active' : ''} onClick={() => setSelected(null)}>
            Both
          </button>
          {state.kids.map((k) => (
            <button
              type="button"
              key={k.id}
              className={selected === k.id ? 'active' : ''}
              onClick={() => setSelected(k.id)}
            >
              {k.emoji}
            </button>
          ))}
        </div>
      </header>

      {kids.map((kid) => {
        const chores = choresForDay(state, kid.id, today);
        const daily = chores.filter((c) => c.kind === 'daily');
        const bonus = chores.filter((c) => c.kind === 'bonus');
        const summary = daySummary(state, kid.id, today);
        const streak = streakLength(state, kid.id, today);
        return (
          <section className="kid-panel" key={kid.id} style={{ '--kid-color': kid.color } as React.CSSProperties}>
            <div className="kid-panel-head">
              <span className="kid-avatar">{kid.emoji}</span>
              <div className="kid-headline">
                <h2>{kid.name}</h2>
                <p className="muted">
                  🔥 {streak} day streak · 💰 {formatMoney(summary.earnedCents, symbol)} today
                </p>
              </div>
              <ProgressRing value={summary.dailyDone} total={summary.dailyTotal} color={kid.color} />
            </div>

            {summary.allDailyDone && <div className="all-done-banner">🎉 All chores done! Legend.</div>}

            <div className="chore-list">
              {daily.map((chore) => (
                <ChoreRow
                  key={chore.id}
                  chore={chore}
                  kid={kid}
                  currencySymbol={symbol}
                  done={isDone(state, kid.id, today, chore.id)}
                  onToggle={() => toggle(kid.id, chore, isDone(state, kid.id, today, chore.id))}
                />
              ))}
              {daily.length === 0 && <p className="muted empty">No chores today 🎈</p>}
            </div>

            {bonus.length > 0 && (
              <>
                <h3 className="section-title">⚡ Bonus Blitz</h3>
                <div className="chore-list">
                  {bonus.map((chore) => (
                    <ChoreRow
                      key={chore.id}
                      chore={chore}
                      kid={kid}
                      currencySymbol={symbol}
                      done={isDone(state, kid.id, today, chore.id)}
                      onToggle={() => toggle(kid.id, chore, isDone(state, kid.id, today, chore.id))}
                    />
                  ))}
                </div>
              </>
            )}
          </section>
        );
      })}
    </div>
  );
}
