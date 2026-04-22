import { test, expect } from '@playwright/test';

test.describe('US-006: preset selector UI', () => {
  test('three preset buttons are visible on page load', async ({ page }) => {
    await page.goto('/');

    const fast = page.locator('[data-preset="fast"]');
    const mixed = page.locator('[data-preset="mixed"]');
    const poor = page.locator('[data-preset="poor"]');

    await expect(fast).toBeVisible();
    await expect(mixed).toBeVisible();
    await expect(poor).toBeVisible();
  });

  test('clicking a preset button adds active class', async ({ page }) => {
    await page.goto('/');

    const fast = page.locator('[data-preset="fast"]');
    await fast.click();

    await expect(fast).toHaveClass(/active/);
  });

  test('clicking a different button moves the active class', async ({ page }) => {
    await page.goto('/');

    const fast = page.locator('[data-preset="fast"]');
    const poor = page.locator('[data-preset="poor"]');

    await fast.click();
    await expect(fast).toHaveClass(/active/);

    await poor.click();
    await expect(poor).toHaveClass(/active/);
    await expect(fast).not.toHaveClass(/active/);
  });

  test('clicking mixed preset activates it', async ({ page }) => {
    await page.goto('/');

    const mixed = page.locator('[data-preset="mixed"]');
    await mixed.click();

    await expect(mixed).toHaveClass(/active/);
  });
});
