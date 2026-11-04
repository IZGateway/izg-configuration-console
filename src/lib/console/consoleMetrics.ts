/**
 * Server-side query construction for the /console log search (IGDD-3474).
 *
 * The console widgets used to build their own Elasticsearch DSL in the browser
 * and POST it to /api/elasticsearch/query, which forwarded it verbatim. The only
 * tenant filter was whatever the browser chose to include, so the route could be
 * opened to no role that does not already see every jurisdiction.
 *
 * Here the browser names *what* it wants to see — a view, a destination, an
 * environment tag and an optional organization — and the server builds the
 * query. The tenant restriction is always derived on the server:
 *  - destination / inbound: `destination.fips = destId`, and the route has
 *    already checked the caller may act on `destId`.
 *  - outbound: `source.commonName IN <principals of destId's jurisdiction>`,
 *    resolved from the database, never from the request.
 *
 * The optional organization only ever NARROWS that base filter, and one that
 * does not resolve fails closed with a reason instead of being ignored.
 */
import type { Destination } from '../type/Destination'
import type { OrganizationRecord } from '../type/OrganizationRecord'
import { ELASTIC_ENV_TAGS } from '../desttypehelper'
import { buildDestinationMetricsQuery } from './queries/destinationMetricsQuery'
import { buildInboundCombinedQuery } from './queries/inboundMessagesQuery'
import { buildOutboundCombinedQuery } from './queries/outboundMessagesQuery'

export const CONSOLE_VIEWS = ['destination', 'inbound', 'outbound'] as const
export type ConsoleView = (typeof CONSOLE_VIEWS)[number]

export interface ConsoleMetricsRequest {
  view: ConsoleView
  /** Destination (jurisdiction prefix) the caller selected. */
  destId: string
  /** One of ELASTIC_ENV_TAGS. Absent means the builders' own default. */
  envTag?: string
  /** Organization name from the widget dropdown; absent means "all". */
  organization?: string
}

// One flat shape rather than a discriminated union: tsconfig has `strict:
// false`, under which `if (!result.ok)` does not narrow a union.
export interface ParseResult {
  ok: boolean
  value?: ConsoleMetricsRequest
  message?: string
}

// Destination ids are short jurisdiction prefixes. Constraining the charset
// keeps the value an identifier rather than free text before it reaches either
// the authorization check or the query.
const DEST_ID_PATTERN = /^[A-Za-z0-9_-]{1,64}$/
const MAX_ORGANIZATION_LENGTH = 256

export function parseConsoleMetricsRequest(body: unknown): ParseResult {
  const raw =
    typeof body === 'string' ? safeJsonParse(body) : (body as unknown)
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    return { ok: false, message: 'Request body must be a JSON object' }
  }
  const { view, destId, envTag, organization } = raw as Record<string, unknown>

  if (typeof view !== 'string' || !CONSOLE_VIEWS.includes(view as ConsoleView)) {
    return { ok: false, message: `view must be one of: ${CONSOLE_VIEWS.join(', ')}` }
  }
  if (destId === undefined || destId === null || destId === '') {
    return { ok: false, message: 'destId is required' }
  }
  if (typeof destId !== 'string' || !DEST_ID_PATTERN.test(destId)) {
    return {
      ok: false,
      message:
        'destId must be 1-64 characters: letters, digits, hyphen or underscore',
    }
  }
  if (
    envTag !== undefined &&
    (typeof envTag !== 'string' || !ELASTIC_ENV_TAGS.includes(envTag))
  ) {
    return { ok: false, message: `envTag must be one of: ${ELASTIC_ENV_TAGS.join(', ')}` }
  }
  if (
    organization !== undefined &&
    (typeof organization !== 'string' ||
      organization.length === 0 ||
      organization.length > MAX_ORGANIZATION_LENGTH)
  ) {
    return {
      ok: false,
      message: `organization must be a non-empty string of at most ${MAX_ORGANIZATION_LENGTH} characters`,
    }
  }

  return {
    ok: true,
    value: {
      view: view as ConsoleView,
      destId,
      envTag: envTag as string | undefined,
      organization: organization as string | undefined,
    },
  }
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value)
  } catch {
    return undefined
  }
}

/** What the builder needs from the database. Loaded by the route, passed in so this stays pure. */
export interface ConsoleScopeData {
  destinations: Pick<Destination, 'destId' | 'jurisdiction'>[]
  organizations: Pick<OrganizationRecord, 'organizationName' | 'principalNames'>[]
}

/** Which lookup tables a request needs, so the route reads only those. */
export function scopeDataNeeded(request: ConsoleMetricsRequest): {
  destinations: boolean
  organizations: boolean
} {
  switch (request.view) {
    case 'destination':
      return { destinations: false, organizations: false }
    case 'inbound':
      return { destinations: false, organizations: Boolean(request.organization) }
    case 'outbound':
      return { destinations: true, organizations: true }
  }
}

/**
 * Either the query to run, or why there is nothing to show. `unavailable` is
 * the fail-closed answer: the route returns it as `{ unavailable }` rather than
 * running a query with a missing or unresolvable filter, and the widget shows
 * it as its error message.
 */
// Flat rather than a union for the same `strict: false` reason as ParseResult.
export interface ConsoleMetricsPlan {
  query?: Record<string, unknown>
  unavailable?: string
}

/** Body of a 200 response when nothing was queried. */
export interface ConsoleMetricsUnavailable {
  unavailable: string
}

const sameDestId = (a: string, b: string) => a.toLowerCase() === b.toLowerCase()

const nonEmptyPrincipals = (names: Iterable<string> | undefined): string[] =>
  Array.from(names ?? []).filter((p) => typeof p === 'string' && p.length > 0)

/**
 * The principals that send on behalf of `destId`'s jurisdiction: the
 * destination → jurisdiction.name → organizationName join, with the reason
 * when it does not resolve.
 */
export function resolveJurisdictionPrincipals(
  destId: string,
  data: ConsoleScopeData
): { principals: string[]; unavailable?: string } {
  const jurisdictionName = data.destinations.find((d) =>
    sameDestId(d.destId, destId)
  )?.jurisdiction?.name
  if (!jurisdictionName) {
    return {
      principals: [],
      unavailable:
        'Cannot display outbound data: unable to resolve organization for the selected destination.',
    }
  }
  const org = data.organizations.find(
    (o) => o.organizationName === jurisdictionName
  )
  if (!org) {
    return {
      principals: [],
      unavailable: `Cannot display outbound data: no organization found matching the destination's jurisdiction (${jurisdictionName}).`,
    }
  }
  const principals = nonEmptyPrincipals(org.principalNames)
  if (principals.length === 0) {
    return {
      principals,
      unavailable: `Cannot display outbound data: the organization matching the destination's jurisdiction (${jurisdictionName}) has no principal names configured.`,
    }
  }
  return { principals }
}

/**
 * Plan the Elasticsearch query for one console widget. The optional
 * organization only ever narrows; an organization that does not resolve is
 * reported as unavailable rather than silently dropped, so the widget never
 * shows a wider result than the one its dropdown names.
 *
 * Callers MUST have authorized `request.destId` for the caller first.
 */
export function planConsoleMetricsQuery(
  request: ConsoleMetricsRequest,
  data: ConsoleScopeData
): ConsoleMetricsPlan {
  const { view, destId, envTag, organization } = request

  switch (view) {
    case 'destination':
      return { query: buildDestinationMetricsQuery(destId, envTag) }

    case 'inbound': {
      // The fips filter on destId is always present; the organization adds a
      // sender filter inside it.
      if (!organization) {
        return { query: buildInboundCombinedQuery(destId, undefined, envTag) }
      }
      const org = data.organizations.find(
        (o) => o.organizationName === organization
      )
      if (!org) {
        return {
          unavailable: `Cannot display inbound data: no organization found matching the selected organization (${organization}).`,
        }
      }
      const principals = nonEmptyPrincipals(org.principalNames)
      if (principals.length === 0) {
        return {
          unavailable: `Cannot display inbound data: the selected organization (${organization}) has no principal names configured.`,
        }
      }
      return { query: buildInboundCombinedQuery(destId, principals, envTag) }
    }

    case 'outbound': {
      // The outbound builder emits NO tenant filter when given no principals,
      // so an unresolved jurisdiction must stop here.
      const { principals, unavailable } = resolveJurisdictionPrincipals(
        destId,
        data
      )
      if (unavailable) return { unavailable }

      let destinationFromOrganization: string | undefined
      if (organization) {
        destinationFromOrganization = data.destinations.find(
          (d) => d.jurisdiction?.name === organization
        )?.destId
        if (!destinationFromOrganization) {
          return {
            unavailable: `Cannot display outbound data: no destination found matching the selected organization (${organization}).`,
          }
        }
      }
      return {
        query: buildOutboundCombinedQuery(
          principals,
          destinationFromOrganization,
          envTag
        ),
      }
    }
  }
}
