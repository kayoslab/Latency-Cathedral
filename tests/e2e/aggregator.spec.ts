import { test, expect } from '@playwright/test';

test.describe('US-009: metrics aggregator', () => {
  test('MetricsAggregator can be instantiated and produces a valid NetworkSnapshot shape', async ({ page }) => {
    await page.goto('/');

    const snapshot = await page.evaluate(async () => {
      // @ts-expect-error Vite resolves this at runtime in the browser
      const { MetricsAggregator } = await import('/src/metrics/aggregator.ts');

      const aggregator = new MetricsAggregator({ cadenceMs: 500 });
      aggregator.start();

      // Wait for at least one aggregation tick
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const snap = aggregator.getSnapshot();
      aggregator.stop();
      return snap;
    });

    expect(snapshot).toBeDefined();
    expect(typeof snapshot.medianRtt).toBe('number');
    expect(Number.isFinite(snapshot.medianRtt)).toBe(true);
    expect(typeof snapshot.jitter).toBe('number');
    expect(Number.isFinite(snapshot.jitter)).toBe(true);
    expect(typeof snapshot.packetLoss).toBe('number');
    expect(Number.isFinite(snapshot.packetLoss)).toBe(true);
    expect(snapshot.packetLoss).toBeGreaterThanOrEqual(0);
    expect(snapshot.packetLoss).toBeLessThanOrEqual(1);
    expect(typeof snapshot.bandwidth).toBe('number');
    expect(Number.isFinite(snapshot.bandwidth)).toBe(true);
    expect(snapshot.bandwidth).toBeGreaterThanOrEqual(0);
    expect(typeof snapshot.timestampMs).toBe('number');
    expect(Number.isFinite(snapshot.timestampMs)).toBe(true);
    expect(Array.isArray(snapshot.samples)).toBe(true);
  });

  test('MetricsAggregator starts and stops without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');

    await page.evaluate(async () => {
      // @ts-expect-error Vite resolves this at runtime in the browser
      const { MetricsAggregator } = await import('/src/metrics/aggregator.ts');

      const aggregator = new MetricsAggregator({ cadenceMs: 300 });
      aggregator.start();
      await new Promise((resolve) => setTimeout(resolve, 1000));
      aggregator.stop();
    });

    expect(errors).toEqual([]);
  });

  test('MetricsAggregator subscription delivers snapshots in the browser', async ({ page }) => {
    await page.goto('/');

    const callCount = await page.evaluate(async () => {
      // @ts-expect-error Vite resolves this at runtime in the browser
      const { MetricsAggregator } = await import('/src/metrics/aggregator.ts');

      const aggregator = new MetricsAggregator({ cadenceMs: 300 });
      let count = 0;
      aggregator.subscribe(() => {
        count++;
      });
      aggregator.start();

      await new Promise((resolve) => setTimeout(resolve, 1500));
      aggregator.stop();
      return count;
    });

    expect(callCount).toBeGreaterThanOrEqual(1);
  });

  test('MetricsAggregator with preset override returns preset values', async ({ page }) => {
    await page.goto('/');

    const snapshot = await page.evaluate(async () => {
      // @ts-expect-error Vite resolves this at runtime in the browser
      const { MetricsAggregator } = await import('/src/metrics/aggregator.ts');
      // @ts-expect-error Vite resolves this at runtime in the browser
      const { createPresetState } = await import('/src/domain/presetState.ts');

      const presetState = createPresetState();
      presetState.select('fast');

      const aggregator = new MetricsAggregator({
        presetState,
        cadenceMs: 300,
      });

      aggregator.start();
      await new Promise((resolve) => setTimeout(resolve, 800));

      const snap = aggregator.getSnapshot();
      aggregator.stop();
      return snap;
    });

    // 'fast' preset values
    expect(snapshot.medianRtt).toBe(20);
    expect(snapshot.jitter).toBe(5);
    expect(snapshot.packetLoss).toBe(0);
    expect(snapshot.bandwidth).toBe(50);
  });
});
