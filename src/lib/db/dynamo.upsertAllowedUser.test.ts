/**
 * @jest-environment node
 */

// Unit test for the AllowedUser audit identity fix (IGDD-3175): the value
// upsertAllowedUser() returns must reflect what was actually persisted to
// DynamoDB (server-derived via getAuditUserString()), not the caller-supplied
// createdBy/updatedBy on the input object. The returned value feeds both the
// API response and the audit log's "newValues" snapshot, so echoing the raw
// input let a caller forge those fields even though the DB write itself was
// already safe.

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
import { asyncRequestContext } from '../Context'
import { AllowedUser } from '../type/AllowedUser'

const forgedUser: AllowedUser = {
  principal: 'izgateway.example.com',
  environment: 2,
  destinationId: '404',
  organization: 'Example Org',
  enabled: true,
  createdBy: 'forged-admin@example.com',
  createdOn: null,
  updatedBy: 'forged-admin@example.com',
  updatedOn: null,
  validatedOn: null,
}

describe('Dynamo.upsertAllowedUser return value (IGDD-3175)', () => {
  const dynamo = new Dynamo()

  beforeEach(() => {
    mockSend.mockReset()
  })

  it('returns the session-derived createdBy/updatedBy, not the caller-supplied values', async () => {
    mockSend
      .mockResolvedValueOnce({}) // GetCommand: no existing Item -> Create
      .mockResolvedValueOnce({}) // PutCommand

    const result = await asyncRequestContext.run(
      {
        user: 'real-user@example.com',
        ipAddress: '203.0.113.7',
      },
      () => dynamo.upsertAllowedUser({ ...forgedUser })
    )

    expect(result.createdBy).toBe('real-user@example.com@203.0.113.7')
    expect(result.updatedBy).toBe('real-user@example.com@203.0.113.7')
    expect(result.createdBy).not.toBe('forged-admin@example.com')
    expect(result.updatedBy).not.toBe('forged-admin@example.com')
  })
})
