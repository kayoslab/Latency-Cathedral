import type { ResourceTimingEntry } from '../domain/types';

/**
 * Feature-detect whether PerformanceObserver supports 'resource' entry type.
 */
export function isResourceTimingSupported(): boolean {
  try {
    return (
      typeof PerformanceObserver !== 'undefined' &&
      PerformanceObserver !== undefined &&
      Array.isArray(PerformanceObserver.supportedEntryTypes) &&
      PerformanceObserver.supportedEntryTypes.includes('resource')
    );
  } catch {
    return false;
  }
}

/**
 * Map a browser PerformanceResourceTiming entry to our domain type.
 */
export function extractTimingEntry(entry: PerformanceResourceTiming): ResourceTimingEntry {
  return {
    name: entry.name,
    duration: entry.duration,
    transferSize: entry.transferSize,
    encodedBodySize: entry.encodedBodySize,
    decodedBodySize: entry.decodedBodySize,
    startTime: entry.startTime,
    responseEnd: entry.responseEnd,
    timestampMs: Date.now(),
  };
}

export interface ResourceTimingCollectorOptions {
  windowSize?: number;
}

const DEFAULT_WINDOW_SIZE = 50;

/**
 * Collects resource timing entries via PerformanceObserver.
 * Gracefully no-ops when the API is unavailable.
 */
export class ResourceTimingCollector {
  private entries: ResourceTimingEntry[] = [];
  private observer: PerformanceObserver | null = null;
  private windowSize: number;

  constructor(options?: ResourceTimingCollectorOptions) {
    this.windowSize = options?.windowSize ?? DEFAULT_WINDOW_SIZE;
  }

  start(): void {
    if (!isResourceTimingSupported()) return;

    this.observer = new PerformanceObserver((list) => {
      const perfEntries = list.getEntries() as PerformanceResourceTiming[];
      for (const entry of perfEntries) {
        this.entries.push(extractTimingEntry(entry));
      }
      // Evict oldest entries beyond window size
      if (this.entries.length > this.windowSize) {
        this.entries = this.entries.slice(this.entries.length - this.windowSize);
      }
    });

    this.observer.observe({ type: 'resource', buffered: false });
  }

  stop(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }

  getEntries(): ResourceTimingEntry[] {
    return [...this.entries];
  }
}
