/**
 * @jest-environment node
 */
const mockWarn = jest.fn()

jest.mock('../../../logger', () => ({
  __esModule: true,
  default: { warn: (...args: unknown[]) => mockWarn(...args) },
}))

import { logAccessDenied } from './accessDeniedAudit'

// The Elastic index maps `url` as an object. A string `url` makes
// Elasticsearch reject the whole document and filebeat drops it, while the
// event still prints to stdout — so CloudWatch, and every other assertion
// about this event, looks fine. This file is the only thing that catches it.
describe('logAccessDenied emitted shape (IGDD-3541)', () => {
  beforeEach(() => mockWarn.mockReset())

  const emitted = () => mockWarn.mock.calls[0][1]

  it('converts the string url callers pass into the ECS url object', () => {
    logAccessDenied({
      reason: 'insufficient role for route access',
      url: '/api/status/reset',
      method: 'POST',
    })

    expect(emitted().url).toEqual({ path: '/api/status/reset' })
    expect(typeof emitted().url).not.toBe('string')
  })

  it('carries the query string as url.query', () => {
    logAccessDenied({ reason: 'r', url: '/api/destinations/x?id=1' })

    expect(emitted().url).toEqual({ path: '/api/destinations/x', query: 'id=1' })
  })

  it('omits url entirely when the caller has none', () => {
    logAccessDenied({ reason: 'r' })

    expect(emitted().url).toBeUndefined()
    // JSON serialization is what reaches filebeat; an undefined field vanishes.
    expect(JSON.parse(JSON.stringify(emitted()))).not.toHaveProperty('url')
  })

  it('leaves every other field unchanged', () => {
    logAccessDenied({
      reason: 'insufficient role for route access',
      deniedAt: 'api',
      page: 'adminoperations',
      permission: 'adminoperations.canResetHubCircuitBreakers',
      url: '/api/status/reset',
      method: 'POST',
      user: 'Jurisdiction Support Test',
      roles: ['Jurisdiction Support'],
    })

    expect(mockWarn).toHaveBeenCalledWith('Access denied: RBAC rejection', {
      eventType: 'AccessDenied',
      reason: 'insufficient role for route access',
      deniedAt: 'api',
      page: 'adminoperations',
      permission: 'adminoperations.canResetHubCircuitBreakers',
      url: { path: '/api/status/reset' },
      method: 'POST',
      user: 'Jurisdiction Support Test',
      roles: ['Jurisdiction Support'],
    })
  })
})
