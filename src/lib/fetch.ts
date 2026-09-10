/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Shared SWR fetcher.
 *
 * Responses are checked before parsing. An expired session, or a request that
 * fails DPoP verification, is answered by the middleware with a redirect to the
 * NextAuth sign-in page; the browser follows it and returns an HTML document.
 * Calling res.json() on that produces `Unexpected token '<', "<!DOCTYPE "...`,
 * which says nothing about the actual cause, so those cases are reported here
 * as what they are.
 */
export default async function fetcher<JSON = any>(
  input: RequestInfo,
  init?: RequestInit
): Promise<JSON> {
  const res = await fetch(input, init)

  const contentType = res.headers.get('content-type') ?? ''
  if (!contentType.includes('application/json')) {
    if (res.redirected && new URL(res.url).pathname.startsWith('/api/auth/')) {
      throw new Error('Your session is no longer valid. Please sign in again.')
    }
    throw new Error(
      `Expected JSON from ${res.url} but received ${
        contentType || 'no content-type'
      } (HTTP ${res.status})`
    )
  }

  return res.json()
}
