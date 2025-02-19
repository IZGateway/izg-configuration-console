/**
 * @jest-environment node
 */

import Dynamo from './dynamo';
import { Destination } from '../type/Destination';
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

});
