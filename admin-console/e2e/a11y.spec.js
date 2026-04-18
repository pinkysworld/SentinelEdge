import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// ════════════════════════════════════════════════════════════════════
// Accessibility smoke tests
// ─────────────────────────────────────────────────────────────────────
// Runs axe-core against a handful of high-traffic screens and fails
// the build on serious or critical violations only. Lighter rules are
// logged but not blocking so the gate stays actionable.
// ════════════════════════════════════════════════════════════════════

const TOKEN = 'testtoken123';

async function login(page) {
  await page.goto('./');
  await page.evaluate((t) => {
    localStorage.setItem('wardex_onboarded', '1');
    localStorage.setItem('wardex_token', t);
  }, TOKEN);
  await page.reload({ waitUntil: 'load' });
  await expect(page.locator('.auth-badge')).toBeVisible({ timeout: 20000 });
  await expect(page.locator('.role-badge')).toContainText('admin', { timeout: 15000 });
}

async function scan(page, label) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();

  const blocking = results.violations.filter(
    (v) => v.impact === 'critical' || v.impact === 'serious'
  );

  if (blocking.length > 0) {
    // eslint-disable-next-line no-console
    console.log(`[a11y:${label}] blocking violations:`, JSON.stringify(blocking, null, 2));
  } else if (results.violations.length > 0) {
    // eslint-disable-next-line no-console
    console.log(
      `[a11y:${label}] non-blocking (moderate/minor) issues:`,
      results.violations.map((v) => `${v.id} (${v.impact})`).join(', ')
    );
  }

  expect(blocking, `a11y violations on ${label}`).toEqual([]);
}

test.describe('Accessibility (axe-core)', () => {
  test('unauthenticated welcome screen has no critical a11y violations', async ({ page }) => {
    await page.goto('./');
    await page.evaluate(() => {
      localStorage.removeItem('wardex_token');
      localStorage.setItem('wardex_onboarded', '1');
    });
    await page.reload({ waitUntil: 'load' });
    await expect(page.locator('text=Welcome to Wardex Admin Console')).toBeVisible();
    await scan(page, 'welcome');
  });

  test('authenticated dashboard has no critical a11y violations', async ({ page }) => {
    await login(page);
    await expect(page.locator('h1')).toContainText('Dashboard');
    await scan(page, 'dashboard');
  });
});
