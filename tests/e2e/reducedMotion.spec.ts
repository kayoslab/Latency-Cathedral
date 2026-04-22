import { test, expect } from '@playwright/test';

test.describe('US-015: reduced motion and hidden-tab throttling', () => {
  test('canvas renders with prefers-reduced-motion: reduce emulation', async ({ browser }) => {
    const context = await browser.newContext({
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();

    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForTimeout(1500);

    // Canvas should still be visible and rendered (not blank)
    const canvas = page.locator('canvas#cathedral');
    await expect(canvas).toBeAttached();
    await expect(canvas).toBeVisible();

    // No console errors
    expect(errors).toEqual([]);

    // Verify canvas has rendered content (not blank)
    const hasPixels = await page.evaluate(() => {
      const c = document.getElementById('cathedral') as HTMLCanvasElement;
      if (!c || c.width === 0 || c.height === 0) return false;
      const dataUrl = c.toDataURL();
      return dataUrl.length > 500;
    });
    expect(hasPixels).toBe(true);

    await context.close();
  });

  test('scene is static or near-static with reduced motion', async ({ browser }) => {
    const context = await browser.newContext({
      reducedMotion: 'reduce',
    });
    const page = await context.newPage();
    await page.goto('/');
    await page.waitForTimeout(500);

    // Capture two frames with a delay and compare pixel data
    // Under reduced motion, rotation should not occur so frames should be very similar
    const frame1 = await page.evaluate(() => {
      const c = document.getElementById('cathedral') as HTMLCanvasElement;
      return c?.toDataURL() ?? '';
    });

    await page.waitForTimeout(500);

    const frame2 = await page.evaluate(() => {
      const c = document.getElementById('cathedral') as HTMLCanvasElement;
      return c?.toDataURL() ?? '';
    });

    // With reduced motion, the frames should be identical (no rotation)
    expect(frame1).toBe(frame2);

    await context.close();
  });

  test('scene animates without reduced motion (control test)', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    const frame1 = await page.evaluate(() => {
      const c = document.getElementById('cathedral') as HTMLCanvasElement;
      return c?.toDataURL() ?? '';
    });

    await page.waitForTimeout(500);

    const frame2 = await page.evaluate(() => {
      const c = document.getElementById('cathedral') as HTMLCanvasElement;
      return c?.toDataURL() ?? '';
    });

    // Without reduced motion, frames should differ due to rotation
    expect(frame1).not.toBe(frame2);
  });

  test('no console errors after simulated tab visibility cycle', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForTimeout(500);

    // Simulate tab hidden
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await page.waitForTimeout(1000);

    // Simulate tab visible again
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: false, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await page.waitForTimeout(1000);

    expect(errors).toEqual([]);
  });

  test('rendering resumes after tab visibility cycle', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    // Simulate hide
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await page.waitForTimeout(500);

    // Simulate show
    await page.evaluate(() => {
      Object.defineProperty(document, 'hidden', { value: false, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
    });

    await page.waitForTimeout(500);

    // Capture a frame after resume
    const frame1 = await page.evaluate(() => {
      const c = document.getElementById('cathedral') as HTMLCanvasElement;
      return c?.toDataURL() ?? '';
    });

    await page.waitForTimeout(500);

    const frame2 = await page.evaluate(() => {
      const c = document.getElementById('cathedral') as HTMLCanvasElement;
      return c?.toDataURL() ?? '';
    });

    // Animation should have resumed — frames should differ
    expect(frame1).not.toBe(frame2);
  });

  test('rapid tab visibility toggling does not cause console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForTimeout(500);

    // Rapidly toggle visibility
    for (let i = 0; i < 10; i++) {
      await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { value: true, configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });
      await page.evaluate(() => {
        Object.defineProperty(document, 'hidden', { value: false, configurable: true });
        document.dispatchEvent(new Event('visibilitychange'));
      });
    }

    await page.waitForTimeout(500);

    expect(errors).toEqual([]);

    // Canvas should still be rendering
    const canvas = page.locator('canvas#cathedral');
    await expect(canvas).toBeVisible();
  });
});
