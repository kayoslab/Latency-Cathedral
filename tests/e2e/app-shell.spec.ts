import { test, expect } from '@playwright/test';

test.describe('US-003: Full-screen application shell', () => {
  test('canvas #cathedral exists and is visible', async ({ page }) => {
    await page.goto('/');

    const canvas = page.locator('canvas#cathedral');
    await expect(canvas).toBeAttached();
    await expect(canvas).toBeVisible();
  });

  test('overlay #overlay container exists', async ({ page }) => {
    await page.goto('/');

    const overlay = page.locator('#overlay');
    await expect(overlay).toBeAttached();
  });

  test('viewport fills browser window — canvas matches viewport size', async ({ page }) => {
    await page.goto('/');

    const viewport = page.viewportSize()!;
    const canvasBox = await page.locator('canvas#cathedral').boundingBox();

    expect(canvasBox).not.toBeNull();
    expect(canvasBox!.width).toBe(viewport.width);
    expect(canvasBox!.height).toBe(viewport.height);
  });

  test('no page scrollbars on normal desktop resolution', async ({ page }) => {
    await page.goto('/');

    const hasScrollbars = await page.evaluate(() => {
      const doc = document.documentElement;
      const horizontalOverflow = doc.scrollWidth > doc.clientWidth;
      const verticalOverflow = doc.scrollHeight > doc.clientHeight;
      return horizontalOverflow || verticalOverflow;
    });

    expect(hasScrollbars).toBe(false);
  });

  test('no console errors on page load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForTimeout(1000);

    expect(errors).toEqual([]);
  });
});
