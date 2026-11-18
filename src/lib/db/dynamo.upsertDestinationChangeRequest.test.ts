/**
 * @jest-environment node
 */

// IGDD-3742: upsertDestinationChangeRequest rebuilds the whole item with a
// PutCommand. A body with isPasswordDifferent: true and no password used to
// store password '' over the saved one, and the deploy that followed failed.
// The stored (already encrypted) password must be kept instead.

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

import { GetCommand, PutCommand } from '@aws-sdk/lib-dynamodb'
import Dynamo from './dynamo'
import { DestinationChangeRequest } from '../type/DestinationChangeRequest'

const STORED_PASSWORD = '==c3RvcmVkLWVuY3J5cHRlZA=='

// Cast: these bodies are deliberately incomplete (no password, or null).
const changeRequest = (
  overrides: Record<string, unknown> = {},
  isPasswordDifferent = true
): DestinationChangeRequest =>
  ({
    id: 42,
    destId: 'xx',
    destType: { typeId: 5, type: 'dev' },
    jiraId: 'CR-1',
    isDraft: false,
    isPasswordDifferent,
    requestedAt: new Date(),
    requestedBy: 'user@example.com',
    scheduledAt: new Date('2026-12-01T12:00:00Z'),
    createdBy: 'user@example.com',
    createdOn: new Date(),
    requested: {
      destUri: 'https://iis.example/soap',
      username: 'izgw',
      ...overrides,
    },
  } as unknown as DestinationChangeRequest)

const storedItem = {
  entityType: 'DestinationChangeRequest',
  sortKey: '42',
  isPasswordDifferent: true,
  password: STORED_PASSWORD,
  createdBy: 'creator@example.com',
  createdOn: '2026-11-01T00:00:00.000Z',
}

const writtenItem = () => {
  const put = mockSend.mock.calls
    .map(([command]) => command)
    .find((command) => command instanceof PutCommand)
  return put.input.Item
}

describe('Dynamo.upsertDestinationChangeRequest password (IGDD-3742)', () => {
  const dynamo = new Dynamo()

  beforeEach(() => {
    mockSend.mockReset()
    mockSend.mockImplementation(async (command) =>
      command instanceof GetCommand ? { Item: storedItem } : {}
    )
    jest
      .spyOn(dynamo, 'convertResponseToDestinationChangeRequest')
      .mockResolvedValue({} as DestinationChangeRequest)
  })

  it.each([
    ['missing', {}],
    ['empty', { password: '' }],
    ['null', { password: null }],
  ])(
    'keeps the stored password when the body password is %s',
    async (_label, requested) => {
      await dynamo.upsertDestinationChangeRequest(changeRequest(requested))

      expect(writtenItem().password).toBe(STORED_PASSWORD)
      expect(writtenItem().isPasswordDifferent).toBe(true)
    }
  )

  it('stores the new password when the body has one', async () => {
    await dynamo.upsertDestinationChangeRequest(
      changeRequest({ password: '==bmV3LWVuY3J5cHRlZA==' })
    )

    expect(writtenItem().password).toBe('==bmV3LWVuY3J5cHRlZA==')
  })

  it("stores '' when there is no stored record to keep", async () => {
    mockSend.mockImplementation(async () => ({}))

    await dynamo.upsertDestinationChangeRequest(changeRequest())

    expect(writtenItem().password).toBe('')
  })

  it('writes no password when isPasswordDifferent is false', async () => {
    await dynamo.upsertDestinationChangeRequest(changeRequest({}, false))

    expect(writtenItem()).not.toHaveProperty('password')
  })
})
