import { Page, expect, test } from '@playwright/test'
import { loginToOkta } from '../helpers/oktaLogin'
import { logout } from '../helpers/logout'
import { newValues, openScheduleStep } from '../helpers/createChangeRequest'

/**
 * IGDD-3566. A production user pressed SCHEDULE, the Jira call passed the nginx
 * read timeout, and nginx answered 504. The screen reported nothing, so the user
 * pressed SCHEDULE seven more times and raised eight Jira tickets.
 *
 * The deployed environment cannot produce that failure on demand, so each test
 * stubs the response in the browser with `page.route`. The intercepted request
 * never leaves the browser, which has two consequences worth stating:
 *
 *   1. The server never sees the submit, so these tests raise no Jira ticket.
 *      They are safer to run than `createChangeRequest`, which raises a real one.
 *   2. The stub is the only thing under test here. Whether the server classifies
 *      a Jira failure correctly is covered by the unit tests in
 *      `src/lib/createchangerequestticket.test.ts`.
 *
 * The expired-wait path is deliberately not covered. It needs 90 seconds, and
 * `playwright.config.ts` sets a 60 second timeout. The `ticketCreated: true`
 * stub shows the same message with no wait, so no coverage is lost.
 */

// The submit. `**` does not cross into further path segments, so this pattern
// does not catch the record lookup below.
const SUBMIT_URL = '**/api/changerequest'
// The record lookup, which is `/api/changerequest/{destTypeId}/{destId}`.
const LOOKUP_URL = '**/api/changerequest/*/*'

// What nginx returns on a read timeout: HTML, with no JSON for the console to read.
const GATEWAY_TIMEOUT_BODY =
  '<html><head><title>504 Gateway Time-out</title></head>' +
  '<body><center><h1>504 Gateway Time-out</h1></center>' +
  '<hr><center>nginx</center></body></html>'

const NOTHING_CREATED_MESSAGE =
  'There was a problem creating your change request, and nothing was created. ' +
  'Please try again later.'
const UNCERTAIN_OUTCOME_MESSAGE =
  'There may have been an issue creating your change request. ' +
  'Please verify in Manage Connections or contact support.'
const CONFIRMED_MESSAGE =
  'The server was slow to respond, but your change request was created.'

// `ca` is shared with closeEditConnection.spec.ts. Neither spec leaves an open
// change request behind, so neither blocks the other. Override with
// CR_TIMEOUT_DEST_ID if that stops being true.
const destId = process.env.CR_TIMEOUT_DEST_ID || 'ca'

let context
let page: Page
let renderLoopWarnings: string[]

test.describe.configure({ mode: 'serial' })

test.beforeAll(async ({ browser }) => {
  context = await browser.newContext()
  page = await context.newPage()
  await loginToOkta(page, process.env.OKTA_USERNAME, process.env.OKTA_PASSWORD)
})

test.afterAll(async () => {
  if (page) await logout(page).catch(() => {})
  if (page && !page.isClosed()) await page.close()
  if (context) await context.close()
})

test.beforeEach(async () => {
  // The render loop that froze the page logged this warning 499 times. Collect it
  // for every test: any failure path may reintroduce it.
  renderLoopWarnings = []
  page.on('console', (message) => {
    if (/Maximum update depth exceeded/.test(message.text())) {
      renderLoopWarnings.push(message.text())
    }
  })

  await page.goto('/manageconnections')
  await page.waitForLoadState('networkidle')

  const opened = await openScheduleStep(page, destId)
  if (!opened) {
    throw new Error(
      `Destination '${destId}' has no edit button, so the stepper cannot be ` +
        'reached. An open change request is holding it. Deploy or cancel that ' +
        'change request, or set CR_TIMEOUT_DEST_ID to another destination.'
    )
  }
})

test.afterEach(async () => {
  await page.unrouteAll({ behavior: 'ignoreErrors' })
  page.removeAllListeners('console')
})

test.describe('Create Change Request: a slow or failed submit (IGDD-3566)', () => {
  test('sends one submission however many times the user presses SCHEDULE', async () => {
    const scheduleButton = page.locator('#schedule')
    let submits = 0

    // Hold the response open. This is the window in which the production user
    // pressed the button seven more times.
    await page.route(SUBMIT_URL, async (route) => {
      if (route.request().method() !== 'POST') return route.fallback()
      submits += 1
      await new Promise((resolve) => setTimeout(resolve, 6000))
      await route.fulfill({
        status: 504,
        contentType: 'text/html',
        body: GATEWAY_TIMEOUT_BODY,
      })
    })

    await scheduleButton.click()

    await expect(scheduleButton).toHaveText(/SCHEDULING/)
    await expect(scheduleButton).toBeDisabled()

    // Press it again the way the production user did. A disabled button swallows
    // these, which is the point of the assertion that follows.
    for (let press = 0; press < 5; press += 1) {
      await scheduleButton.click({ force: true, timeout: 2000 }).catch(() => {})
    }

    await expect(page.locator('[class*="MuiAlert-message"]')).toBeVisible({
      timeout: 30000,
    })
    expect(submits).toBe(1)
    expect(renderLoopWarnings).toEqual([])
  })

  test('reports a confirmed success when the record gains the ticket after a 504', async () => {
    await page.route(SUBMIT_URL, async (route) => {
      if (route.request().method() !== 'POST') return route.fallback()

      // Stub the lookup only once the submit has failed. The page reads this same
      // endpoint through SWR to load the draft, so an earlier stub would change
      // the ticket that the confirmation compares against, and the console would
      // report an uncertain outcome instead of a confirmed one.
      await page.route(LOOKUP_URL, (lookup) =>
        lookup.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ destId, jiraId: 'CCT-9999' }),
        })
      )

      await route.fulfill({
        status: 504,
        contentType: 'text/html',
        body: GATEWAY_TIMEOUT_BODY,
      })
    })

    await page.locator('#schedule').click()

    // The console cannot read a verdict out of nginx's HTML, so it reads the
    // record instead. The button says so while it waits.
    await expect(page.locator('#schedule')).toHaveText(/CHECKING/)

    await page.waitForURL('/manageconnections', { timeout: 30000 })
    await expect(page.locator('[class*="MuiAlert-message"]')).toContainText(
      CONFIRMED_MESSAGE
    )
    expect(renderLoopWarnings).toEqual([])
  })

  test('reports a proven failure at once and keeps the entered values', async () => {
    let lookups = 0
    page.on('request', (request) => {
      if (/\/api\/changerequest\/\d+\//.test(request.url())) lookups += 1
    })

    await page.route(SUBMIT_URL, async (route) => {
      if (route.request().method() !== 'POST') return route.fallback()
      await route.fulfill({
        status: 502,
        contentType: 'application/json',
        body: JSON.stringify({ ticketCreated: false }),
      })
    })

    await page.locator('#schedule').click()

    await expect(page.locator('[class*="MuiAlert-message"]')).toContainText(
      NOTHING_CREATED_MESSAGE
    )

    // The server proved that nothing was created, so there is nothing to confirm.
    expect(lookups).toBe(0)

    // The user stays on the form, and a retry needs the values to still be there.
    await expect(page).not.toHaveURL(/manageconnections/)
    await page.locator('#previous').click()
    await page.locator('#previous').click()
    await expect(page.locator('#username')).toHaveValue(newValues.username)
    expect(renderLoopWarnings).toEqual([])
  })

  test('reports an uncertain outcome that waits for a dismissal', async () => {
    await page.route(SUBMIT_URL, async (route) => {
      if (route.request().method() !== 'POST') return route.fallback()
      // Jira raised the ticket, and a later step failed. A retry here would raise
      // a second ticket, so this message must never invite one.
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ ticketCreated: true }),
      })
    })

    await page.locator('#schedule').click()

    const alert = page.locator('[class*="MuiAlert-message"]')
    await expect(alert).toContainText(UNCERTAIN_OUTCOME_MESSAGE)
    await expect(alert).not.toContainText(/try again/i)

    // Every other message auto-hides after 6 seconds. This one must not, because
    // the user has to go and check whether a change request exists.
    await page.waitForTimeout(10000)
    await expect(alert).toBeVisible()

    await page.locator('[title="Close"]').click()
    await expect(alert).toBeHidden()
    expect(renderLoopWarnings).toEqual([])
  })
})
