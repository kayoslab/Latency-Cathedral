import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

/**
 * These tests target the resource timing module (src/metrics/resourceTiming.ts).
 * Functions under test: isResourceTimingSupported, extractTimingEntry, ResourceTimingCollector.
 */

// Helper: build a mock PerformanceResourceTiming entry
function makePerformanceEntry(
  overrides: Partial<PerformanceResourceTiming> = {},
): PerformanceResourceTiming {
  return {
    name: 'http://localhost:5173/probe.txt',
    entryType: 'resource',
    startTime: 100,
    duration: 45.5,
    initiatorType: 'fetch',
    nextHopProtocol: 'h2',
    transferSize: 1024,
    encodedBodySize: 900,
    decodedBodySize: 900,
    responseEnd: 145.5,
    workerStart: 0,
    redirectStart: 0,
    redirectEnd: 0,
    fetchStart: 100,
    domainLookupStart: 100,
    domainLookupEnd: 100,
    connectStart: 100,
    connectEnd: 100,
    secureConnectionStart: 0,
    requestStart: 110,
    responseStart: 130,
    serverTiming: [],
    toJSON: () => ({}),
    ...overrides,
  } as PerformanceResourceTiming;
}

describe('US-008: resource timing metrics', () => {
  // ── isResourceTimingSupported ───────────────────────────────────────

  describe('isResourceTimingSupported()', () => {
    let isResourceTimingSupported: typeof import('../../../src/metrics/resourceTiming').isResourceTimingSupported;

    beforeEach(async () => {
      vi.resetModules();
      ({ isResourceTimingSupported } = await import(
        '../../../src/metrics/resourceTiming'
      ));
    });

    afterEach(() => {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    });

    it('returns false when PerformanceObserver is absent', () => {
      vi.stubGlobal('PerformanceObserver', undefined);
      expect(isResourceTimingSupported()).toBe(false);
    });

    it('returns false when supportedEntryTypes does not include "resource"', () => {
      const FakeObserver = class {} as unknown as typeof PerformanceObserver;
      Object.defineProperty(FakeObserver, 'supportedEntryTypes', {
        value: ['mark', 'measure'],
        configurable: true,
      });
      vi.stubGlobal('PerformanceObserver', FakeObserver);
      expect(isResourceTimingSupported()).toBe(false);
    });

    it('returns true when PerformanceObserver supports "resource" entry type', () => {
      const FakeObserver = class {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        constructor(_cb: PerformanceObserverCallback) {}
        observe() {}
        disconnect() {}
        takeRecords() {
          return [];
        }
      } as unknown as typeof PerformanceObserver;
      Object.defineProperty(FakeObserver, 'supportedEntryTypes', {
        value: ['resource', 'mark', 'measure'],
        configurable: true,
      });
      vi.stubGlobal('PerformanceObserver', FakeObserver);
      expect(isResourceTimingSupported()).toBe(true);
    });

    it('returns false when supportedEntryTypes is undefined', () => {
      const FakeObserver = class {} as unknown as typeof PerformanceObserver;
      vi.stubGlobal('PerformanceObserver', FakeObserver);
      expect(isResourceTimingSupported()).toBe(false);
    });

    it('returns false when PerformanceObserver.supportedEntryTypes throws', () => {
      const FakeObserver = class {} as unknown as typeof PerformanceObserver;
      Object.defineProperty(FakeObserver, 'supportedEntryTypes', {
        get() {
          throw new Error('not supported');
        },
        configurable: true,
      });
      vi.stubGlobal('PerformanceObserver', FakeObserver);
      expect(isResourceTimingSupported()).toBe(false);
    });
  });

  // ── extractTimingEntry ──────────────────────────────────────────────

  describe('extractTimingEntry()', () => {
    let extractTimingEntry: typeof import('../../../src/metrics/resourceTiming').extractTimingEntry;

    beforeEach(async () => {
      vi.resetModules();
      ({ extractTimingEntry } = await import(
        '../../../src/metrics/resourceTiming'
      ));
    });

    it('maps all fields from a PerformanceResourceTiming entry', () => {
      const perf = makePerformanceEntry({
        name: 'http://localhost:5173/probe.txt',
        duration: 45.5,
        transferSize: 1024,
        encodedBodySize: 900,
        decodedBodySize: 900,
        startTime: 100,
        responseEnd: 145.5,
      });

      const entry = extractTimingEntry(perf);

      expect(entry.name).toBe('http://localhost:5173/probe.txt');
      expect(entry.duration).toBe(45.5);
      expect(entry.transferSize).toBe(1024);
      expect(entry.encodedBodySize).toBe(900);
      expect(entry.decodedBodySize).toBe(900);
      expect(entry.startTime).toBe(100);
      expect(entry.responseEnd).toBe(145.5);
      expect(typeof entry.timestampMs).toBe('number');
    });

    it('includes a timestampMs reflecting current time', () => {
      const perf = makePerformanceEntry();
      const before = Date.now();
      const entry = extractTimingEntry(perf);
      const after = Date.now();

      expect(entry.timestampMs).toBeGreaterThanOrEqual(before);
      expect(entry.timestampMs).toBeLessThanOrEqual(after);
    });

    it('handles entries with zero transferSize (cached resources)', () => {
      const perf = makePerformanceEntry({ transferSize: 0 });
      const entry = extractTimingEntry(perf);
      expect(entry.transferSize).toBe(0);
    });

    it('handles entries with zero duration', () => {
      const perf = makePerformanceEntry({ duration: 0 });
      const entry = extractTimingEntry(perf);
      expect(entry.duration).toBe(0);
    });
  });

  // ── ResourceTimingCollector ─────────────────────────────────────────

  describe('ResourceTimingCollector', () => {
    let ResourceTimingCollector: typeof import('../../../src/metrics/resourceTiming').ResourceTimingCollector;

    afterEach(() => {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    });

    describe('when API is unsupported', () => {
      beforeEach(async () => {
        vi.resetModules();
        vi.stubGlobal('PerformanceObserver', undefined);
        ({ ResourceTimingCollector } = await import(
          '../../../src/metrics/resourceTiming'
        ));
      });

      it('start() does not throw when API is unavailable', () => {
        const collector = new ResourceTimingCollector();
        expect(() => collector.start()).not.toThrow();
      });

      it('stop() does not throw when API is unavailable', () => {
        const collector = new ResourceTimingCollector();
        collector.start();
        expect(() => collector.stop()).not.toThrow();
      });

      it('getEntries() returns empty array when API is unavailable', () => {
        const collector = new ResourceTimingCollector();
        collector.start();
        const entries = collector.getEntries();
        expect(entries).toEqual([]);
      });

      it('stop() without start() does not throw', () => {
        const collector = new ResourceTimingCollector();
        expect(() => collector.stop()).not.toThrow();
      });
    });

    describe('when API is supported', () => {
      let observeCallback: PerformanceObserverCallback;
      let mockDisconnect: ReturnType<typeof vi.fn<() => void>>;

      beforeEach(async () => {
        vi.resetModules();

        mockDisconnect = vi.fn();

        const FakeObserver = class {
          constructor(cb: PerformanceObserverCallback) {
            observeCallback = cb;
          }
          observe() {}
          disconnect() {
            mockDisconnect();
          }
          takeRecords() {
            return [];
          }
        } as unknown as typeof PerformanceObserver;

        Object.defineProperty(FakeObserver, 'supportedEntryTypes', {
          value: ['resource', 'mark', 'measure'],
          configurable: true,
        });

        vi.stubGlobal('PerformanceObserver', FakeObserver);

        ({ ResourceTimingCollector } = await import(
          '../../../src/metrics/resourceTiming'
        ));
      });

      it('collects entries pushed by PerformanceObserver', () => {
        const collector = new ResourceTimingCollector();
        collector.start();

        // Simulate observer delivering entries
        const mockEntry = makePerformanceEntry({ duration: 42 });
        const mockList = {
          getEntries: () => [mockEntry],
        } as unknown as PerformanceObserverEntryList;
        observeCallback(
          mockList,
          {} as PerformanceObserver,
        );

        const entries = collector.getEntries();
        expect(entries.length).toBe(1);
        expect(entries[0].duration).toBe(42);
      });

      it('stop() disconnects the observer', () => {
        const collector = new ResourceTimingCollector();
        collector.start();
        collector.stop();
        expect(mockDisconnect).toHaveBeenCalled();
      });

      it('enforces rolling window of default size', () => {
        const collector = new ResourceTimingCollector();
        collector.start();

        // Push more entries than the default window size (50)
        for (let i = 0; i < 60; i++) {
          const mockEntry = makePerformanceEntry({ duration: i });
          const mockList = {
            getEntries: () => [mockEntry],
          } as unknown as PerformanceObserverEntryList;
          observeCallback(mockList, {} as PerformanceObserver);
        }

        const entries = collector.getEntries();
        expect(entries.length).toBeLessThanOrEqual(50);
        // Oldest entries should have been evicted; newest should remain
        expect(entries[entries.length - 1].duration).toBe(59);
      });

      it('accepts custom window size', () => {
        const collector = new ResourceTimingCollector({ windowSize: 5 });
        collector.start();

        for (let i = 0; i < 10; i++) {
          const mockEntry = makePerformanceEntry({ duration: i });
          const mockList = {
            getEntries: () => [mockEntry],
          } as unknown as PerformanceObserverEntryList;
          observeCallback(mockList, {} as PerformanceObserver);
        }

        const entries = collector.getEntries();
        expect(entries.length).toBeLessThanOrEqual(5);
        // Most recent entries should be preserved
        expect(entries[entries.length - 1].duration).toBe(9);
      });

      it('evicts oldest entries when window overflows', () => {
        const collector = new ResourceTimingCollector({ windowSize: 3 });
        collector.start();

        // Push entries with durations 10, 20, 30, 40
        for (const dur of [10, 20, 30, 40]) {
          const mockEntry = makePerformanceEntry({ duration: dur });
          const mockList = {
            getEntries: () => [mockEntry],
          } as unknown as PerformanceObserverEntryList;
          observeCallback(mockList, {} as PerformanceObserver);
        }

        const entries = collector.getEntries();
        expect(entries.length).toBe(3);
        // The oldest (10) should be evicted
        expect(entries.map((e: { duration: number }) => e.duration)).toEqual([20, 30, 40]);
      });

      it('handles multiple entries in a single observer callback', () => {
        const collector = new ResourceTimingCollector();
        collector.start();

        const entries = [
          makePerformanceEntry({ duration: 10 }),
          makePerformanceEntry({ duration: 20 }),
          makePerformanceEntry({ duration: 30 }),
        ];
        const mockList = {
          getEntries: () => entries,
        } as unknown as PerformanceObserverEntryList;
        observeCallback(mockList, {} as PerformanceObserver);

        expect(collector.getEntries().length).toBe(3);
      });

      it('getEntries() returns a copy, not a reference to internal state', () => {
        const collector = new ResourceTimingCollector();
        collector.start();

        const mockEntry = makePerformanceEntry({ duration: 42 });
        const mockList = {
          getEntries: () => [mockEntry],
        } as unknown as PerformanceObserverEntryList;
        observeCallback(mockList, {} as PerformanceObserver);

        const entries1 = collector.getEntries();
        const entries2 = collector.getEntries();
        expect(entries1).not.toBe(entries2);
        expect(entries1).toEqual(entries2);
      });

      it('getEntries() returns empty array before start()', () => {
        const collector = new ResourceTimingCollector();
        expect(collector.getEntries()).toEqual([]);
      });
    });
  });
});
