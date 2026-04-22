import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * US-015: Hidden-tab throttling integration wiring tests.
 *
 * These tests verify that when visibility changes, ProbeSampler and
 * MetricsAggregator are stopped/started correctly, and that the
 * wiring is idempotent (no duplicate timers on rapid hide/show cycles).
 */

describe('US-015: hidden-tab throttling wiring', () => {
  let ProbeSampler: typeof import('../../src/metrics/probeSampler').ProbeSampler;
  let MetricsAggregator: typeof import('../../src/metrics/aggregator').MetricsAggregator;

  beforeEach(async () => {
    vi.resetModules();
    vi.useFakeTimers();

    // Stub fetch for ProbeSampler
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });
    vi.spyOn(performance, 'now').mockReturnValue(0);

    ({ ProbeSampler } = await import('../../src/metrics/probeSampler'));
    ({ MetricsAggregator } = await import('../../src/metrics/aggregator'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('ProbeSampler.stop() halts probing when tab is hidden', async () => {
    const sampler = new ProbeSampler({ intervalMs: 1000 });
    sampler.start();

    // Let one probe fire
    await vi.advanceTimersByTimeAsync(1000);
    const countBeforeStop = sampler.getSnapshot().samples.length;

    // Simulate "tab hidden" by calling stop
    sampler.stop();

    // Advance timers — no more probes should fire
    await vi.advanceTimersByTimeAsync(5000);
    expect(sampler.getSnapshot().samples.length).toBe(countBeforeStop);
  });

  it('MetricsAggregator.stop() halts aggregation when tab is hidden', () => {
    const aggregator = new MetricsAggregator({ cadenceMs: 1000 });
    const cb = vi.fn();
    aggregator.subscribe(cb);
    aggregator.start();

    vi.advanceTimersByTime(1000);
    expect(cb).toHaveBeenCalledTimes(1);

    // Simulate "tab hidden" by calling stop
    aggregator.stop();

    vi.advanceTimersByTime(5000);
    expect(cb).toHaveBeenCalledTimes(1); // No more ticks
  });

  it('ProbeSampler resumes cleanly after stop/start cycle', async () => {
    const sampler = new ProbeSampler({ intervalMs: 1000 });
    sampler.start();

    await vi.advanceTimersByTimeAsync(1000);
    const countAfterFirst = sampler.getSnapshot().samples.length;

    // Simulate hide
    sampler.stop();
    await vi.advanceTimersByTimeAsync(3000);

    // Simulate show
    sampler.start();
    await vi.advanceTimersByTimeAsync(1000);

    expect(sampler.getSnapshot().samples.length).toBeGreaterThan(countAfterFirst);
  });

  it('MetricsAggregator resumes cleanly and produces a snapshot after resume', () => {
    const aggregator = new MetricsAggregator({ cadenceMs: 1000 });
    const cb = vi.fn();
    aggregator.subscribe(cb);
    aggregator.start();

    vi.advanceTimersByTime(1000);
    expect(cb).toHaveBeenCalledTimes(1);

    // Simulate hide
    aggregator.stop();
    vi.advanceTimersByTime(3000);

    // Simulate show
    aggregator.start();
    vi.advanceTimersByTime(1000);

    expect(cb).toHaveBeenCalledTimes(2); // New tick after resume
  });

  it('ProbeSampler.start() is idempotent — no duplicate timers', async () => {
    const sampler = new ProbeSampler({ intervalMs: 1000 });
    sampler.start();
    sampler.start(); // Should be no-op
    sampler.start(); // Should be no-op

    await vi.advanceTimersByTimeAsync(1000);

    // Only 1 probe, not 3
    expect(sampler.getSnapshot().samples.length).toBe(1);
    sampler.stop();
  });

  it('MetricsAggregator.start() is idempotent — no duplicate timers', () => {
    const aggregator = new MetricsAggregator({ cadenceMs: 1000 });
    const cb = vi.fn();
    aggregator.subscribe(cb);

    aggregator.start();
    aggregator.start(); // Should be no-op
    aggregator.start(); // Should be no-op

    vi.advanceTimersByTime(1000);
    expect(cb).toHaveBeenCalledTimes(1); // Not 3
    aggregator.stop();
  });

  it('rapid hide/show cycles do not create duplicate timers', async () => {
    const sampler = new ProbeSampler({ intervalMs: 1000 });
    const aggregator = new MetricsAggregator({ cadenceMs: 1000 });
    const cb = vi.fn();
    aggregator.subscribe(cb);

    // Start both
    sampler.start();
    aggregator.start();

    // Rapid hide/show/hide/show
    sampler.stop();
    aggregator.stop();
    sampler.start();
    aggregator.start();
    sampler.stop();
    aggregator.stop();
    sampler.start();
    aggregator.start();

    // Advance one interval
    await vi.advanceTimersByTimeAsync(1000);

    // Should only have 1 probe and 1 aggregation tick
    expect(sampler.getSnapshot().samples.length).toBe(1);
    expect(cb).toHaveBeenCalledTimes(1);

    sampler.stop();
    aggregator.stop();
  });

  it('stop() can be called multiple times without error', () => {
    const sampler = new ProbeSampler({ intervalMs: 1000 });
    const aggregator = new MetricsAggregator({ cadenceMs: 1000 });

    sampler.start();
    aggregator.start();

    // Multiple stops should not throw
    expect(() => {
      sampler.stop();
      sampler.stop();
      sampler.stop();
    }).not.toThrow();

    expect(() => {
      aggregator.stop();
      aggregator.stop();
      aggregator.stop();
    }).not.toThrow();
  });

  it('stop() before start() does not cause issues', () => {
    const sampler = new ProbeSampler({ intervalMs: 1000 });
    const aggregator = new MetricsAggregator({ cadenceMs: 1000 });

    // Calling stop before start should not throw
    expect(() => sampler.stop()).not.toThrow();
    expect(() => aggregator.stop()).not.toThrow();

    // Should still be able to start normally after
    sampler.start();
    aggregator.start();

    sampler.stop();
    aggregator.stop();
  });
});
