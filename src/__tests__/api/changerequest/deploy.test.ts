/**
 * @jest-environment node
 *
 * IGDD-3742: deploying a password change required both the change request's
 * new password and the destination's current one, and failed with a 500 and
 * no log line when either was missing.
 */
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('next-auth/jwt', () => ({ getToken: jest.fn() }))
jest.mock('../../../pages/api/auth/[...nextauth]', () => ({ authOptions: {} }))
jest.mock('../../../lib/accesshelper', () => ({
  __esModule: true,
  default: jest.fn(),
}))
jest.mock('../../../lib/utils/izghubdbrefresh', () => ({
  refreshHubForEnvironment: jest.fn().mockResolvedValue({}),
}))

const mockLoggerError = jest.fn()
jest.mock('../../../../logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
    error: (...args: unknown[]) => mockLoggerError(...args),
  },
}))

const mockFetchDestinationChangeRequestById = jest.fn()
const mockFetchChangeRequestPassword = jest.fn()
const mockFetchDestinationPassword = jest.fn()
const mockUpdateDestination = jest.fn()
const mockCreateAudit = jest.fn()
const mockDeleteChangeRequest = jest.fn()
jest.mock('../../../lib/db/DbClientFactory', () => ({
  __esModule: true,
  default: {
    getDbClient: jest.fn().mockResolvedValue({
      fetchDestinationChangeRequestById: (...args: unknown[]) =>
        mockFetchDestinationChangeRequestById(...args),
      fetchChangeRequestPassword: (...args: unknown[]) =>
        mockFetchChangeRequestPassword(...args),
      fetchDestinationPassword: (...args: unknown[]) =>
        mockFetchDestinationPassword(...args),
      fetchDestination: jest.fn().mockResolvedValue(null),
      updateDestination: (...args: unknown[]) => mockUpdateDestination(...args),
      createDestinationChangeRequestDeploymentAudit: (...args: unknown[]) =>
        mockCreateAudit(...args),
      deleteDestinationChangeRequest: (...args: unknown[]) =>
        mockDeleteChangeRequest(...args),
    }),
  },
}))

import { getServerSession } from 'next-auth'
import { getToken } from 'next-auth/jwt'
import hasAccessToDestId from '../../../lib/accesshelper'
import handler from '../../../pages/api/changerequest/deploy/[...slug]'

const buildReqRes = () => {
  const req: any = {
    method: 'GET',
    url: '/api/changerequest/deploy/999',
    headers: {},
    query: { slug: ['999'] },
  }
  const res: any = {
    status: jest.fn(() => res),
    json: jest.fn(() => res),
    setHeader: jest.fn(),
    send: jest.fn(),
  }
  return { req, res }
}

// The success reply is sent from a .then the handler does not await.
const flush = () => new Promise((resolve) => setImmediate(resolve))

const passwordChange = () => ({
  id: 999,
  jiraId: 'CCT-1',
  destId: 'dest1',
  destType: { typeId: 5, type: 'DEV' },
  jurisdiction: { jurisdictionId: 1 },
  isPasswordDifferent: true,
  requested: { destUri: 'https://iis.example/soap', username: 'user1' },
  current: { destUri: 'https://iis.example/soap', username: 'user1' },
})

describe('GET /api/changerequest/deploy password handling (IGDD-3742)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    ;(getServerSession as jest.Mock).mockResolvedValue({
      user: {
        name: 'Ops User',
        email: 'ops@example.com',
        roles: ['IZG Operations'],
      },
    })
    ;(getToken as jest.Mock).mockResolvedValue({ sub: 'user-sub' })
    ;(hasAccessToDestId as jest.Mock).mockReturnValue(true)
    mockFetchDestinationChangeRequestById.mockResolvedValue(passwordChange())
    mockUpdateDestination.mockResolvedValue(true)
    mockCreateAudit.mockResolvedValue(true)
    mockDeleteChangeRequest.mockResolvedValue(true)
  })

  it('deploys the new password', async () => {
    mockFetchChangeRequestPassword.mockResolvedValue('new-secret')
    mockFetchDestinationPassword.mockResolvedValue('old-secret')
    const { req, res } = buildReqRes()

    await handler(req, res)
    await flush()

    expect(mockUpdateDestination).toHaveBeenCalledWith(
      expect.objectContaining({ password: 'new-secret' })
    )
    expect(res.status).toHaveBeenCalledWith(200)
  })

  it('deploys a first password to a destination that has none', async () => {
    mockFetchChangeRequestPassword.mockResolvedValue('new-secret')
    mockFetchDestinationPassword.mockResolvedValue(null)
    const { req, res } = buildReqRes()

    await handler(req, res)
    await flush()

    expect(mockUpdateDestination).toHaveBeenCalledWith(
      expect.objectContaining({ password: 'new-secret' })
    )
    expect(res.status).toHaveBeenCalledWith(200)
  })

  it.each([
    ['empty', ''],
    ['missing', null],
  ])(
    'refuses, logs, and changes nothing when the new password is %s',
    async (_label, stored) => {
      mockFetchChangeRequestPassword.mockResolvedValue(stored)
      mockFetchDestinationPassword.mockResolvedValue('old-secret')
      const { req, res } = buildReqRes()

      await handler(req, res)
      await flush()

      expect(res.status).toHaveBeenCalledWith(500)
      expect(mockLoggerError).toHaveBeenCalledWith(
        'Change request is a password change but has no stored password',
        expect.objectContaining({ changeRequestId: 999, jiraId: 'CCT-1' })
      )
      expect(mockUpdateDestination).not.toHaveBeenCalled()
      expect(mockCreateAudit).not.toHaveBeenCalled()
      expect(mockDeleteChangeRequest).not.toHaveBeenCalled()
    }
  )
})
