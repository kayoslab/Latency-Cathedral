import { test, expect } from '@playwright/test';

test.describe('US-001: Default page loads', () => {
  test('the page loads and has a title or visible content', async ({ page }) => {
    await page.goto('/');

    // The page should load without errors
    await expect(page).toHaveURL(/localhost/);

    // There should be visible content confirming the app loaded
    const body = page.locator('body');
    await expect(body).toBeVisible();

    // The page should contain either a meaningful title or visible text
    const title = await page.title();
    const bodyText = await body.textContent();
    const hasContent = title.length > 0 || (bodyText !== null && bodyText.trim().length > 0);
    expect(hasContent).toBe(true);
  });

  test('the page contains a canvas element', async ({ page }) => {
    await page.goto('/');

    const canvas = page.locator('canvas#cathedral');
    await expect(canvas).toBeAttached();
  });

  test('no console errors on page load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto('/');
    // Allow a moment for any async errors to surface
    await page.waitForTimeout(1000);

    expect(errors).toEqual([]);
  });
});
