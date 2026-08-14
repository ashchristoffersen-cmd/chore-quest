import { useEffect, useState } from 'react';
import { parseMoney } from '../lib/money';

interface Props {
  cents: number;
  onChange: (cents: number) => void;
}

/**
 * Money field that keeps what the parent typed while they type. Formatting the
 * committed value back into the input on every keystroke makes multi-digit entry
 * impossible ("40" becomes "4.00"), so the draft text is only normalised on blur.
 */
export function MoneyInput({ cents, onChange }: Props) {
  const [draft, setDraft] = useState(() => (cents / 100).toFixed(2));

  useEffect(() => {
    if (parseMoney(draft) !== cents) setDraft((cents / 100).toFixed(2));
    // Only resync when the committed value changes elsewhere.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cents]);

  return (
    <input
      inputMode="decimal"
      value={draft}
      onChange={(e) => {
        const next = e.target.value.replace(/[^0-9.]/g, '');
        setDraft(next);
        onChange(parseMoney(next));
      }}
      onFocus={(e) => e.target.select()}
      onBlur={() => setDraft((parseMoney(draft) / 100).toFixed(2))}
    />
  );
}
