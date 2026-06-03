/**
 * Attack simulation — Step 2: replay storageState without the private key.
 *
 * Loads the stolen storageState into a fresh browser context (no IndexedDB,
 * no private key). Attempts to call a protected API endpoint. A successful
 * remediation means every request is redirected to sign-in.
 *
 * Usage: node scripts/attack-sim-replay.js
 */
const { chromium } = require('@playwright/test')
const os = require('os')
const path = require('path')

const TARGET = 'https://dev.console.izgateway.org'
const STATE_FILE = path.join(os.tmpdir(), 'attack-state.json')
// A protected API route that requires DPoP — adjust if needed.
const PROBE_URL = `${TARGET}/api/organizations`

;(async () => {
  const browser = await chromium.launch({ headless: true })

  // Load stolen cookies into a fresh context — no IndexedDB, no private key.
  const context = await browser.newContext({ storageState: STATE_FILE })
  const page = await context.newPage()

  console.log('Attack simulation: replaying stolen storageState in fresh context (no private key).')
  console.log(`Probing protected API: POST ${PROBE_URL}`)

  // Intercept the response to check for redirect to sign-in.
  let finalUrl = null
  page.on('response', response => {
    if (response.url().includes('/api/organizations')) {
      console.log(`  API response status: ${response.status()} — ${response.url()}`)
    }
  })

  // Attempt a GET to the protected API endpoint.
  const response = await page.request.get(PROBE_URL, {
    maxRedirects: 0,
  }).catch(e => ({ status: () => 'error', url: () => e.message }))

  const status = response.status()
  finalUrl = response.url()

  console.log(`\nResult:`)
  console.log(`  Status: ${status}`)
  console.log(`  URL: ${finalUrl}`)

  if (status === 302 || status === 307 || String(finalUrl).includes('/api/auth/signin') || String(finalUrl).includes('okta')) {
    console.log('\n✅ PASS — Replay attack blocked. Request redirected to sign-in without private key.')
  } else if (status === 200) {
    console.log('\n❌ VULNERABLE — Replay attack succeeded. API returned data without DPoP proof.')
  } else if (status === 500 || status === 400 || status === 422) {
    console.log(`\n❌ VULNERABLE — Session cookie was accepted (status ${status} = application error, not auth rejection).`)
    console.log('   The stolen session bypassed authentication. The API error is from the request body, not auth.')
  } else {
    console.log(`\n⚠️  Unexpected status ${status} — review manually.`)
  }

  await browser.close()
})()
