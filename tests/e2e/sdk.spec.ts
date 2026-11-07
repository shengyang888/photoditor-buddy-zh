import { expect, test } from '@playwright/test';

test.describe('SDK embed', () => {
  test('host page mounts the editor, loads an image and receives the export', async ({ page }) => {
    await page.goto('/sdk-demo.html');
    await expect(page.locator('#result')).toContainText('Editor ready', { timeout: 20000 });
    await page.getByRole('button', { name: 'Load sample' }).click();
    const frame = page.frameLocator('iframe[title="photoditor-buddy editor"]');
    await expect(frame.getByTestId('editor')).toBeVisible({ timeout: 20000 });
    await expect(frame.getByTestId('export-button')).toContainText('Send to website');
    await page.getByRole('button', { name: 'Ask editor to export' }).click();
    await frame.getByTestId('export-confirm').click();
    await expect(page.getByTestId('sdk-received')).toContainText('Received', { timeout: 20000 });
    await expect(page.locator('#result img')).toBeVisible();
  });
});
