import { Middleware } from 'next-api-middleware'
import logger from '../../../logger'
import { NextApiHandler, NextApiRequest, NextApiResponse } from 'next'
import { asyncRequestContext } from '../../lib/Context'
import { buildRequestContext } from '../../lib/requestContext'
import { logAccessDenied } from '../../lib/security/accessDeniedAudit'
import { subjectOf } from '../../lib/security/authzsubject'
import { toEcsUrl } from '../../lib/utils/ecsUrl'
import type { CcRole } from '../../lib/security/rolemapping'
import {
  CapabilityRef,
  decideCapability,
  grantingRoleForRoute,
  requiresDestinationScope,
} from '../../lib/security/accessregistry'

/**
 * This module lives under `src/lib/api/`, NOT `src/pages/api/` (IGDD-3472).
 *
 * The framework serves every file in the page tree as a route regardless of
 * intent. While this file sat there it was routable at
 * `/api/api-middleware-helper`, where a request would call
 * `withMiddleware(req, res)` — treating the request and response as middleware
 * names — get back the wrapper function, and never send a response, resolving
 * without a reply.
 *
 * Be precise about the severity: `src/middleware.ts` stood in front of it.
 * `withAuth` redirects an unauthenticated request to sign-in, and DPoP
 * enforcement redirects any `/api/*` request without an `x-dpop-proof` header
 * — which address-bar navigation never has, since the proof is attached by the
 * `window.fetch` interceptor in `_app.tsx`. So the handler was reachable only
 * by an in-app fetch, and nothing in the app fetched it. This was a latent
 * defect caught by defence in depth, not a live unauthenticated hang. It is
 * moved because a module in the route tree is one config change away from
 * being served for real, not because it was being exploited.
 */

const LOG_LEVEL = process.env.LOG_LEVEL || 'info'

/**
 * Shared `scope` extractor for the `/{destTypeId}/{destId}` slug shape used
 * by seven route declarations. Security-relevant and previously copied
 * inline into each: a fix to one copy (e.g. rejecting a non-string or array
 * slug) would not have reached the others. PR #771 review (Anusha).
 */
export const destIdFromSlug = (req: NextApiRequest): string | undefined =>
  (req.query.slug as string[] | undefined)?.[1]

export type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'HEAD'
  | 'OPTIONS'

/**
 * How a route is authorized. The **required first argument** of
 * `withMiddleware`, so once a file calls the wrapper, forgetting to declare is
 * a build failure rather than a silently-unprotected route.
 *
 * Declarations are colocated with the handler they govern. There is
 * deliberately no central `pattern → capability` table: adding a path-matching
 * layer to an authorization decision makes trailing slashes, URL-encoded
 * separators, case handling and rule ordering into bypass vectors, which is a
 * well-known authorization-bypass class. A required argument is fail-closed
 * *earlier* — build time rather than request time — with no matching layer at
 * all.
 *
 * This is a second layer, **not the guarantee**. It says nothing about a file
 * that bypasses the wrapper entirely; the route-coverage test in
 * `accessregistry.test.ts` is what holds that line.
 */
export type RouteAuthz =
  /**
   * Authorized by capability. An array means **any-of** — the caller needs one
   * of them, which is right for a lookup route shared by several surfaces.
   *
   * `scope` names the destination the request acts on, and may resolve it
   * asynchronously (e.g. a database lookup keyed by a value on the request),
   * not only read one already present on `req`. It is read only for
   * capabilities in `REQUIRES_DESTINATION_SCOPE`, which are then decided for
   * that destination, per role.
   *
   * Omitting `scope` entirely is a deliberate declaration, not an oversight:
   * it authorizes the capability alone, any role, any jurisdiction — correct
   * for a route whose data path narrows to the caller's own reach afterward
   * rather than naming one destination up front. A declared `scope` that
   * resolves to `undefined` falls back to roles with global reach only; `null`
   * means the named destination is invalid and denies all roles. A thrown
   * extractor is an infrastructure failure. Run before the handler, so it
   * must not trust or mutate the request beyond reading the identifier.
   */
  | {
      capability: CapabilityRef | CapabilityRef[]
      scope?: (
        req: NextApiRequest
      ) => string | null | undefined | Promise<string | null | undefined>
      /**
       * A release/kill-switch flag, checked right after authentication and
       * ahead of any capability/scope decision. `false` answers 403 directly
       * and never reaches `scope`, the capability check, or the
       * `AccessDenied` audit log — a disabled feature is not an RBAC
       * decision, so it must not produce one (review follow-up, IGDD-3549:
       * nine in-handler copies of this check across apikeys' seven routes
       * were producing `AccessDenied` events for callers who simply lacked
       * an apikeys role, in any environment where the feature is off).
       */
      featureFlag?: () => boolean
    }
  /**
   * Per-method capability. Required, not a nicety: several route files handle
   * a read and a write in one handler, and one capability per file would
   * conflate view with mutate. A method absent from the map is `405`.
   *
   * A method entry carries its own `scope` extractor, same meaning as the
   * top-level `capability` variant's - read only for capabilities in
   * `REQUIRES_DESTINATION_SCOPE`, optional with the same deliberate-omission
   * meaning, and may resolve asynchronously. A method entry may instead be
   * `{ inHandler: string }` for the rare case where the destination can't be
   * named without a database lookup the declaration site can't do; the string
   * must name a follow-up ticket, same as the top-level escape hatch, and is
   * counted by the same `inHandler:` ratchet.
   */
  | {
      byMethod: Partial<
        Record<
          HttpMethod,
          | (CapabilityRef & {
              scope?: (
                req: NextApiRequest
              ) => string | null | undefined | Promise<string | null | undefined>
            })
          | { inHandler: string }
        >
      >
      /** Same meaning as the top-level `capability` shape's `featureFlag`, shared across every method. */
      featureFlag?: () => boolean
    }
  /** Authenticated session required; the handler does its own row filtering. */
  | { session: true }
  /**
   * The handler decides. **The string must name a follow-up ticket.**
   *
   * This is a comment with a type and must be treated as one: nothing verifies
   * the string describes what the handler actually does, and nothing stops a
   * later change deleting the inline check while the reassuring declaration
   * stays behind. Every one of these carries a matching `AUTHZ_DEBT` row, and
   * a test asserts the two counts are equal — so an acknowledged gap may be
   * closed, never added.
   */
  | { inHandler: string }
  /**
   * Deliberately unauthenticated. The string is the reason.
   *
   * `detail` is for a public route that returns more to some callers: the
   * capability that unlocks the fuller response. It is decided here, like
   * every other declared capability, and the answer is left on the request
   * context for the handler to read through `currentDetailGranted()`. It never
   * refuses a request. The handler must not decide it again itself, so the
   * decision stays visible at the declaration, and removing `detail` fails
   * closed: every caller gets the public response (IGDD-3552, PR #786 review).
   */
  | { public: string; detail?: CapabilityRef }

// Catch any errors
const captureErrors: Middleware = async (req, res, next) => {
  try {
    await next()
  } catch (error) {
    logger.error('Unhandled error in request', {
      url: toEcsUrl(req.url),
      method: req.method,
      query: req.query,
      statusCode: 500,
      errorMessage: error.message,
      errorType: error.name,
      stack: error.stack,
    })
    res.status(500)
    res.json({ error: error })
  }
}

// log the api requests and response code
const logApiRequest: Middleware = async (req, res, next) => {
  const context = asyncRequestContext.getStore()
  const user = context?.user || null
  const sub = context?.sub || null
  if (LOG_LEVEL.toLocaleLowerCase() === 'debug') {
    logger.warn(
      'WARNING: LOG_LEVEL is set to DEBUG, this will log sensitive information for every API request'
    )
    logger.info('API Request ' + req.url, {
      req,
      res,
      user,
      sub,
      'x-forwarded-for': req.headers['x-forwarded-for'] || null,
      'user-agent': req.headers['user-agent'] || null,
    })
  } else {
    logger.info('API Request ' + req.url, {
      user,
      sub,
      'x-forwarded-for': req.headers['x-forwarded-for'] || null,
      'user-agent': req.headers['user-agent'] || null,
    })
  }
  await next()
}

/**
 * Enforcer 2 of 2: the generic route authorization middleware (IGDD-3472).
 *
 * The other is `withPageAccess`. Neither contains policy — both call the same
 * untouched `can()`. Built per route from its `RouteAuthz` declaration and
 * prepended **after** `logApiRequest`, so the request log still precedes any
 * denial.
 */
const enforceRouteAuthz = (authz: RouteAuthz): Middleware => {
  return async (req, res, next) => {
    const context = asyncRequestContext.getStore()
    const user = context?.user || 'unknown'
    const session = context?.session
    const subject = subjectOf(session)

    const forbid = () => res.status(403).send('forbidden')

    // A throwing `scope` extractor is an infrastructure failure (e.g. a
    // DynamoDB outage inside `prefixOf`), not a permission decision —
    // swallowing it and falling through to "no destination" would make an
    // outage indistinguishable from a legitimate deny in the audit trail,
    // with nothing alerting (the exact failure mode `canActOnJurisdiction`'s
    // own doc comment in `apiKeyAuthz.ts` was written to avoid). Logged at
    // error level and answered with 500, not 403 — this is a 50x, not a 40x.
    const scopeResolutionFailed = (error: unknown) => {
      logger.error('Route scope extractor failed', {
        url: toEcsUrl(req.url),
        method: req.method,
        errorMessage: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      })
      res.status(500).send('internal server error')
    }

    // The destination the request acts on, for REQUIRES_DESTINATION_SCOPE
    // capabilities. `hasScope` records whether a `scope` extractor was
    // declared at all — independent of whether it resolved anything — so
    // `decideRouteCapability` can tell "declared, but no destination named"
    // (global-reach fallback) from "declared destination did not resolve"
    // (deny all roles) and "not declared" (capability alone governs).
    //
    // Declared here (mutated further down, after the early-exit checks
    // below) so the `deny`/`decide` closures that default to it can be
    // defined once, ahead of every branch that calls them.
    let scope: string | null | undefined
    let hasScope = false

    const deny = (ref: CapabilityRef, s: string | null | undefined = scope) => {
      // A caller who holds the capability somewhere but not for this
      // destination is a reach denial; say so, and name the destination.
      const reachDenial =
        requiresDestinationScope(ref) && decideCapability(subject, ref)
      // `apikeys.*` is the one REQUIRES_DESTINATION_SCOPE page block whose
      // resolved value is a jurisdiction prefix, not a destination id —
      // logging it as `destId` would be misleading in a query by actual
      // destination. `jurisdictionId` already exists on `AccessDeniedEvent`
      // for exactly this (it was the old in-handler apikeys gate's field,
      // orphaned when that gate was replaced by this one — IGDD-3549 review
      // follow-up), so reuse it rather than adding a new field.
      const scopeField = ref.page === 'apikeys' ? 'jurisdictionId' : 'destId'
      logAccessDenied({
        reason: reachDenial
          ? s === null
            ? 'destination could not be resolved'
            : s
              ? 'Destination outside caller reach'
              : 'destination-scoped capability used without a destination'
          : 'insufficient role for route access',
        deniedAt: 'api',
        page: ref.page,
        permission: `${ref.page}.${String(ref.capability)}`,
        url: req.url,
        method: req.method,
        user,
        roles: subject.roles,
        ...(s ? { [scopeField]: s } : {}),
      })
      forbid()
    }

    // An any-of failure means the caller held NONE of the alternatives, so
    // there is no single missing capability to name. Logging `refs[0]` would
    // read as "grant them this one" when any of the others would serve equally
    // — and for /api/organizations the three alternatives sit on three
    // different page blocks, so `page` would be arbitrary as well.
    const denyAnyOf = (refs: ReadonlyArray<CapabilityRef>) => {
      logAccessDenied({
        reason: 'insufficient role for route access',
        deniedAt: 'api',
        permissionAnyOf: refs.map((r) => `${r.page}.${String(r.capability)}`),
        url: req.url,
        method: req.method,
        user,
        roles: subject.roles,
      })
      forbid()
    }

    // A single alternative: the capability AND, when its data path applies no
    // jurisdiction filter, global tenancy reach — both from the SAME role.
    //
    // `decideCapability` enforces that role-locally. Asking `can(...)` and
    // `hasGlobalTenancy(subject)` as two separate questions computes
    // `(∃r: holds) ∧ (∃r: reach)`, which would let a scoped role holding a
    // guarded capability borrow reach from an unrelated global role — the exact
    // leak the guard exists to prevent. Caught in review on PR #700.
    //
    // The tenancy predicate is the function's own default rather than a lambda
    // passed from here, so this enforcer, the page gate and the nav predicate
    // cannot be edited into three different decisions.
    //
    // `grantingRoleForRoute` adds the REQUIRES_DESTINATION_SCOPE rule on top
    // (PR #756): a destination-scoped capability is decided for `scope`, per
    // role; a missing destination falls back to global-reach roles only, while
    // an invalid destination denies all roles; a capability declared with no
    // `scope` at all (`hasScope` false) is decided by capability alone, any
    // jurisdiction (IGDD-3549). `decideRouteCapability` is the same question
    // asked as a boolean — not used here, since this enforcer needs *which*
    // role, not just whether one exists: call this once and reuse the answer
    // for both the allow/deny decision and the audit-trail `grantedBy` a
    // handler reads afterward, rather than deciding the same thing twice
    // (review follow-up on IGDD-3549: `grant()` used to re-derive the role
    // separately, right after this had already computed it).
    const decide = (
      ref: CapabilityRef,
      s: string | null | undefined = scope,
      hs: boolean = hasScope
    ): CcRole | undefined => grantingRoleForRoute(subject, ref, s, hs)

    // The first alternative (of possibly several, for an any-of declaration)
    // that some held role grants, if any.
    const firstGrantingRole = (refs: ReadonlyArray<CapabilityRef>): CcRole | undefined => {
      for (const ref of refs) {
        const role = decide(ref)
        if (role) return role
      }
      return undefined
    }

    // Stash which role the decision above actually used, so a handler that
    // records an audit trail's "which role authorized this?" (IGDD-3549)
    // reads it from the request context instead of re-deciding authorization.
    const grant = (role: CcRole) => {
      if (context) context.grantedBy = role
      return next()
    }

    if ('public' in authz) {
      if (authz.detail && context) {
        context.detailGranted = decideCapability(subject, authz.detail)
      }
      return next()
    }

    // The handler owns the decision. Declared, ticketed and counted, but not
    // enforced here.
    if ('inHandler' in authz) return next()

    // Unauthenticated is 401, never 403 — for every declaration kind that
    // requires a caller, not just `{ session: true }`.
    //
    // Without this, a request with no resolvable session reached the capability
    // branches with `subjectOf(undefined)` → zero roles → a 403 and an
    // `AccessDenied` event naming a permission nobody was denied. That is an
    // authentication failure wearing an authorization failure's clothes: wrong
    // status for the caller, and a false RBAC denial in the very
    // `eventType:AccessDenied` query this change adds `deniedAt`/`permission`
    // to support. A session expiring between the edge `withAuth` check and the
    // handler is enough to trigger it. The page gate and the `{ session: true }`
    // branch below already special-cased this; the others did not. Raised by
    // review on PR #700.
    if (!session?.user) {
      // No audit event, for the reason in the accessDeniedAudit header: an
      // expired session is not an RBAC denial, and logging it buries the real
      // ones.
      res.status(401).send('unauthorized')
      return
    }

    if ('session' in authz) return next()

    // A release/kill-switch flag, not an authorization decision — checked
    // here, ahead of any capability/scope work, so a disabled feature
    // answers directly and never reaches a (possibly DB-reading) `scope`
    // extractor or produces an `AccessDenied` audit event for an unrelated
    // role gap. Review follow-up, IGDD-3549 (Anusha, PR #778): this used to
    // be nine in-handler copies of the same check across apikeys' seven
    // routes, running after this enforcer, so every caller without an
    // apikeys role was audited as denied in any environment where the
    // feature is simply off.
    const featureFlag = 'featureFlag' in authz ? authz.featureFlag : undefined
    if (featureFlag && !featureFlag()) {
      res.status(403).json({ error: 'Forbidden - feature disabled' })
      return
    }

    if ('byMethod' in authz) {
      const method = (req.method || 'GET').toUpperCase() as HttpMethod
      const ref = authz.byMethod[method]
      if (!ref) {
        // A method the route does not declare is not authorized by omission —
        // it is not offered at all.
        res.setHeader('Allow', Object.keys(authz.byMethod).join(', '))
        res.status(405).send('method not allowed')
        return
      }
      // The handler owns this method's decision, same meaning as the
      // top-level escape hatch — declared, ticketed, counted, not enforced here.
      if ('inHandler' in ref) return next()
      // Skip the (possibly DB-reading) `scope` extractor entirely when no
      // held role could ever grant this method's capability — the same
      // prefilter the removed in-handler `requireApiKeyAccess` used ("skip
      // the DynamoDB read for a caller no held role could ever allow").
      // Review follow-up, IGDD-3549 (Anusha, PR #778).
      if (!decideCapability(subject, ref)) return deny(ref)
      let methodScope: string | null | undefined
      let methodHasScope = false
      if (ref.scope) {
        methodHasScope = true
        try {
          methodScope = await ref.scope(req)
        } catch (error) {
          return scopeResolutionFailed(error)
        }
      }
      const methodRole = decide(ref, methodScope, methodHasScope)
      if (!methodRole) return deny(ref, methodScope)
      return grant(methodRole)
    }

    // Same prefilter as the `byMethod` branch above, for the top-level
    // `capability` shape (a single ref, or an any-of array): skip `scope`
    // entirely — and the session-expensive DB read it may do — when no held
    // role could ever grant any declared alternative. Previously this
    // extractor ran unconditionally, and before the session check above even
    // existed in this function at all, so an expired session or a role with
    // no apikeys capability still triggered 1-3 DynamoDB reads per request.
    // Review follow-up, IGDD-3549 (Anusha, PR #778).
    if (authz.scope) {
      const refs = Array.isArray(authz.capability)
        ? authz.capability
        : [authz.capability]
      if (!refs.some((ref) => decideCapability(subject, ref))) {
        return Array.isArray(authz.capability)
          ? denyAnyOf(authz.capability)
          : deny(authz.capability)
      }
      hasScope = true
      try {
        scope = await authz.scope(req)
      } catch (error) {
        return scopeResolutionFailed(error)
      }
    }

    // A single declared capability keeps the precise `permission` field; an
    // any-of cannot, so the two denials are reported differently.
    if (!Array.isArray(authz.capability)) {
      const role = decide(authz.capability)
      if (!role) return deny(authz.capability)
      return grant(role)
    }

    // Any-of, and the tenancy guard is evaluated **per alternative**, not
    // across the array. /api/organizations accepts three capabilities, two of
    // which are guarded; a caller holding only the unguarded third must still
    // pass, or Jurisdiction Operations and Support lose the route silently.
    const anyOfRole = firstGrantingRole(authz.capability)
    if (anyOfRole) return grant(anyOfRole)
    return denyAnyOf(authz.capability)
  }
}

// Hoisted so `withMiddleware`'s parameter can be typed against its keys: a
// caller naming a middleware that is not here (one since removed, as
// `checkAdmin` was in IGDD-3498) is a compile error rather than an `undefined`
// in the stack that 500s every request. Raised by review on PR #767.
const middlewareMap = {
  logApiRequest,
  captureErrors,
} satisfies Record<string, Middleware>

type MiddlewareName = keyof typeof middlewareMap

const withMiddleware = (
  authz: RouteAuthz,
  ...middlewareNames: MiddlewareName[]
) => {
  // `logApiRequest` is prepended for every route rather than named by callers,
  // so drop it from the caller list if someone passes it explicitly.
  const declaredNames = Array.from(new Set(middlewareNames)).filter(
    (name) => name !== 'logApiRequest'
  )
  // `captureErrors`, where a route declares it, keeps its original position
  // ahead of everything else it used to wrap — which now includes the
  // authorization decision. The first version of this stack put
  // `enforceRouteAuthz` at index 1, ahead of the declared list, so on the four
  // routes that declare `captureErrors` a throw inside the denial path (a
  // logger transport failure, say) escaped the trap that previously covered it:
  // no structured error log, no 500 body, just a dropped request. Raised by
  // review on PR #700.
  const errorTrap = declaredNames.filter((name) => name === 'captureErrors')
  const routeSpecific = declaredNames.filter((name) => name !== 'captureErrors')
  // The order is written out rather than reached by index arithmetic: the
  // request log must precede any denial (so a denied request still appears in
  // the access log), the error trap must wrap everything after it, and
  // authorization must precede every route-specific middleware. A
  // `splice(1, 0, ...)` here would silently put authorization in the wrong
  // place the first time anything else is prepended.
  const stack: Middleware[] = [
    logApiRequest,
    ...errorTrap.map((name) => middlewareMap[name]),
    enforceRouteAuthz(authz),
    ...routeSpecific.map((name) => middlewareMap[name]),
  ]

  return (handler: NextApiHandler) => {
    return async (req: NextApiRequest, res: NextApiResponse) => {
      // Setup the per-request audit context (shared with getServerSideProps reads).
      const context = await buildRequestContext(req, res)
      await asyncRequestContext.run(context, async () => {
        const dispatch = async (i: number): Promise<void> => {
          if (i < stack.length) {
            await stack[i](req, res, () => dispatch(i + 1))
          } else {
            await handler(req, res)
          }
        }
        await dispatch(0)
      })
    }
  }
}

export default withMiddleware
