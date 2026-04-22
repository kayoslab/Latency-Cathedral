import { describe, it, expect } from 'vitest';
import { mapSnapshotToScene } from '../../../src/domain/snapshotToScene';
import { PRESET_SNAPSHOTS } from '../../../src/domain/presets';
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

describe('US-010: mapSnapshotToScene — acceptance criteria', () => {
  // ─── AC-1: Fast state yields high symmetry ───────────────────────
  describe('AC-1: fast state yields high symmetry', () => {
    it('fast preset produces symmetry > 0.9', () => {
      const scene = mapSnapshotToScene(PRESET_SNAPSHOTS.fast);
      expect(scene.symmetry).toBeGreaterThan(0.9);
    });

    it('low RTT and low jitter produce symmetry close to 1', () => {
      const scene = mapSnapshotToScene(
        makeSnapshot({ medianRtt: 5, jitter: 1, packetLoss: 0 }),
      );
      expect(scene.symmetry).toBeGreaterThan(0.95);
    });

    it('symmetry decreases monotonically as jitter increases', () => {
      const s1 = mapSnapshotToScene(makeSnapshot({ medianRtt: 50, jitter: 10 }));
      const s2 = mapSnapshotToScene(makeSnapshot({ medianRtt: 50, jitter: 150 }));
      const s3 = mapSnapshotToScene(makeSnapshot({ medianRtt: 50, jitter: 400 }));

      expect(s1.symmetry).toBeGreaterThan(s2.symmetry);
      expect(s2.symmetry).toBeGreaterThan(s3.symmetry);
    });

    it('symmetry decreases monotonically as RTT increases', () => {
      const s1 = mapSnapshotToScene(makeSnapshot({ medianRtt: 20, jitter: 10 }));
      const s2 = mapSnapshotToScene(makeSnapshot({ medianRtt: 400, jitter: 10 }));
      const s3 = mapSnapshotToScene(makeSnapshot({ medianRtt: 900, jitter: 10 }));

      expect(s1.symmetry).toBeGreaterThan(s2.symmetry);
      expect(s2.symmetry).toBeGreaterThan(s3.symmetry);
    });
  });

  // ─── AC-2: Poor state yields high fracture ───────────────────────
  describe('AC-2: poor state yields high fracture', () => {
    it('poor preset produces fracture > 0.7', () => {
      const scene = mapSnapshotToScene(PRESET_SNAPSHOTS.poor);
      expect(scene.fracture).toBeGreaterThan(0.7);
    });

    it('high jitter and high loss produce fracture close to 1', () => {
      const scene = mapSnapshotToScene(
        makeSnapshot({ medianRtt: 900, jitter: 500, packetLoss: 1 }),
      );
      expect(scene.fracture).toBeGreaterThan(0.9);
    });

    it('fracture increases monotonically as packet loss increases', () => {
      const s1 = mapSnapshotToScene(makeSnapshot({ jitter: 100, packetLoss: 0 }));
      const s2 = mapSnapshotToScene(makeSnapshot({ jitter: 100, packetLoss: 0.4 }));
      const s3 = mapSnapshotToScene(makeSnapshot({ jitter: 100, packetLoss: 0.9 }));

      expect(s1.fracture).toBeLessThan(s2.fracture);
      expect(s2.fracture).toBeLessThan(s3.fracture);
    });
  });

  // ─── AC-3: Mapper is deterministic ───────────────────────────────
  describe('AC-3: mapper is deterministic', () => {
    it('returns identical output for the same input on repeated calls', () => {
      const snapshot = makeSnapshot({ medianRtt: 250, jitter: 80, packetLoss: 0.1 });
      const first = mapSnapshotToScene(snapshot);
      const second = mapSnapshotToScene(snapshot);
      const third = mapSnapshotToScene(snapshot);

      expect(first).toEqual(second);
      expect(second).toEqual(third);
    });

    it('returns identical output for structurally equal but distinct objects', () => {
      const a = makeSnapshot({ medianRtt: 500, jitter: 200, packetLoss: 0.3 });
      const b = makeSnapshot({ medianRtt: 500, jitter: 200, packetLoss: 0.3 });

      expect(mapSnapshotToScene(a)).toEqual(mapSnapshotToScene(b));
    });

    it('produces exact expected values for a known input', () => {
      // RTT 500ms → rttNorm = 0.5, jitter 250ms → jitterNorm = 0.5, loss = 0.2
      const snapshot = makeSnapshot({ medianRtt: 500, jitter: 250, packetLoss: 0.2 });
      const scene = mapSnapshotToScene(snapshot);

      // height = 1 - 0.5 = 0.5
      expect(scene.height).toBeCloseTo(0.5, 10);
      // symmetry = clamp(1 - (0.5*0.7 + 0.5*0.4)) = 1 - 0.55 = 0.45
      expect(scene.symmetry).toBeCloseTo(0.45, 10);
      // fracture = clamp(0.5*0.7 + 0.2*0.3) = 0.35 + 0.06 = 0.41
      expect(scene.fracture).toBeCloseTo(0.41, 10);
      // degradation = 0.5*0.55 + 0.5*0.35 + 0.2*0.15 = 0.275 + 0.175 + 0.03 = 0.48
      expect(scene.fog).toBeCloseTo(0.48, 10);
      // lightIntensity = 1 - 0.48 = 0.52
      expect(scene.lightIntensity).toBeCloseTo(0.52, 10);
      // ruinLevel = 0.5*0.3 + 0.5*0.3 + 0.2*0.4 = 0.15 + 0.15 + 0.08 = 0.38
      expect(scene.ruinLevel).toBeCloseTo(0.38, 10);
    });
  });

  // ─── AC-4: Unit tests verify mappings (comprehensive coverage) ──
  describe('AC-4: mapping verification', () => {
    describe('fog and lightIntensity are complementary', () => {
      it('fog + lightIntensity ≈ 1 for any input', () => {
        const inputs = [
          makeSnapshot({ medianRtt: 0, jitter: 0, packetLoss: 0 }),
          makeSnapshot({ medianRtt: 200, jitter: 100, packetLoss: 0.1 }),
          makeSnapshot({ medianRtt: 500, jitter: 250, packetLoss: 0.5 }),
          makeSnapshot({ medianRtt: 1000, jitter: 500, packetLoss: 1 }),
        ];

        for (const snap of inputs) {
          const scene = mapSnapshotToScene(snap);
          expect(scene.fog + scene.lightIntensity).toBeCloseTo(1, 10);
        }
      });
    });

    describe('fog monotonicity tracks degradation', () => {
      it('fog increases as overall conditions degrade', () => {
        const good = mapSnapshotToScene(makeSnapshot({ medianRtt: 20, jitter: 5, packetLoss: 0 }));
        const mid = mapSnapshotToScene(makeSnapshot({ medianRtt: 400, jitter: 150, packetLoss: 0.2 }));
        const bad = mapSnapshotToScene(makeSnapshot({ medianRtt: 900, jitter: 400, packetLoss: 0.7 }));

        expect(good.fog).toBeLessThan(mid.fog);
        expect(mid.fog).toBeLessThan(bad.fog);
      });
    });

    describe('boundary conditions', () => {
      it('all-zero input yields maximum height and zero fracture', () => {
        const scene = mapSnapshotToScene(
          makeSnapshot({ medianRtt: 0, jitter: 0, packetLoss: 0 }),
        );
        expect(scene.height).toBe(1);
        expect(scene.symmetry).toBe(1);
        expect(scene.fracture).toBe(0);
        expect(scene.fog).toBe(0);
        expect(scene.lightIntensity).toBe(1);
        expect(scene.ruinLevel).toBe(0);
      });

      it('max-saturated input yields minimum height and high fracture', () => {
        const scene = mapSnapshotToScene(
          makeSnapshot({ medianRtt: 1000, jitter: 500, packetLoss: 1 }),
        );
        expect(scene.height).toBe(0);
        expect(scene.fracture).toBe(1);
        expect(scene.fog).toBe(1);
        expect(scene.lightIntensity).toBe(0);
        expect(scene.ruinLevel).toBe(1);
      });

      it('beyond-max inputs are clamped identically to max', () => {
        const atMax = mapSnapshotToScene(
          makeSnapshot({ medianRtt: 1000, jitter: 500, packetLoss: 1 }),
        );
        const beyondMax = mapSnapshotToScene(
          makeSnapshot({ medianRtt: 5000, jitter: 2000, packetLoss: 1 }),
        );
        expect(atMax).toEqual(beyondMax);
      });
    });

    describe('NaN and Infinity handling', () => {
      it('NaN medianRtt is treated as 0 (best case)', () => {
        const scene = mapSnapshotToScene(
          makeSnapshot({ medianRtt: NaN, jitter: 0, packetLoss: 0 }),
        );
        expectNormalized(scene);
        expect(scene.height).toBe(1);
      });

      it('NaN jitter is treated as 0', () => {
        const scene = mapSnapshotToScene(
          makeSnapshot({ medianRtt: 0, jitter: NaN, packetLoss: 0 }),
        );
        expectNormalized(scene);
        expect(scene.fracture).toBe(0);
      });

      it('NaN packetLoss is treated as 0', () => {
        const scene = mapSnapshotToScene(
          makeSnapshot({ medianRtt: 0, jitter: 0, packetLoss: NaN }),
        );
        expectNormalized(scene);
        expect(scene.ruinLevel).toBe(0);
      });

      it('Infinity inputs are clamped to max', () => {
        const scene = mapSnapshotToScene(
          makeSnapshot({ medianRtt: Infinity, jitter: Infinity, packetLoss: Infinity }),
        );
        expectNormalized(scene);
        expect(scene.height).toBe(0);
      });

      it('negative inputs are clamped to min', () => {
        const scene = mapSnapshotToScene(
          makeSnapshot({ medianRtt: -100, jitter: -50, packetLoss: -0.5 }),
        );
        expectNormalized(scene);
        expect(scene.height).toBe(1);
        expect(scene.fracture).toBe(0);
      });
    });

    describe('individual parameter sensitivity', () => {
      it('height depends only on RTT, not jitter or loss', () => {
        const base = makeSnapshot({ medianRtt: 300, jitter: 0, packetLoss: 0 });
        const withJitter = makeSnapshot({ medianRtt: 300, jitter: 400, packetLoss: 0 });
        const withLoss = makeSnapshot({ medianRtt: 300, jitter: 0, packetLoss: 0.9 });

        expect(mapSnapshotToScene(base).height).toBe(mapSnapshotToScene(withJitter).height);
        expect(mapSnapshotToScene(base).height).toBe(mapSnapshotToScene(withLoss).height);
      });

      it('fracture depends on jitter and loss, not RTT', () => {
        const base = makeSnapshot({ medianRtt: 0, jitter: 200, packetLoss: 0.5 });
        const withRtt = makeSnapshot({ medianRtt: 900, jitter: 200, packetLoss: 0.5 });

        expect(mapSnapshotToScene(base).fracture).toBe(mapSnapshotToScene(withRtt).fracture);
      });
    });

    describe('preset round-trip validates end-to-end', () => {
      it('fast preset: height > 0.9, symmetry > 0.9, fracture < 0.05', () => {
        const scene = mapSnapshotToScene(PRESET_SNAPSHOTS.fast);
        expectNormalized(scene);
        expect(scene.height).toBeGreaterThan(0.9);
        expect(scene.symmetry).toBeGreaterThan(0.9);
        expect(scene.fracture).toBeLessThan(0.05);
      });

      it('poor preset: height < 0.1, fracture > 0.7, ruinLevel > 0.7', () => {
        const scene = mapSnapshotToScene(PRESET_SNAPSHOTS.poor);
        expectNormalized(scene);
        expect(scene.height).toBeLessThan(0.1);
        expect(scene.fracture).toBeGreaterThan(0.7);
        expect(scene.ruinLevel).toBeGreaterThan(0.7);
      });

      it('mixed preset: intermediate values for all params', () => {
        const scene = mapSnapshotToScene(PRESET_SNAPSHOTS.mixed);
        expectNormalized(scene);
        expect(scene.height).toBeGreaterThan(0.3);
        expect(scene.height).toBeLessThan(0.8);
        expect(scene.fracture).toBeGreaterThan(0.1);
        expect(scene.fracture).toBeLessThan(0.6);
      });
    });
  });
});
