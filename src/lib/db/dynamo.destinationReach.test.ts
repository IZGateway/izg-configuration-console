/**
 * @jest-environment node
 */

// Unit test for the destination list reach fix (IGDD-3542):
// fetchLoggedInUsersDestinations() must fail closed on an empty jurisdiction
// claim (return [] and send no query) rather than build the malformed
// `destId IN ()` filter expression that DynamoDB rejects. See
// openspec/changes/destination-list-reach for the full spec and design.

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

describe('Dynamo.fetchLoggedInUsersDestinations reach (IGDD-3542)', () => {
  const dynamo = new Dynamo()

  beforeEach(() => {
    mockSend.mockReset()
    mockSend.mockResolvedValue({ Items: [] })
  })

  it('a global caller reads with no filter', async () => {
    await dynamo.fetchLoggedInUsersDestinations(true, [])

    expect(mockSend).toHaveBeenCalledTimes(1)
    const command = mockSend.mock.calls[0][0]
    expect(command.input.FilterExpression).toBeUndefined()
  })

  it('a scoped caller with one jurisdiction reads with that filter', async () => {
    await dynamo.fetchLoggedInUsersDestinations(false, ['az'])

    expect(mockSend).toHaveBeenCalledTimes(1)
    const command = mockSend.mock.calls[0][0]
    expect(command.input.FilterExpression).toBe('destId IN (:d0)')
    expect(command.input.ExpressionAttributeValues[':d0']).toBe('az')
  })

  it('a scoped caller with an empty list returns an empty array', async () => {
    const result = await dynamo.fetchLoggedInUsersDestinations(false, [])

    expect(result).toEqual([])
  })

  it('that same empty case sends no command', async () => {
    await dynamo.fetchLoggedInUsersDestinations(false, [])

    expect(mockSend).not.toHaveBeenCalled()
  })

  it('logs a warning when falling back to an empty reach', async () => {
    await dynamo.fetchLoggedInUsersDestinations(false, [])

    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('scoped caller has no assigned jurisdictions')
    )
  })

  // Exact whole-value matching: the data holds both `az` (Arizona) and `azova`
  // (a sender organization). A scoped caller whose claim is `az` must filter
  // on the exact value, never a substring, so `azova` is never a match. See
  // accesshelper.ts:41-43 for why this match must never be a substring test.
  it('filters on the exact jurisdiction value, not a prefix match', async () => {
    await dynamo.fetchLoggedInUsersDestinations(false, ['az'])

    const command = mockSend.mock.calls[0][0]
    expect(command.input.ExpressionAttributeValues[':d0']).toBe('az')
    const values = Object.values(command.input.ExpressionAttributeValues)
    expect(values).not.toContain('azova')
  })
})
