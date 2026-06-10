/**
 * @jest-environment node
 */

// Unit tests for the AllowedUser audit/log behavior in Dynamo.upsertAllowedUser
// (IGDD-2853): the success log event must carry a structured `changeType`
// ('Create' | 'Update') and a message that names the operation, while the
// persisted AllowedUserAudit record is left unchanged.

// Lazy closure over mockSend so the mock works regardless of import hoisting.
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
import { AllowedUser } from '../type/AllowedUser'

const baseUser: AllowedUser = {
  principal: 'izgateway.example.com',
  environment: 2,
  destinationId: '404',
  organization: 'Example Org',
  enabled: false,
  createdBy: 'tester',
  createdOn: new Date('2026-01-01T00:00:00.000Z'),
  updatedBy: 'tester',
  updatedOn: new Date('2026-01-01T00:00:00.000Z'),
  validatedOn: null,
}

describe('Dynamo.upsertAllowedUser audit logging (IGDD-2853)', () => {
  const dynamo = new Dynamo()

  beforeEach(() => {
    mockSend.mockReset()
    ;(logger.info as jest.Mock).mockReset()
  })

  it('logs changeType "Create" and a "created" message when no record exists', async () => {
    mockSend
      .mockResolvedValueOnce({}) // GetCommand: no existing Item -> Create
      .mockResolvedValueOnce({}) // PutCommand

    await dynamo.upsertAllowedUser({ ...baseUser })

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringMatching(/created AllowedUser/i),
      expect.objectContaining({ changeType: 'Create' })
    )
  })

  it('logs changeType "Update" and an "updated" message when a record exists', async () => {
    mockSend
      .mockResolvedValueOnce({
        // GetCommand: existing Item -> Update
        Item: {
          createdBy: 'original-creator',
          createdOn: '2025-01-01T00:00:00.000Z',
        },
      })
      .mockResolvedValueOnce({}) // PutCommand

    await dynamo.upsertAllowedUser({ ...baseUser })

    expect(logger.info).toHaveBeenCalledWith(
      expect.stringMatching(/updated AllowedUser/i),
      expect.objectContaining({ changeType: 'Update' })
    )
  })
})

describe('Dynamo.createAllowedUserAudit persisted record (IGDD-2853)', () => {
  const dynamo = new Dynamo()

  beforeEach(() => {
    mockSend.mockReset()
  })

  it('still writes an AllowedUserAudit item with the given changeType', async () => {
    mockSend.mockResolvedValueOnce({ $metadata: { httpStatusCode: 200 } })

    await dynamo.createAllowedUserAudit(
      'Update',
      baseUser.principal,
      baseUser.environment,
      baseUser.destinationId,
      'tester@127.0.0.1',
      { ...baseUser },
      { ...baseUser, enabled: true }
    )

    expect(mockSend).toHaveBeenCalledTimes(1)
    const putCommand = mockSend.mock.calls[0][0]
    expect(putCommand.input.Item.entityType).toBe('AllowedUserAudit')
    expect(putCommand.input.Item.changeType).toBe('Update')
    expect(putCommand.input.Item.tableName).toBe('allowed_users')
    expect(putCommand.input.Item.sortKey).toContain(
      `${baseUser.environment}#${baseUser.destinationId}#${baseUser.principal}#`
    )
  })
})
