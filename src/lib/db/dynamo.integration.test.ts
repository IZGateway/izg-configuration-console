/**
 * @jest-environment node
 */

import Dynamo from './dynamo'
import { Destination } from '../type/Destination'
import { DestinationChangeRequest } from '../type/DestinationChangeRequest'

// This is for local testing only
const ENABLED = false

function sortObjectKeys<T>(obj: T): T {
  const orderedKeys = Object.keys(obj).sort()
  return orderedKeys.reduce((acc, key) => {
    acc[key] = obj[key]
    return acc
  }, {}) as T
}

function getChangeRequest(
  devDestination: Destination
): DestinationChangeRequest {
  const now = new Date()

  // Define the function to return a valid DestinationChangeRequest object
  return {
    id: null,
    isDraft: false,
    jiraId: null,
    destId: devDestination.destId,
    destType: devDestination.destinationType,
    requestedAt: now,
    scheduledAt: now,
    requestedBy: 'Test User',
    requested: {
      destUri: devDestination.destUri,
      password: null,
      facilityId: devDestination.facilityId,
      MSH3: devDestination.MSH3,
      MSH4: devDestination.MSH4,
      MSH5: devDestination.MSH5,
      MSH6: devDestination.MSH6,
      MSH11: devDestination.MSH11,
      MSH22: devDestination.MSH22,
      RXA11: devDestination.RXA11,
      username: devDestination.username,
    },
  }
}

describe('Dynamo Integration Tests', () => {
  if (!ENABLED) {
    it('This is for local testing only', async () => {
      /* Do Nothing */
    })
    return
  }

  const dynamo = new Dynamo()
  const destType = 5

  beforeAll(async () => {
    // RESET dev destination to expected values
    const devDestination = {
      destId: 'dev',
      destUri: '/dev/IISService',
      destVersion: '',
      username: 'user',
      MSH3: 'IZGW',
      MSH4: 'IZGW',
      MSH5: 'IZGW',
      MSH6: 'IZGW',
      MSH22: '',
      RXA11: '',
      facilityId: 'IZGW',
      passExpiry: new Date('2024-07-12T00:00:00.000Z'),
      maintReason: '',
      maintStart: null,
      maintEnd: null,
      destinationType: {
        type: 'DEV',
        typeId: 5,
      },
      jurisdiction: {
        jurisdictionId: 1,
        name: 'DEVELOPMENT',
        description: 'Development Testing',
      },
    } as Destination
    await dynamo.updateDestination(devDestination)
  })
  afterAll(async () => {
    /* Do Nothing */
  })

  const destIdValues = [
    '404',
    'aira',
    'dev',
    'dev2011',
    'devwup',
    'dex-dev',
    'dex',
    'down',
    'invalid',
    'maint',
    'mock',
    'reject',
  ]

  for (const destId of destIdValues) {
    it(
      'fetchDestination should fetch same resources for ' + destId,
      async () => {
        const result = await dynamo.fetchDestination(destId, destType)
        expect(result).toEqual(result2)
      }
    )
  }

  it('fetchDestinationPassword should fetch the correct passwords for dev and 404', async () => {
    const devPass = await dynamo.fetchDestinationPassword('dev', 5)
    expect(devPass).toEqual('passdev')
    const nfPass = await dynamo.fetchDestinationPassword('404', 5)
    expect(nfPass).toEqual('NONE')
    const wupPass = await dynamo.fetchDestinationPassword('devwup', 5)
    expect(wupPass).toEqual('passdevwup')
  })

  it('upsertChangeRequest should create a new DestinationChangeRequest', async () => {
    const devDestination = await dynamo.fetchDestination('dev', 5)
    const changeRequest: DestinationChangeRequest =
      getChangeRequest(devDestination)

    const result = await dynamo.upsertDestinationChangeRequest(changeRequest)

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { requestedAt, scheduledAt, id, ...actual } = result
    expect(actual).toEqual(expected)
    result.requested.MSH22 = 'MSH22'
    const result3 = await dynamo.upsertDestinationChangeRequest(result)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const {
      requestedAt: requestedAt3,
      scheduledAt: scheduledAt3,
      id: id3,
      ...actual2
    } = result3
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const {
      requestedAt: requestedAt4,
      scheduledAt: scheduledAt4,
      id: id4,
      ...expected2
    } = result4
    expect(actual2).toEqual(expected2)

    const result5 = await dynamo.fetchDestinationChangeRequestById(result.id)
    expect(result5).toEqual(result3)

    const result6 =
      await dynamo.fetchDestinationChangeRequestByDestIdAndDestType(
        result.destId,
        result.destType.typeId
      )
    expect(result6).toEqual(result3)

    dynamo.deleteDestinationChangeRequest(result.id)
  })

  it('createDestinationChangeRequestDeploymentAudit should create a new Audit record', async () => {
    const devDestination = await dynamo.fetchDestination('dev', 5)
    const changeRequest: DestinationChangeRequest =
      getChangeRequest(devDestination)
    changeRequest.current = { ...changeRequest.requested }
    changeRequest.requested.MSH22 = 'MSH22'

    // Create the audit record
    await dynamo.createDestinationChangeRequestDeploymentAudit(
      changeRequest,
      'Test User'
    )

    // Fetch the audit history
    const auditHistory = await dynamo.fetchDestinationAuditHistory(
      changeRequest.destId,
      changeRequest.destType.typeId
    )

    // Verify the audit record was created with correct data
    expect(auditHistory).toHaveLength(1)
    const auditRecord = { ...auditHistory[0] }
    delete auditRecord.id
    delete auditRecord.createdAt

    // Expected audit record should match the change request data
    expect(auditRecord).toMatchObject({
      destId: changeRequest.destId,
      destTypeId: changeRequest.destType.typeId,
      updatedBy: 'Test User',
      changes: {
        MSH22: {
          from: '', // Original value
          to: 'MSH22', // New value
        },
      },
    })
  })

  it('updateDestination works as expected', async () => {
    const devDestination = await dynamo.fetchDestination('dev', 5)
    devDestination.MSH22 = 'MSH22'
    await dynamo.updateDestination(devDestination)
    const result = await dynamo.fetchDestination('dev', 5)
    expect(result).toEqual(devDestination)
  })
})
