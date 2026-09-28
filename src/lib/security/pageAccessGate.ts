import type { GetServerSideProps, GetServerSidePropsContext } from 'next'
import { withRequestContext } from '../requestContext'
import type { Context } from '../Context'
import { ANY_JURISDICTION, can, hasGlobalTenancy } from './policy'
import { subjectOf } from './authzsubject'
import { logAccessDenied } from './accessDeniedAudit'
import {
  entryCapabilityOf,
  PAGE_ENTRY,
  requiresGlobalTenancy,
} from './accessregistry'
import type { PageKey } from './accesslevel'

/**
 * Enforcer 1 of 2: the server-side page gate (IGDD-3472).
 *
 * The other is `enforceRouteAuthz` in the API middleware. Neither contains
 * policy — both call the same untouched `can()`. This one exists so that
 * gating a page is one line at the page, and so a denial renders a message
 * rather than redirecting.
 *
 * ## Why `getServerSideProps` and not `src/middleware.ts`
 *
 * A client-side navigation fetches `/_next/data/<buildId>/<page>.json`, not
 * `/<page>`. A middleware gate would have to normalize that path or in-app
 * navigation silently bypasses it, whereas `getServerSideProps` runs for both
 * automatically. Middleware would also put `/api/auth/*` and sign-in inside the
 * blast radius of a single regex.
 */

/** Added to every gated page's props. Optional, so the allowed case is `{}`. */
export type AccessDeniedProp = { accessDenied?: boolean }

/**
 * Gate a page on the entry capability for `page`, then delegate to `handler`.
 *
 * The capability is read from `PAGE_ENTRY[page]` and is deliberately **not** an
 * argument: the navigation-visibility predicate reads the same constant, so the
 * link and the gate cannot resolve to different flags.
 *
 * Denial renders in place — `{ props: { accessDenied: true } }`, never a
 * redirect. A redirect hides the fact that access was denied and makes the
 * outcome indistinguishable from a broken link. The page component is
 * responsible for branching on the prop and rendering `<AccessDenied/>`; the
 * coverage test asserts that every file referencing `withPageAccess` also
 * references `AccessDenied`, because gating a page and handling the denial are
 * separate acts.
 *
 * An unauthenticated request is **not** a denial: it redirects to sign-in and
 * writes no audit event. Logging it would fire on every expired session, which
 * is the noise the header warning in `accessDeniedAudit.ts` exists to prevent.
 */
export function withPageAccess<
  P extends PageKey,
  T extends Record<string, unknown> = Record<string, never>
>(
  page: P,
  handler?: (
    context: GetServerSidePropsContext,
    requestContext: Context
  ) => ReturnType<GetServerSideProps<T & AccessDeniedProp>>
): GetServerSideProps<T & AccessDeniedProp> {
  // Wrap withRequestContext rather than sitting beside it, so the gate, the
  // denial event and the handler all run inside `asyncRequestContext` and the
  // event inherits the sessionUser block (userId, email, sessionId, jti) from
  // the existing ALS logger injector.
  return withRequestContext<T & AccessDeniedProp>(
    async (context, requestContext) => {
      const session = requestContext.session
      if (!session?.user) {
        return { redirect: { destination: '/api/auth/signin', permanent: false } }
      }

      const capability = PAGE_ENTRY[page]
      const subject = subjectOf(session)

      // ANY_JURISDICTION because these pages carry no jurisdiction in their
      // URL — they are authorized on the capability alone. The tenancy guard
      // below is what keeps that safe when the capability's data path applies
      // no jurisdiction filter.
      const decision = can(subject, page, capability, ANY_JURISDICTION)
      const allowed =
        decision.allowed &&
        (!requiresGlobalTenancy(entryCapabilityOf(page)) ||
          hasGlobalTenancy(subject))

      if (!allowed) {
        logAccessDenied({
          reason: 'insufficient role for page access',
          deniedAt: 'page',
          page,
          permission: `${page}.${String(capability)}`,
          // resolvedUrl, not req.url: on a client-side transition Next fetches
          // the /_next/data/... path, so req.url would record that while the
          // browser shows the page URL the user actually asked for.
          url: context.resolvedUrl,
          method: context.req.method,
          user: requestContext.user,
          roles: subject.roles,
        })
        // An intersection with an optional key, never a union: a union breaks
        // InferGetServerSidePropsType destructuring in the page component.
        return { props: { accessDenied: true } as T & AccessDeniedProp }
      }

      if (!handler) return { props: {} as T & AccessDeniedProp }
      return handler(context, requestContext)
    }
  )
}
