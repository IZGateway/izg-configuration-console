/**
 * Attack simulation — Step 1: capture storageState after login.
 *
 * Opens a headed browser so you can complete Okta SSO, then saves the full
 * browser state (cookies, localStorage, sessionStorage) to attack-state.json.
 * That file is the "stolen artifact" used by attack-sim-replay.js.
 *
 * Usage: node scripts/attack-sim-capture.js
 */
const { chromium } = require('@playwright/test')
const os = require('os')
const path = require('path')

const TARGET = 'https://dev.console.izgateway.org'
const STATE_FILE = path.join(os.tmpdir(), 'attack-state.json')

;(async () => {
  const browser = await chromium.launch({ headless: false })
  const context = await browser.newContext()
  const page = await context.newPage()

  console.log('Opening browser — please log in with your Okta credentials.')
  await page.goto(TARGET)

  // Wait until the user has authenticated and landed on a page inside the app.
  // The URL will no longer contain oktapreview.com once login is complete.
  console.log('\nComplete the Okta MFA flow in the browser window.')
  console.log('Once you are fully logged in and the app has loaded, come back here and press ENTER.')
  await new Promise(resolve => process.stdin.once('data', resolve))
  console.log('Waiting 3 seconds for DPoP bind-session to complete...')
  await page.waitForTimeout(3000)

  await context.storageState({ path: STATE_FILE })
  console.log(`storageState saved to ${STATE_FILE}`)
  console.log('The browser session private key is NOT included — IndexedDB CryptoKey objects cannot be serialized.')

  await browser.close()
  process.exit(0)
})()
