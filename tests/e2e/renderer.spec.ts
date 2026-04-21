import { test, expect } from '@playwright/test';

test.describe('US-004: Three.js renderer bootstrap', () => {
  test('page loads without console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    await page.waitForTimeout(1500);

    expect(errors).toEqual([]);
  });

  test('canvas #cathedral is visible', async ({ page }) => {
    await page.goto('/');

    const canvas = page.locator('canvas#cathedral');
    await expect(canvas).toBeAttached();
    await expect(canvas).toBeVisible();
  });

  test('canvas has rendered pixel data (three.js drew something)', async ({ page }) => {
    await page.goto('/');
    // Wait for at least one render frame
    await page.waitForTimeout(500);

    const hasPixels = await page.evaluate(() => {
      const canvas = document.getElementById('cathedral') as HTMLCanvasElement;
      if (!canvas) return false;

      // Check that the canvas has non-zero dimensions
      if (canvas.width === 0 || canvas.height === 0) return false;

      // Sample pixel data from the center of the canvas
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!gl) {
        // Fallback: try reading via 2D context from toDataURL
        // three.js preserveDrawingBuffer may not be set, so use toDataURL check
        const dataUrl = canvas.toDataURL();
        // A blank canvas produces a very short data URL; rendered content is longer
        return dataUrl.length > 500;
      }

      // Read pixels from the center of the canvas
      const x = Math.floor(gl.drawingBufferWidth / 2);
      const y = Math.floor(gl.drawingBufferHeight / 2);
      const pixels = new Uint8Array(4);
      gl.readPixels(x, y, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixels);

      // At least one channel should be non-zero (not a blank/transparent canvas)
      return pixels[0] > 0 || pixels[1] > 0 || pixels[2] > 0 || pixels[3] > 0;
    });

    expect(hasPixels).toBe(true);
  });

  test('no WebGL context-lost errors', async ({ page }) => {
    const contextLostMessages: string[] = [];
    page.on('console', (msg) => {
      const text = msg.text().toLowerCase();
      if (text.includes('context lost') || (text.includes('webgl') && !text.includes('readpixels') && !text.includes('gpu stall'))) {
        if (msg.type() === 'error' || msg.type() === 'warning') {
          contextLostMessages.push(msg.text());
        }
      }
    });

    await page.goto('/');
    await page.waitForTimeout(1500);

    expect(contextLostMessages).toEqual([]);
  });

  test('canvas resizes when viewport changes', async ({ page }) => {
    await page.goto('/');

    await page.setViewportSize({ width: 800, height: 600 });
    await page.waitForTimeout(300);

    const canvasBox = await page.locator('canvas#cathedral').boundingBox();
    expect(canvasBox).not.toBeNull();
    expect(canvasBox!.width).toBe(800);
    expect(canvasBox!.height).toBe(600);
  });
});
