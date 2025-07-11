import { test } from '@playwright/test';
import { loginToOkta } from './helpers/oktaLogin';

test('homepage has correct username of logged in user', async ({ page }) => {
  await loginToOkta(page, process.env.OKTA_USERNAME, process.env.OKTA_PASSWORD);
});