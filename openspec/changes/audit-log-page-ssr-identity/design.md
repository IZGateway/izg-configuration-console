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

Identity is already *known* in these `getServerSideProps` (each calls `getServerSession`); it just is not propagated to the logs. This change fixes that under-attribution.

## Goals / Non-Goals

**Goals:**
- Attach `sessionUser` to the server-side data reads in `getServerSideProps` for the four direct-DB pages, reusing the existing automatic injection.
- Extract a single shared context builder so `withMiddleware` and the page reads cannot drift.
- Stay additive (preserve `userContext` and all existing fields).

**Non-Goals:**
- Edge `Route Request` attribution (`src/middleware.ts`) — Edge runtime can't use the Node logger/ALS; separate follow-up.
- Changing what the DB-layer logs contain (we only add `sessionUser` via context).
- Pages already attributed via `/api/*` (`onboarding`) or with no server-side read (`passwordencryption`).

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

### D2 — Wrap the page data reads in `asyncRequestContext.run(...)`

In each in-scope `getServerSideProps`, build the context and run the data access inside it:

```text
const context = await buildRequestContext(ctx.req, ctx.res)
const result  = await asyncRequestContext.run(context, () => <existing data read>)
```

Everything logged during that read (the page's own logs plus DB-layer logs) then gets `sessionUser` via the existing format — no logger or DB changes. For `test/[...slug]` and `testreport`, the wrapped call is `connectionTest(...)`, which also brings the connection-test log lines into coverage while leaving the hand-built `userContext` intact (additive).

### D3 — Per-request scoping (no bleed)

`asyncRequestContext.run(context, fn)` scopes the store to that single awaited render and tears it down automatically — the same pattern `withMiddleware` uses. A fresh context is built per `getServerSideProps` invocation; nothing is shared across requests.

### D4 — No-session safety

If `getServerSideProps` runs without a resolvable session (it normally won't — these pages are gated by `withAuth`), `buildRequestContext` yields no `userId`/`email`/`sessionId`, and the injector no-ops. No fabricated identity, consistent with the API path.

## Risks / Trade-offs

- **Import cycle** (lib helper importing `authOptions` from a page) → If it surfaces, pass `authOptions` into the helper instead of importing it. Low risk; `withMiddleware` already imports it.
- **Refactor regression in `withMiddleware`** → It is on the hot path for every API request. Mitigation: the extraction is behavior-preserving and covered by the existing `api-middleware-helper` context test; re-run it.
- **More PII occurrences** (email/name/ip now on page-read logs) → same data already logged elsewhere; same audit intent and data-minimization posture as the parent change. No new data type or secret.
- **Pre-existing DB-layer log content** → unchanged; we only add `sessionUser`. If any of those lines already log sensitive payloads, that is a separate concern, untouched here.

## Migration Plan

Additive and backward-compatible. Takes effect on next deploy; no data migration. **Rollback:** revert the change — page reads return to logging without `sessionUser` (existing fields unaffected throughout).

## Open Questions

- None blocking. Edge `Route Request` structured attribution remains a deliberate future follow-up.
