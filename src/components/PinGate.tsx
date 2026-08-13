import { useState } from 'react';

interface Props {
  title: string;
  onSuccess: () => void;
  onCancel: () => void;
  pin: string;
}

export const DEFAULT_PIN = '1234';

export function PinGate({ title, onSuccess, onCancel, pin: rawPin }: Props) {
  const pin = rawPin.length > 0 ? rawPin : DEFAULT_PIN;
  const [entry, setEntry] = useState('');
  const [error, setError] = useState(false);

  const press = (digit: string) => {
    const next = (entry + digit).slice(0, pin.length);
    setEntry(next);
    setError(false);
    if (next.length === pin.length) {
      if (next === pin) {
        onSuccess();
      } else {
        setError(true);
        setTimeout(() => setEntry(''), 400);
      }
    }
  };

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className={`modal pin-modal${error ? ' shake' : ''}`} onClick={(e) => e.stopPropagation()}>
        <h2>🔒 {title}</h2>
        <p className="muted">Parents only</p>
        <div className="pin-dots">
          {Array.from({ length: pin.length }).map((_, i) => (
            <span key={i} className={i < entry.length ? 'dot filled' : 'dot'} />
          ))}
        </div>
        {error && <p className="error">Wrong PIN, try again</p>}
        <div className="keypad">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
            <button key={d} type="button" onClick={() => press(d)}>
              {d}
            </button>
          ))}
          <button type="button" className="ghost" onClick={onCancel}>
            Cancel
          </button>
          <button type="button" onClick={() => press('0')}>
            0
          </button>
          <button type="button" className="ghost" onClick={() => setEntry(entry.slice(0, -1))}>
            ⌫
          </button>
        </div>
      </div>
    </div>
  );
}
