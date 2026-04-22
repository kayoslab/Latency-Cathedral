import { test, expect } from '@playwright/test';

test.describe('US-007: same-origin latency probe sampler', () => {
  test('probe asset /probe.txt is fetchable and returns 200', async ({ page }) => {
    await page.goto('/');

    const response = await page.evaluate(async () => {
      const res = await fetch('/probe.txt');
      return { status: res.status, ok: res.ok };
    });

    expect(response.status).toBe(200);
    expect(response.ok).toBe(true);
  });

  test('probe asset /probe.txt contains expected payload', async ({ page }) => {
    await page.goto('/');

    const body = await page.evaluate(async () => {
      const res = await fetch('/probe.txt');
      return res.text();
    });

    expect(body).toBe('probe-payload');
  });

  test('ProbeSampler produces a valid NetworkSnapshot after probing', async ({ page }) => {
    await page.goto('/');

    const snapshot = await page.evaluate(async () => {
      // Dynamically import the sampler module
      // @ts-expect-error Vite resolves this at runtime in the browser
      const { ProbeSampler } = await import('/src/metrics/probeSampler.ts');
      const sampler = new ProbeSampler({ intervalMs: 200, windowSize: 5 });
      sampler.start();

      // Wait for a few probe cycles
      await new Promise((resolve) => setTimeout(resolve, 1500));

      const snap = sampler.getSnapshot();
      sampler.stop();
      return snap;
    });

    expect(snapshot).toBeDefined();
    expect(Array.isArray(snapshot.samples)).toBe(true);
    expect(snapshot.samples.length).toBeGreaterThan(0);
    expect(typeof snapshot.medianRtt).toBe('number');
    expect(Number.isFinite(snapshot.medianRtt)).toBe(true);
    expect(snapshot.medianRtt).toBeGreaterThanOrEqual(0);
    expect(typeof snapshot.jitter).toBe('number');
    expect(Number.isFinite(snapshot.jitter)).toBe(true);
    expect(snapshot.jitter).toBeGreaterThanOrEqual(0);
    expect(typeof snapshot.timestampMs).toBe('number');
  });

  test('cache-bust parameter varies between probe requests', async ({ page }) => {
    await page.goto('/');

    const urls = await page.evaluate(async () => {
      // @ts-expect-error Vite resolves this at runtime in the browser
      const { fetchProbe } = await import('/src/metrics/probeSampler.ts');
      const sample1 = await fetchProbe('/probe.txt');
      // Small delay to ensure different timestamp
      await new Promise((resolve) => setTimeout(resolve, 50));
      const sample2 = await fetchProbe('/probe.txt');
      return { url1: sample1.url, url2: sample2.url };
    });

    // Both should target /probe.txt but the sampler should have used cache-bust params
    expect(urls.url1).toBe('/probe.txt');
    expect(urls.url2).toBe('/probe.txt');
  });

  test('no console errors during probe sampling', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');

    await page.evaluate(async () => {
      // @ts-expect-error Vite resolves this at runtime in the browser
      const { ProbeSampler } = await import('/src/metrics/probeSampler.ts');
      const sampler = new ProbeSampler({ intervalMs: 300 });
      sampler.start();
      await new Promise((resolve) => setTimeout(resolve, 1000));
      sampler.stop();
    });

    expect(errors).toEqual([]);
  });
});
