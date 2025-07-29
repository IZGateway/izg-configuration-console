import { Page, expect } from '@playwright/test';


export const loginToOkta = async (page: Page, username: string, password: string, userFullName: string = 'Automation Testerson') => {
  await page.goto('/', { waitUntil: 'load', timeout: 10000 });

  await page.getByText('Sign in with Okta').click();
  await page.locator('input[name="identifier"]').fill(username);
  await page.locator('[type="submit"]').click();

  const body = page.locator('body');
  const selectFactorExists = await body.locator('.button.select-factor.link-button').count();
  if (selectFactorExists > 0) {
    await body.locator('.button.select-factor.link-button').click();
  }
  await page.locator('input[name="credentials.passcode"]').fill(password);
  await page.locator('[type="submit"]').click();
  await page.waitForSelector('#app-header', { timeout: 10000 });
  await expect(page.locator('#app-header')).toContainText(userFullName);
};
