import type { NetworkSnapshot, SceneParams } from './types';
import { clamp, normalizeRtt, normalizeJitter } from './normalize';

/**
 * Map a NetworkSnapshot to SceneParams (all values 0–1).
 *
 * Low RTT / low jitter → tall, clean, symmetrical cathedral.
 * High RTT / high jitter → fractured, heavy, ruinous cathedral.
 */
export function mapSnapshotToScene(snapshot: NetworkSnapshot): SceneParams {
  const rttNorm = normalizeRtt(snapshot.medianRtt);
  const jitterNorm = normalizeJitter(snapshot.jitter);
  const lossNorm = clamp(Number.isNaN(snapshot.packetLoss) ? 0 : snapshot.packetLoss, 0, 1);

  // Composite degradation signal (weighted blend)
  const degradation = clamp(rttNorm * 0.55 + jitterNorm * 0.35 + lossNorm * 0.15, 0, 1);

  return {
    height: clamp(1 - rttNorm, 0, 1),
    symmetry: clamp(1 - (jitterNorm * 0.7 + rttNorm * 0.4), 0, 1),
    fracture: clamp(jitterNorm * 0.7 + lossNorm * 0.3, 0, 1),
    fog: clamp(degradation, 0, 1),
    lightIntensity: clamp(1 - degradation, 0, 1),
    ruinLevel: clamp(rttNorm * 0.3 + jitterNorm * 0.3 + lossNorm * 0.4, 0, 1),
  };
}
