/**
 * IGDD-3599 — fleet-wide circuit breaker reset, Admin Operations.
 *
 * Acceptance criteria:
 * openspec/changes/igdd-3599-fleet-wide-circuit-breaker-reset/specs/
 *   hub-administrative-operations/spec.md
 *
 * Keep the redaction test in the suite permanently. The Hub answers a reset
 * with a `hosts` map keyed by private AWS DNS name
 * (`us-west-1:ip-10-161-101-98`) and destination entries carrying `statusBy`.
 * The console must never pass either to a browser. That is the class of bug
 * which regresses in silence: the screen looks identical whether the
 * redaction runs or not, and the only evidence is in a response body nobody
 * reads. A unit test covers the route in isolation; this one covers the
 * deployed console end to end.
 *
 * What this spec cannot cover, and why:
 *   - `partial`. A region reports `partial` only when it runs several
 *     instances and some fail. The nightly workflow starts dev with
 *     ECS_DESIRED_COUNT defaulting to 1, so a stopped task gives `failed`
 *     instead. Unit tests cover the word; the Hub verifies it emits all three.
 *   - The 30 second timeout. It needs a Hub that stalls.
 *
 * Accounts (workflow env). The spec skips locally if they are unset, and
 * fails in CI, because a skipped privacy check reports green every night
 * without ever running:
 *   OKTA_USERNAME / OKTA_PASSWORD
 *     IZG Operations. The only role holding `canResetHubCircuitBreakers`.
 *   E2E_RBAC_JURIS_OPS_USERNAME / _PASSWORD / _FULLNAME
 *     Jurisdiction Operations, for the negative case.
 */
import { Page, expect, test } from '@playwright/test'
import { loginToOkta } from '../helpers/oktaLogin'

const REQUIRED_ENV = [
  'OKTA_USERNAME',
  'OKTA_PASSWORD',
  'E2E_RBAC_JURIS_OPS_USERNAME',
  'E2E_RBAC_JURIS_OPS_PASSWORD',
  'E2E_RBAC_JURIS_OPS_FULLNAME',
]
const missingEnv = REQUIRED_ENV.filter((name) => !process.env[name])
if (process.env.CI && missingEnv.length > 0) {
  throw new Error(
    `Circuit breaker reset spec cannot run in CI: set ${missingEnv.join(
      ', '
    )} in the workflow env`
  )
}

const env = (name: string) => process.env[name] as string

/** Every "RESET <environment>" button the card renders. */
const RESET_BUTTONS = '[id^="reset-"][id$="-circuit-breakers"]'
const CONFIRM_BUTTON = '#confirm-reset-circuit-breaker'
const REGION_OUTCOME = '[data-testid="circuit-breaker-region-outcome"]'

/**
 * Strings that prove a Hub host name or an instance count escaped the server.
 * `.internal`, not `.ec2.internal`: a host name can also read
 * `ip-10-202-10-158.us-west-2.compute.internal`.
 */
const FORBIDDEN_IN_BODY = ['ip-', '.internal', 'statusBy', 'hosts']

test.describe('Admin Operations circuit breaker reset (IGDD-3599)', () => {
  test.skip(
    missingEnv.length > 0,
    `missing credentials: ${missingEnv.join(', ')}`
  )

  test.describe('as IZG Operations', () => {
    let page: Page

    test.beforeAll(async ({ browser }) => {
      page = await browser.newPage()
      await loginToOkta(page, env('OKTA_USERNAME'), env('OKTA_PASSWORD'))
      await page.goto('/adminoperations')
      await page.waitForLoadState('networkidle')
    })

    test.afterAll(async () => {
      await page
        ?.locator('#logout')
        .click()
        .catch(() => {})
      if (page && !page.isClosed()) await page.close()
    })

    test('the page offers a reset for at least one Hub environment', async () => {
      await expect(
        page.getByRole('heading', { name: 'Circuit Breaker Reset' })
      ).toBeVisible()
      expect(await page.locator(RESET_BUTTONS).count()).toBeGreaterThan(0)
    })

    /**
     * Resetting is a real administrative action and it is audit-logged, so it
     * runs on one browser project rather than all four. Chrome and Edge both
     * report `chromium` as the browser name, so the project name is what
     * distinguishes them. Remove the guard if the team would rather have the
     * coverage on every engine.
     *
     * The action itself is safe to repeat: a reset with no breaker thrown
     * clears nothing, which is why it suits a nightly run.
     */
    test('reports a result for every Hub region, and leaks no host name', async () => {
      test.skip(
        test.info().project.name !== 'Chrome',
        'the reset is audit-logged; run it once per night'
      )

      const firstEnvironment = page.locator(RESET_BUTTONS).first()

      const responsePromise = page.waitForResponse(
          (response) =>
            new URL(response.url()).pathname === '/api/status/reset' &&
            response.request().method() === 'POST',
        // Above the console's own 30 s timeout to the Hub, so a slow Hub
        // fails on the assertion rather than on the wait.
        { timeout: 45000 }
      )

      await firstEnvironment.click()
      await page.locator(CONFIRM_BUTTON).click()

      const response = await responsePromise
      const body = await response.text()

      // The privacy guarantee, asserted on the wire rather than on screen.
      for (const forbidden of FORBIDDEN_IN_BODY) {
        expect(
          body,
          `${forbidden} must not reach the browser (IGDD-3599)`
        ).not.toContain(forbidden)
      }

      // Against the IGDD-3599 Hub the card lists one line per region. An
      // older Hub sends no block and renders none, which is the documented
      // fallback, so the panel is checked only when the body carries it.
      if (/"regions"\s*:/.test(body)) {
        const outcome = page.locator(REGION_OUTCOME)
        await expect(outcome).toBeVisible({ timeout: 15000 })
        await expect(outcome).toContainText(/result by region/i)
        // A region name, for example us-east-1 or us-west-2.
        await expect(outcome).toContainText(/[a-z]{2}-[a-z]+-\d/)
      }

      // Whatever the outcome, the operator is told something.
      await expect(page.getByRole('alert').first()).toBeVisible({
        timeout: 15000,
      })
    })
  })

  /**
   * `canResetHubCircuitBreakers` belongs to IZG Operations alone, and
   * `canViewAdminOperations` gates the page itself, so a jurisdiction-scoped
   * role never reaches the card. The per-destination reset in Manage
   * Connections is the surface that role does hold.
   */
  test('a Jurisdiction Operations user cannot reach the page', async ({
    browser,
  }) => {
    const page = await browser.newPage()
    try {
      await loginToOkta(
        page,
        env('E2E_RBAC_JURIS_OPS_USERNAME'),
        env('E2E_RBAC_JURIS_OPS_PASSWORD'),
        env('E2E_RBAC_JURIS_OPS_FULLNAME')
      )
      await page.goto('/adminoperations')
      await page.waitForLoadState('networkidle')

      await expect(
        page.getByText('You do not have access to this page.')
      ).toBeVisible({ timeout: 15000 })
      expect(await page.locator(RESET_BUTTONS).count()).toBe(0)
    } finally {
      await page
        .locator('#logout')
        .click()
        .catch(() => {})
      if (!page.isClosed()) await page.close()
    }
  })

  /**
   * The same privacy rule on the jurisdiction-facing screen. Manage
   * Connections renders server-side, so the status reaches the browser inside
   * `__NEXT_DATA__` rather than through an XHR. `fetchEndpointStatus.ts`
   * removes `statusBy` before it gets there.
   */
  test('Manage Connections ships no Hub host name to the browser', async ({
    browser,
  }) => {
    const page = await browser.newPage()
    try {
      await loginToOkta(page, env('OKTA_USERNAME'), env('OKTA_PASSWORD'))
      await page.goto('/manageconnections')
      await page
        .getByRole('columnheader', { name: 'DESTINATION ID' })
        .waitFor({ state: 'visible', timeout: 15000 })

      const nextData = await page
        .locator('#__NEXT_DATA__')
        .textContent({ timeout: 15000 })

      expect(nextData, '__NEXT_DATA__ is missing').toBeTruthy()
      expect(nextData).not.toContain('statusBy')
      expect(nextData).not.toContain('.internal')
    } finally {
      await page
        .locator('#logout')
        .click()
        .catch(() => {})
      if (!page.isClosed()) await page.close()
    }
  })
})
