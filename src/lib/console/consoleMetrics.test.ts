import {
  ConsoleMetricsRequest,
  ConsoleScopeData,
  CONSOLE_VIEWS,
  parseConsoleMetricsRequest,
  planConsoleMetricsQuery,
  resolveJurisdictionPrincipals,
  scopeDataNeeded,
} from './consoleMetrics'
import { buildSystemResourcesQuery } from './queries/systemResourcesQuery'

const FIPS = 'transactionData.destination.fips.keyword'
const COMMON_NAME = 'transactionData.source.commonName.keyword'

/**
 * Every value constraining `field` inside the top-level `query` — the part
 * Elasticsearch applies to every document and aggregation. A filter that only
 * appears inside `aggs` would not restrict the hits, so it is not collected.
 */
function topLevelValues(
  built: Record<string, unknown> | undefined,
  field: string
): string[] {
  const found: string[] = []
  const walk = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(walk)
    if (!node || typeof node !== 'object') return
    for (const [key, value] of Object.entries(node)) {
      if (key === field) {
        if (typeof value === 'string') found.push(value)
        else if (Array.isArray(value)) found.push(...value)
        else if (value && typeof value === 'object' && 'value' in value)
          found.push(String((value as { value: unknown }).value))
      } else {
        walk(value)
      }
    }
  }
  walk(built?.query)
  return found
}

const DATA: ConsoleScopeData = {
  destinations: [
    { destId: 'az', jurisdiction: { name: 'Arizona' } as never },
    { destId: 'ma', jurisdiction: { name: 'Massachusetts' } as never },
    { destId: 'nj', jurisdiction: { name: 'New Jersey' } as never },
  ],
  organizations: [
    { organizationName: 'Arizona', principalNames: ['az-sender.example'] },
    { organizationName: 'Massachusetts', principalNames: ['ma-sender.example'] },
    // No destination in this jurisdiction's name: a sender-only organization.
    { organizationName: 'Azova', principalNames: ['azova.example'] },
    // A jurisdiction whose organization has no principals configured.
    { organizationName: 'New Jersey', principalNames: [] },
  ],
}

const req = (over: Partial<ConsoleMetricsRequest>): ConsoleMetricsRequest => ({
  view: 'destination',
  destId: 'az',
  ...over,
})

/** The planned query, failing the test if the plan was "unavailable". */
const queryOf = (request: ConsoleMetricsRequest) => {
  const plan = planConsoleMetricsQuery(request, DATA)
  expect(plan.unavailable).toBeUndefined()
  return plan.query
}

describe('parseConsoleMetricsRequest', () => {
  it('accepts a well-formed request', () => {
    const parsed = parseConsoleMetricsRequest({
      view: 'inbound',
      destId: 'az',
      envTag: 'prod',
      organization: 'Azova',
    })
    expect(parsed).toEqual({
      ok: true,
      value: { view: 'inbound', destId: 'az', envTag: 'prod', organization: 'Azova' },
    })
  })

  it('accepts a JSON string body', () => {
    expect(
      parseConsoleMetricsRequest(JSON.stringify({ view: 'outbound', destId: 'ma' })).ok
    ).toBe(true)
  })

  it.each([
    ['not an object', 'nope'],
    ['an array', []],
    ['an unknown view', { view: 'everything', destId: 'az' }],
    ['a missing destId', { view: 'destination' }],
    ['an empty destId', { view: 'destination', destId: '' }],
    ['a destId that is not an identifier', { view: 'destination', destId: 'az OR *' }],
    ['an envTag outside the allowlist', { view: 'destination', destId: 'az', envTag: 'prod*' }],
    ['an empty organization', { view: 'inbound', destId: 'az', organization: '' }],
    ['a non-string organization', { view: 'inbound', destId: 'az', organization: ['a'] }],
  ])('rejects %s', (_label, body) => {
    const parsed = parseConsoleMetricsRequest(body)
    expect(parsed.ok).toBe(false)
    expect(parsed.message).toEqual(expect.any(String))
  })

  it('tells a missing destId apart from a malformed one', () => {
    expect(parseConsoleMetricsRequest({ view: 'destination' }).message).toBe(
      'destId is required'
    )
    expect(
      parseConsoleMetricsRequest({ view: 'destination', destId: 'az.prod' }).message
    ).toMatch(/letters, digits, hyphen or underscore/)
  })

  it('ignores raw Elasticsearch DSL rather than forwarding it', () => {
    const parsed = parseConsoleMetricsRequest({
      view: 'destination',
      destId: 'az',
      query: { match_all: {} },
      size: 10000,
    })
    expect(parsed.value).toEqual({
      view: 'destination',
      destId: 'az',
      envTag: undefined,
      organization: undefined,
    })
  })
})

describe('scopeDataNeeded: each view reads only the tables it uses', () => {
  it.each([
    [req({ view: 'destination' }), { destinations: false, organizations: false }],
    [req({ view: 'inbound' }), { destinations: false, organizations: false }],
    [
      req({ view: 'inbound', organization: 'Azova' }),
      { destinations: false, organizations: true },
    ],
    [req({ view: 'outbound' }), { destinations: true, organizations: true }],
  ])('%j', (request, needs) => {
    expect(scopeDataNeeded(request)).toEqual(needs)
  })
})

describe('resolveJurisdictionPrincipals', () => {
  it("returns the principals of the destination's jurisdiction organization", () => {
    expect(resolveJurisdictionPrincipals('az', DATA)).toEqual({
      principals: ['az-sender.example'],
    })
  })

  it('matches the destination id case-insensitively', () => {
    expect(resolveJurisdictionPrincipals('AZ', DATA).principals).toEqual([
      'az-sender.example',
    ])
  })

  it('explains an unknown destination', () => {
    expect(resolveJurisdictionPrincipals('zz', DATA)).toEqual({
      principals: [],
      unavailable: expect.stringContaining('unable to resolve organization'),
    })
  })

  it('explains a jurisdiction whose organization has no principals', () => {
    expect(resolveJurisdictionPrincipals('nj', DATA)).toEqual({
      principals: [],
      unavailable: expect.stringContaining('(New Jersey) has no principal names'),
    })
  })

  it('explains a jurisdiction with no matching organization', () => {
    const data = { ...DATA, organizations: [] }
    expect(resolveJurisdictionPrincipals('az', data).unavailable).toContain(
      "no organization found matching the destination's jurisdiction (Arizona)"
    )
  })
})

describe('planConsoleMetricsQuery: the tenant filter is always server-derived', () => {
  it('destination view filters on the requested destination only', () => {
    expect(topLevelValues(queryOf(req({ view: 'destination' })), FIPS)).toEqual(['AZ'])
  })

  it('inbound view filters on the requested destination, with no sender filter for "all"', () => {
    const built = queryOf(req({ view: 'inbound' }))
    expect(topLevelValues(built, FIPS)).toEqual(['AZ'])
    expect(topLevelValues(built, COMMON_NAME)).toEqual([])
  })

  it('inbound view narrows to the organization principals resolved on the server', () => {
    const built = queryOf(req({ view: 'inbound', organization: 'Azova' }))
    expect(topLevelValues(built, FIPS)).toEqual(['AZ'])
    expect(topLevelValues(built, COMMON_NAME)).toEqual(['azova.example'])
  })

  // An organization that cannot narrow must not silently fall back to the
  // whole destination's traffic while the dropdown names one organization.
  it.each([
    [
      'unknown',
      'Nobody',
      'no organization found matching the selected organization (Nobody)',
    ],
    [
      'principal-less',
      'New Jersey',
      'the selected organization (New Jersey) has no principal names',
    ],
  ])('inbound view fails closed for an %s organization', (_label, organization, reason) => {
    const plan = planConsoleMetricsQuery(req({ view: 'inbound', organization }), DATA)
    expect(plan.query).toBeUndefined()
    expect(plan.unavailable).toContain(reason)
  })

  it("outbound view filters on the destination jurisdiction's own principals", () => {
    const built = queryOf(req({ view: 'outbound' }))
    expect(topLevelValues(built, COMMON_NAME)).toEqual(['az-sender.example'])
    expect(topLevelValues(built, FIPS)).toEqual([])
  })

  it('outbound view with an organization narrows to that destination, never widens', () => {
    const built = queryOf(req({ view: 'outbound', organization: 'Massachusetts' }))
    expect(topLevelValues(built, COMMON_NAME)).toEqual(['az-sender.example'])
    expect(topLevelValues(built, FIPS)).toEqual(['MA'])
  })

  it('outbound view fails closed when the jurisdiction has no principals', () => {
    // buildOutboundCombinedQuery emits NO tenant filter without principals.
    for (const destId of ['nj', 'zz']) {
      const plan = planConsoleMetricsQuery(req({ view: 'outbound', destId }), DATA)
      expect(plan.query).toBeUndefined()
      expect(plan.unavailable).toEqual(expect.any(String))
    }
  })

  it('outbound view fails closed when the organization resolves to no destination', () => {
    const plan = planConsoleMetricsQuery(
      req({ view: 'outbound', organization: 'Azova' }),
      DATA
    )
    expect(plan.query).toBeUndefined()
    expect(plan.unavailable).toContain(
      'no destination found matching the selected organization (Azova)'
    )
  })

  it.each(CONSOLE_VIEWS)(
    '%s view: every plan is either unavailable or carries a tenant filter in the top-level query',
    (view) => {
      for (const destId of ['az', 'ma', 'nj', 'zz']) {
        for (const organization of [
          undefined,
          'Azova',
          'Massachusetts',
          'New Jersey',
          'Nobody',
        ]) {
          const plan = planConsoleMetricsQuery(req({ view, destId, organization }), DATA)
          expect(Boolean(plan.query) !== Boolean(plan.unavailable)).toBe(true)
          if (!plan.query) continue
          const restricted =
            topLevelValues(plan.query, FIPS).includes(destId.toUpperCase()) ||
            topLevelValues(plan.query, COMMON_NAME).length > 0
          expect({ view, destId, organization, restricted }).toEqual({
            view,
            destId,
            organization,
            restricted: true,
          })
        }
      }
    }
  )

  it('passes the environment tag through', () => {
    expect(JSON.stringify(queryOf(req({ envTag: 'prod' })))).toContain(
      '"tags.keyword":"prod"'
    )
  })
})

describe('buildSystemResourcesQuery', () => {
  it('returns aggregations only, never log documents', () => {
    const built = buildSystemResourcesQuery(new Date('2026-10-21T12:00:00Z'))
    expect(built.size).toBe(0)
    expect(Object.keys(built.aggs as object).sort()).toEqual([
      'connections',
      'cpu',
      'disk',
      'memory',
    ])
    expect(built.query).toEqual({
      range: {
        '@timestamp': {
          gte: '2026-10-20T12:00:00.000Z',
          lte: '2026-10-21T12:00:00.000Z',
        },
      },
    })
  })
})
