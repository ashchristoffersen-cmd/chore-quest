import { useState } from 'react';
import { useStore } from '../store';
import { TROPHIES, TROPHY_GROUPS } from '../lib/trophies';
import { formatDay } from '../lib/date';

export function TrophyView() {
  const { state, today } = useStore();
  const [holder, setHolder] = useState<string>(state.kids[0]?.id ?? 'team');

  const isTeamTab = holder === 'team';
  const visible = TROPHIES.filter((t) => (isTeamTab ? t.scope === 'team' : t.scope === 'kid'));
  const earned = state.trophies.filter((t) => t.kidId === holder);
  const kid = state.kids.find((k) => k.id === holder);

  return (
    <div className="view">
      <header className="view-header">
        <h1>🏆 Trophies</h1>
        <div className="kid-switch">
          {state.kids.map((k) => (
            <button type="button" key={k.id} className={k.id === holder ? 'active' : ''} onClick={() => setHolder(k.id)}>
              {k.emoji} {k.name}
            </button>
          ))}
          <button type="button" className={isTeamTab ? 'active' : ''} onClick={() => setHolder('team')}>
            🤝 Team
          </button>
        </div>
      </header>

      <p className="muted">
        {earned.length} of {visible.length} unlocked{kid ? ` by ${kid.name}` : ''}
      </p>

      {TROPHY_GROUPS.filter((g) => visible.some((t) => t.group === g)).map((group) => (
        <section key={group}>
          <h3 className="section-title">{group}</h3>
          <div className="trophy-grid">
            {visible
              .filter((t) => t.group === group)
              .map((def) => {
                const award = earned.find((e) => e.trophyId === def.id);
                return (
                  <div className={`trophy${award ? ' unlocked' : ''}`} key={def.id}>
                    <span className="trophy-emoji">{award ? def.emoji : '🔒'}</span>
                    <span className="trophy-name">{def.name}</span>
                    <span className="trophy-desc">{def.description}</span>
                    {award && <span className="trophy-date">{formatDay(award.date, today)}</span>}
                  </div>
                );
              })}
          </div>
        </section>
      ))}
    </div>
  );
}
