/**
 * @jest-environment node
 */
jest.mock('next-auth', () => ({ getServerSession: jest.fn() }))
jest.mock('next-auth/jwt', () => ({ getToken: jest.fn() }))
jest.mock('../../../pages/api/auth/[...nextauth]', () => ({ authOptions: {} }))

const mockFetchAudit = jest.fn()
jest.mock('../../../lib/db/DbClientFactory', () => ({
  __esModule: true,
  default: {
    getDbClient: jest.fn().mockResolvedValue({
      fetchAllowedUserAuditHistory: (...args: unknown[]) => mockFetchAudit(...args),
    }),
  },
}))

const mockLogAccessDenied = jest.fn()
jest.mock('../../../lib/security/accessDeniedAudit', () => ({
  logAccessDenied: (...args: unknown[]) => mockLogAccessDenied(...args),
}))

import { getServerSession } from 'next-auth'
import handler from '../../../pages/api/allowedusersaudit/[...slug]'

const call = async (slug: string[]) => {
  const req: any = {
    method: 'GET',
    url: `/api/allowedusersaudit/${slug.join('/')}`,
    headers: {},
    query: { slug },
  }
  const res: any = {
    status: jest.fn(() => res),
    json: jest.fn(() => res),
    setHeader: jest.fn(),
    send: jest.fn(),
  }
  await handler(req, res)
  return res
}

const signIn = (roles: string[], jurisdictions: string[] = []) =>
  (getServerSession as jest.Mock).mockResolvedValue({
    user: { email: 'user@example.com', roles, jurisdictions },
  })

describe('GET /api/allowedusersaudit reach check (IGDD-3474)', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockFetchAudit.mockResolvedValue([{ changeType: 'Create' }])
  })

  it.each([['Jurisdiction Operations'], ['Jurisdiction Support']])(
    '%s reads its own jurisdiction sender history',
    async (role) => {
      signIn([role], ['az'])
      const res = await call(['1', 'az', 'sender.example'])
      expect(res.status).not.toHaveBeenCalledWith(403)
      expect(mockFetchAudit).toHaveBeenCalledWith('sender.example', 1, 'az')
      expect(res.json).toHaveBeenCalledWith([{ changeType: 'Create' }])
    }
  )

  it.each([['Jurisdiction Operations'], ['Jurisdiction Support']])(
    "%s is refused another jurisdiction's sender history, and the denial is audited",
    async (role) => {
      signIn([role], ['az'])
      const res = await call(['1', 'ma', 'sender.example'])
      expect(res.status).toHaveBeenCalledWith(403)
      expect(mockFetchAudit).not.toHaveBeenCalled()
      expect(mockLogAccessDenied).toHaveBeenCalledWith(
        expect.objectContaining({
          destId: 'ma',
          permission: 'onboarding.canViewOnboarding',
        })
      )
    }
  )

  it('matches the jurisdiction case-insensitively', async () => {
    signIn(['Jurisdiction Operations'], ['az'])
    const res = await call(['1', 'AZ', 'sender.example'])
    expect(res.status).not.toHaveBeenCalledWith(403)
    expect(mockFetchAudit).toHaveBeenCalled()
  })

  it.each([['IZG Operations'], ['IZG Support']])(
    '%s reads any jurisdiction',
    async (role) => {
      signIn([role])
      const res = await call(['1', 'ma', 'sender.example'])
      expect(res.status).not.toHaveBeenCalledWith(403)
      expect(mockFetchAudit).toHaveBeenCalled()
    }
  )

  it('Sender Operations, which cannot view onboarding, is refused', async () => {
    signIn(['Sender Operations'], ['azova'])
    const res = await call(['1', 'azova', 'sender.example'])
    expect(res.status).toHaveBeenCalledWith(403)
    expect(mockFetchAudit).not.toHaveBeenCalled()
  })
})
