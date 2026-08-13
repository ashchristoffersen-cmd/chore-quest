import { useState } from 'react';
import { useStore } from '../store';
import { DEFAULT_PIN, PinGate } from '../components/PinGate';
import { ALL_DAYS, WEEKDAY_LABELS, WEEKEND_DAYS, formatDay, toISODate } from '../lib/date';
import { formatMoney, parseMoney } from '../lib/money';
import { AVATAR_CHOICES, CHORE_EMOJI_CHOICES } from '../lib/defaults';
import { reconcile } from '../lib/engine';
import type { Chore, ChoreKind, Kid } from '../types';

function EmojiPicker({ value, options, onChange }: { value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <div className="emoji-picker">
      {options.map((e) => (
        <button type="button" key={e} className={e === value ? 'active' : ''} onClick={() => onChange(e)}>
          {e}
        </button>
      ))}
    </div>
  );
}

function ChoreEditor({
  chore,
  symbol,
  onChange,
  onDelete,
}: {
  chore: Chore;
  symbol: string;
  onChange: (next: Chore) => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`editor-row${open ? ' open' : ''}`}>
      <button type="button" className="editor-head" onClick={() => setOpen(!open)}>
        <span className="chore-emoji">{chore.emoji}</span>
        <span className="chore-text">
          <span className="chore-name">{chore.name}</span>
          <span className="muted small">
            {formatMoney(chore.amountCents, symbol)} ·{' '}
            {chore.days.length === 7 ? 'Every day' : chore.days.map((d) => WEEKDAY_LABELS[d - 1]).join(' ')}
          </span>
        </span>
        <span className="muted">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="editor-body">
          <label>
            Name
            <input value={chore.name} onChange={(e) => onChange({ ...chore, name: e.target.value })} />
          </label>
          <label>
            Amount
            <input
              inputMode="decimal"
              value={(chore.amountCents / 100).toFixed(2)}
              onChange={(e) => onChange({ ...chore, amountCents: parseMoney(e.target.value) })}
            />
          </label>
          <label>Icon</label>
          <EmojiPicker
            value={chore.emoji}
            options={CHORE_EMOJI_CHOICES}
            onChange={(emoji) => onChange({ ...chore, emoji })}
          />
          <label>Days</label>
          <div className="day-picker">
            {ALL_DAYS.map((d) => (
              <button
                type="button"
                key={d}
                className={chore.days.includes(d) ? 'active' : ''}
                onClick={() =>
                  onChange({
                    ...chore,
                    days: chore.days.includes(d)
                      ? chore.days.filter((x) => x !== d)
                      : [...chore.days, d].sort((a, b) => a - b),
                  })
                }
              >
                {WEEKDAY_LABELS[d - 1]}
              </button>
            ))}
          </div>
          <label>Type</label>
          <div className="day-picker">
            {(['daily', 'bonus'] as ChoreKind[]).map((k) => (
              <button type="button" key={k} className={chore.kind === k ? 'active' : ''} onClick={() => onChange({ ...chore, kind: k })}>
                {k === 'daily' ? 'Daily chore' : 'Bonus Blitz'}
              </button>
            ))}
          </div>
          <button type="button" className="danger" onClick={onDelete}>
            Delete chore
          </button>
        </div>
      )}
    </div>
  );
}

function KidEditor({ kid, symbol, onChange }: { kid: Kid; symbol: string; onChange: (next: Kid) => void }) {
  return (
    <div className="editor-body">
      <label>
        Name
        <input value={kid.name} onChange={(e) => onChange({ ...kid, name: e.target.value })} />
      </label>
      <label>Avatar</label>
      <EmojiPicker value={kid.emoji} options={AVATAR_CHOICES} onChange={(emoji) => onChange({ ...kid, emoji })} />
      <label>
        Colour
        <input type="color" value={kid.color} onChange={(e) => onChange({ ...kid, color: e.target.value })} />
      </label>
      <label>
        Savings goal
        <input
          value={kid.goal?.label ?? ''}
          placeholder="Lego set"
          onChange={(e) =>
            onChange({
              ...kid,
              goal: { emoji: kid.goal?.emoji ?? '🎯', targetCents: kid.goal?.targetCents ?? 0, label: e.target.value },
            })
          }
        />
      </label>
      <label>
        Goal amount ({symbol})
        <input
          inputMode="decimal"
          value={((kid.goal?.targetCents ?? 0) / 100).toFixed(2)}
          onChange={(e) =>
            onChange({
              ...kid,
              goal: {
                emoji: kid.goal?.emoji ?? '🎯',
                label: kid.goal?.label ?? 'Goal',
                targetCents: parseMoney(e.target.value),
              },
            })
          }
        />
      </label>
    </div>
  );
}

export function ParentView() {
  const { state, today, setState, resetAll, syncStatus } = useStore();
  const [unlocked, setUnlocked] = useState(false);
  const [showPin, setShowPin] = useState(false);
  const [tab, setTab] = useState<'chores' | 'kids' | 'settings'>('chores');
  const [activeKid, setActiveKid] = useState(state.kids[0]?.id ?? '');
  const symbol = state.settings.currencySymbol;

  if (!unlocked) {
    return (
      <div className="view">
        <div className="locked">
          <h1>🔒 Parent zone</h1>
          <p className="muted">Chores, money and settings live in here.</p>
          <button type="button" onClick={() => setShowPin(true)}>
            Unlock
          </button>
        </div>
        {showPin && (
          <PinGate
            title="Parent zone"
            pin={state.settings.pin}
            onCancel={() => setShowPin(false)}
            onSuccess={() => {
              setShowPin(false);
              setUnlocked(true);
            }}
          />
        )}
      </div>
    );
  }

  const updateSettings = (patch: Partial<typeof state.settings>) =>
    setState((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));

  const chores = state.chores.filter((c) => c.kidId === activeKid && !c.archived);

  return (
    <div className="view">
      <header className="view-header">
        <h1>🛠️ Parent zone</h1>
        <button type="button" className="ghost small-btn" onClick={() => setUnlocked(false)}>
          Lock
        </button>
      </header>

      <div className="tabs">
        {(['chores', 'kids', 'settings'] as const).map((t) => (
          <button type="button" key={t} className={tab === t ? 'active' : ''} onClick={() => setTab(t)}>
            {t === 'chores' ? 'Chores' : t === 'kids' ? 'Kids' : 'Settings'}
          </button>
        ))}
      </div>

      {tab === 'chores' && (
        <>
          <div className="kid-switch">
            {state.kids.map((k) => (
              <button type="button" key={k.id} className={k.id === activeKid ? 'active' : ''} onClick={() => setActiveKid(k.id)}>
                {k.emoji} {k.name}
              </button>
            ))}
          </div>

          {chores.map((chore) => (
            <ChoreEditor
              key={chore.id}
              chore={chore}
              symbol={symbol}
              onChange={(next) =>
                setState((prev) => ({ ...prev, chores: prev.chores.map((c) => (c.id === next.id ? next : c)) }))
              }
              onDelete={() =>
                setState((prev) => ({
                  ...prev,
                  chores: prev.chores.map((c) => (c.id === chore.id ? { ...c, archived: true } : c)),
                }))
              }
            />
          ))}

          <div className="row-buttons">
            <button
              type="button"
              onClick={() =>
                setState((prev) => ({
                  ...prev,
                  chores: [
                    ...prev.chores,
                    {
                      id: crypto.randomUUID(),
                      kidId: activeKid,
                      name: 'New chore',
                      emoji: '⭐',
                      amountCents: 50,
                      kind: 'daily',
                      days: ALL_DAYS,
                      order: prev.chores.length,
                      archived: false,
                    },
                  ],
                }))
              }
            >
              ➕ Daily chore
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() =>
                setState((prev) => ({
                  ...prev,
                  chores: [
                    ...prev.chores,
                    {
                      id: crypto.randomUUID(),
                      kidId: activeKid,
                      name: 'New bonus job',
                      emoji: '🧽',
                      amountCents: 150,
                      kind: 'bonus',
                      days: WEEKEND_DAYS,
                      order: prev.chores.length,
                      archived: false,
                    },
                  ],
                }))
              }
            >
              ⚡ Bonus job
            </button>
          </div>

          <h3 className="section-title">Just for {formatDay(today, today).toLowerCase()}</h3>
          <p className="muted small">One-off chores that only show up today.</p>
          {state.oneOffs
            .filter((o) => o.date === today && o.kidId === activeKid)
            .map((o) => (
              <div className="editor-row" key={o.id}>
                <div className="editor-head">
                  <span className="chore-emoji">{o.emoji}</span>
                  <span className="chore-text">
                    <span className="chore-name">{o.name}</span>
                    <span className="muted small">{formatMoney(o.amountCents, symbol)}</span>
                  </span>
                  <button
                    type="button"
                    className="ghost small-btn"
                    onClick={() => setState((prev) => ({ ...prev, oneOffs: prev.oneOffs.filter((x) => x.id !== o.id) }))}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))}
          <button
            type="button"
            className="ghost"
            onClick={() =>
              setState((prev) => ({
                ...prev,
                oneOffs: [
                  ...prev.oneOffs,
                  {
                    id: crypto.randomUUID(),
                    date: today,
                    kidId: activeKid,
                    name: 'Extra job',
                    emoji: '⭐',
                    amountCents: 100,
                    kind: 'bonus',
                  },
                ],
              }))
            }
          >
            ➕ Add today-only job
          </button>
        </>
      )}

      {tab === 'kids' && (
        <>
          {state.kids.map((kid) => (
            <section className="card" key={kid.id}>
              <h3 className="section-title">
                {kid.emoji} {kid.name}
              </h3>
              <KidEditor
                kid={kid}
                symbol={symbol}
                onChange={(next) =>
                  setState((prev) => ({ ...prev, kids: prev.kids.map((k) => (k.id === next.id ? next : k)) }))
                }
              />
            </section>
          ))}
        </>
      )}

      {tab === 'settings' && (
        <section className="card">
          <label>
            All-chores-done bonus ({symbol})
            <input
              inputMode="decimal"
              value={(state.settings.perfectDayBonusCents / 100).toFixed(2)}
              onChange={(e) => updateSettings({ perfectDayBonusCents: parseMoney(e.target.value) })}
            />
          </label>
          <label>
            Perfect week bonus ({symbol})
            <input
              inputMode="decimal"
              value={(state.settings.perfectWeekBonusCents / 100).toFixed(2)}
              onChange={(e) => updateSettings({ perfectWeekBonusCents: parseMoney(e.target.value) })}
            />
          </label>
          <label>
            Teamwork bonus, each kid ({symbol})
            <input
              inputMode="decimal"
              value={(state.settings.teamBonusCents / 100).toFixed(2)}
              onChange={(e) => updateSettings({ teamBonusCents: parseMoney(e.target.value) })}
            />
          </label>
          <label>
            Day resets at
            <select
              value={state.settings.dayResetHour}
              onChange={(e) => updateSettings({ dayResetHour: Number(e.target.value) })}
            >
              {Array.from({ length: 24 }, (_, h) => (
                <option key={h} value={h}>
                  {String(h).padStart(2, '0')}:00
                </option>
              ))}
            </select>
          </label>
          <label className="switch">
            <input
              type="checkbox"
              checked={state.settings.soundEnabled}
              onChange={(e) => updateSettings({ soundEnabled: e.target.checked })}
            />
            Sound effects
          </label>
          <label>
            PIN
            <input
              inputMode="numeric"
              value={state.settings.pin}
              onChange={(e) => updateSettings({ pin: e.target.value.replace(/\D/g, '').slice(0, 4) })}
              onBlur={() => {
                if (state.settings.pin.length < 4) updateSettings({ pin: DEFAULT_PIN });
              }}
            />
            <span className="muted">4 digits — reverts to {DEFAULT_PIN} if left blank</span>
          </label>

          <h3 className="section-title">Vault interest (optional)</h3>
          <label className="switch">
            <input
              type="checkbox"
              checked={state.settings.interest.enabled}
              onChange={(e) =>
                updateSettings({ interest: { ...state.settings.interest, enabled: e.target.checked } })
              }
            />
            Pay weekly interest
          </label>
          <label>
            Rate % per week
            <input
              inputMode="decimal"
              value={state.settings.interest.weeklyRatePercent}
              onChange={(e) =>
                updateSettings({
                  interest: { ...state.settings.interest, weeklyRatePercent: Number(e.target.value) || 0 },
                })
              }
            />
          </label>

          <h3 className="section-title">Date override</h3>
          <p className="muted small">Pin the app to a date — handy for catching up on a missed day.</p>
          <input
            type="date"
            value={state.settings.dateOverride ?? toISODate(new Date())}
            onChange={(e) => updateSettings({ dateOverride: e.target.value })}
          />
          <div className="row-buttons">
            <button type="button" className="ghost" onClick={() => updateSettings({ dateOverride: null })}>
              Back to today
            </button>
            <button type="button" className="ghost" onClick={() => setState((prev) => reconcile(prev, today).state)}>
              Recheck trophies
            </button>
          </div>

          <h3 className="section-title">Sync</h3>
          <p className="muted small">
            {syncStatus === 'off'
              ? 'Sync is off — data stays on this device.'
              : syncStatus === 'error'
                ? 'Sync error — will retry.'
                : `Sync ${syncStatus}.`}
          </p>

          <h3 className="section-title">Danger zone</h3>
          <button
            type="button"
            className="danger"
            onClick={() => {
              if (confirm('Erase all chores, money and trophies?')) resetAll();
            }}
          >
            Reset everything
          </button>
        </section>
      )}
    </div>
  );
}
