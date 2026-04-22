import { test, expect } from '@playwright/test';

test.describe('US-013: atmosphere, fog, and lighting moods', () => {
  test('canvas renders without errors when poor preset is active', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');

    // Click the poor preset — should produce dense fog and dim lighting
    const poor = page.locator('[data-preset="poor"]');
    await poor.click();

    // Wait for atmosphere to apply
    await page.waitForTimeout(1000);

    expect(errors).toEqual([]);
  });

  test('canvas renders without errors when fast preset is active', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');

    // Click the fast preset — should produce clean fog and bright lighting
    const fast = page.locator('[data-preset="fast"]');
    await fast.click();

    await page.waitForTimeout(1000);

    expect(errors).toEqual([]);
  });

  test('canvas is non-empty after switching presets (pixel check)', async ({ page }) => {
    await page.goto('/');

    // Switch to poor preset
    await page.locator('[data-preset="poor"]').click();
    await page.waitForTimeout(1000);

    const hasPixels = await page.evaluate(() => {
      const canvas = document.getElementById('cathedral') as HTMLCanvasElement;
      if (!canvas) return false;
      if (canvas.width === 0 || canvas.height === 0) return false;

      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) {
        const dataUrl = canvas.toDataURL();
        return dataUrl.length > 500;
      }

      const x = Math.floor(gl.drawingBufferWidth / 2);
      const y = Math.floor(gl.drawingBufferHeight / 2);
      const pixels = new Uint8Array(4);
      gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      return pixels[0] > 0 || pixels[1] > 0 || pixels[2] > 0 || pixels[3] > 0;
    });

    expect(hasPixels).toBe(true);
  });

  test('switching between fast and poor presets does not produce WebGL errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text().toLowerCase();
      if (msg.type() === 'error' || (msg.type() === 'warning' && (text.includes('webgl') || text.includes('context lost')))) {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForTimeout(500);

    // Rapidly switch presets to stress-test atmosphere updates
    await page.locator('[data-preset="fast"]').click();
    await page.waitForTimeout(300);

    await page.locator('[data-preset="poor"]').click();
    await page.waitForTimeout(300);

    await page.locator('[data-preset="mixed"]').click();
    await page.waitForTimeout(300);

    await page.locator('[data-preset="fast"]').click();
    await page.waitForTimeout(300);

    await page.locator('[data-preset="poor"]').click();
    await page.waitForTimeout(500);

    expect(errors).toEqual([]);
  });

  test('canvas still renders content after multiple preset switches', async ({ page }) => {
    await page.goto('/');

    // Cycle through presets
    await page.locator('[data-preset="fast"]').click();
    await page.waitForTimeout(500);
    await page.locator('[data-preset="poor"]').click();
    await page.waitForTimeout(500);
    await page.locator('[data-preset="mixed"]').click();
    await page.waitForTimeout(500);

    const canvas = page.locator('canvas#cathedral');
    await expect(canvas).toBeVisible();

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
});
