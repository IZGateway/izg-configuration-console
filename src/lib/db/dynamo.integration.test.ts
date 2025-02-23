/**
 * @jest-environment node
 */

import Dynamo from './dynamo';
import { Destination } from '../type/Destination';
import { DestinationChangeRequest } from '../type/DestinationChangeRequest'
import AWS from 'aws-sdk';
import JDBC from './jdbc';

function sortObjectKeys<T>(obj: T) : T {
  const orderedKeys = Object.keys(obj).sort();
  return orderedKeys.reduce((acc, key) => {
    acc[key] = obj[key];
    return acc;
  }, {}) as T;
}

describe('Dynamo Integration Tests', () => {
  const dynamo = new Dynamo()
  const jdbc = new JDBC()
  const destType = 5;

  beforeAll(async () => {})
  afterAll(async () => {})

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
    expect(nfPass).toEqual('NONE')
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
    const now = new Date()
    const changeRequest : DestinationChangeRequest = {
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
    }
    const result = await dynamo.upsertDestinationChangeRequest(changeRequest)
    const result2 = await jdbc.upsertDestinationChangeRequest(changeRequest)
    
    var { requestedAt, scheduledAt, id, ...actual } = result
    var { requestedAt, scheduledAt, id, ...expected } = result2
    expect(actual).toEqual(expected)
    result.requested.MSH22 = 'MSH22'
    result2.requested.MSH22 = 'MSH22'
    const result3 = await dynamo.upsertDestinationChangeRequest(result)
    const result4 = await jdbc.upsertDestinationChangeRequest(result2)
    var { requestedAt, scheduledAt, id, ...actual } = result3
    var { requestedAt, scheduledAt, id, ...expected } = result4
    expect(actual).toEqual(expected)

    const result5 = await dynamo.fetchDestinationChangeRequestById(result.id)
    expect(result5).toEqual(result3)

    const result6 = await dynamo.fetchDestinationChangeRequestByDestIdAndDestType(result.destId, result.destType.typeId)
    expect(result6).toEqual(result3)
  })
})
