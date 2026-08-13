import { useEffect, useState } from 'react';
import type { CelebrationEvent } from '../lib/engine';
import { bigConfetti, popConfetti } from '../lib/celebrate';
import { play } from '../lib/sound';
import { formatMoney } from '../lib/money';

interface Props {
  events: CelebrationEvent[];
  soundEnabled: boolean;
  currencySymbol: string;
  onDone: () => void;
}

const PRAISE = ['Awesome!', 'Nice one!', 'Boom!', 'Legend!', 'Great job!', 'Superstar!', 'Yes!'];

export function Celebration({ events, soundEnabled, currencySymbol, onDone }: Props) {
  const [index, setIndex] = useState(0);
  const event = events[index];

  useEffect(() => {
    if (!event) return;
    if (event.kind === 'trophy') {
      bigConfetti();
      play('trophy', soundEnabled);
    } else if (event.kind === 'bonus') {
      bigConfetti();
      play('bonus', soundEnabled);
    } else {
      popConfetti();
      play('tick', soundEnabled);
    }
    const delay = event.kind === 'chore' ? 1100 : 1900;
    const id = setTimeout(() => {
      if (index + 1 < events.length) setIndex(index + 1);
      else onDone();
    }, delay);
    return () => clearTimeout(id);
  }, [event, index, events.length, onDone, soundEnabled]);

  useEffect(() => setIndex(0), [events]);

  if (!event) return null;

  const title =
    event.kind === 'trophy'
      ? 'Trophy unlocked!'
      : event.kind === 'bonus'
        ? event.label
        : PRAISE[Math.floor(Math.random() * PRAISE.length)];
  const subtitle =
    event.kind === 'trophy'
      ? event.name
      : event.kind === 'bonus'
        ? `+${formatMoney(event.amountCents, currencySymbol)}`
        : `${event.name} · +${formatMoney(event.amountCents, currencySymbol)}`;

  return (
    <div className="celebration" role="status" aria-live="polite">
      <div className="celebration-card">
        <div className="celebration-emoji">{event.emoji}</div>
        <div className="celebration-title">{title}</div>
        <div className="celebration-subtitle">{subtitle}</div>
      </div>
    </div>
  );
}
