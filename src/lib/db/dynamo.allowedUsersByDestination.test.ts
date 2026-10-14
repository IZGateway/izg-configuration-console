/**
 * @jest-environment node
 */

// Unit test for the fetchAllowedUsersByDestination fail-open fix (PR #729
// review, out-of-scope note from IGDD-3542's proposal.md, raised to blocking
// once this PR gave Jurisdiction Operations write access through this same
// function): it must fail closed (return [] and send no command) on an empty
// jurisdiction claim, the same guard already applied to
// fetchLoggedInUsersDestinations in dynamo.destinationReach.test.ts.

const mockSend = jest.fn()

jest.mock('@aws-sdk/lib-dynamodb', () => {
  const actual = jest.requireActual('@aws-sdk/lib-dynamodb')
  return {
    ...actual,
    DynamoDBDocumentClient: {
      from: () => ({ send: (...args: unknown[]) => mockSend(...args) }),
    },
  }
})

jest.mock('@aws-sdk/client-dynamodb', () => {
  const actual = jest.requireActual('@aws-sdk/client-dynamodb')
  return {
    ...actual,
    DynamoDBClient: jest.fn(() => ({
      send: jest.fn().mockResolvedValue({ TableNames: [] }),
      config: {
        region: async () => 'us-east-1',
        endpoint: async () => 'http://localhost:8000',
      },
    })),
  }
})

jest.mock('../../../logger', () => ({
  __esModule: true,
  default: {
    info: jest.fn(),
    debug: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}))

import Dynamo from './dynamo'
import logger from '../../../logger'

describe('Dynamo.fetchAllowedUsersByDestination reach (IGDD-3546)', () => {
  const dynamo = new Dynamo()

  beforeEach(() => {
    mockSend.mockReset()
    mockSend.mockResolvedValue({ Items: [] })
  })

  it('a global caller reads with no filter', async () => {
    await dynamo.fetchAllowedUsersByDestination(true, [])

    expect(mockSend).toHaveBeenCalledTimes(1)
    const command = mockSend.mock.calls[0][0]
    expect(command.input.FilterExpression).toBeUndefined()
  })

  it('a scoped caller with one destination reads with that filter', async () => {
    await dynamo.fetchAllowedUsersByDestination(false, ['az'])

    expect(mockSend).toHaveBeenCalledTimes(1)
    const command = mockSend.mock.calls[0][0]
    expect(command.input.FilterExpression).toBe(
      'entityType = :entityType AND (destinationId = :d0)'
    )
    expect(command.input.ExpressionAttributeValues[':d0']).toBe('az')
  })

  it('a scoped caller with an empty list returns an empty array', async () => {
    const result = await dynamo.fetchAllowedUsersByDestination(false, [])

    expect(result).toEqual([])
  })

  it('that same empty case sends no command', async () => {
    await dynamo.fetchAllowedUsersByDestination(false, [])

    expect(mockSend).not.toHaveBeenCalled()
  })

  it('logs a warning when falling back to an empty reach', async () => {
    await dynamo.fetchAllowedUsersByDestination(false, [])

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('scoped caller has no assigned jurisdictions')
    )
  })
})
