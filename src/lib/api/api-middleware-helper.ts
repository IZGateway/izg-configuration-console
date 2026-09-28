import { Middleware } from 'next-api-middleware'
import logger from '../../../logger'
import hasAccessToDestId from '../../lib/accesshelper'
import { NextApiHandler, NextApiRequest, NextApiResponse } from 'next'
import { asyncRequestContext } from '../../lib/Context'
import { buildRequestContext } from '../../lib/requestContext'
import { logAccessDenied } from '../../lib/security/accessDeniedAudit'
import { subjectOf } from '../../lib/security/authzsubject'
import { ANY_JURISDICTION, can, hasGlobalTenancy } from '../../lib/security/policy'
import {
  CapabilityRef,
  requiresGlobalTenancy,
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
   */
  | { capability: CapabilityRef | CapabilityRef[] }
  /**
   * Per-method capability. Required, not a nicety: several route files handle
   * a read and a write in one handler, and one capability per file would
   * conflate view with mutate. A method absent from the map is `405`.
   */
  | { byMethod: Partial<Record<HttpMethod, CapabilityRef>> }
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
  /** Deliberately unauthenticated. The string is the reason. */
  | { public: string }

// Catch any errors
const captureErrors: Middleware = async (req, res, next) => {
  try {
    await next()
  } catch (error) {
    logger.error('Unhandled error in request', {
      url: req.url,
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

// check access to destination
const checkAccessToDestId: Middleware = async (req, res, next) => {
  const destId = req.query.id.toString()
  const context = asyncRequestContext.getStore()
  const user = context?.user || 'unknown'
  const sub = context?.sub || null
  const hasAccess = hasAccessToDestId(destId, context?.session)
  if (hasAccess) {
    logger.debug('Api request ' + req.url, {
      req,
      res,
      user,
      sub,
    })
    await next()
  } else {
    logAccessDenied({
      reason: 'caller has no access to destination',
      url: req.url,
      method: req.method,
      user,
      roles: subjectOf(context?.session).roles,
      destId,
    })
    res.status(401).send('unauthorized')
  }
}
const checkAccessToDestIdSlug: Middleware = async (req, res, next) => {
  const { slug } = req.query
  const destId = slug[1]
  const context = asyncRequestContext.getStore()
  const user = context?.user || 'unknown'
  const sub = context?.sub || null
  const hasAccess = hasAccessToDestId(destId, context?.session)
  if (hasAccess) {
    logger.debug('Api request ' + req.url, {
      req,
      res,
      user,
      sub,
    })
    await next()
  } else {
    logAccessDenied({
      reason: 'caller has no access to destination',
      url: req.url,
      method: req.method,
      user,
      roles: subjectOf(context?.session).roles,
      destId,
    })
    res.status(401).send('unauthorized')
  }
}

// Check the caller is an operations/admin user (Okta OPERATIONS_GROUP).
//
// A second authorization axis, separate from the CcRole matrix and invisible
// to can(). IGDD-3472 adds no new readers of it and layers real capabilities
// *alongside* its two remaining call sites, so removing the axis later is a
// pure subtraction.
const checkAdmin: Middleware = async (req, res, next) => {
  const context = asyncRequestContext.getStore()
  const user = context?.user || 'unknown'
  const isAdmin = context?.session?.user?.isAdmin
  if (isAdmin) {
    await next()
  } else {
    logAccessDenied({
      reason: 'admin-only operation',
      url: req.url,
      method: req.method,
      user,
      roles: subjectOf(context?.session).roles,
    })
    res.status(403).send('forbidden')
  }
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

    const deny = (ref: CapabilityRef) => {
      logAccessDenied({
        reason: 'insufficient role for route access',
        deniedAt: 'api',
        page: ref.page,
        permission: `${ref.page}.${String(ref.capability)}`,
        url: req.url,
        method: req.method,
        user,
        roles: subject.roles,
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
    // jurisdiction filter, global tenancy reach on the SAME subject.
    const satisfies = (ref: CapabilityRef): boolean => {
      const decision = can(
        subject,
        ref.page,
        // `as never` is load-bearing and unavoidable here. `CapabilityRef` is a
        // union distributed over PageKey, so `ref.page` and `ref.capability`
        // are correlated at construction — but once destructured, TypeScript
        // has no way to carry that correlation into a call, and widens
        // `ref.capability` to the union of every page's capabilities.
        // `withPageAccess` needs no cast because its page key is a generic
        // parameter. The pairing is still guaranteed: nothing can build a
        // mismatched `CapabilityRef` in the first place.
        ref.capability as never,
        ANY_JURISDICTION
      )
      if (!decision.allowed) return false
      return !requiresGlobalTenancy(ref) || hasGlobalTenancy(subject)
    }

    if ('public' in authz) return next()

    // The handler owns the decision. Declared, ticketed and counted, but not
    // enforced here.
    if ('inHandler' in authz) return next()

    if ('session' in authz) {
      if (session?.user) return next()
      // Authentication, not RBAC: no audit event. Logging it would fire on
      // every expired session (see the header warning in accessDeniedAudit).
      res.status(401).send('unauthorized')
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
      if (!satisfies(ref)) return deny(ref)
      return next()
    }

    // A single declared capability keeps the precise `permission` field; an
    // any-of cannot, so the two denials are reported differently.
    if (!Array.isArray(authz.capability)) {
      if (satisfies(authz.capability)) return next()
      return deny(authz.capability)
    }

    // Any-of, and the tenancy guard is evaluated **per alternative**, not
    // across the array. /api/organizations accepts three capabilities, two of
    // which are guarded; a caller holding only the unguarded third must still
    // pass, or Jurisdiction Operations and Support lose the route silently.
    if (authz.capability.some(satisfies)) return next()
    return denyAnyOf(authz.capability)
  }
}

const withMiddleware = (
  authz: RouteAuthz,
  ...middlewareNames: string[]
) => {
  const middlewareMap = {
    logApiRequest,
    captureErrors,
    checkAccessToDestId,
    checkAccessToDestIdSlug,
    checkAdmin,
  }
  // `logApiRequest` is prepended for every route rather than named by callers,
  // so drop it from the caller list if someone passes it explicitly.
  const declaredNames = Array.from(new Set(middlewareNames)).filter(
    (name) => name !== 'logApiRequest'
  )
  // The order is written out rather than reached by index arithmetic: the
  // request log must precede any denial (so a denied request still appears in
  // the access log), and authorization must precede every route-specific
  // middleware. A `splice(1, 0, ...)` here would silently put authorization in
  // the wrong place the first time anything else is prepended.
  const stack: Middleware[] = [
    logApiRequest,
    enforceRouteAuthz(authz),
    ...declaredNames.map((name) => middlewareMap[name]),
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
