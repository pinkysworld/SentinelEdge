const { test, expect } = require('@playwright/test');

const BASE = process.env.WARDEX_BASE_URL || 'http://127.0.0.1:8080';
const TOKEN = process.env.WARDEX_ADMIN_TOKEN || 'wardex-live-token';

test('wardex live admin smoke', async ({ page }) => {
  test.setTimeout(60000);

  const consoleErrors = [];
  const pageErrors = [];
  const badResponses = [];

  page.on('console', (msg) => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('pageerror', (err) => pageErrors.push(String(err)));
  page.on('response', (response) => {
    if (response.url().startsWith(`${BASE}/api/`) && response.status() >= 400) {
      badResponses.push(`${response.status()} ${response.url()}`);
    }
  });

  await page.goto(`${BASE}/admin.html`, { waitUntil: 'domcontentloaded' });
  await expect(page).toHaveURL(/\/admin\/?$/);

  await page.getByPlaceholder('API token').fill(TOKEN);
  await page.getByRole('button', { name: 'Connect' }).click();
  await expect(page.locator('.auth-badge')).toContainText(/Connected/i);
  await expect(page.getByRole('heading', { name: 'Security Overview' })).toBeVisible();

  await page.getByRole('button', { name: 'Live Monitor' }).click();
  await expect(page.getByRole('heading', { name: 'Live Alert Stream' })).toBeVisible();
  await page.getByRole('button', { name: 'Processes' }).click();
  await expect(page.getByText('Running Processes')).toBeVisible();
  await expect(page.getByText('Process Count')).toBeVisible();

  await page.screenshot({
    path: 'output/playwright/live-console-smoke.png',
    fullPage: true,
  });

  expect(pageErrors).toEqual([]);
  expect(consoleErrors).toEqual([]);
  expect(badResponses).toEqual([]);
});
