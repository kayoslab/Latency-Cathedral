import type { NetworkSnapshot, QualityBand } from './types';

export function deriveQualityBand(snapshot: NetworkSnapshot): QualityBand {
  const { medianRtt, jitter, packetLoss } = snapshot;

  if (medianRtt >= 500 || jitter >= 300 || packetLoss >= 0.25) {
    return 'poor';
  }
  if (medianRtt >= 200 || jitter >= 100 || packetLoss >= 0.08) {
    return 'degraded';
  }
  if (medianRtt >= 60 || jitter >= 30 || packetLoss >= 0.03) {
    return 'good';
  }
  return 'excellent';
}
