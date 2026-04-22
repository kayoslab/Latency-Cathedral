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

    await page.waitForTimeout(500);

    const hasPixels = await page.evaluate(() => {
      const c = document.querySelector('canvas#cathedral') as HTMLCanvasElement;
      if (!c) return false;
      try {
        const gl = c.getContext('webgl2') || c.getContext('webgl');
        if (gl) {
          const buf = new Uint8Array(4);
          gl.readPixels(
            Math.floor(c.width / 2),
            Math.floor(c.height / 2),
            1,
            1,
            gl.RGBA,
            gl.UNSIGNED_BYTE,
            buf,
          );
          return buf.some((v) => v > 0);
        }
      } catch {
        /* fall through to toDataURL */
      }
      const url = c.toDataURL();
      return url.length > 200;
    });

    expect(hasPixels).toBe(true);
  });

  test('all three preset buttons are visible', async ({ page }) => {
    await page.goto('/');

    for (const preset of ['fast', 'mixed', 'poor']) {
      const btn = page.locator(`[data-preset="${preset}"]`);
      await expect(btn).toBeVisible();
    }
  });

  test('clicking a preset moves the active class', async ({ page }) => {
    await page.goto('/');

    const fast = page.locator('[data-preset="fast"]');
    const mixed = page.locator('[data-preset="mixed"]');
    const poor = page.locator('[data-preset="poor"]');

    await mixed.click();
    await expect(mixed).toHaveClass(/active/);
    await expect(fast).not.toHaveClass(/active/);
    await expect(poor).not.toHaveClass(/active/);

    await poor.click();
    await expect(poor).toHaveClass(/active/);
    await expect(mixed).not.toHaveClass(/active/);
  });

  test('canvas still renders after preset switch', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    for (const preset of ['fast', 'mixed', 'poor']) {
      const btn = page.locator(`[data-preset="${preset}"]`);
      await btn.click();
      await page.waitForTimeout(300);

      const hasPixels = await page.evaluate(() => {
        const c = document.querySelector('canvas#cathedral') as HTMLCanvasElement;
        if (!c) return false;
        try {
          const gl = c.getContext('webgl2') || c.getContext('webgl');
          if (gl) {
            const buf = new Uint8Array(4);
            gl.readPixels(
              Math.floor(c.width / 2),
              Math.floor(c.height / 2),
              1,
              1,
              gl.RGBA,
              gl.UNSIGNED_BYTE,
              buf,
            );
            return buf.some((v) => v > 0);
          }
        } catch {
          /* fall through to toDataURL */
        }
        const url = c.toDataURL();
        return url.length > 200;
      });

      expect(hasPixels, `canvas should have pixels after switching to "${preset}"`).toBe(true);
    }
  });
});
