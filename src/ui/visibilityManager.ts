export interface VisibilityManager {
  onHidden(cb: () => void): () => void;
  onVisible(cb: () => void): () => void;
  dispose(): void;
}

export function createVisibilityManager(): VisibilityManager {
  const hiddenCallbacks = new Set<() => void>();
  const visibleCallbacks = new Set<() => void>();

  const handler = () => {
    if (document.hidden) {
      for (const cb of hiddenCallbacks) cb();
    } else {
      for (const cb of visibleCallbacks) cb();
    }
  };

  document.addEventListener('visibilitychange', handler);

  return {
    onHidden(cb) {
      hiddenCallbacks.add(cb);
      return () => {
        hiddenCallbacks.delete(cb);
      };
    },

    onVisible(cb) {
      visibleCallbacks.add(cb);
      return () => {
        visibleCallbacks.delete(cb);
      };
    },

    dispose() {
      document.removeEventListener('visibilitychange', handler);
      hiddenCallbacks.clear();
      visibleCallbacks.clear();
    },
  };
}
