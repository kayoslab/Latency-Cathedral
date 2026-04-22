import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ProbeSample, NetworkSnapshot, ResourceTimingEntry } from '../../../src/domain/types';

/**
 * These tests target the metrics aggregator module (src/metrics/aggregator.ts).
 * Functions under test: computePacketLoss, estimateBandwidth, MetricsAggregator class.
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

// Helper: build a ResourceTimingEntry with defaults
function makeEntry(overrides: Partial<ResourceTimingEntry> = {}): ResourceTimingEntry {
  return {
    name: 'https://example.com/resource.js',
    duration: 100,
    transferSize: 50000,
    encodedBodySize: 48000,
    decodedBodySize: 48000,
    startTime: 0,
    responseEnd: 100,
    timestampMs: Date.now(),
    ...overrides,
  };
}

describe('US-009: aggregate metrics into one normalized snapshot', () => {
  // ── computePacketLoss ───────────────────────────────────────────────

  describe('computePacketLoss()', () => {
    let computePacketLoss: typeof import('../../../src/metrics/aggregator').computePacketLoss;

    beforeEach(async () => {
      ({ computePacketLoss } = await import('../../../src/metrics/aggregator'));
    });

    it('returns 0 for an empty array', () => {
      expect(computePacketLoss([])).toBe(0);
    });

    it('returns 0 when all samples are successful', () => {
      const samples = [
        makeSample({ rttMs: 30, statusCode: 200 }),
        makeSample({ rttMs: 50, statusCode: 200 }),
        makeSample({ rttMs: 40, statusCode: 200 }),
      ];
      expect(computePacketLoss(samples)).toBe(0);
    });

    it('returns 1 when all samples failed (Infinity RTT)', () => {
      const samples = [
        makeSample({ rttMs: Infinity, statusCode: 0 }),
        makeSample({ rttMs: Infinity, statusCode: 0 }),
        makeSample({ rttMs: Infinity, statusCode: 0 }),
      ];
      expect(computePacketLoss(samples)).toBe(1);
    });

    it('returns correct ratio for mixed success/failure', () => {
      const samples = [
        makeSample({ rttMs: 30, statusCode: 200 }),
        makeSample({ rttMs: Infinity, statusCode: 0 }),
        makeSample({ rttMs: 50, statusCode: 200 }),
        makeSample({ rttMs: Infinity, statusCode: 0 }),
      ];
      expect(computePacketLoss(samples)).toBeCloseTo(0.5);
    });

    it('returns correct ratio for a single successful sample', () => {
      const samples = [makeSample({ rttMs: 42, statusCode: 200 })];
      expect(computePacketLoss(samples)).toBe(0);
    });

    it('returns correct ratio for a single failed sample', () => {
      const samples = [makeSample({ rttMs: Infinity, statusCode: 0 })];
      expect(computePacketLoss(samples)).toBe(1);
    });

    it('treats statusCode 0 with finite RTT as a failure', () => {
      // statusCode 0 indicates network error even if rttMs happened to be finite
      const samples = [
        makeSample({ rttMs: 30, statusCode: 200 }),
        makeSample({ rttMs: 10, statusCode: 0 }),
      ];
      expect(computePacketLoss(samples)).toBeCloseTo(0.5);
    });
  });

  // ── estimateBandwidth ───────────────────────────────────────────────

  describe('estimateBandwidth()', () => {
    let estimateBandwidth: typeof import('../../../src/metrics/aggregator').estimateBandwidth;

    beforeEach(async () => {
      ({ estimateBandwidth } = await import('../../../src/metrics/aggregator'));
    });

    it('returns 0 for an empty array', () => {
      expect(estimateBandwidth([])).toBe(0);
    });

    it('returns 0 when all entries have zero transferSize (cross-origin)', () => {
      const entries = [
        makeEntry({ transferSize: 0, duration: 100 }),
        makeEntry({ transferSize: 0, duration: 200 }),
      ];
      expect(estimateBandwidth(entries)).toBe(0);
    });

    it('returns 0 when all entries have zero duration', () => {
      const entries = [
        makeEntry({ transferSize: 50000, duration: 0 }),
        makeEntry({ transferSize: 30000, duration: 0 }),
      ];
      expect(estimateBandwidth(entries)).toBe(0);
    });

    it('computes correct mean throughput in Mbps for valid entries', () => {
      // 50000 bytes / 100ms = 500000 bytes/s = 4 Mbps
      // 100000 bytes / 200ms = 500000 bytes/s = 4 Mbps
      // Mean = 4 Mbps
      const entries = [
        makeEntry({ transferSize: 50000, duration: 100 }),
        makeEntry({ transferSize: 100000, duration: 200 }),
      ];
      const result = estimateBandwidth(entries);
      expect(result).toBeCloseTo(4, 1);
    });

    it('excludes entries with zero transferSize from the mean', () => {
      // Only the valid entry should count:
      // 50000 bytes / 100ms = 500000 bytes/s = 4 Mbps
      const entries = [
        makeEntry({ transferSize: 50000, duration: 100 }),
        makeEntry({ transferSize: 0, duration: 200 }),
      ];
      const result = estimateBandwidth(entries);
      expect(result).toBeCloseTo(4, 1);
    });

    it('excludes entries with zero duration from the mean', () => {
      // Only the valid entry should count
      const entries = [
        makeEntry({ transferSize: 50000, duration: 100 }),
        makeEntry({ transferSize: 30000, duration: 0 }),
      ];
      const result = estimateBandwidth(entries);
      expect(result).toBeCloseTo(4, 1);
    });

    it('handles a single valid entry', () => {
      // 125000 bytes / 100ms = 1250000 bytes/s = 10 Mbps
      const entries = [makeEntry({ transferSize: 125000, duration: 100 })];
      const result = estimateBandwidth(entries);
      expect(result).toBeCloseTo(10, 1);
    });
  });

  // ── MetricsAggregator class ─────────────────────────────────────────

  describe('MetricsAggregator', () => {
    let MetricsAggregator: typeof import('../../../src/metrics/aggregator').MetricsAggregator;

    beforeEach(async () => {
      vi.useFakeTimers();
      ({ MetricsAggregator } = await import('../../../src/metrics/aggregator'));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    // Stub factories
    function stubProbeSampler(snapshot?: Partial<NetworkSnapshot>) {
      return {
        getSnapshot: vi.fn<() => NetworkSnapshot>().mockReturnValue({
          samples: [makeSample()],
          medianRtt: 50,
          jitter: 10,
          packetLoss: 0,
          bandwidth: 0,
          timestampMs: Date.now(),
          ...snapshot,
        }),
      };
    }

    function stubResourceTimingCollector(entries?: ResourceTimingEntry[]) {
      return {
        getEntries: vi.fn<() => ResourceTimingEntry[]>().mockReturnValue(
          entries ?? [makeEntry()],
        ),
      };
    }

    function stubPresetState(active: { name: string; snapshot: NetworkSnapshot } | null = null) {
      return {
        current: vi.fn().mockReturnValue(active),
        select: vi.fn(),
        subscribe: vi.fn().mockReturnValue(() => {}),
      };
    }

    it('produces a complete snapshot with all fields populated when both sources available', () => {
      const sampler = stubProbeSampler({
        samples: [makeSample({ rttMs: 40 }), makeSample({ rttMs: 60 })],
        medianRtt: 50,
        jitter: 10,
      });
      const collector = stubResourceTimingCollector([
        makeEntry({ transferSize: 50000, duration: 100 }),
      ]);
      const presetState = stubPresetState(null);

      const aggregator = new MetricsAggregator({
        probeSampler: sampler as any,
        resourceTimingCollector: collector as any,
        presetState: presetState as any,
        cadenceMs: 2000,
      });

      aggregator.start();
      vi.advanceTimersByTime(2000);

      const snap = aggregator.getSnapshot();
      aggregator.stop();

      expect(snap).toBeDefined();
      expect(typeof snap.medianRtt).toBe('number');
      expect(typeof snap.jitter).toBe('number');
      expect(typeof snap.packetLoss).toBe('number');
      expect(typeof snap.bandwidth).toBe('number');
      expect(typeof snap.timestampMs).toBe('number');
      expect(Array.isArray(snap.samples)).toBe(true);
      expect(Number.isFinite(snap.medianRtt)).toBe(true);
      expect(Number.isFinite(snap.jitter)).toBe(true);
      expect(Number.isFinite(snap.packetLoss)).toBe(true);
      expect(Number.isFinite(snap.bandwidth)).toBe(true);
    });

    it('returns preset snapshot when preset is active, ignoring live data', () => {
      const presetSnapshot: NetworkSnapshot = {
        samples: [],
        medianRtt: 20,
        jitter: 5,
        packetLoss: 0,
        bandwidth: 50,
        timestampMs: 0,
      };

      const sampler = stubProbeSampler({ medianRtt: 999, jitter: 999 });
      const collector = stubResourceTimingCollector();
      const presetState = stubPresetState({ name: 'fast', snapshot: presetSnapshot });

      const aggregator = new MetricsAggregator({
        probeSampler: sampler as any,
        resourceTimingCollector: collector as any,
        presetState: presetState as any,
        cadenceMs: 2000,
      });

      aggregator.start();
      vi.advanceTimersByTime(2000);

      const snap = aggregator.getSnapshot();
      aggregator.stop();

      expect(snap.medianRtt).toBe(20);
      expect(snap.jitter).toBe(5);
      expect(snap.packetLoss).toBe(0);
      expect(snap.bandwidth).toBe(50);
    });

    it('returns snapshot with zero RTT/jitter when ProbeSampler is missing', () => {
      const collector = stubResourceTimingCollector([
        makeEntry({ transferSize: 50000, duration: 100 }),
      ]);
      const presetState = stubPresetState(null);

      const aggregator = new MetricsAggregator({
        resourceTimingCollector: collector as any,
        presetState: presetState as any,
        cadenceMs: 2000,
      });

      aggregator.start();
      vi.advanceTimersByTime(2000);

      const snap = aggregator.getSnapshot();
      aggregator.stop();

      expect(snap.medianRtt).toBe(0);
      expect(snap.jitter).toBe(0);
      expect(snap.packetLoss).toBe(0);
      expect(snap.samples).toEqual([]);
      expect(Number.isFinite(snap.bandwidth)).toBe(true);
    });

    it('returns snapshot with zero bandwidth when ResourceTimingCollector is missing', () => {
      const sampler = stubProbeSampler({
        samples: [makeSample({ rttMs: 50 })],
        medianRtt: 50,
        jitter: 10,
      });
      const presetState = stubPresetState(null);

      const aggregator = new MetricsAggregator({
        probeSampler: sampler as any,
        presetState: presetState as any,
        cadenceMs: 2000,
      });

      aggregator.start();
      vi.advanceTimersByTime(2000);

      const snap = aggregator.getSnapshot();
      aggregator.stop();

      expect(snap.bandwidth).toBe(0);
      expect(snap.medianRtt).toBe(50);
      expect(snap.jitter).toBe(10);
    });

    it('does not crash when all sources are missing', () => {
      const aggregator = new MetricsAggregator({ cadenceMs: 2000 });

      aggregator.start();
      vi.advanceTimersByTime(2000);

      const snap = aggregator.getSnapshot();
      aggregator.stop();

      expect(snap.medianRtt).toBe(0);
      expect(snap.jitter).toBe(0);
      expect(snap.packetLoss).toBe(0);
      expect(snap.bandwidth).toBe(0);
      expect(snap.samples).toEqual([]);
      expect(Number.isFinite(snap.timestampMs)).toBe(true);
    });

    it('subscription fires on each tick', () => {
      const sampler = stubProbeSampler();
      const collector = stubResourceTimingCollector();
      const presetState = stubPresetState(null);

      const aggregator = new MetricsAggregator({
        probeSampler: sampler as any,
        resourceTimingCollector: collector as any,
        presetState: presetState as any,
        cadenceMs: 1000,
      });

      const cb = vi.fn();
      aggregator.subscribe(cb);
      aggregator.start();

      vi.advanceTimersByTime(3000);
      aggregator.stop();

      expect(cb).toHaveBeenCalledTimes(3);
      // Each call receives a NetworkSnapshot
      for (const call of cb.mock.calls) {
        const snap = call[0] as NetworkSnapshot;
        expect(typeof snap.medianRtt).toBe('number');
        expect(typeof snap.timestampMs).toBe('number');
      }
    });

    it('unsubscribe stops delivery', () => {
      const sampler = stubProbeSampler();
      const presetState = stubPresetState(null);

      const aggregator = new MetricsAggregator({
        probeSampler: sampler as any,
        presetState: presetState as any,
        cadenceMs: 1000,
      });

      const cb = vi.fn();
      const unsub = aggregator.subscribe(cb);
      aggregator.start();

      vi.advanceTimersByTime(1000);
      expect(cb).toHaveBeenCalledTimes(1);

      unsub();

      vi.advanceTimersByTime(2000);
      expect(cb).toHaveBeenCalledTimes(1); // No additional calls

      aggregator.stop();
    });

    it('stop() prevents further ticks and does not leak timers', () => {
      const sampler = stubProbeSampler();
      const presetState = stubPresetState(null);

      const aggregator = new MetricsAggregator({
        probeSampler: sampler as any,
        presetState: presetState as any,
        cadenceMs: 1000,
      });

      const cb = vi.fn();
      aggregator.subscribe(cb);
      aggregator.start();

      vi.advanceTimersByTime(1000);
      expect(cb).toHaveBeenCalledTimes(1);

      aggregator.stop();

      vi.advanceTimersByTime(5000);
      expect(cb).toHaveBeenCalledTimes(1); // No additional calls after stop
    });

    it('start() is idempotent — calling it twice does not create duplicate timers', () => {
      const sampler = stubProbeSampler();
      const presetState = stubPresetState(null);

      const aggregator = new MetricsAggregator({
        probeSampler: sampler as any,
        presetState: presetState as any,
        cadenceMs: 1000,
      });

      const cb = vi.fn();
      aggregator.subscribe(cb);
      aggregator.start();
      aggregator.start(); // second call should be no-op

      vi.advanceTimersByTime(1000);
      expect(cb).toHaveBeenCalledTimes(1); // Not 2
      aggregator.stop();
    });

    it('uses default cadence of 2000ms when not specified', () => {
      const sampler = stubProbeSampler();
      const presetState = stubPresetState(null);

      const aggregator = new MetricsAggregator({
        probeSampler: sampler as any,
        presetState: presetState as any,
      });

      const cb = vi.fn();
      aggregator.subscribe(cb);
      aggregator.start();

      vi.advanceTimersByTime(1999);
      expect(cb).toHaveBeenCalledTimes(0);

      vi.advanceTimersByTime(1);
      expect(cb).toHaveBeenCalledTimes(1);

      aggregator.stop();
    });

    it('getSnapshot returns valid zero-value defaults before first tick', () => {
      const aggregator = new MetricsAggregator({ cadenceMs: 2000 });

      const snap = aggregator.getSnapshot();

      expect(snap.medianRtt).toBe(0);
      expect(snap.jitter).toBe(0);
      expect(snap.packetLoss).toBe(0);
      expect(snap.bandwidth).toBe(0);
      expect(snap.samples).toEqual([]);
      expect(Number.isFinite(snap.timestampMs)).toBe(true);
    });

    it('computes packetLoss from probe samples with failures', () => {
      const failedSamples = [
        makeSample({ rttMs: 40, statusCode: 200 }),
        makeSample({ rttMs: Infinity, statusCode: 0 }),
        makeSample({ rttMs: 60, statusCode: 200 }),
        makeSample({ rttMs: Infinity, statusCode: 0 }),
      ];
      const sampler = stubProbeSampler({ samples: failedSamples });
      const presetState = stubPresetState(null);

      const aggregator = new MetricsAggregator({
        probeSampler: sampler as any,
        presetState: presetState as any,
        cadenceMs: 1000,
      });

      aggregator.start();
      vi.advanceTimersByTime(1000);

      const snap = aggregator.getSnapshot();
      aggregator.stop();

      expect(snap.packetLoss).toBeCloseTo(0.5);
    });

    it('computes bandwidth from resource timing entries', () => {
      // 50000 bytes / 100ms = 500000 bytes/s = 4 Mbps
      const collector = stubResourceTimingCollector([
        makeEntry({ transferSize: 50000, duration: 100 }),
      ]);
      const presetState = stubPresetState(null);

      const aggregator = new MetricsAggregator({
        resourceTimingCollector: collector as any,
        presetState: presetState as any,
        cadenceMs: 1000,
      });

      aggregator.start();
      vi.advanceTimersByTime(1000);

      const snap = aggregator.getSnapshot();
      aggregator.stop();

      expect(snap.bandwidth).toBeCloseTo(4, 1);
    });
  });
});
