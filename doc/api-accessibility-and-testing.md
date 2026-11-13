# Next.js API Accessibility and Test Validation Guide (izg-configuration-console)

In Next.js (Pages Router), **all files defined under `src/pages/api/` are exposed as HTTP endpoints**. Next.js does not natively distinguish between "external internet-facing APIs" and "internal client-side APIs" — if the Next.js server is reachable over the network, any HTTP client can technically send requests to those paths.

However, access to them is gated by **Next.js Edge Middleware (`src/middleware.ts`)**, **NextAuth**, and **RFC 9449 DPoP (Demonstrating Proof-of-Possession)**.

---

## 1. Which APIs are Accessible Over the Internet vs. Protected?

### A. Publicly Accessible (No Authentication Required)
These bypass authentication middleware because they are excluded in the `matcher` in `src/middleware.ts` (`matcher: ['/((?!api/healthcheck|api/deephealthcheck|_next/static).*)']`):
* **`/api/healthcheck`**: Basic liveness probe (uptime and basic health status).
* **`/api/deephealthcheck`**: Comprehensive health check. **This actually touches the database** (`DbClientFactory.getDbClient().isDatabaseConnected()`) as well as Okta, Jira, and IZ Gateway, and returns status JSON without needing a login session.
* **`/api/auth/**`**: NextAuth authentication endpoints (e.g., `/api/auth/signin`, `/api/auth/callback/okta`, `/api/auth/session`, `/api/auth/csrf`, `/api/auth/bind-session`). Required for negotiating the OIDC session.

### B. Protected APIs (All Business & Database Routes)
Every other route under `/api/*` is intercepted by `src/middleware.ts` via `withAuth`:
* **Data & Configuration routes**:
  * `/api/destinations` (and `[...slug]`)
  * `/api/accesscontrol`
  * `/api/accessgroups`
  * `/api/changerequest` (and `deploy/[...slug]`)
  * `/api/apikeys` (and `token`, `renew`, `domains`, etc.)
  * `/api/allowedusers`, `/api/allowedusersaudit`
  * `/api/jurisdictions`, `/api/organizations`
  * `/api/status`, `/api/statushistory`, `/api/status/reset`
  * `/api/denylist`, `/api/adsfiletypes`
  * `/api/tests/connectiontest/[...slug]`
  * `/api/swaggerjson`

### Protection Mechanisms from Unauthorized Internet Access:
1. **NextAuth Session Cookie (`withAuth`)**: Requests without a valid NextAuth session JWT cookie are rejected or redirected to `/api/auth/signin`.
2. **DPoP Token Binding (`x-dpop-proof`)**: When an authenticated session is established in a browser, `src/pages/api/auth/bind-session.ts` embeds the browser's generated ECDSA public key (`boundPublicKey`) into the session JWT. Thereafter, `src/middleware.ts` enforces that every `/api/*` request includes a valid `x-dpop-proof` header signed by that client's private key, bound to the HTTP method, path, and a one-time `jti` (replay protection). Even with a stolen session cookie, external callers cannot invoke the APIs without the matching private key.
3. **Role & Jurisdiction Guards**:
   * Admin routes check `isAdmin` via `withMiddleware('checkAdmin')`.
   * Destination routes filter records by user jurisdictions or verify destination IDs via `withMiddleware('checkAccessToDestId')`.

---

## 2. How to Call Database-Accessing APIs or Validate DB Results in Testing

Depending on what level of testing you are doing, there are three primary ways to access the data or call these endpoints:

### Option 1: Direct Database Access via `DbClientFactory` (Recommended for test scripts & integration tests)
If your goal is to validate database state before/after test operations, you do not need to make HTTP calls through Next.js at all. You can import and use the application's database layer directly in Node.js/TypeScript test scripts:

```typescript
import DbClientFactory from '@/lib/db/DbClientFactory'

const dbClient = await DbClientFactory.getDbClient()

// Fetch destinations directly
const destinations = await dbClient.fetchDestinations()

// Fetch sender access control data
const senderData = await dbClient.fetchSenderData()

// Fetch change requests, API keys, etc.
const cr = await dbClient.fetchDestinationChangeRequestByDestIdAndDestType(destId, destTypeId)
```

* **Benefits**: 
  * Connects directly to DynamoDB (or local DynamoDB container) using `AMAZON_DYNAMODB_TABLE` and AWS environment variables.
  * Transparently handles field encryption/decryption via `EncryptedRepository`.
  * Completely bypasses Next.js HTTP server, NextAuth, and DPoP.

---

### Option 2: Browser-level E2E Tests via Playwright (Calling APIs through the UI session)
The project already includes Playwright E2E helpers under `e2e/helpers/oktaLogin.ts`.
In a browser context that has logged in via Okta:
* `_app.tsx` sets up the DPoP keys and configures `window.fetch` with the DPoP request interceptor.
* Within a test, you can call any `/api/*` endpoint directly in the page context:

```typescript
const response = await page.evaluate(async () => {
  const res = await fetch('/api/destinations')
  return await res.json()
})
```

---

### Option 3: Synthetic NextAuth Session Cookie (For headless HTTP API testing)
If you want to test the actual Next.js HTTP route handlers (e.g. via `curl`, `fetch`, or supertest) without full Okta browser automation:

1. Notice how DPoP enforcement works in `src/middleware.ts` (lines 96–97):
   ```typescript
   const boundPublicKey = req.nextauth?.token?.boundPublicKey
   if (!boundPublicKey) return NextResponse.next()
   ```
   If a session token does **not** contain `boundPublicKey`, DPoP enforcement is skipped.

2. You only need a valid NextAuth session JWT signed with the test environment's `NEXTAUTH_SECRET`:
   ```typescript
   import { encode } from 'next-auth/jwt'

   const token = {
     sub: 'test-user-id',
     name: 'Test User',
     email: 'test@example.com',
     groups: [process.env.OPERATIONS_GROUP || 'Operations'], // grants isAdmin
     jurisdictions: ['ALL'],
   }

   const sessionCookie = await encode({
     token,
     secret: process.env.NEXTAUTH_SECRET!,
   })
   ```

3. Pass that cookie in your HTTP request:
   `Cookie: next-auth.session-token=<sessionCookie>` (or `__Secure-next-auth.session-token` on HTTPS).
   This satisfies `withAuth` and allows programmatic calls to `/api/destinations`, `/api/accesscontrol`, etc.
