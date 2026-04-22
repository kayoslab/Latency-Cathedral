import type { NetworkSnapshot } from './types';
import type { PresetName } from './presets';
import { PRESET_SNAPSHOTS } from './presets';

export interface PresetState {
  select(name: PresetName): NetworkSnapshot;
  clear(): void;
  current(): { name: PresetName; snapshot: NetworkSnapshot } | null;
  subscribe(cb: (snapshot: NetworkSnapshot, name: PresetName) => void): () => void;
}

export function createPresetState(initial?: PresetName): PresetState {
  let activeName: PresetName | null = initial ?? null;
  const listeners = new Set<(snapshot: NetworkSnapshot, name: PresetName) => void>();

  return {
    select(name: PresetName): NetworkSnapshot {
      activeName = name;
      const snapshot = PRESET_SNAPSHOTS[name];
      for (const cb of listeners) {
        cb(snapshot, name);
      }
      return snapshot;
    },

    clear(): void {
      activeName = null;
    },

    current() {
      if (activeName === null) return null;
      return { name: activeName, snapshot: PRESET_SNAPSHOTS[activeName] };
    },

    subscribe(cb: (snapshot: NetworkSnapshot, name: PresetName) => void): () => void {
      listeners.add(cb);
      return () => {
        listeners.delete(cb);
      };
    },
  };
}
