/**
 * @jest-environment node
 */
jest.mock('../../logger', () => ({
  __esModule: true,
  default: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

import hasAccessToDestId from './accesshelper'
import logger from '../../logger'

const sessionWith = (roles: string[], jurisdictions: string[] = []) => ({
  user: { roles, jurisdictions },
})

describe('hasAccessToDestId', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('a globally-scoped role reaches any destination regardless of jurisdictions', () => {
    expect(hasAccessToDestId('az', sessionWith(['IZG Operations']))).toBe(true)
    expect(hasAccessToDestId('az', sessionWith(['IZG Operations'], []))).toBe(true)
  })

  it('a scoped role reaches its own jurisdiction', () => {
    expect(
      hasAccessToDestId('az', sessionWith(['Jurisdiction Operations'], ['az']))
    ).toBe(true)
  })

  it('a scoped role does not reach an outside jurisdiction', () => {
    expect(
      hasAccessToDestId('vha', sessionWith(['Jurisdiction Operations'], ['az']))
    ).toBe(false)
  })

  // Regression for PR #666 review: this used to throw, turning a clean
  // 401/404 in every caller (none of which catch it) into an uncaught 500.
  it('a scoped role with an EMPTY jurisdictions array is denied, not thrown', () => {
    expect(() =>
      hasAccessToDestId('az', sessionWith(['Jurisdiction Operations'], []))
    ).not.toThrow()
    expect(
      hasAccessToDestId('az', sessionWith(['Jurisdiction Operations'], []))
    ).toBe(false)
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('no assigned jurisdictions'),
      expect.objectContaining({ destId: 'az' })
    )
  })

  it('no recognized role is denied, not thrown', () => {
    expect(() => hasAccessToDestId('az', sessionWith([]))).not.toThrow()
    expect(hasAccessToDestId('az', sessionWith([]))).toBe(false)
  })
})
