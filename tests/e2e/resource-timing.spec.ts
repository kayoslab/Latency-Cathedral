import { test, expect } from '@playwright/test';

test.describe('US-008: resource timing metrics', () => {
  test('PerformanceObserver is available in the browser context', async ({
    page,
  }) => {
    await page.goto('/');

    const supported = await page.evaluate(() => {
      return (
        typeof PerformanceObserver !== 'undefined' &&
        Array.isArray(PerformanceObserver.supportedEntryTypes) &&
        PerformanceObserver.supportedEntryTypes.includes('resource')
      );
    });

    expect(supported).toBe(true);
  });

  test('ResourceTimingCollector picks up entries after a fetch', async ({
    page,
  }) => {
    await page.goto('/');

    const result = await page.evaluate(async () => {
      // @ts-expect-error Vite resolves this at runtime in the browser
      const { ResourceTimingCollector } = await import(
        '/src/metrics/resourceTiming.ts'
      );
      const collector = new ResourceTimingCollector({ windowSize: 20 });
      collector.start();

      // Trigger a fetch that will generate a resource timing entry
      await fetch('/probe.txt');

      // Allow time for the PerformanceObserver callback to fire
      await new Promise((resolve) => setTimeout(resolve, 500));

      const entries = collector.getEntries();
      collector.stop();

      return {
        count: entries.length,
        firstDuration:
          entries.length > 0 ? entries[0].duration : null,
        firstName: entries.length > 0 ? entries[0].name : null,
      };
    });

    expect(result.count).toBeGreaterThanOrEqual(1);
    expect(result.firstDuration).toBeGreaterThanOrEqual(0);
    expect(typeof result.firstName).toBe('string');
  });

  test('collected entries have positive or zero duration', async ({
    page,
  }) => {
    await page.goto('/');

    const durations = await page.evaluate(async () => {
      // @ts-expect-error Vite resolves this at runtime in the browser
      const { ResourceTimingCollector } = await import(
        '/src/metrics/resourceTiming.ts'
      );
      const collector = new ResourceTimingCollector();
      collector.start();

      // Trigger multiple fetches
      await fetch('/probe.txt');
      await fetch('/probe.txt?t=2');

      await new Promise((resolve) => setTimeout(resolve, 500));

      const entries = collector.getEntries();
      collector.stop();

      return entries.map((e: { duration: number }) => e.duration);
    });

    expect(durations.length).toBeGreaterThanOrEqual(1);
    for (const d of durations) {
      expect(d).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(d)).toBe(true);
    }
  });

  test('isResourceTimingSupported returns true in Chromium', async ({
    page,
  }) => {
    await page.goto('/');

    const supported = await page.evaluate(async () => {
      // @ts-expect-error Vite resolves this at runtime in the browser
      const { isResourceTimingSupported } = await import(
        '/src/metrics/resourceTiming.ts'
      );
      return isResourceTimingSupported();
    });

    expect(supported).toBe(true);
  });

  test('no console errors during resource timing collection', async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');

    await page.evaluate(async () => {
      // @ts-expect-error Vite resolves this at runtime in the browser
      const { ResourceTimingCollector } = await import(
        '/src/metrics/resourceTiming.ts'
      );
      const collector = new ResourceTimingCollector();
      collector.start();

      await fetch('/probe.txt');
      await new Promise((resolve) => setTimeout(resolve, 500));

      collector.stop();
    });

    expect(errors).toEqual([]);
  });
});
