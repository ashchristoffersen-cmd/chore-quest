import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { PinGate } from '../components/PinGate';
import { addManualTransaction } from '../lib/engine';
import { balanceCents, completionsOn, daySummary } from '../lib/stats';
import { formatDay, formatTime } from '../lib/date';
import { formatMoney, parseMoney } from '../lib/money';
import type { Transaction } from '../types';

const TYPE_META: Record<Transaction['type'], { emoji: string; label: string }> = {
  chore: { emoji: '✅', label: 'Chore' },
  bonus: { emoji: '⚡', label: 'Bonus Blitz' },
  'perfect-day': { emoji: '✨', label: 'All chores bonus' },
  'perfect-week': { emoji: '🗓️', label: 'Perfect week bonus' },
  team: { emoji: '🤝', label: 'Teamwork bonus' },
  deposit: { emoji: '➕', label: 'Money added' },
  withdrawal: { emoji: '➖', label: 'Money out' },
  interest: { emoji: '📈', label: 'Interest' },
};

export function VaultView() {
  const { state, today, setState } = useStore();
  const [kidId, setKidId] = useState(state.kids[0]?.id ?? '');
  const [openDay, setOpenDay] = useState<string | null>(null);
  const [pending, setPending] = useState<null | { type: 'deposit' | 'withdrawal' }>(null);
  const [pinFor, setPinFor] = useState<null | { type: 'deposit' | 'withdrawal' }>(null);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');

  const kid = state.kids.find((k) => k.id === kidId) ?? state.kids[0];
  const symbol = state.settings.currencySymbol;
  const balance = kid ? balanceCents(state, kid.id) : 0;

  const days = useMemo(() => {
    if (!kid) return [];
    const grouped = new Map<string, Transaction[]>();
    for (const txn of state.transactions.filter((t) => t.kidId === kid.id)) {
      const list = grouped.get(txn.date) ?? [];
      list.push(txn);
      grouped.set(txn.date, list);
    }
    return [...grouped.entries()]
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, txns]) => ({ date, txns, total: txns.reduce((s, t) => s + t.amountCents, 0) }));
  }, [state.transactions, kid]);

  if (!kid) return <div className="view">No kids configured yet.</div>;

  const goalPct = kid.goal ? Math.min(100, Math.round((balance / kid.goal.targetCents) * 100)) : 0;

  const submit = () => {
    if (!pending) return;
    const cents = parseMoney(amount);
    if (cents <= 0) return;
    setState((prev) => addManualTransaction(prev, kid.id, today, pending.type, cents, note));
    setPending(null);
    setAmount('');
    setNote('');
  };

  return (
    <div className="view">
      <header className="view-header">
        <h1>🏦 Vault</h1>
        <div className="kid-switch">
          {state.kids.map((k) => (
            <button type="button" key={k.id} className={k.id === kidId ? 'active' : ''} onClick={() => setKidId(k.id)}>
              {k.emoji} {k.name}
            </button>
          ))}
        </div>
      </header>

      <section className="balance-card" style={{ '--kid-color': kid.color } as React.CSSProperties}>
        <p className="muted">{kid.name}'s balance</p>
        <p className="balance">{formatMoney(balance, symbol)}</p>
        {kid.goal && (
          <div className="goal">
            <div className="goal-label">
              <span>
                {kid.goal.emoji} {kid.goal.label}
              </span>
              <span>
                {formatMoney(balance, symbol)} / {formatMoney(kid.goal.targetCents, symbol)}
              </span>
            </div>
            <div className="goal-bar">
              <div className="goal-fill" style={{ width: `${goalPct}%` }} />
            </div>
            <p className="muted small">{goalPct}% of the way there</p>
          </div>
        )}
        <div className="row-buttons">
          <button type="button" onClick={() => setPinFor({ type: 'deposit' })}>
            ➕ Add money
          </button>
          <button type="button" className="ghost" onClick={() => setPinFor({ type: 'withdrawal' })}>
            ➖ Take out
          </button>
        </div>
      </section>

      <h3 className="section-title">History</h3>
      <div className="history">
        {days.length === 0 && <p className="muted empty">No money movement yet.</p>}
        {days.map(({ date, txns, total }) => {
          const summary = daySummary(state, kid.id, date);
          const open = openDay === date;
          return (
            <div className={`history-day${open ? ' open' : ''}`} key={date}>
              <button type="button" className="history-head" onClick={() => setOpenDay(open ? null : date)}>
                <span className="history-date">{formatDay(date, today)}</span>
                <span className="muted">
                  {summary.dailyDone}/{summary.dailyTotal} chores
                  {summary.bonusDone > 0 ? ` · ${summary.bonusDone} bonus` : ''}
                </span>
                <span className={total >= 0 ? 'amount pos' : 'amount neg'}>{formatMoney(total, symbol)}</span>
              </button>
              {open && (
                <div className="history-detail">
                  {completionsOn(state, kid.id, date).length > 0 && (
                    <>
                      <p className="detail-title">Chores done</p>
                      <ul>
                        {completionsOn(state, kid.id, date).map((c) => (
                          <li key={c.id}>
                            <span>
                              {c.emoji} {c.name}
                            </span>
                            <span className="muted">{formatTime(c.completedAt)}</span>
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                  <p className="detail-title">Money</p>
                  <ul>
                    {txns.map((t) => (
                      <li key={t.id}>
                        <span>
                          {TYPE_META[t.type].emoji} {t.note || TYPE_META[t.type].label}
                        </span>
                        <span className={t.amountCents >= 0 ? 'amount pos' : 'amount neg'}>
                          {formatMoney(t.amountCents, symbol)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {pinFor && (
        <PinGate
          title={pinFor.type === 'deposit' ? 'Add money' : 'Take money out'}
          pin={state.settings.pin}
          onCancel={() => setPinFor(null)}
          onSuccess={() => {
            setPending(pinFor);
            setPinFor(null);
          }}
        />
      )}

      {pending && (
        <div className="modal-backdrop" onClick={() => setPending(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>{pending.type === 'deposit' ? '➕ Add money' : '➖ Take money out'}</h2>
            <label>
              Amount
              <input
                type="text"
                inputMode="decimal"
                autoFocus
                value={amount}
                placeholder="5.00"
                onChange={(e) => setAmount(e.target.value)}
              />
            </label>
            <label>
              Note
              <input
                type="text"
                value={note}
                placeholder={pending.type === 'deposit' ? 'Birthday money' : 'Bought a toy'}
                onChange={(e) => setNote(e.target.value)}
              />
            </label>
            <div className="row-buttons">
              <button type="button" onClick={submit}>
                Save
              </button>
              <button type="button" className="ghost" onClick={() => setPending(null)}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
