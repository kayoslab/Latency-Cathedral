import type { ProbeSample, NetworkSnapshot, ResourceTimingEntry } from '../domain/types';

/** Determine whether a probe sample represents a failure. */
function isFailed(sample: ProbeSample): boolean {
  return sample.statusCode === 0 || !Number.isFinite(sample.rttMs);
}

/**
 * Compute packet loss as the ratio of failed samples to total samples.
 * A sample is considered failed when statusCode === 0 or rttMs is not finite.
 * Returns 0 for an empty array.
 */
export function computePacketLoss(samples: ProbeSample[]): number {
  if (samples.length === 0) return 0;
  const failures = samples.filter(isFailed).length;
  return failures / samples.length;
}

/**
 * Estimate bandwidth in Mbps from resource timing entries.
 * Entries with zero transferSize or zero duration are excluded (e.g. cross-origin).
 * Returns 0 when no usable entries exist.
 */
export function estimateBandwidth(entries: ResourceTimingEntry[]): number {
  const usable = entries.filter((e) => e.transferSize > 0 && e.duration > 0);
  if (usable.length === 0) return 0;

  let totalMbps = 0;
  for (const e of usable) {
    // bytes to megabits: bytes * 8 / 1_000_000
    // duration ms to seconds: duration / 1000
    // Mbps = (bytes * 8 / 1_000_000) / (duration / 1000) = bytes * 8 / (duration * 1000)
    totalMbps += (e.transferSize * 8) / (e.duration * 1000);
  }
  return totalMbps / usable.length;
}

const DEFAULT_CADENCE_MS = 2000;

function zeroSnapshot(): NetworkSnapshot {
  return {
    samples: [],
    medianRtt: 0,
    jitter: 0,
    packetLoss: 0,
    bandwidth: 0,
    timestampMs: Date.now(),
  };
}

export interface AggregatorOptions {
  probeSampler?: { getSnapshot(): NetworkSnapshot };
  resourceTimingCollector?: { getEntries(): ResourceTimingEntry[] };
  presetState?: { current(): { name: string; snapshot: NetworkSnapshot } | null };
  cadenceMs?: number;
}

export class MetricsAggregator {
  private readonly probeSampler: AggregatorOptions['probeSampler'];
  private readonly resourceTimingCollector: AggregatorOptions['resourceTimingCollector'];
  private readonly presetState: AggregatorOptions['presetState'];
  private readonly cadenceMs: number;

  private latest: NetworkSnapshot = zeroSnapshot();
  private timerId: ReturnType<typeof setInterval> | null = null;
  private subscribers = new Set<(snap: NetworkSnapshot) => void>();

  constructor(options: AggregatorOptions) {
    this.probeSampler = options.probeSampler;
    this.resourceTimingCollector = options.resourceTimingCollector;
    this.presetState = options.presetState;
    this.cadenceMs = options.cadenceMs ?? DEFAULT_CADENCE_MS;
  }

  start(): void {
    if (this.timerId !== null) return;
    this.timerId = setInterval(() => this.aggregate(), this.cadenceMs);
  }

  stop(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  getSnapshot(): NetworkSnapshot {
    return this.latest;
  }

  subscribe(cb: (snap: NetworkSnapshot) => void): () => void {
    this.subscribers.add(cb);
    return () => {
      this.subscribers.delete(cb);
    };
  }

  private aggregate(): void {
    // Preset overrides live data
    const preset = this.presetState?.current();
    if (preset) {
      this.latest = { ...preset.snapshot, timestampMs: Date.now() };
      this.notify();
      return;
    }

    // Read live sources (gracefully handle missing)
    const probeSnap = this.probeSampler?.getSnapshot();
    const entries = this.resourceTimingCollector?.getEntries() ?? [];

    const samples = probeSnap?.samples ?? [];
    const medianRtt = probeSnap?.medianRtt ?? 0;
    const jitter = probeSnap?.jitter ?? 0;
    const packetLoss = computePacketLoss(samples);
    const bandwidth = estimateBandwidth(entries);

    this.latest = {
      samples,
      medianRtt,
      jitter,
      packetLoss,
      bandwidth,
      timestampMs: Date.now(),
    };

    this.notify();
  }

  private notify(): void {
    for (const cb of this.subscribers) {
      cb(this.latest);
    }
  }
}
