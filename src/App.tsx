import { useCallback, useState } from 'react';
import { StoreProvider, useStore } from './store';
import { CelebrateContext } from './celebrationContext';
import { Celebration } from './components/Celebration';
import { TodayView } from './views/TodayView';
import { VaultView } from './views/VaultView';
import { TrophyView } from './views/TrophyView';
import { ParentView } from './views/ParentView';
import type { CelebrationEvent } from './lib/engine';

type Tab = 'today' | 'vault' | 'trophies' | 'parent';

const TABS: { id: Tab; label: string; emoji: string }[] = [
  { id: 'today', label: 'Chores', emoji: '📋' },
  { id: 'vault', label: 'Vault', emoji: '🏦' },
  { id: 'trophies', label: 'Trophies', emoji: '🏆' },
  { id: 'parent', label: 'Parent', emoji: '🛠️' },
];

function Shell() {
  const { state } = useStore();
  const [tab, setTab] = useState<Tab>('today');
  const [events, setEvents] = useState<CelebrationEvent[]>([]);

  const celebrate = useCallback((next: CelebrationEvent[]) => setEvents(next), []);

  return (
    <CelebrateContext.Provider value={celebrate}>
      <main className="app">
        {tab === 'today' && <TodayView kidFilter={null} />}
        {tab === 'vault' && <VaultView />}
        {tab === 'trophies' && <TrophyView />}
        {tab === 'parent' && <ParentView />}
      </main>
      <nav className="tabbar">
        {TABS.map((t) => (
          <button type="button" key={t.id} className={tab === t.id ? 'active' : ''} onClick={() => setTab(t.id)}>
            <span className="tab-emoji">{t.emoji}</span>
            <span>{t.label}</span>
          </button>
        ))}
      </nav>
      {events.length > 0 && (
        <Celebration
          events={events}
          soundEnabled={state.settings.soundEnabled}
          currencySymbol={state.settings.currencySymbol}
          onDone={() => setEvents([])}
        />
      )}
    </CelebrateContext.Provider>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  );
}
