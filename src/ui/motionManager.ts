export interface MotionManager {
  isReduced(): boolean;
  onChange(cb: (reduced: boolean) => void): () => void;
  dispose(): void;
}

export function createMotionManager(): MotionManager {
  const mql = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = mql.matches;
  const subscribers = new Set<(reduced: boolean) => void>();

  const handler = (e: MediaQueryListEvent | { matches: boolean }) => {
    reduced = e.matches;
    for (const cb of subscribers) cb(reduced);
  };

  mql.addEventListener('change', handler);

  return {
    isReduced() {
      return reduced;
    },

    onChange(cb) {
      subscribers.add(cb);
      return () => {
        subscribers.delete(cb);
      };
    },

    dispose() {
      mql.removeEventListener('change', handler);
      subscribers.clear();
    },
  };
}
