import type { NextApiRequest } from 'next'
import DbClientFactory from '../db/DbClientFactory'
import logger from '../../../logger'
import type { AuthzSubject } from './authzsubject'
import { can, type Decision } from './policy'
import type { ApiKeyManagementPageAccessControl } from '../type/PageAccessControls'

/**
 * Server-side authorization support for the `/api/apikeys/*` routes.
 *
 * This module is the *impure adapter*: it resolves a jurisdiction id to its
 * prefix (a DynamoDB read). The decision itself is made by `can()` in
 * `policy.ts`, which is pure. Capability + reach for a single route's
 * request is now declared on the route (`capability`/`scope` on
 * `withMiddleware`, decided by `decideRouteCapability` — IGDD-3549); what
 * remains here is the *per-row* reach check (`canActOnJurisdiction`, used by
 * `scopeToOwnedJurisdictions` to filter a list) and the prefix resolvers that
 * back both that and every route's `scope` extractor.
 *
 * The UI gates the API Key Management screen too, but UI gating is not a security
 * boundary — these routes are.
 */

export type ApiKeyPermission = keyof ApiKeyManagementPageAccessControl

/**
 * Release flag (IGDD-3444, per the Feature Flag Strategy), independent of
 * role. The feature is still short several planned pieces (filters, audit
 * log, test coverage — see the OpenSpec change), so this lets ops fully
 * hide/disable it for every role — including IZG/Jurisdiction Security, who
 * otherwise have full access — via a runtime env var (no rebuild: read at
 * request time, unlike a `NEXT_PUBLIC_` var which would be inlined into the
 * client bundle at build time). Defaults to disabled so a missing/unset var
 * never accidentally exposes an unfinished feature. Remove this flag and the
 * branch it guards once the feature has launched.
 */
export function isApiKeyManagementEnabled(): boolean {
  return process.env.FEATURE_API_KEY_MANAGEMENT_ENABLED === 'true'
}

/**
 * Resolve a jurisdiction id to its short prefix. Throws on infrastructure failure.
 *
 * Exported (IGDD-3549) so every `scope` extractor declared on the seven
 * `apikeys`/`apikeysaudit` routes shares this one lookup rather than each
 * route file copying it.
 */
export async function prefixOf(jurisdictionId: string): Promise<string | null> {
  const dbClient = await DbClientFactory.getDbClient()
  const jurisdiction = await dbClient.getJurisdiction(String(jurisdictionId))
  return jurisdiction?.prefix ?? null
}

/**
 * Resolve a credential's prefix from its `sortKey` — the shared shape of a
 * `scope` extractor for every route whose reach requirement is "the
 * jurisdiction that owns the credential named in this request" (IGDD-3549):
 * `token.ts`, `renew/index.ts`, `verify-domain.ts`'s GET,
 * `apikeys/index.ts`'s PATCH/DELETE, and `apikeysaudit/[sortKey].ts`. Reads
 * the credential's *stored* `jurisdictionId`, never one the caller could
 * supply directly — the IDOR protection these routes already had in-handler,
 * now expressed once here instead of five separate copies.
 *
 * Returns `undefined` for a missing credential and `null` for an existing
 * credential whose jurisdiction no longer resolves. The former can be handled
 * by the route (e.g. return 404) while still allowing global-reach roles
 * through; the latter is an invalid destination and must be denied. An actual
 * infrastructure failure (the DB read itself throwing) is left to propagate:
 * `enforceRouteAuthz` treats a thrown `scope` extractor as a 500, not a denial.
 */
export async function prefixFromCredentialSortKey(
  sortKey: string
): Promise<string | null | undefined> {
  const dbClient = await DbClientFactory.getDbClient()
  const credential = await dbClient.getApiKeyCredential(sortKey)
  if (!credential) return undefined
  return (await prefixOf(credential.jurisdictionId)) ?? null
}

/** Reads `field` from the body, coercing a truthy value to a string — body
 * fields are `unknown` and may legitimately arrive as a number (e.g. a
 * numeric `jurisdictionId`), unlike a query param. */
function stringFromBody(req: NextApiRequest, field: string): string | undefined {
  const value = (req.body as Record<string, unknown> | undefined)?.[field]
  return value ? String(value) : undefined
}

/** Reads `field` from the query string. `req.query[field]` is
 * `string | string[] | undefined` — only a plain string is a valid
 * identifier here, so an array is treated the same as absent. */
function stringFromQuery(req: NextApiRequest, field: string): string | undefined {
  const value = req.query[field]
  return typeof value === 'string' ? value : undefined
}

/**
 * Shared `scope`-extractor builders (IGDD-3549 review follow-up): the nine
 * declarations across the seven `apikeys`/`apikeysaudit` routes resolve to
 * exactly four shapes — a credential's sortKey or a bare jurisdictionId,
 * read from either the body or the query string. Factored out so a fix to
 * one (e.g. how a malformed field is rejected) reaches every route that
 * reads that shape, the same reasoning `destIdFromSlug` in
 * `api-middleware-helper.ts` was factored out for.
 */
export function scopeFromCredentialSortKeyInBody(
  field = 'sortKey'
): (req: NextApiRequest) => Promise<string | null | undefined> {
  return async (req) => {
    const sortKey = stringFromBody(req, field)
    return sortKey ? prefixFromCredentialSortKey(sortKey) : undefined
  }
}

export function scopeFromCredentialSortKeyInQuery(
  field = 'sortKey'
): (req: NextApiRequest) => Promise<string | null | undefined> {
  return async (req) => {
    const sortKey = stringFromQuery(req, field)
    return sortKey ? prefixFromCredentialSortKey(sortKey) : undefined
  }
}

export function scopeFromJurisdictionIdInBody(
  field = 'jurisdictionId'
): (req: NextApiRequest) => Promise<string | null | undefined> {
  return async (req) => {
    const jurisdictionId = stringFromBody(req, field)
    return jurisdictionId ? (await prefixOf(jurisdictionId)) ?? null : undefined
  }
}

export function scopeFromJurisdictionIdInQuery(
  field = 'jurisdictionId'
): (req: NextApiRequest) => Promise<string | null | undefined> {
  return async (req) => {
    const jurisdictionId = stringFromQuery(req, field)
    return jurisdictionId ? (await prefixOf(jurisdictionId)) ?? null : undefined
  }
}

/**
 * The single authorization decision for "may this caller do X to this
 * jurisdiction's data?" — a *per-row* check, not a per-request gate: the
 * route-level capability + reach decision now happens declaratively before
 * the handler runs (IGDD-3549), but a list endpoint still needs to filter
 * individual rows to the caller's own reach, which is what
 * `scopeToOwnedJurisdictions` uses this for.
 *
 * Every tenancy-paired caller goes through here, so the one-role-at-a-time rule
 * in `policy.ts` is implemented once rather than re-derived per route. The
 * permission-only helper `ownsJurisdiction` that used to exist is gone: it let a
 * caller check reach without a permission, which is half of the mistake this
 * design prevents.
 *
 * Fails closed in every direction, but loudly. A jurisdiction with no resolvable
 * prefix denies everyone (warn), and an infrastructure failure denies too but
 * logs at error level — previously a swallowed `catch { return false }` made a
 * DynamoDB outage indistinguishable from a legitimate deny, so the symptom was
 * an empty list with nothing alerting.
 *
 * Never call this as a per-request gate (it has no feature-flag check and
 * emits no AccessDenied event) — only inside a row-filter loop.
 */
export async function canActOnJurisdiction(
  subject: AuthzSubject,
  permission: ApiKeyPermission,
  jurisdictionId: string
): Promise<Decision> {
  let prefix: string | null
  try {
    prefix = await prefixOf(jurisdictionId)
  } catch (error) {
    logger.error('Authorization could not resolve jurisdiction', {
      jurisdictionId,
      operation: 'canActOnJurisdiction',
      errorMessage: error instanceof Error ? error.message : String(error),
    })
    return { allowed: false }
  }

  if (!prefix) {
    logger.warn('Ownership check denied: jurisdiction has no prefix', {
      jurisdictionId,
      operation: 'canActOnJurisdiction',
    })
    return { allowed: false }
  }

  return can(subject, 'apikeys', permission, prefix)
}
