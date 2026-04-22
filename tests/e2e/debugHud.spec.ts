import { test, expect } from '@playwright/test';

test.describe('US-014: Debug HUD', () => {
  test('HUD is hidden by default on page load', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    const hud = page.locator('[data-testid="debug-hud"]');
    await expect(hud).toBeAttached();
    await expect(hud).not.toBeVisible();
  });

  test('pressing backtick shows the HUD', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    await page.keyboard.press('`');
    const hud = page.locator('[data-testid="debug-hud"]');
    await expect(hud).toBeVisible();
  });

  test('HUD displays latency, jitter, and quality band', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(1000);

    await page.keyboard.press('`');
    const hud = page.locator('[data-testid="debug-hud"]');
    await expect(hud).toBeVisible();

    const text = await hud.textContent();
    expect(text).toBeTruthy();

    // Verify latency-related content is displayed
    const hasLatency = /latency|rtt|ms/i.test(text!);
    expect(hasLatency, 'HUD should display latency info').toBe(true);

    // Verify jitter content is displayed
    const hasJitter = /jitter/i.test(text!);
    expect(hasJitter, 'HUD should display jitter info').toBe(true);

    // Verify quality band is displayed
    const hasBand = /excellent|good|degraded|poor/i.test(text!);
    expect(hasBand, 'HUD should display quality band').toBe(true);
  });

  test('pressing backtick again hides the HUD', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(500);

    const hud = page.locator('[data-testid="debug-hud"]');

    // Show
    await page.keyboard.press('`');
    await expect(hud).toBeVisible();

    // Hide
    await page.keyboard.press('`');
    await expect(hud).not.toBeVisible();
  });

  test('HUD shows live network data after waiting', async ({ page }) => {
    await page.goto('/');
    await page.waitForTimeout(3000);

    // Show HUD
    await page.keyboard.press('`');
    const hud = page.locator('[data-testid="debug-hud"]');
    await expect(hud).toBeVisible();

    const text = await hud.textContent();
    // HUD should show a quality band
    const hasBand = /excellent|good|degraded|poor/i.test(text!);
    expect(hasBand, 'HUD should show a quality band').toBe(true);
  });
});
