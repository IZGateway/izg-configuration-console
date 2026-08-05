/**
 * @jest-environment node
 */

// Unit tests for the DynamoDB layer of the API key lifecycle changes (IGDD-2707):
//  - cancelApiKeyCredential: SOFT cancel (status→cancelled, record retained)
//    guarded to ready_for_validation only
//  - supersedApiKeyCredential: renewal transitions the old credential to
//    `grace_period` (Hub-aligned contract, IGDD-2711), not the legacy
//    `grace`/`superseded` values.

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

// Isolate the raw client so the Dynamo constructor's fire-and-forget
// connection check never hits AWS.
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
  default: { info: jest.fn(), debug: jest.fn(), warn: jest.fn(), error: jest.fn() },
}))

import Dynamo from './dynamo'

describe('Dynamo API key lifecycle (IGDD-2707)', () => {
  const dynamo = new Dynamo()

  beforeEach(() => {
    mockSend.mockReset()
  })

  describe('cancelApiKeyCredential', () => {
    it('issues an UpdateCommand setting status=cancelled, gated to ready_for_validation, retaining the record', async () => {
      mockSend.mockResolvedValueOnce({ $metadata: { httpStatusCode: 200 } })

      await dynamo.cancelApiKeyCredential(
        '5#abc',
        'tester@example.com',
        '2026-07-28T00:00:00Z'
      )

      expect(mockSend).toHaveBeenCalledTimes(1)
      const command = mockSend.mock.calls[0][0]
      // Soft cancel = Update (record retained), not Delete.
      expect(command.constructor.name).toBe('UpdateCommand')
      expect(command.input.Key).toEqual({
        entityType: 'ApiKeyCredential',
        sortKey: '5#abc',
      })
      expect(command.input.ExpressionAttributeValues[':cancelled']).toBe('cancelled')
      expect(command.input.ExpressionAttributeValues[':cancelledBy']).toBe(
        'tester@example.com'
      )
      expect(command.input.ExpressionAttributeValues[':cancelledAt']).toBe(
        '2026-07-28T00:00:00Z'
      )
      // Atomic guard: only a pending credential may be cancelled.
      expect(command.input.ConditionExpression).toContain('#status')
      expect(command.input.ExpressionAttributeValues[':readyForValidation']).toBe(
        'ready_for_validation'
      )
    })

    it('propagates a conditional-check failure (wrong status) to the caller', async () => {
      const err = Object.assign(new Error('conditional'), {
        name: 'ConditionalCheckFailedException',
      })
      mockSend.mockRejectedValueOnce(err)

      await expect(
        dynamo.cancelApiKeyCredential('5#active', 'tester@example.com', '2026-07-28T00:00:00Z')
      ).rejects.toThrow('conditional')
    })
  })

  describe('supersedApiKeyCredential', () => {
    it('transitions the old credential to grace_period (Hub-aligned) with a supersededBy successor jti', async () => {
      mockSend.mockResolvedValueOnce({ $metadata: { httpStatusCode: 200 } })

      await dynamo.supersedApiKeyCredential({
        sortKey: '5#old',
        renewedBy: 'tester@example.com',
        renewedAt: '2026-07-27T00:00:00Z',
        graceExpiresAt: '2026-08-10T00:00:00Z',
        supersededBy: 'new-jti',
      })

      expect(mockSend).toHaveBeenCalledTimes(1)
      const command = mockSend.mock.calls[0][0]
      expect(command.constructor.name).toBe('UpdateCommand')
      // Status value + attribute name must match the Hub contract (izgw-hub
      // GracePeriodRevocationScheduler / ApiKeyCredential model, IGDD-2711).
      expect(command.input.ExpressionAttributeValues[':status']).toBe('grace_period')
      expect(command.input.ExpressionAttributeValues[':graceExpiresAt']).toBe(
        '2026-08-10T00:00:00Z'
      )
      expect(command.input.ExpressionAttributeValues[':supersededBy']).toBe(
        'new-jti'
      )
    })
  })
})
