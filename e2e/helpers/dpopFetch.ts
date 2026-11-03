import { Page } from '@playwright/test'

export type ApiResult = { status: number; body: unknown }

/**
 * Call a console API route as the user signed in to `page`.
 *
 * DPoP: every /api/* call must carry a proof signed by the browser's session
 * key (src/middleware.ts), which the app's window.fetch wrapper adds. So the
 * call runs as fetch() inside the logged-in page. A Playwright `request` call
 * with copied cookies has no proof; the middleware redirects it to sign-in
 * before the route's own authorization ever runs.
 *
 * `redirect: 'manual'` turns a middleware rejection into status 0 (opaque
 * redirect) instead of silently following it to the sign-in page's 200.
 */
export const callApi = (
  page: Page,
  method: string,
  path: string,
  body?: Record<string, unknown>
): Promise<ApiResult> =>
  page.evaluate(
    async ({ method, path, body }) => {
      const res = await fetch(path, {
        method,
        redirect: 'manual',
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      })
      const text = await res.text()
      let parsed: unknown = text
      try {
        parsed = JSON.parse(text)
      } catch {
        // Non-JSON body; keep the raw text for the failure message.
      }
      return { status: res.status, body: parsed }
    },
    { method, path, body }
  )
