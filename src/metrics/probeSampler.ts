import type { ProbeSample, NetworkSnapshot } from '../domain/types';

export async function fetchProbe(url: string): Promise<ProbeSample> {
  const cacheBustUrl = `${url}${url.includes('?') ? '&' : '?'}t=${Date.now()}`;
  const start = performance.now();

  try {
    const response = await fetch(cacheBustUrl);
    const end = performance.now();
    return {
      url,
      statusCode: response.status,
      rttMs: end - start,
      timestampMs: Date.now(),
    };
  } catch {
    return {
      url,
      statusCode: 0,
      rttMs: Infinity,
      timestampMs: Date.now(),
    };
  }
}

function filterValid(samples: ProbeSample[]): ProbeSample[] {
  return samples.filter((s) => Number.isFinite(s.rttMs));
}

export function computeMedianRtt(samples: ProbeSample[]): number {
  const valid = filterValid(samples).map((s) => s.rttMs).sort((a, b) => a - b);
  if (valid.length === 0) return 0;
  const mid = Math.floor(valid.length / 2);
  if (valid.length % 2 === 1) return valid[mid];
  return (valid[mid - 1] + valid[mid]) / 2;
}

export function computeJitter(samples: ProbeSample[]): number {
  const valid = filterValid(samples).map((s) => s.rttMs);
  if (valid.length < 2) return 0;
  let sum = 0;
  for (let i = 1; i < valid.length; i++) {
    sum += Math.abs(valid[i] - valid[i - 1]);
  }
  return sum / (valid.length - 1);
}

export interface ProbeSamplerOptions {
  url?: string;
  intervalMs?: number;
  windowSize?: number;
}

export class ProbeSampler {
  private readonly url: string;
  private readonly intervalMs: number;
  private readonly windowSize: number;
  private samples: ProbeSample[] = [];
  private timerId: ReturnType<typeof setInterval> | null = null;

  constructor(options: ProbeSamplerOptions = {}) {
    this.url = options.url ?? '/probe.txt';
    this.intervalMs = options.intervalMs ?? 2000;
    this.windowSize = options.windowSize ?? 20;
  }

  start(): void {
    if (this.timerId !== null) return;
    this.timerId = setInterval(() => {
      void this.probe();
    }, this.intervalMs);
  }

  stop(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
  }

  getSnapshot(): NetworkSnapshot {
    return {
      samples: [...this.samples],
      medianRtt: computeMedianRtt(this.samples),
      jitter: computeJitter(this.samples),
      packetLoss: 0,
      bandwidth: 0,
      timestampMs: Date.now(),
    };
  }

  private async probe(): Promise<void> {
    const sample = await fetchProbe(this.url);
    this.samples.push(sample);
    if (this.samples.length > this.windowSize) {
      this.samples = this.samples.slice(-this.windowSize);
    }
  }
}
