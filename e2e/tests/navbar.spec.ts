import { Page, expect, test } from '@playwright/test';
import { loginToOkta } from './helpers/oktaLogin';

test.beforeEach('Login User', async ({ page }) => {
  await loginToOkta(page, process.env.OKTA_USERNAME, process.env.OKTA_PASSWORD);
});
test.afterEach('Logout User', async ({ page }) => {
  await page.locator('#logout').click();
});
test('Home page Navigation is correct', async ({ page }) => {
  // Expect the title to be IZ Gateway Configuration Console
  await expect.soft(page).toHaveTitle('IZ Gateway Configuration Console');

  // Expect to see IZG logo at the top of left navigation Bar
  // <img> exists with alt="izg logo"> exists.  
  const logo = page.getByAltText('izg logo')
  await expect.soft(logo).toBeVisible();
  var bb = await logo.boundingBox();
  console.log({'logo': bb });
  await expect.soft(bb.x).toBeLessThan(20);	// Within 20 pixels of top
  await expect.soft(bb.y).toBeLessThan(20);	// Within 20 pixels of top
  

  // navigation panel <div id='navigation'> panel exists and is visible
  const navPanel = await page.locator('#navigation');
  await expect.soft(navPanel).toBeVisible();
  bb = await navPanel.boundingBox();

  // and has something with datatest-id = ChevronLeftIcon that is visible
  await expect.soft(navPanel.getByTestId('ChevronLeftIcon')).toBeVisible();

  // and it has the manageconnections link
  //   <a href='/manageconnections'/> with text "Manage Connections"
  var manageConnectionsLink = navPanel.getByRole('link').filter({ hasText: 'Manage Connections' });
  await expect.soft(manageConnectionsLink).toHaveAttribute('href', '/manageconnections');
  await expect.soft(manageConnectionsLink).toBeVisible();

  //await page.pause();
  // and it has the Swagger API link
  //   <a href='/api-doc'/> with text Swagger API"
  var apiLink = navPanel.locator('xpath=//a[@href="/api-doc"]');
  const swaggerButton = navPanel.getByText('Swagger API');
  await expect.soft(apiLink).toHaveAttribute('href', '/api-doc');
  await expect.soft(apiLink).toHaveText('Swagger API');
  await expect.soft(swaggerButton).toBeVisible();

  // and it has the Log Out link
  //   A thing with id="logout" and Text "Log Out"
  const logoutLink = await navPanel.locator('#logout');
  await expect.soft(logoutLink).toHaveText('Log Out');
  await expect.soft(logoutLink).toBeVisible();

  // Hide navigation
  await navPanel.getByTestId('ChevronLeftIcon').click();
  var bb2 = await navPanel.boundingBox();
  await expect.soft(bb2.width).toBeLessThan(bb.width);  // Width is smaller
  await expect.soft(bb2.height).toBe(bb.height); // Height is same

  // Show navigation
  await navPanel.getByTestId('ChevronRightIcon').click();
  bb2 = await navPanel.boundingBox();
  await expect.soft(bb2.width).toBe(bb.width);  // Width is smaller
  await expect.soft(bb2.height).toBe(bb.height); // Height is same
 
});
