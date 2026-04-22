import { test, expect } from '@playwright/test';

test.describe('US-013: atmosphere, fog, and lighting', () => {
  test('canvas renders without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForTimeout(2000);

    expect(errors).toEqual([]);
  });

  test('canvas is non-empty (pixel check)', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(2000);

    const hasPixels = await page.evaluate(() => {
      const canvas = document.getElementById('cathedral') as HTMLCanvasElement;
      if (!canvas || canvas.width === 0 || canvas.height === 0) return false;
      try {
        const dataUrl = canvas.toDataURL();
        return dataUrl.length > 500;
      } catch {
        return false;
      }
    });

    expect(hasPixels).toBe(true);
  });

  test('no WebGL errors after running for a few seconds', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text().toLowerCase();
      if (msg.type() === 'error' || (msg.type() === 'warning' && (text.includes('webgl') || text.includes('context lost')))) {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForTimeout(3000);

    expect(errors).toEqual([]);
  });
});
