import type { NetworkSnapshot } from './types';

export type PresetName = 'fast' | 'mixed' | 'poor';

export const PRESET_SNAPSHOTS: Record<PresetName, NetworkSnapshot> = {
  fast: {
    medianRtt: 20,
    jitter: 5,
    packetLoss: 0,
    bandwidth: 50,
    samples: [],
    timestampMs: 0,
  },
  mixed: {
    medianRtt: 350,
    jitter: 150,
    packetLoss: 0.10,
    bandwidth: 10,
    samples: [],
    timestampMs: 0,
  },
  poor: {
    medianRtt: 950,
    jitter: 450,
    packetLoss: 0.50,
    bandwidth: 1,
    samples: [],
    timestampMs: 0,
  },
};
