import { describe, it, expect } from 'vitest';
import type { NetworkSnapshot } from '../../../src/domain/types';

/** Helper to build a snapshot with specific metrics. */
function makeSnapshot(
  overrides: Partial<NetworkSnapshot> = {},
): NetworkSnapshot {
  return {
    samples: [],
    medianRtt: 20,
    jitter: 5,
    packetLoss: 0,
    bandwidth: 50,
    timestampMs: 0,
    ...overrides,
  };
}

// Lazy import so the test file can be written before the source exists.
async function loadModule() {
  const mod = await import('../../../src/domain/qualityBand');
  return mod.deriveQualityBand;
}

describe('US-014: deriveQualityBand', () => {
  let deriveQualityBand: Awaited<ReturnType<typeof loadModule>>;

  it('module loads', async () => {
    deriveQualityBand = await loadModule();
    expect(deriveQualityBand).toBeTypeOf('function');
  });

  describe('band thresholds', () => {
    it('returns "excellent" for low RTT and low jitter', async () => {
      deriveQualityBand = await loadModule();
      const snap = makeSnapshot({ medianRtt: 20, jitter: 5, packetLoss: 0 });
      expect(deriveQualityBand(snap)).toBe('excellent');
    });

    it('returns "good" for moderate RTT and moderate jitter', async () => {
      deriveQualityBand = await loadModule();
      const snap = makeSnapshot({ medianRtt: 100, jitter: 50, packetLoss: 0.05 });
      expect(deriveQualityBand(snap)).toBe('good');
    });

    it('returns "degraded" for high RTT and high jitter', async () => {
      deriveQualityBand = await loadModule();
      const snap = makeSnapshot({ medianRtt: 350, jitter: 150, packetLoss: 0.10 });
      expect(deriveQualityBand(snap)).toBe('degraded');
    });

    it('returns "poor" for very high RTT and very high jitter', async () => {
      deriveQualityBand = await loadModule();
      const snap = makeSnapshot({ medianRtt: 950, jitter: 450, packetLoss: 0.50 });
      expect(deriveQualityBand(snap)).toBe('poor');
    });
  });

  describe('boundary values', () => {
    it('classifies the "fast" preset snapshot as excellent', async () => {
      deriveQualityBand = await loadModule();
      const snap = makeSnapshot({ medianRtt: 20, jitter: 5, packetLoss: 0, bandwidth: 50 });
      expect(deriveQualityBand(snap)).toBe('excellent');
    });

    it('classifies the "mixed" preset snapshot as degraded', async () => {
      deriveQualityBand = await loadModule();
      const snap = makeSnapshot({ medianRtt: 350, jitter: 150, packetLoss: 0.10, bandwidth: 10 });
      expect(deriveQualityBand(snap)).toBe('degraded');
    });

    it('classifies the "poor" preset snapshot as poor', async () => {
      deriveQualityBand = await loadModule();
      const snap = makeSnapshot({ medianRtt: 950, jitter: 450, packetLoss: 0.50, bandwidth: 1 });
      expect(deriveQualityBand(snap)).toBe('poor');
    });
  });

  describe('monotonicity', () => {
    it('worse metrics never produce a better band', async () => {
      deriveQualityBand = await loadModule();
      const bands = ['excellent', 'good', 'degraded', 'poor'] as const;
      const bandIndex = (b: string) => bands.indexOf(b as typeof bands[number]);

      const excellent = deriveQualityBand(makeSnapshot({ medianRtt: 20, jitter: 5 }));
      const good = deriveQualityBand(makeSnapshot({ medianRtt: 100, jitter: 50 }));
      const degraded = deriveQualityBand(makeSnapshot({ medianRtt: 350, jitter: 150 }));
      const poor = deriveQualityBand(makeSnapshot({ medianRtt: 950, jitter: 450 }));

      expect(bandIndex(excellent)).toBeLessThanOrEqual(bandIndex(good));
      expect(bandIndex(good)).toBeLessThanOrEqual(bandIndex(degraded));
      expect(bandIndex(degraded)).toBeLessThanOrEqual(bandIndex(poor));
    });
  });

  describe('return type', () => {
    it('always returns one of the four valid band names', async () => {
      deriveQualityBand = await loadModule();
      const validBands = ['excellent', 'good', 'degraded', 'poor'];

      const testCases = [
        makeSnapshot({ medianRtt: 0, jitter: 0 }),
        makeSnapshot({ medianRtt: 500, jitter: 200 }),
        makeSnapshot({ medianRtt: 1500, jitter: 800 }),
      ];

      for (const snap of testCases) {
        expect(validBands).toContain(deriveQualityBand(snap));
      }
    });
  });
});
