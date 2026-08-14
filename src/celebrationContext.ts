import { createContext, useContext } from 'react';
import type { CelebrationEvent } from './lib/engine';

export const CelebrateContext = createContext<(events: CelebrationEvent[]) => void>(() => {});

export function useCelebrate() {
  return useContext(CelebrateContext);
}
