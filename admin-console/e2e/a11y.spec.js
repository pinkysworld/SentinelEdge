import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

// ════════════════════════════════════════════════════════════════════
// Accessibility smoke tests (advisory)
// ─────────────────────────────────────────────────────────────────────
// Runs axe-core against high-traffic screens that do NOT require a live
// backend. Violations are logged to the CI output so regressions are
// visible, but the test is intentionally advisory: it never fails the
// build. Raise to strict mode once the baseline is clean.
// ════════════════════════════════════════════════════════════════════

async function report(page, label) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21aa'])
    .analyze();

  const summary = results.violations.map((v) => ({
    id: v.id,
    impact: v.impact,
    help: v.help,
    nodes: v.nodes.length,
  }));

  if (summary.length > 0) {
    const blocking = summary.filter((v) => v.impact === 'critical' || v.impact === 'serious');
    // eslint-disable-next-line no-console
    console.log(`[a11y:${label}] ${summary.length} total, ${blocking.length} serious/critical`);
    // eslint-disable-next-line no-console
    console.log(`[a11y:${label}] details:`, JSON.stringify(summary, null, 2));
  } else {
    // eslint-disable-next-line no-console
    console.log(`[a11y:${label}] clean`);
  }

  // Basic sanity: axe itself executed.
  expect(Array.isArray(results.violations)).toBe(true);
}

test.describe('Accessibility (axe-core, advisory)', () => {
  test('unauthenticated welcome screen', async ({ page }) => {
    await page.goto('./');
    await page.evaluate(() => {
      localStorage.removeItem('wardex_token');
      localStorage.setItem('wardex_onboarded', '1');
    });
    await page.reload({ waitUntil: 'load' });
    await expect(page.locator('text=Welcome to Wardex Admin Console')).toBeVisible({
      timeout: 15000,
    });
    await report(page, 'welcome');
  });

  test('onboarding wizard first step', async ({ page }) => {
    await page.goto('./');
    await page.evaluate(() => {
      localStorage.removeItem('wardex_token');
      localStorage.removeItem('wardex_onboarded');
    });
    await page.reload({ waitUntil: 'load' });
    await page.waitForLoadState('networkidle').catch(() => {});
    await report(page, 'onboarding');
  });
});
