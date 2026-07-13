## Context

`audit-log-user-identity` (archived) injects `sessionUser` onto every log produced inside a `withMiddleware`-wrapped `/api/*` request, by reading the `AsyncLocalStorage` request context that `withMiddleware` establishes (`src/pages/api/api-middleware-helper.ts`). The Winston format in `logger.ts` reads that store; if there is no store, it no-ops.

Several pages, however, read data **directly from the database in `getServerSideProps`** — server-side page rendering that runs in Node but **outside** `withMiddleware`, so no context exists and those reads log without `sessionUser`. Verified set:

| Page (`getServerSideProps`) | Server-side data access | Attributed today? |
|---|---|---|
| `manageconnections` | direct DB: `fetchDestination`, `fetchDestinationChangeRequest…` | No |
| `changerequest/[...slug]` | direct DB: `fetchDestinationChangeRequest…` | No |
| `testreport` | direct DB `fetchDestination` + `connectionTest` | No |
| `test/[...slug]` | direct DB `fetchDestination` + `connectionTest` (connection test) | No (has hand-built `userContext`) |
| `onboarding` | fetch via `/api/allowedusers/bydestination` | Yes (attributed on the API line) — unchanged |
| `passwordencryption` | none (session check only) | n/a — unchanged |

Identity is already *known* in these `getServerSideProps` (each resolves the session); it just is not propagated to the logs. This change fixes that under-attribution.

Although only the four direct-DB pages have an under-attribution *gap* today, the change wraps **every** `getServerSideProps` uniformly (adding `onboarding` and `passwordencryption`) via a single shared wrapper. This is deliberate: it makes SSR attribution a property of the wrapper rather than of each author remembering to wrap, so new SSR pages are covered by construction and cannot silently drift out of coverage (the review question that motivated broadening the scope).

## Goals / Non-Goals

**Goals:**
- Attach `sessionUser` to every authenticated `getServerSideProps` render, reusing the existing automatic injection.
- Provide a single reusable wrap point (`withRequestContext`) so coverage is uniform and future SSR pages are attributed without per-page wiring.
- Extract a single shared context builder so `withMiddleware` and the page renders cannot drift.
- Stay additive (preserve `userContext` and all existing fields).

**Non-Goals:**
- Edge `Route Request` attribution (`src/middleware.ts`) — Edge runtime can't use the Node logger/ALS; separate follow-up.
- Changing what the DB-layer logs contain (we only add `sessionUser` via context).
- Pages with no `getServerSideProps` (client-side + `/api/*` only) — already attributed via the API path; nothing to wrap.

## Decisions

### D1 — Extract a shared `buildRequestContext(req, res)` helper

Move the inline context-building logic out of `withMiddleware` into a shared function (e.g. `src/lib/requestContext.ts`):

```text
async function buildRequestContext(req, res): Promise<Context> {
  const session  = await getServerSession(req, res, authOptions)
  const jwtToken = await getToken({ req })
  const user     = session?.user?.name || session?.user?.email || 'unknown'
  const sub      = jwtToken?.sub as string | undefined
  const ipAddress = (req.headers['x-forwarded-for'] as string)?.split(',')[0]
                    || req.socket?.remoteAddress || 'unknown'
  return { user, ipAddress, sub, session,
           userId: sub, email: session?.user?.email || undefined,
           sessionId: jwtToken?.sessionId, jti: jwtToken?.oktaJti, authTime: jwtToken?.authTime }
}
```

`withMiddleware` is refactored to call it (no behavior change — existing API-path tests must still pass). The same helper builds the context for `getServerSideProps`. The signature works for both because `getServerSession(req, res, …)` and `getToken({ req })` accept the `getServerSideProps` `context.req`/`context.res`.

- Import note: the helper depends on `authOptions` (from `src/pages/api/auth/[...nextauth]`). A `lib` module importing from `pages` is acceptable here (`withMiddleware` already does), but watch for an import cycle; if one appears, the helper can take `authOptions` as a parameter.

### D2 — A shared `withRequestContext(getServerSideProps)` wrapper applied to every SSR page

Rather than hand-writing `buildRequestContext` + `asyncRequestContext.run(...)` inside each `getServerSideProps` (the copy-paste pattern the first cut used, which the reviewer flagged as easy to forget), introduce one higher-order wrapper in `src/lib/requestContext.ts`:

```text
export function withRequestContext(handler) {
  return async (context) => {
    const requestContext = await buildRequestContext(context.req, context.res)
    return asyncRequestContext.run(requestContext, () => handler(context, requestContext))
  }
}

// usage in a page:
export const getServerSideProps = withRequestContext(async (context, requestContext) => {
  const session = requestContext.session       // reuse — no second getServerSession
  ... existing read ...
})
```

The wrapper runs the **entire** handler inside the context, so the page's own logs (including auth-failure warnings, e.g. onboarding's) plus all downstream DB-layer logs get `sessionUser` via the existing Winston format — no logger or DB changes. It passes the built `Context` to the handler so pages reuse its resolved `session` for their auth check instead of calling `getServerSession` again (onboarding's standalone call is removed). For `test/[...slug]` and `testreport`, the connection-test call runs inside the context too, bringing those log lines into coverage while leaving the hand-built `userContext` intact (additive). Applying the wrapper to all six pages makes coverage a property of the wrapper, not of each author.

### D3 — Per-request scoping (no bleed)

`asyncRequestContext.run(context, fn)` scopes the store to that single awaited render and tears it down automatically — the same pattern `withMiddleware` uses. A fresh context is built per `getServerSideProps` invocation; nothing is shared across requests.

### D4 — No-session safety

If `getServerSideProps` runs without a resolvable session (it normally won't — these pages are gated by `withAuth`), `buildRequestContext` yields no `userId`/`email`/`sessionId`, and the injector no-ops. No fabricated identity, consistent with the API path.

## Risks / Trade-offs

- **Import cycle** (lib helper importing `authOptions` from a page) → If it surfaces, pass `authOptions` into the helper instead of importing it. Low risk; `withMiddleware` already imports it.
- **Refactor regression in `withMiddleware`** → It is on the hot path for every API request. Mitigation: the extraction is behavior-preserving and covered by the existing `api-middleware-helper` context test; re-run it.
- **More PII occurrences** (email/name/ip now on page-render logs, including onboarding + passwordencryption) → same data already logged elsewhere; same audit intent and data-minimization posture as the parent change. No new data type or secret. Increases volume, not category, of PII in the `izgw-config-console-*` indices.
- **Wrapping a sensitive-feature page** (`passwordencryption`) → attaching identity is a net audit gain, but identity must not end up logged *next to* secret material. The block itself carries no secrets; the residual risk is pre-existing log statements in that page's downstream code (`encryptionStatus`/`rotatekey`/`encrypt`) that might log key material. Verified as part of task 4.4; the fix for any such line is to stop logging the secret, not to skip attribution.
- **Pre-existing DB-layer log content** → unchanged; we only add `sessionUser`. If any of those lines already log sensitive payloads, that is a separate concern, untouched here.

## Migration Plan

Additive and backward-compatible. Takes effect on next deploy; no data migration. **Rollback:** revert the change — page reads return to logging without `sessionUser` (existing fields unaffected throughout).

## Open Questions

- None blocking. Edge `Route Request` structured attribution remains a deliberate future follow-up.
