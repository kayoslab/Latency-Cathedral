import { describe, it, expect, beforeEach } from 'vitest';
import { clamp, normalizeRtt, normalizeJitter } from '../../../src/domain/normalize';

describe('US-005: normalization helpers', () => {
  describe('clamp()', () => {
    it('returns the value when within range', () => {
      expect(clamp(5, 0, 10)).toBe(5);
    });

    it('returns min when value is below range', () => {
      expect(clamp(-1, 0, 10)).toBe(0);
    });

    it('returns max when value is above range', () => {
      expect(clamp(15, 0, 10)).toBe(10);
    });

    it('returns min for value exactly at min', () => {
      expect(clamp(0, 0, 10)).toBe(0);
    });

    it('returns max for value exactly at max', () => {
      expect(clamp(10, 0, 10)).toBe(10);
    });

    it('clamps NaN to min', () => {
      expect(clamp(NaN, 0, 10)).toBe(0);
    });

    it('clamps Infinity to max', () => {
      expect(clamp(Infinity, 0, 10)).toBe(10);
    });

    it('clamps -Infinity to min', () => {
      expect(clamp(-Infinity, 0, 10)).toBe(0);
    });

    it('works with negative ranges', () => {
      expect(clamp(-5, -10, -1)).toBe(-5);
      expect(clamp(0, -10, -1)).toBe(-1);
      expect(clamp(-20, -10, -1)).toBe(-10);
    });

    it('returns the value when min equals max', () => {
      expect(clamp(5, 3, 3)).toBe(3);
    });
  });

  describe('normalizeRtt()', () => {
    it('returns 0 for zero RTT with default range', () => {
      expect(normalizeRtt(0)).toBe(0);
    });

    it('returns 1 for RTT at default max (1000ms)', () => {
      expect(normalizeRtt(1000)).toBe(1);
    });

    it('returns 0.5 for RTT at midpoint of default range', () => {
      expect(normalizeRtt(500)).toBe(0.5);
    });

    it('clamps RTT above max to 1', () => {
      expect(normalizeRtt(2000)).toBe(1);
    });

    it('clamps negative RTT to 0', () => {
      expect(normalizeRtt(-50)).toBe(0);
    });

    it('clamps NaN to 0', () => {
      expect(normalizeRtt(NaN)).toBe(0);
    });

    it('clamps Infinity to 1', () => {
      expect(normalizeRtt(Infinity)).toBe(1);
    });

    it('clamps -Infinity to 0', () => {
      expect(normalizeRtt(-Infinity)).toBe(0);
    });

    it('accepts custom min and max range', () => {
      expect(normalizeRtt(50, 0, 100)).toBe(0.5);
      expect(normalizeRtt(100, 0, 100)).toBe(1);
      expect(normalizeRtt(0, 0, 100)).toBe(0);
    });

    it('clamps values beyond custom range', () => {
      expect(normalizeRtt(200, 0, 100)).toBe(1);
      expect(normalizeRtt(-10, 0, 100)).toBe(0);
    });

    it('handles custom min greater than zero', () => {
      // RTT of 50 in range [50, 150] should be 0
      expect(normalizeRtt(50, 50, 150)).toBe(0);
      // RTT of 100 in range [50, 150] should be 0.5
      expect(normalizeRtt(100, 50, 150)).toBe(0.5);
    });
  });

  describe('normalizeJitter()', () => {
    it('returns 0 for zero jitter', () => {
      expect(normalizeJitter(0)).toBe(0);
    });

    it('returns 1 for jitter at default max', () => {
      // The default max should normalize to 1
      const result = normalizeJitter(500);
      expect(result).toBe(1);
    });

    it('clamps jitter above max to 1', () => {
      expect(normalizeJitter(1000)).toBe(1);
    });

    it('clamps negative jitter to 0', () => {
      expect(normalizeJitter(-10)).toBe(0);
    });

    it('clamps NaN to 0', () => {
      expect(normalizeJitter(NaN)).toBe(0);
    });

    it('clamps Infinity to 1', () => {
      expect(normalizeJitter(Infinity)).toBe(1);
    });

    it('clamps -Infinity to 0', () => {
      expect(normalizeJitter(-Infinity)).toBe(0);
    });

    it('accepts a custom max', () => {
      expect(normalizeJitter(50, 100)).toBe(0.5);
      expect(normalizeJitter(100, 100)).toBe(1);
    });

    it('returns value in (0, 1) for typical jitter values', () => {
      const result = normalizeJitter(100);
      expect(result).toBeGreaterThan(0);
      expect(result).toBeLessThanOrEqual(1);
    });
  });

  // ── US-008: normalizeLoadDuration ─────────────────────────────────

  describe('normalizeLoadDuration()', () => {
    let normalizeLoadDuration: typeof import('../../../src/domain/normalize').normalizeLoadDuration;

    beforeEach(async () => {
      ({ normalizeLoadDuration } = await import(
        '../../../src/domain/normalize'
      ));
    });

    it('returns 0 for zero duration', () => {
      expect(normalizeLoadDuration(0)).toBe(0);
    });

    it('returns 1 for duration at default max (5000ms)', () => {
      expect(normalizeLoadDuration(5000)).toBe(1);
    });

    it('returns 0.5 for duration at midpoint of default range', () => {
      expect(normalizeLoadDuration(2500)).toBe(0.5);
    });

    it('clamps duration above max to 1', () => {
      expect(normalizeLoadDuration(10000)).toBe(1);
    });

    it('clamps negative duration to 0', () => {
      expect(normalizeLoadDuration(-100)).toBe(0);
    });

    it('returns 0 for NaN', () => {
      expect(normalizeLoadDuration(NaN)).toBe(0);
    });

    it('returns 1 for Infinity', () => {
      expect(normalizeLoadDuration(Infinity)).toBe(1);
    });

    it('returns 0 for -Infinity', () => {
      expect(normalizeLoadDuration(-Infinity)).toBe(0);
    });

    it('accepts a custom max', () => {
      expect(normalizeLoadDuration(50, 100)).toBe(0.5);
      expect(normalizeLoadDuration(100, 100)).toBe(1);
      expect(normalizeLoadDuration(0, 100)).toBe(0);
    });

    it('clamps beyond custom max to 1', () => {
      expect(normalizeLoadDuration(200, 100)).toBe(1);
    });
  });

  // ── US-008: computeMeanDuration ───────────────────────────────────

  describe('computeMeanDuration()', () => {
    let computeMeanDuration: typeof import('../../../src/domain/normalize').computeMeanDuration;

    beforeEach(async () => {
      ({ computeMeanDuration } = await import(
        '../../../src/domain/normalize'
      ));
    });

    it('returns 0 for an empty array', () => {
      expect(computeMeanDuration([])).toBe(0);
    });

    it('returns the single value for an array with one entry', () => {
      expect(computeMeanDuration([42])).toBe(42);
    });

    it('computes the mean of multiple values', () => {
      expect(computeMeanDuration([10, 20, 30])).toBe(20);
    });

    it('filters out NaN values', () => {
      expect(computeMeanDuration([10, NaN, 30])).toBe(20);
    });

    it('filters out Infinity values', () => {
      expect(computeMeanDuration([10, Infinity, 30])).toBe(20);
    });

    it('filters out -Infinity values', () => {
      expect(computeMeanDuration([10, -Infinity, 30])).toBe(20);
    });

    it('returns 0 when all values are non-finite', () => {
      expect(computeMeanDuration([NaN, Infinity, -Infinity])).toBe(0);
    });

    it('handles typical resource timing durations', () => {
      const durations = [45.5, 120.3, 88.7, 200.1];
      const expected = (45.5 + 120.3 + 88.7 + 200.1) / 4;
      expect(computeMeanDuration(durations)).toBeCloseTo(expected);
    });
  });
});
