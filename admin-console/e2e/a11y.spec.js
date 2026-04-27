import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import {
  installAppMocks,
  resetStoredSession,
  seedAuthenticatedSession,
} from './support/mockApi.js';

const DEFAULT_STRICT_A11Y_LABELS = new Set(['welcome', 'onboarding']);
const STRICT_A11Y_ENV = globalThis.process?.env?.WARDEX_A11Y_STRICT || '';

const STRICT_A11Y_LABELS = new Set(
  [
    ...DEFAULT_STRICT_A11Y_LABELS,
    ...STRICT_A11Y_ENV.split(',')
      .map((label) => label.trim())
      .filter(Boolean),
  ].filter(Boolean),
);

function strictFor(label) {
  return (
    STRICT_A11Y_LABELS.has('1') || STRICT_A11Y_LABELS.has('all') || STRICT_A11Y_LABELS.has(label)
  );
}

// ════════════════════════════════════════════════════════════════════
// Accessibility smoke tests (advisory)
// ─────────────────────────────────────────────────────────────────────
// Runs axe-core against high-traffic screens that do NOT require a live
// backend. Screens in DEFAULT_STRICT_A11Y_LABELS fail on serious or critical
// violations; newer coverage starts advisory and is promoted once clean.
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
    const nodeDetails = results.violations.map((violation) => ({
      id: violation.id,
      nodes: violation.nodes.map((node) => ({
        target: node.target,
        html: node.html,
      })),
    }));
    console.log(`[a11y:${label}] ${summary.length} total, ${blocking.length} serious/critical`);
    console.log(`[a11y:${label}] details:`, JSON.stringify(summary, null, 2));
    console.log(`[a11y:${label}] nodes:`, JSON.stringify(nodeDetails, null, 2));
    if (strictFor(label)) {
      expect(blocking, `strict a11y violations for ${label}`).toEqual([]);
    }
  } else {
    console.log(`[a11y:${label}] clean`);
  }

  // Basic sanity: axe itself executed.
  expect(Array.isArray(results.violations)).toBe(true);
}

test.describe('Accessibility (axe-core, advisory)', () => {
  test('unauthenticated welcome screen', async ({ page }) => {
    await installAppMocks(page);
    await resetStoredSession(page, { onboarded: true });
    await expect(page.locator('text=Welcome to Wardex Admin Console')).toBeVisible({
      timeout: 15000,
    });
    await report(page, 'welcome');
  });

  test('onboarding wizard first step', async ({ page }) => {
    await installAppMocks(page);
    await seedAuthenticatedSession(page, { onboarded: false });
    await expect(page.getByText('Set up the Wardex admin console')).toBeVisible({ timeout: 15000 });
    await report(page, 'onboarding');
  });

  test('settings workspace', async ({ page }) => {
    await installAppMocks(page);
    await seedAuthenticatedSession(page);

    await page.getByTitle('Settings').click();
    await expect(page.locator('.topbar-title')).toHaveText('Settings');
    await expect(page.locator('button.tab').filter({ hasText: 'Config' })).toBeVisible({
      timeout: 15000,
    });
    await report(page, 'settings');
  });
});
