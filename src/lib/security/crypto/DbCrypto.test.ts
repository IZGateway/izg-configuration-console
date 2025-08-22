import DbClient from '../../db/DbClient'
import DbClientFactory from '../../db/DbClientFactory'
import { resetDb, encryptDb, decryptDb, isDatabaseEncrypted, isDatabaseDecrypted } from './DbCrypto'
import {setImmediate} from 'timers' // For Node 14 compatibility

describe('DbCrypto integration', () => {
  let dbClient : DbClient | null = null
  global.setImmediate = global.setImmediate || setImmediate  // For Jest Issue

  beforeAll(async () => {
    dbClient = await DbClientFactory.getDbClient('dynamo')
    await resetDb(dbClient)
  })
  afterAll(async () => {
    await resetDb(dbClient)
  })
  it('resetDb sets all destinations to correct values', async () => {
    const destinations = await dbClient.fetchAllDestinations()
    destinations.forEach(async dest => {
      const password = 'pass' + dest.destId + ' PASS' + dest.destId + dest.destinationType.typeId + dest.destId.charAt(0)
      const username = 'user' + dest.destId
      const facilityId = dest.destId
      const destPassword = await dbClient.fetchDestinationPassword(dest.destId, dest.destinationType.typeId)
      try {
        expect(destPassword).toMatch(password)
        expect(dest.facilityId).toMatch(facilityId)
        expect(dest.username).toMatch(username)
      } catch (error) {
        console.error(`Error validating destination ${dest.destId}:\n` +
          `Password: '${password}' = '${destPassword}'\n` +
          `Username: '${username}' = '${dest.username}'\n` +
          `Facility ID: '${facilityId}' = '${dest.facilityId}'\n`, error)
        throw error
      }
    })
  })

  it('encryptDb encrypts all destination passwords', async () => {
    await encryptDb(dbClient)
    expect(await isDatabaseEncrypted(dbClient)).toBeTruthy()
    const destinations = await dbClient.fetchAllDestinations()
    destinations.forEach(async dest => {
      const password = await dbClient.getRepository().fetchDestinationPassword(dest.destId, dest.destinationType.typeId)
      expect(password).toMatch(/^==[A-Za-z0-9+/=]+$/) // Encrypted passwords start with '=='
    })
  })

  it('decryptDb decrypts all destination passwords', async () => {
    if (!await isDatabaseEncrypted(dbClient)) {
        await encryptDb(dbClient)
    }
    await decryptDb(dbClient)
    expect(await isDatabaseDecrypted(dbClient)).toBeTruthy()
    const destinations = await dbClient.fetchAllDestinations()
    destinations.forEach(async dest => {
      const expectedPassword = 'pass' + dest.destId + ' PASS' + dest.destId + dest.destinationType.typeId + dest.destId.charAt(0)
      const password = await dbClient.getRepository().fetchDestinationPassword(dest.destId, dest.destinationType.typeId)
      if (password) expect(password).toMatch(expectedPassword) 
    })
  })
})
