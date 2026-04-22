import { test, expect } from '@playwright/test';

test.describe('US-016: PNG export and shareable preset URLs', () => {
  test('Save PNG button is visible', async ({ page }) => {
    await page.goto('/');
    const btn = page.locator('[data-action="export-png"]');
    await expect(btn).toBeVisible();
  });

  test('clicking Save PNG initiates a download', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    const downloadPromise = page.waitForEvent('download');
    await page.locator('[data-action="export-png"]').click();
    const download = await downloadPromise;

    expect(download.suggestedFilename()).toContain('.png');
  });

  test('Share button is visible', async ({ page }) => {
    await page.goto('/');
    const btn = page.locator('[data-action="share-url"]');
    await expect(btn).toBeVisible();
  });

  test('navigating to /?preset=poor activates the poor preset', async ({ page }) => {
    await page.goto('/?preset=poor');
    await page.waitForTimeout(500);

    const poorBtn = page.locator('[data-preset="poor"]');
    await expect(poorBtn).toHaveClass(/active/);
  });

  test('navigating to /?preset=fast activates the fast preset', async ({ page }) => {
    await page.goto('/?preset=fast');
    await page.waitForTimeout(500);

    const fastBtn = page.locator('[data-preset="fast"]');
    await expect(fastBtn).toHaveClass(/active/);
  });

  test('clicking a preset updates the URL bar with ?preset= param', async ({ page }) => {
    await page.goto('/');

    await page.locator('[data-preset="mixed"]').click();
    await page.waitForTimeout(300);

    const url = page.url();
    expect(url).toContain('preset=mixed');
  });

  test('URL updates when switching between presets', async ({ page }) => {
    await page.goto('/');

    await page.locator('[data-preset="fast"]').click();
    await page.waitForTimeout(200);
    expect(page.url()).toContain('preset=fast');

    await page.locator('[data-preset="poor"]').click();
    await page.waitForTimeout(200);
    expect(page.url()).toContain('preset=poor');
    expect(page.url()).not.toContain('preset=fast');
  });

  test('app does not crash with invalid preset in URL', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/?preset=bogus');
    await page.waitForTimeout(1000);

    // App should load without errors
    const canvas = page.locator('canvas#cathedral');
    await expect(canvas).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('app does not crash with empty preset param', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') errors.push(msg.text());
    });

    await page.goto('/?preset=');
    await page.waitForTimeout(1000);

    const canvas = page.locator('canvas#cathedral');
    await expect(canvas).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('shared URL loads correctly and renders', async ({ page }) => {
    await page.goto('/?preset=poor');
    await page.waitForTimeout(500);

    // Verify canvas renders with preset active
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
        /* fall through */
      }
      const url = c.toDataURL();
      return url.length > 200;
    });

    expect(hasPixels).toBe(true);
  });

  test('clicking Share button does not crash when clipboard is available', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-write']);
    await page.goto('/');

    await page.locator('[data-preset="fast"]').click();
    await page.waitForTimeout(200);

    const shareBtn = page.locator('[data-action="share-url"]');
    await expect(shareBtn).toBeVisible();

    // Should not throw
    await shareBtn.click();
    await page.waitForTimeout(200);

    // App should still be functional
    const canvas = page.locator('canvas#cathedral');
    await expect(canvas).toBeVisible();
  });
});
