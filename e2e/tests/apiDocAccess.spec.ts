/**
 * /api-doc access check (IGDD-3550).
 *
 * The Swagger page and its spec endpoint must reach only roles that hold
 * `canViewApiDoc`. A role without it must get no link, the denial screen, and
 * a 403 from /api/swaggerjson.
 *
 * Accounts (.env.test). A test skips with a reason if its account is unset:
 *   OKTA_USERNAME / OKTA_PASSWORD
 *     IZG Operations. Holds `canViewApiDoc`.
 *   OKTA_NONADMIN_USERNAME / OKTA_NONADMIN_PASSWORD / OKTA_NONADMIN_EXPECTED_FULLNAME
 *     Jurisdiction Operations. Does not hold `canViewApiDoc`.
 *
 * NOTE: The target RBAC matrix moves `canViewApiDoc` from IZG Operations to
 * IZG Security (matrix.ts, MOVES_TO_IZG_SECURITY). When that change reaches
 * the code, point the first test at an IZG Security account.
 *
 * The RBAC matrix check (e2e/rbac) also covers this page, but it only
 * reports. This spec fails the run.
 */
import { expect, Page, test } from '@playwright/test'
import { callApi } from '../helpers/dpopFetch'
import { logout } from '../helpers/logout'
import { loginToOkta } from '../helpers/oktaLogin'

const DENIAL_TEXT = 'You do not have access to this page.'

// Against `npm run dev`, the Next.js dev tools badge sits on top of the logout
// icon, so the logout click opens the badge menu instead. A production build
// has no badge, so this changes nothing there.
const signOut = async (page: Page) => {
  await page.addStyleTag({ content: 'nextjs-portal { display: none !important; }' })
  await logout(page)
}

test('User with access sees the Swagger link and the API spec', async ({
  page,
}) => {
  test.skip(
    !process.env.OKTA_USERNAME || !process.env.OKTA_PASSWORD,
    'OKTA_USERNAME / OKTA_PASSWORD are not set'
  )

  await loginToOkta(page, process.env.OKTA_USERNAME, process.env.OKTA_PASSWORD)
  await page.waitForLoadState('networkidle')

  const apiLink = page.locator('#navigation a[href="/api-doc"]')
  await expect(apiLink).toBeVisible()

  await page.goto('/api-doc')
  await expect(page.getByText(DENIAL_TEXT)).toHaveCount(0)
  await expect(page.locator('.swagger-ui')).toBeVisible()
  // An empty viewer means the spec was not built into the image.
  await expect(page.locator('.swagger-ui .opblock').first()).toBeVisible()

  const spec = await callApi(page, 'GET', '/api/swaggerjson')
  expect(spec.status).toBe(200)
  const paths = (spec.body as { paths?: Record<string, unknown> }).paths
  expect(Object.keys(paths ?? {}).length).toBeGreaterThan(0)

  await signOut(page)
})

test('User without access sees no Swagger link and no API spec', async ({
  page,
}) => {
  test.skip(
    !process.env.OKTA_NONADMIN_USERNAME || !process.env.OKTA_NONADMIN_PASSWORD,
    'OKTA_NONADMIN_USERNAME / OKTA_NONADMIN_PASSWORD are not set'
  )

  await loginToOkta(
    page,
    process.env.OKTA_NONADMIN_USERNAME,
    process.env.OKTA_NONADMIN_PASSWORD,
    process.env.OKTA_NONADMIN_EXPECTED_FULLNAME
  )
  await page.waitForLoadState('networkidle')

  await expect(page.locator('#navigation')).toBeVisible()
  await expect(page.locator('#navigation a[href="/api-doc"]')).toHaveCount(0)

  await page.goto('/api-doc')
  await expect(page.getByText(DENIAL_TEXT)).toBeVisible()
  await expect(page.locator('.swagger-ui')).toHaveCount(0)

  // The page data must not carry the spec either.
  const nextData = await page.locator('#__NEXT_DATA__').textContent()
  expect(nextData).not.toContain('"openapi"')
  expect(nextData).not.toContain('"paths"')

  const spec = await callApi(page, 'GET', '/api/swaggerjson')
  expect(spec.status).toBe(403)

  await signOut(page)
})
