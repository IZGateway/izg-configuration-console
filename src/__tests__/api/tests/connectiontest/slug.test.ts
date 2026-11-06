/**
 * @jest-environment node
 *
 * PR #771 review (Anusha): this route serves two different tests for two
 * different audiences. Testing a destination's configured/live settings (no
 * `values` in the body) stays open to the view-or-edit audience already
 * checked by test.canRunConnectionTest. Testing UNSAVED DRAFT content
 * (`values` present, the Edit Connection "Run Draft Connection Test" button)
 * is edit-only and runs a live test against caller-supplied data — gated on
 * edit.canRunDraftConnectionTest instead, not in addition.
 *
 * Before this fix, the whole route declared only test.canRunConnectionTest,
 * which IZG Support and Jurisdiction Support hold despite having NO edit.*
 * capability at all (and being unable to even load /edit) — a live gap, not
 * a dormant one, since both roles can call this route directly today.
 */
export {}

jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('next-auth/jwt', () => ({ getToken: jest.fn() }))
jest.mock('../../../../pages/api/auth/[...nextauth]', () => ({
  authOptions: {},
}))

const mockConnectionTest = jest.fn()
jest.mock('../../../../lib/connectiontests', () => ({
  __esModule: true,
  default: (...args: unknown[]) => mockConnectionTest(...args),
}))

const mockFetchDestinationChangeRequestByDestIdAndDestType = jest.fn()
const mockFetchDestinationPassword = jest.fn()
const mockFetchChangeRequestPassword = jest.fn()
jest.mock('../../../../lib/db/DbClientFactory', () => ({
  __esModule: true,
  default: {
    getDbClient: jest.fn().mockResolvedValue({
      fetchDestinationChangeRequestByDestIdAndDestType: (
        ...args: unknown[]
      ) => mockFetchDestinationChangeRequestByDestIdAndDestType(...args),
      fetchDestinationPassword: (...args: unknown[]) =>
        mockFetchDestinationPassword(...args),
      fetchChangeRequestPassword: (...args: unknown[]) =>
        mockFetchChangeRequestPassword(...args),
    }),
  },
}))

import { getServerSession } from 'next-auth'
import { getToken } from 'next-auth/jwt'

const signIn = (roles: string[], jurisdictions: string[] = []) => {
  ;(getServerSession as jest.Mock).mockResolvedValue({
    user: { name: 'u', email: 'u@example.com', id: '1', roles, jurisdictions },
  })
  ;(getToken as jest.Mock).mockResolvedValue({ sub: '00uABC' })
}

const buildReqRes = (
  destTypeId: string,
  destId: string,
  body: Record<string, unknown>
) => {
  const req: any = {
    method: 'POST',
    url: `/api/tests/connectiontest/${destTypeId}/${destId}`,
    headers: {},
    query: { slug: [destTypeId, destId] },
    body,
  }
  const res: any = {
    status: jest.fn(() => res),
    json: jest.fn(() => res),
    setHeader: jest.fn(),
    send: jest.fn(() => res),
  }
  return { req, res }
}

const loadHandler = () =>
  require('../../../../pages/api/tests/connectiontest/[...slug]').default

describe('POST /api/tests/connectiontest/{destTypeId}/{destId}', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockConnectionTest.mockResolvedValue({
      connectionTestResult: { testResults: [] },
    })
    mockFetchDestinationPassword.mockResolvedValue('stored-password')
  })

  it('tests configured/live settings for a view-tier role (no values in the body)', async () => {
    signIn(['IZG Support'])
    mockFetchDestinationChangeRequestByDestIdAndDestType.mockResolvedValue({
      id: 1,
      destType: { type: 'PROD' },
      jurisdiction: { description: 'Arizona' },
      destId: 'az',
      requested: { destUri: 'https://example.org' },
    })
    const { req, res } = buildReqRes('1', 'az', { configuration: 'deploy' })

    await loadHandler()(req, res)

    expect(mockConnectionTest).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalledWith(403)
  })

  it('refuses the configured/live test for a role without test.canRunConnectionTest', async () => {
    signIn([])
    const { req, res } = buildReqRes('1', 'az', { configuration: 'deploy' })

    await loadHandler()(req, res)

    expect(mockConnectionTest).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
  })

  it('tests draft content for an edit-tier role (values present in the body)', async () => {
    signIn(['IZG Operations'])
    const { req, res } = buildReqRes('1', 'az', {
      values: {
        destinationType: { type: 'PROD' },
        jurisdiction: { description: 'Arizona' },
        destUri: 'https://example.org',
        newPassword: 'x',
        confirmPassword: 'x',
      },
    })

    await loadHandler()(req, res)

    expect(mockConnectionTest).toHaveBeenCalled()
    expect(res.status).not.toHaveBeenCalledWith(403)
  })

  it('refuses the draft test for a role holding test.canRunConnectionTest but no edit.* capability (the live gap this closes)', async () => {
    signIn(['IZG Support'])
    const { req, res } = buildReqRes('1', 'az', {
      values: {
        destinationType: { type: 'PROD' },
        jurisdiction: { description: 'Arizona' },
        destUri: 'https://attacker.example/',
        newPassword: 'x',
        confirmPassword: 'x',
      },
    })

    await loadHandler()(req, res)

    expect(mockConnectionTest).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
  })

  it('refuses the draft test for Jurisdiction Support too, even with reach to the destination', async () => {
    signIn(['Jurisdiction Support'], ['az'])
    const { req, res } = buildReqRes('1', 'az', {
      values: {
        destinationType: { type: 'PROD' },
        jurisdiction: { description: 'Arizona' },
        destUri: 'https://attacker.example/',
        newPassword: 'x',
        confirmPassword: 'x',
      },
    })

    await loadHandler()(req, res)

    expect(mockConnectionTest).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(403)
  })
})
