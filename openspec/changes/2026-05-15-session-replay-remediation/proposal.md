## Why

As a developer maintaining `izg-configuration-console` (a Next.js / next-auth v4
application), I need the Playwright session replay vulnerability (IZG-SEC-2026-001)
remediated in code, so that a stolen Playwright `storageState` file cannot be used
to authenticate as a victim user.

Playwright's `storageState()` serializes live `HttpOnly` session cookies via the
Chrome DevTools Protocol (CDP). A stolen `storageState` file authenticates as the
victim with no password or MFA required. Both CC and `izg-transformation-ui` are
affected.

**CVSS v3.1:** 7.1 High unmitigated → reduced with mitigations applied
**Internal tracking:** IZG-SEC-2026-001

> **Operational mitigations (outside this CR):** An IP allowlist WAF rule
> restricting CC admin paths to known staff IPs (Phase 1) and an Elasticsearch
> Watcher alerting on maintenance mode changes (Phase 2) have been applied as
> interim controls by the operations team. This CR covers the code-level
> remediations only.

## Root Cause

`izg-configuration-console`: The Okta access token is stored in the NextAuth JWT
cookie (`[...nextauth].ts` line 42: `token.accessToken = account.access_token`).
The cookie is exportable via CDP, extending the damage window to 60 minutes (Okta
access token lifetime).

`izg-transformation-ui`: NextAuth session cookie exportable via CDP. Damage window
30 minutes (NextAuth session lifetime only). Addressed as a follow-on to this CR.

## What Changes

### Mitigation 3 — CC Token Store Fix

**`src/pages/api/auth/[...nextauth].ts`**: Remove the line that stores the Okta
access token in the NextAuth JWT cookie:

```ts
token.accessToken = account.access_token   // deleted
```

The access token is set but never read anywhere in CC. The only use of the raw
token is the userinfo fetch at login time, which reads directly from
`account.access_token` (only available during the sign-in callback).

### Mitigation 4 — WebCrypto DPoP Session Binding

Bind every authenticated browser session to a non-exportable ECDSA P-256 private
key generated in the originating browser via `crypto.subtle`. A stolen session
cookie is useless without the matching private key, which cannot be extracted by
any software path including CDP.

New files:

- **`src/lib/dpop.ts`**: `buildDpopProof` (client) and `verifyDpopProof` (server/
  edge) implemented using native `crypto.subtle` — no external library required.
- **`src/lib/sessionKeys.ts`**: IndexedDB helpers to store and load the non-
  exportable private key and public key JWK across page loads.
- **`src/pages/api/auth/bind-session.ts`**: API endpoint that receives the
  browser's public key JWK, adds it to the NextAuth JWT as `boundPublicKey`, and
  re-issues the session cookie.

Modified files:

- **`src/pages/_app.tsx`**: `Auth` component generates a key pair on first
  authenticated render (or reloads it from IndexedDB), calls `bind-session`, then
  installs a `window.fetch` interceptor that attaches a signed `x-dpop-proof`
  header to every request.
- **`src/middleware.ts`**: Reads `boundPublicKey` from the NextAuth JWT via
  `withAuth`. If present, requires and verifies the `x-dpop-proof` header on every
  protected route. Invalid or missing proof redirects to sign-in. Includes 60-second
  in-process jti deduplication (process-local; sufficient for ECS Fargate).

## Capabilities

### Modified Capabilities

- `session-security`: NextAuth JWT no longer contains the Okta access token;
  authenticated sessions are cryptographically bound to the originating browser.

## Impact

- **Security**: Eliminates the practical value of a stolen `storageState` file for
  CC. An attacker possessing the session cookie cannot produce valid DPoP proofs
  without the non-exportable private key.
- **Runtime**: Session initialization adds one `crypto.subtle.generateKey` call and
  one `POST /api/auth/bind-session` request per authenticated page load. Both are
  sub-millisecond on modern hardware.
- **Browser compatibility**: `crypto.subtle`, ECDSA P-256, and IndexedDB are
  supported in all four IZG-supported browsers (Chrome, Edge, Firefox, Safari 17+).
- **Follow-on**: `izg-transformation-ui` receives the same pattern as a separate CR.
