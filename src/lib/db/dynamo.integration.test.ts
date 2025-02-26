/**
 * @jest-environment node
 */

import Dynamo from './dynamo';
import { Destination } from '../type/Destination';
import { DestinationChangeRequest } from '../type/DestinationChangeRequest'
import JDBC from './jdbc';

// This is for local testing only
const ENABLED = false;

function sortObjectKeys<T>(obj: T) : T {
  const orderedKeys = Object.keys(obj).sort();
  return orderedKeys.reduce((acc, key) => {
    acc[key] = obj[key];
    return acc;
  }, {}) as T;
}

function getChangeRequest(devDestination : Destination) : DestinationChangeRequest {
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
    }
  };
};

describe('Dynamo Integration Tests', () => {

  if (!ENABLED) {
    it('This is for local testing only', async () => { /* Do Nothing */ })
    return
  } 

  const dynamo = new Dynamo()
  const jdbc = new JDBC()
  const destType = 5;

  beforeAll(async () => {
    // RESET dev destination to expected values
    const devDestination = {
      "destId": "dev",
      "destUri": "/dev/IISService",
      "destVersion": "",
      "username": "user",
      "MSH3": "IZGW",
      "MSH4": "IZGW",
      "MSH5": "IZGW",
      "MSH6": "IZGW",
      "MSH22": "",
      "RXA11": "",
      "facilityId": "IZGW",
      "passExpiry": new Date("2024-07-12T00:00:00.000Z"),
      "maintReason": "",
      "maintStart": null,
      "maintEnd": null,
      "destinationType": {
        "type": "DEV",
        "typeId": 5,
      },
      "jurisdiction": {
        "jurisdictionId": 1,
        "name": "DEVELOPMENT",
        "description": "Development Testing",
      },
    } as Destination
    await dynamo.updateDestination(devDestination)
    await jdbc.updateDestination(devDestination)
  })
  afterAll(async () => { /* Do Nothing */ })

  const destIdValues = [ '404', 'aira', 'dev', 'dev2011', 'devwup', 'dex-dev', 'dex', 'down', 'invalid', 'maint', 'mock', 'reject']

  for (const destId of destIdValues) {
    it('fetchDestination should fetch same resources for ' + destId, async () => {
      const result = await dynamo.fetchDestination(destId, destType)
      const result2 = await jdbc.fetchDestination(destId, destType)
      expect(result).toEqual(result2)
    });
  }

  it('fetchDestinationPassword should fetch the correct passwords for dev and 404', async () => {
    const devPass = await dynamo.fetchDestinationPassword('dev', 5)
    expect(devPass).toEqual('pass')
    const nfPass = await dynamo.fetchDestinationPassword('404', 5)
    expect(nfPass).toEqual('NONE')
    const wupPass = await dynamo.fetchDestinationPassword('devwup', 5)
    expect(wupPass).toEqual('')
  });

  it('fetchLoggedInUsersDestinations should fetch same resources for ' + destIdValues, async () => {
    const result = await dynamo.fetchLoggedInUsersDestinations(false, destIdValues)
    for (const i in result) {
      delete result[i].passExpiry // remove these until fixed
      result[i] = sortObjectKeys(result[i])
    }
    const result2 = (await jdbc.fetchLoggedInUsersDestinations(false, destIdValues)).filter(item => item.destinationType.typeId === 5)
    for (const i in result2) {
      delete result2[i].passExpiry // remove these until fixed
      result2[i] = sortObjectKeys(result2[i])
    }
    expect(result).toEqual(result2)
  });

  it('upsertChangeRequest should create a new DestinationChangeRequest', async () => {
    const devDestination = await dynamo.fetchDestination('dev', 5)
    const changeRequest: DestinationChangeRequest = getChangeRequest(devDestination);
    
    const result = await dynamo.upsertDestinationChangeRequest(changeRequest)
    const result2 = await jdbc.upsertDestinationChangeRequest(changeRequest)
    
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { requestedAt, scheduledAt, id, ...actual } = result
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { scheduledAt: scheduledAt2, id: id2, ...expected } = result2
    expect(actual).toEqual(expected)
    result.requested.MSH22 = 'MSH22'
    result2.requested.MSH22 = 'MSH22'
    const result3 = await dynamo.upsertDestinationChangeRequest(result)
    const result4 = await jdbc.upsertDestinationChangeRequest(result2)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { requestedAt: requestedAt3, scheduledAt: scheduledAt3, id: id3, ...actual2 } = result3
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { requestedAt: requestedAt4, scheduledAt: scheduledAt4, id: id4, ...expected2 } = result4
    expect(actual2).toEqual(expected2)

    const result5 = await dynamo.fetchDestinationChangeRequestById(result.id)
    expect(result5).toEqual(result3)

    const result6 = await dynamo.fetchDestinationChangeRequestByDestIdAndDestType(result.destId, result.destType.typeId)
    expect(result6).toEqual(result3)

    dynamo.deleteDestinationChangeRequest(result.id)
    jdbc.deleteDestinationChangeRequest(result2.id)
  })

  it('createDestinationChangeRequestDeploymentAudit should create a new Audit record', async () => {
    const devDestination = await dynamo.fetchDestination('dev', 5)
    const changeRequest: DestinationChangeRequest = getChangeRequest(devDestination);
    changeRequest.current = { ...changeRequest.requested }
    changeRequest.requested.MSH22 = 'MSH22'
    await dynamo.createDestinationChangeRequestDeploymentAudit(changeRequest, 'Test User')
    await jdbc.createDestinationChangeRequestDeploymentAudit(changeRequest, 'Test User')
    const result = await dynamo.fetchDestinationAuditHistory(changeRequest.destId, changeRequest.destType.typeId)
    const result2 = await jdbc.fetchDestinationAuditHistory(changeRequest.destId, changeRequest.destType.typeId)
    for (const r of result) {
      delete r.id
      delete r.createdAt
    }
    for (const r of result2) {
      delete r.id
      delete r.createdAt
    } 
    expect(result).toEqual(result2)
  })

  it('updateDestination works as expected', async () => {
    const devDestination = await dynamo.fetchDestination('dev', 5)
    devDestination.MSH22 = 'MSH22'
    await dynamo.updateDestination(devDestination)
    await jdbc.updateDestination(devDestination)
    const result = await dynamo.fetchDestination('dev', 5)
    const result2 = await jdbc.fetchDestination('dev', 5)
    expect(result).toEqual(devDestination)
    expect(result2).toEqual(devDestination)
  })
})
