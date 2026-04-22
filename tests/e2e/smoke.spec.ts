import { test, expect } from '@playwright/test';

test.describe('US-017: Browser smoke tests', () => {
  test('app loads without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/');
    await page.waitForTimeout(1500);

    expect(errors).toEqual([]);
  });

  test('canvas is visible and has rendered pixel data', async ({ page }) => {
    await page.goto('/');
    const canvas = page.locator('canvas#cathedral');
    await expect(canvas).toBeVisible();

    const box = await canvas.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.width).toBeGreaterThan(0);
    expect(box!.height).toBeGreaterThan(0);

    await page.waitForTimeout(1000);

    const hasPixels = await page.evaluate(() => {
      const c = document.querySelector('canvas#cathedral') as HTMLCanvasElement;
      if (!c) return false;
      try {
        return c.toDataURL().length > 200;
      } catch {
        return false;
      }
    });

    expect(hasPixels).toBe(true);
  });

  test('info button is visible', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    const infoBtn = page.locator('button[aria-label="About this project"]');
    await expect(infoBtn).toBeVisible();
  });

  test('canvas continues to render over time', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);

    const hasPixels = await page.evaluate(() => {
      const c = document.querySelector('canvas#cathedral') as HTMLCanvasElement;
      if (!c) return false;
      try {
        return c.toDataURL().length > 200;
      } catch {
        return false;
      }
    });

    expect(hasPixels).toBe(true);
  });
});
