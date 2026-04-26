import { test, expect } from '@playwright/test';
import { installAppMocks, TOKEN } from './support/mockApi.js';

async function openAuthenticatedCommandCenter(page) {
  await page.goto('./command');
  await page.evaluate((token) => {
    localStorage.setItem('wardex_token', token);
    localStorage.setItem('wardex_onboarded', '1');
  }, TOKEN);
  await page.reload({ waitUntil: 'load' });
}

test.describe('Command Center smoke', () => {
  test('opens command center action drawers and keeps lane data visible', async ({ page }) => {
    await installAppMocks(page);
    await openAuthenticatedCommandCenter(page);

    await expect(page.getByRole('heading', { name: /Operate incidents/i })).toBeVisible();
    await expect(page.getByText('Credential storm on gateway').first()).toBeVisible();
    await expect(page.getByText('GitHub Audit Log')).toBeVisible();

    await page.getByRole('button', { name: /Connector gaps/i }).click();
    await expect(page.getByRole('dialog', { name: 'Connector Validation' })).toBeVisible();
    await page.getByRole('button', { name: 'Validate now' }).click();
    await expect(page.getByText(/Validation complete|Validation failed/)).toBeVisible();
    await page.getByRole('button', { name: 'Close' }).click();

    await page.getByRole('button', { name: /Pending approvals/i }).click();
    const remediationDrawer = page.getByRole('dialog', { name: 'Remediation Approval' });
    await expect(remediationDrawer).toBeVisible();
    await expect(remediationDrawer.getByLabel('Change review')).toHaveValue('review-credential-storm-1');
    await page.getByRole('button', { name: 'Close' }).click();

    await page.getByRole('button', { name: /Noisy rules/i }).click();
    const replayDrawer = page.getByRole('dialog', { name: 'Rule Replay and Promotion' });
    await expect(replayDrawer).toBeVisible();
    await expect(replayDrawer.getByLabel('Rule')).toHaveValue('rule-ssh-burst');
    await page.getByRole('button', { name: 'Close' }).click();

    await page.getByRole('button', { name: /Compliance packs/i }).click();
    const evidenceDrawer = page.getByRole('dialog', { name: 'Compliance Evidence Pack' });
    await expect(evidenceDrawer).toBeVisible();
    await evidenceDrawer.getByRole('button', { name: 'Create evidence pack' }).click();
    await expect(page.getByText(/Evidence pack queued|Evidence export failed/)).toBeVisible();
  });

  test('supports the mobile command layout without overlapping primary controls', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await installAppMocks(page);
    await openAuthenticatedCommandCenter(page);

    await expect(page.getByRole('heading', { name: /Operate incidents/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Refresh Center/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Connector gaps/i })).toBeVisible();
  });
});
