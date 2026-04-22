import { describe, it, expect } from 'vitest';
import { mapSnapshotToScene } from '../../../src/domain/snapshotToScene';
import type { NetworkSnapshot, SceneParams } from '../../../src/domain/types';

/** Helper to build a NetworkSnapshot with sensible defaults. */
function makeSnapshot(overrides: Partial<NetworkSnapshot> = {}): NetworkSnapshot {
  return {
    samples: [],
    medianRtt: 0,
    jitter: 0,
    packetLoss: 0,
    bandwidth: 0,
    timestampMs: Date.now(),
    ...overrides,
  };
}

/** Assert all SceneParams fields are in [0, 1]. */
function expectNormalized(params: SceneParams) {
  for (const [key, value] of Object.entries(params)) {
    expect(value, `${key} should be >= 0`).toBeGreaterThanOrEqual(0);
    expect(value, `${key} should be <= 1`).toBeLessThanOrEqual(1);
  }
}

describe('US-005: mapSnapshotToScene()', () => {
  describe('ideal network conditions', () => {
    it('produces high height and symmetry for low RTT and low jitter', () => {
      const snapshot = makeSnapshot({ medianRtt: 10, jitter: 2, packetLoss: 0 });
      const scene = mapSnapshotToScene(snapshot);

      expectNormalized(scene);
      expect(scene.height).toBeGreaterThan(0.7);
      expect(scene.symmetry).toBeGreaterThan(0.7);
    });

    it('produces low fracture and ruinLevel for ideal conditions', () => {
      const snapshot = makeSnapshot({ medianRtt: 5, jitter: 1, packetLoss: 0 });
      const scene = mapSnapshotToScene(snapshot);

      expectNormalized(scene);
      expect(scene.fracture).toBeLessThan(0.3);
      expect(scene.ruinLevel).toBeLessThan(0.3);
    });

    it('produces high lightIntensity and low fog for clean connections', () => {
      const snapshot = makeSnapshot({ medianRtt: 10, jitter: 2, packetLoss: 0 });
      const scene = mapSnapshotToScene(snapshot);

      expectNormalized(scene);
      expect(scene.lightIntensity).toBeGreaterThan(0.7);
      expect(scene.fog).toBeLessThan(0.3);
    });
  });

  describe('degraded network conditions', () => {
    it('produces low height and symmetry for high RTT and high jitter', () => {
      const snapshot = makeSnapshot({ medianRtt: 800, jitter: 300, packetLoss: 0.5 });
      const scene = mapSnapshotToScene(snapshot);

      expectNormalized(scene);
      expect(scene.height).toBeLessThan(0.3);
      expect(scene.symmetry).toBeLessThan(0.3);
    });

    it('produces high fracture and ruinLevel for poor conditions', () => {
      const snapshot = makeSnapshot({ medianRtt: 900, jitter: 400, packetLoss: 0.8 });
      const scene = mapSnapshotToScene(snapshot);

      expectNormalized(scene);
      expect(scene.fracture).toBeGreaterThan(0.7);
      expect(scene.ruinLevel).toBeGreaterThan(0.7);
    });

    it('produces low lightIntensity and high fog for degraded connections', () => {
      const snapshot = makeSnapshot({ medianRtt: 800, jitter: 300, packetLoss: 0.5 });
      const scene = mapSnapshotToScene(snapshot);

      expectNormalized(scene);
      expect(scene.lightIntensity).toBeLessThan(0.3);
      expect(scene.fog).toBeGreaterThan(0.7);
    });
  });

  describe('edge cases', () => {
    it('handles an empty samples array', () => {
      const snapshot = makeSnapshot({ samples: [], medianRtt: 0, jitter: 0, packetLoss: 0 });
      const scene = mapSnapshotToScene(snapshot);

      expectNormalized(scene);
    });

    it('handles a single sample', () => {
      const snapshot = makeSnapshot({
        samples: [{ url: '/probe', statusCode: 200, rttMs: 50, timestampMs: Date.now() }],
        medianRtt: 50,
        jitter: 0,
        packetLoss: 0,
      });
      const scene = mapSnapshotToScene(snapshot);

      expectNormalized(scene);
    });

    it('handles all-zero values', () => {
      const snapshot = makeSnapshot({
        medianRtt: 0,
        jitter: 0,
        packetLoss: 0,
        bandwidth: 0,
      });
      const scene = mapSnapshotToScene(snapshot);

      expectNormalized(scene);
    });

    it('handles extreme RTT values', () => {
      const snapshot = makeSnapshot({ medianRtt: 10000, jitter: 5000, packetLoss: 1 });
      const scene = mapSnapshotToScene(snapshot);

      expectNormalized(scene);
    });

    it('returns all SceneParams fields', () => {
      const snapshot = makeSnapshot({ medianRtt: 100, jitter: 30 });
      const scene = mapSnapshotToScene(snapshot);

      expect(scene).toHaveProperty('height');
      expect(scene).toHaveProperty('symmetry');
      expect(scene).toHaveProperty('fracture');
      expect(scene).toHaveProperty('fog');
      expect(scene).toHaveProperty('lightIntensity');
      expect(scene).toHaveProperty('ruinLevel');
    });
  });

  describe('monotonicity', () => {
    it('height decreases as RTT increases', () => {
      const low = mapSnapshotToScene(makeSnapshot({ medianRtt: 50, jitter: 10 }));
      const mid = mapSnapshotToScene(makeSnapshot({ medianRtt: 300, jitter: 10 }));
      const high = mapSnapshotToScene(makeSnapshot({ medianRtt: 800, jitter: 10 }));

      expect(low.height).toBeGreaterThan(mid.height);
      expect(mid.height).toBeGreaterThan(high.height);
    });

    it('fracture increases as jitter increases', () => {
      const low = mapSnapshotToScene(makeSnapshot({ medianRtt: 100, jitter: 5 }));
      const mid = mapSnapshotToScene(makeSnapshot({ medianRtt: 100, jitter: 150 }));
      const high = mapSnapshotToScene(makeSnapshot({ medianRtt: 100, jitter: 400 }));

      expect(low.fracture).toBeLessThan(mid.fracture);
      expect(mid.fracture).toBeLessThan(high.fracture);
    });

    it('ruinLevel increases as packet loss increases', () => {
      const low = mapSnapshotToScene(makeSnapshot({ medianRtt: 100, jitter: 10, packetLoss: 0 }));
      const mid = mapSnapshotToScene(makeSnapshot({ medianRtt: 100, jitter: 10, packetLoss: 0.3 }));
      const high = mapSnapshotToScene(makeSnapshot({ medianRtt: 100, jitter: 10, packetLoss: 0.8 }));

      expect(low.ruinLevel).toBeLessThan(mid.ruinLevel);
      expect(mid.ruinLevel).toBeLessThan(high.ruinLevel);
    });
  });
});
