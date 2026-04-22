import { describe, it, expect } from 'vitest';
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
});
