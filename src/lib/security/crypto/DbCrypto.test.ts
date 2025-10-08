import logger from '../../../../logger'
import DbClient from '../../db/DbClient'
import DbClientFactory from '../../db/DbClientFactory'
import {
  resetDb,
  encryptDb,
  decryptDb,
  isDatabaseEncrypted,
  isDatabaseDecrypted,
  rotateKey,
} from './DbCrypto'
import { setImmediate } from 'timers'
jest.setTimeout(30000) // Increase this if debugging

/**
 * These tests will validate the encryption and decryption of database records.
 * It resets the database to a known state (unencrypted with fixed passwords
 * in a development or test environment)
 * It then encrypts the database records and verifies that they have been encrypted.
 * It then decrypts the database records and verifies that they have been decrypted.
 * After everything is over, it resets the database to its original state.
 * It will NOT reset the records for ADS endpoints
 */
describe('DbCrypto integration', () => {
  let dbClient: DbClient | null = null
  global.setImmediate = global.setImmediate || setImmediate // For Jest Issue

  beforeAll(async () => {
    dbClient = await DbClientFactory.getDbClient('dynamo')
  })
  afterAll(async () => {
    // Comment out the line below and add .only after test below (making it it.only) o run only one test for a command line encrypt/decrypt/reset
    await resetDb(dbClient)
  })
  it('resetDb sets all destinations to correct values', async () => {
    await resetDb(dbClient)
    const destinations = await dbClient.fetchAllDestinations()
    destinations.forEach(async (dest) => {
      const password =
        'pass' +
        dest.destId +
        ' PASS' +
        dest.destId +
        dest.destinationType.typeId +
        dest.destId.charAt(0)
      const username = 'user' + dest.destId
      const facilityId = dest.destId
      const destPassword = await dbClient.fetchDestinationPassword(
        dest.destId,
        dest.destinationType.typeId
      )
      try {
        expect(destPassword).toMatch(password)
        expect(dest.facilityId).toMatch(facilityId)
        expect(dest.username).toMatch(username)
      } catch (error) {
        logger.error('Destination validation failed in test', {
          destId: dest.destId,
          actual: dest,
          operation: 'validate_destination_test',
        })
        throw error
      }
    })
  })

  it('encryptDb encrypts all destination passwords', async () => {
    await encryptDb(dbClient)
    expect(await isDatabaseEncrypted(dbClient)).toBeTruthy()
    const destinations = await dbClient.fetchAllDestinations()
    destinations.forEach(async (dest) => {
      const password = await dbClient
        .getRepository()
        .fetchDestinationPassword(dest.destId, dest.destinationType.typeId)
      expect(password).toMatch(/^==[A-Za-z0-9+/=]+$/) // Encrypted passwords start with '=='

      const cr =
        await dbClient.fetchDestinationChangeRequestByDestIdAndDestType(
          dest.destId,
          dest.destinationType.typeId
        )
      if (cr) {
        const crPassword = await dbClient
          .getRepository()
          .fetchChangeRequestPassword(cr.id)
        if (crPassword) expect(crPassword).toMatch(/^==[A-Za-z0-9+/=]+$/)
      }
    })
  })

  it('rotateKey reencrypts all destination passwords', async () => {
    await encryptDb(dbClient) // Ensure all are encrypted
    expect(await isDatabaseEncrypted(dbClient)).toBeTruthy()

    const destinations = await dbClient.fetchAllDestinations()
    // Save all old encrypted passwords
    destinations.forEach(async (dest) => {
      const password = await dbClient
        .getRepository()
        .fetchDestinationPassword(dest.destId, dest.destinationType.typeId)
      dest.password = password
      const cr =
        await dbClient.fetchDestinationChangeRequestByDestIdAndDestType(
          dest.destId,
          dest.destinationType.typeId
        )
      if (cr) {
        const crPassword = await dbClient
          .getRepository()
          .fetchChangeRequestPassword(cr.id)
        dest.RXA11 = crPassword // Use RXA11 field to store old CR password temporarily
      }
    })
    await rotateKey(dbClient)
    destinations.forEach(async (dest) => {
      const rotatedPassword = await dbClient
        .getRepository()
        .fetchDestinationPassword(dest.destId, dest.destinationType.typeId)
      expect(rotatedPassword).not.toBe(dest.password)
      expect(rotatedPassword).toMatch(/^==[A-Za-z0-9+/=]+$/)
      const cr =
        await dbClient.fetchDestinationChangeRequestByDestIdAndDestType(
          dest.destId,
          dest.destinationType.typeId
        )
      if (cr) {
        const crPassword = await dbClient
          .getRepository()
          .fetchChangeRequestPassword(cr.id)
        if (crPassword) {
          expect(crPassword).not.toBe(dest.RXA11)
          expect(crPassword).toMatch(/^==[A-Za-z0-9+/=]+$/)
        }
      }
    })
  })

  it('decryptDb decrypts all destination passwords', async () => {
    if (!(await isDatabaseEncrypted(dbClient))) {
      await encryptDb(dbClient)
    }
    await decryptDb(dbClient)
    expect(await isDatabaseDecrypted(dbClient)).toBeTruthy()
    const destinations = await dbClient.fetchAllDestinations()
    destinations.forEach(async (dest) => {
      const expectedPassword =
        'pass' +
        dest.destId +
        ' PASS' +
        dest.destId +
        dest.destinationType.typeId +
        dest.destId.charAt(0)
      const password = await dbClient
        .getRepository()
        .fetchDestinationPassword(dest.destId, dest.destinationType.typeId)
      if (password) expect(password).toMatch(expectedPassword)
      const cr =
        await dbClient.fetchDestinationChangeRequestByDestIdAndDestType(
          dest.destId,
          dest.destinationType.typeId
        )
      if (cr) {
        const crPassword = await dbClient
          .getRepository()
          .fetchChangeRequestPassword(cr.id)
        if (crPassword) expect(crPassword).not.toMatch(/^==[A-Za-z0-9+/=]+$/)
      }
    })
  })
})
