import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ProbeSample } from '../../../src/domain/types';

/**
 * These tests target the probe sampler module (src/metrics/probeSampler.ts).
 * Functions under test: computeMedianRtt, computeJitter, fetchProbe, ProbeSampler class.
 */

// Helper: build a ProbeSample with defaults
function makeSample(overrides: Partial<ProbeSample> = {}): ProbeSample {
  return {
    url: '/probe.txt',
    statusCode: 200,
    rttMs: 50,
    timestampMs: Date.now(),
    ...overrides,
  };
}

describe('US-007: same-origin latency probe sampler', () => {
  // ── computeMedianRtt ────────────────────────────────────────────────

  describe('computeMedianRtt()', () => {
    let computeMedianRtt: typeof import('../../../src/metrics/probeSampler').computeMedianRtt;

    beforeEach(async () => {
      ({ computeMedianRtt } = await import('../../../src/metrics/probeSampler'));
    });

    it('returns median for odd number of samples', () => {
      const samples = [
        makeSample({ rttMs: 10 }),
        makeSample({ rttMs: 30 }),
        makeSample({ rttMs: 20 }),
      ];
      expect(computeMedianRtt(samples)).toBe(20);
    });

    it('returns average of two middle values for even number of samples', () => {
      const samples = [
        makeSample({ rttMs: 10 }),
        makeSample({ rttMs: 20 }),
        makeSample({ rttMs: 30 }),
        makeSample({ rttMs: 40 }),
      ];
      expect(computeMedianRtt(samples)).toBe(25);
    });

    it('returns the value for a single sample', () => {
      const samples = [makeSample({ rttMs: 42 })];
      expect(computeMedianRtt(samples)).toBe(42);
    });

    it('returns 0 for an empty array', () => {
      expect(computeMedianRtt([])).toBe(0);
    });

    it('filters out failed probes (Infinity RTT)', () => {
      const samples = [
        makeSample({ rttMs: 10 }),
        makeSample({ rttMs: Infinity, statusCode: 0 }),
        makeSample({ rttMs: 30 }),
      ];
      // After filtering: [10, 30] → median = 20
      expect(computeMedianRtt(samples)).toBe(20);
    });

    it('returns 0 when all probes are failed', () => {
      const samples = [
        makeSample({ rttMs: Infinity, statusCode: 0 }),
        makeSample({ rttMs: Infinity, statusCode: 0 }),
      ];
      expect(computeMedianRtt(samples)).toBe(0);
    });
  });

  // ── computeJitter ───────────────────────────────────────────────────

  describe('computeJitter()', () => {
    let computeJitter: typeof import('../../../src/metrics/probeSampler').computeJitter;

    beforeEach(async () => {
      ({ computeJitter } = await import('../../../src/metrics/probeSampler'));
    });

    it('returns 0 for an empty array', () => {
      expect(computeJitter([])).toBe(0);
    });

    it('returns 0 for a single sample', () => {
      expect(computeJitter([makeSample({ rttMs: 50 })])).toBe(0);
    });

    it('returns low jitter for stable RTT values', () => {
      const samples = [
        makeSample({ rttMs: 50 }),
        makeSample({ rttMs: 50 }),
        makeSample({ rttMs: 50 }),
        makeSample({ rttMs: 50 }),
      ];
      expect(computeJitter(samples)).toBe(0);
    });

    it('returns high jitter for variable RTT values', () => {
      const samples = [
        makeSample({ rttMs: 10 }),
        makeSample({ rttMs: 100 }),
        makeSample({ rttMs: 10 }),
        makeSample({ rttMs: 100 }),
      ];
      const jitter = computeJitter(samples);
      expect(jitter).toBeGreaterThan(0);
      // The mean absolute difference of consecutive pairs: |100-10|=90, |10-100|=90, |100-10|=90 → mean = 90
      expect(jitter).toBe(90);
    });

    it('computes jitter as mean absolute difference of consecutive RTTs', () => {
      const samples = [
        makeSample({ rttMs: 10 }),
        makeSample({ rttMs: 20 }),
        makeSample({ rttMs: 15 }),
      ];
      // |20-10| = 10, |15-20| = 5 → mean = 7.5
      expect(computeJitter(samples)).toBe(7.5);
    });

    it('filters out failed probes before computing jitter', () => {
      const samples = [
        makeSample({ rttMs: 50 }),
        makeSample({ rttMs: Infinity, statusCode: 0 }),
        makeSample({ rttMs: 50 }),
      ];
      // After filtering: [50, 50] → |50-50| = 0 → jitter = 0
      expect(computeJitter(samples)).toBe(0);
    });
  });

  // ── fetchProbe ──────────────────────────────────────────────────────

  describe('fetchProbe()', () => {
    let fetchProbe: typeof import('../../../src/metrics/probeSampler').fetchProbe;
    let originalFetch: typeof globalThis.fetch;

    beforeEach(async () => {
      originalFetch = globalThis.fetch;
      ({ fetchProbe } = await import('../../../src/metrics/probeSampler'));
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
      vi.restoreAllMocks();
    });

    it('measures RTT using performance.now() around fetch', async () => {
      let callCount = 0;
      vi.spyOn(performance, 'now').mockImplementation(() => {
        callCount++;
        // First call returns start time, second returns end time
        return callCount === 1 ? 100 : 150;
      });

      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });

      const sample = await fetchProbe('/probe.txt');
      expect(sample.rttMs).toBe(50);
      expect(sample.statusCode).toBe(200);
      expect(sample.url).toBe('/probe.txt');
    });

    it('appends a cache-bust query parameter', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });
      globalThis.fetch = mockFetch;

      vi.spyOn(performance, 'now').mockReturnValue(0);

      await fetchProbe('/probe.txt');

      const calledUrl = mockFetch.mock.calls[0][0] as string;
      expect(calledUrl).toContain('/probe.txt');
      expect(calledUrl).toMatch(/[?&]t=/);
    });

    it('returns statusCode 0 and Infinity rttMs on network failure', async () => {
      globalThis.fetch = vi.fn().mockRejectedValue(new TypeError('Network error'));
      vi.spyOn(performance, 'now').mockReturnValue(0);

      const sample = await fetchProbe('/probe.txt');
      expect(sample.statusCode).toBe(0);
      expect(sample.rttMs).toBe(Infinity);
    });

    it('returns the actual status code for non-200 responses', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
      });
      vi.spyOn(performance, 'now').mockReturnValue(0);

      const sample = await fetchProbe('/probe.txt');
      expect(sample.statusCode).toBe(404);
    });

    it('includes a timestampMs in the result', async () => {
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });
      vi.spyOn(performance, 'now').mockReturnValue(0);

      const before = Date.now();
      const sample = await fetchProbe('/probe.txt');
      const after = Date.now();

      expect(sample.timestampMs).toBeGreaterThanOrEqual(before);
      expect(sample.timestampMs).toBeLessThanOrEqual(after);
    });
  });

  // ── ProbeSampler class ──────────────────────────────────────────────

  describe('ProbeSampler', () => {
    let ProbeSampler: typeof import('../../../src/metrics/probeSampler').ProbeSampler;

    beforeEach(async () => {
      vi.useFakeTimers();
      globalThis.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
      });
      vi.spyOn(performance, 'now').mockReturnValue(0);

      ({ ProbeSampler } = await import('../../../src/metrics/probeSampler'));
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
    });

    it('can be constructed with default options', () => {
      const sampler = new ProbeSampler();
      expect(sampler).toBeDefined();
    });

    it('accepts custom probe URL, interval, and window size', () => {
      const sampler = new ProbeSampler({
        url: '/custom-probe.txt',
        intervalMs: 5000,
        windowSize: 10,
      });
      expect(sampler).toBeDefined();
    });

    it('start() begins periodic probing', async () => {
      const sampler = new ProbeSampler({ intervalMs: 2000 });
      sampler.start();

      // Advance past one interval
      await vi.advanceTimersByTimeAsync(2000);

      const snapshot = sampler.getSnapshot();
      expect(snapshot.samples.length).toBeGreaterThanOrEqual(1);

      sampler.stop();
    });

    it('stop() halts periodic probing', async () => {
      const sampler = new ProbeSampler({ intervalMs: 2000 });
      sampler.start();

      await vi.advanceTimersByTimeAsync(2000);
      sampler.stop();

      const countAfterStop = sampler.getSnapshot().samples.length;

      await vi.advanceTimersByTimeAsync(4000);
      expect(sampler.getSnapshot().samples.length).toBe(countAfterStop);
    });

    it('caps samples at the configured window size', async () => {
      const sampler = new ProbeSampler({ intervalMs: 100, windowSize: 5 });
      sampler.start();

      // Fire enough intervals to exceed the window
      for (let i = 0; i < 10; i++) {
        await vi.advanceTimersByTimeAsync(100);
      }

      expect(sampler.getSnapshot().samples.length).toBeLessThanOrEqual(5);

      sampler.stop();
    });

    it('getSnapshot() returns a valid NetworkSnapshot shape', async () => {
      const sampler = new ProbeSampler({ intervalMs: 1000 });
      sampler.start();

      await vi.advanceTimersByTimeAsync(3000);

      const snapshot = sampler.getSnapshot();

      expect(snapshot).toHaveProperty('samples');
      expect(snapshot).toHaveProperty('medianRtt');
      expect(snapshot).toHaveProperty('jitter');
      expect(snapshot).toHaveProperty('packetLoss');
      expect(snapshot).toHaveProperty('bandwidth');
      expect(snapshot).toHaveProperty('timestampMs');

      expect(Array.isArray(snapshot.samples)).toBe(true);
      expect(typeof snapshot.medianRtt).toBe('number');
      expect(typeof snapshot.jitter).toBe('number');
      expect(typeof snapshot.packetLoss).toBe('number');
      expect(typeof snapshot.bandwidth).toBe('number');
      expect(typeof snapshot.timestampMs).toBe('number');

      sampler.stop();
    });

    it('getSnapshot() returns numeric medianRtt and jitter', async () => {
      let callCount = 0;
      vi.spyOn(performance, 'now').mockImplementation(() => {
        callCount++;
        // Simulate varying RTT: alternates between 100ms and 120ms
        return callCount % 2 === 1 ? 0 : (callCount % 4 === 0 ? 120 : 100);
      });

      const sampler = new ProbeSampler({ intervalMs: 1000 });
      sampler.start();

      await vi.advanceTimersByTimeAsync(5000);

      const snapshot = sampler.getSnapshot();
      expect(Number.isFinite(snapshot.medianRtt)).toBe(true);
      expect(Number.isFinite(snapshot.jitter)).toBe(true);
      expect(snapshot.medianRtt).toBeGreaterThanOrEqual(0);
      expect(snapshot.jitter).toBeGreaterThanOrEqual(0);

      sampler.stop();
    });

    it('packetLoss and bandwidth default to 0 (placeholder for US-008/US-009)', async () => {
      const sampler = new ProbeSampler();
      const snapshot = sampler.getSnapshot();
      expect(snapshot.packetLoss).toBe(0);
      expect(snapshot.bandwidth).toBe(0);
    });

    it('getSnapshot() returns empty state before start()', () => {
      const sampler = new ProbeSampler();
      const snapshot = sampler.getSnapshot();
      expect(snapshot.samples).toEqual([]);
      expect(snapshot.medianRtt).toBe(0);
      expect(snapshot.jitter).toBe(0);
    });

    it('uses /probe.txt as default URL', async () => {
      const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
      const sampler = new ProbeSampler();
      sampler.start();

      await vi.advanceTimersByTimeAsync(2000);

      const calledUrl = mockFetch.mock.calls[0]?.[0] as string;
      expect(calledUrl).toContain('/probe.txt');

      sampler.stop();
    });
  });
});
