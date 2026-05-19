import DbClient from '../../db/DbClient'
import crypto from 'crypto'
import {
  KEY_LENGTH,
  KEY_NAME,
  encrypt,
  encryptWithKey,
  initCryptoSupport,
  storeKeyInSecretsManager,
} from './cryptoSupport'
import { Destination } from '../../type/Destination'
import { DestinationChangeRequest } from '../../type/DestinationChangeRequest'
import logger from '../../../../logger'

/**
 * Returns true if all passwords in the database are encrypted, or empty.  Returns false if any password
 * is not encrypted.
 * @param dbClient  The database client
 * @returns true if all passwords are encrypted, false otherwise
 */
export async function isDatabaseEncrypted(
  dbClient: DbClient
): Promise<boolean> {
  const destinations = await dbClient.fetchAllDestinations()
  for (const dest of destinations) {
    try {
      const password = await dbClient
        .getRepository()
        .fetchDestinationPassword(dest.destId, dest.destinationType.typeId)
      if (
        typeof password === 'string' &&
        password.trim() !== '' &&
        !password.startsWith('==')
      ) {
        logger.warn(
          `Destination ${dest.destId}/${dest.destinationType.typeId} is not encrypted: ${password}`
        )
        return false
      }
    } catch (error) {
      logger.error(
        'Error fetching destination password while checking is database encrypted',
        {
          destinationId: dest.destId,
          destinationTypeId: dest.destinationType.typeId,
          errorMessage: error.message,
          errorType: error.name,
          stack: error.stack,
          operation: 'fetchDestinationPassword',
        }
      )
      return false
    }
    try {
      const cr =
        await dbClient.fetchDestinationChangeRequestByDestIdAndDestType(
          dest.destId,
          dest.destinationType.typeId
        )
      if (cr) {
        const crPassword = await dbClient
          .getRepository()
          .fetchChangeRequestPassword(cr.id)
        if (
          typeof crPassword === 'string' &&
          crPassword.trim() !== '' &&
          !crPassword.startsWith('==')
        ) {
          logger.warn(
            `Change request ${cr.id} for destination ${dest.destId}/${dest.destinationType.typeId} is not encrypted: ${crPassword}`
          )
          return false
        }
      }
    } catch (error) {
      logger.error(
        'Error fetching change request password while checking is database encrypted',
        {
          destinationId: dest.destId,
          destinationTypeId: dest.destinationType.typeId,
          errorMessage: error.message,
          errorType: error.name,
          stack: error.stack,
          operation: 'fetchChangeRequestPassword',
        }
      )

      return false
    }
  }
  if (!KEY_NAME) {
    logger.error('No encryption key configured for encrypted database', {
      configKey: 'KEY_NAME',
      databaseType: 'encrypted',
      operation: 'databaseEncryption',
    })
    throw new Error('No encryption key configured with encrypted database')
  }
  // If all passwords are encrypted, return true
  return true
}

/**
 * Returns true if all passwords in the database are not encrypted.  Returns false if any password
 * is encrypted.
 * @param dbClient  The database client
 * @returns true if all passwords are decrypted, false otherwise
 */
export async function isDatabaseDecrypted(
  dbClient: DbClient
): Promise<boolean> {
  const destinations = await dbClient.fetchAllDestinations()
  for (const dest of destinations) {
    try {
      const password = await dbClient
        .getRepository()
        .fetchDestinationPassword(dest.destId, dest.destinationType.typeId)
      if (typeof password === 'string' && password.startsWith('==')) {
        logger.warn(
          `Destination ${dest.destId}/${dest.destinationType.typeId} is encrypted`
        )
        return false
      }
    } catch (error) {
      logger.error(
        'Error fetching destination password while checking is database decrypted',
        {
          destinationId: dest.destId,
          destinationTypeId: dest.destinationType.typeId,
          errorMessage: error.message,
          errorType: error.name,
          stack: error.stack,
          operation: 'fetchDestinationPassword',
        }
      )

      return false
    }
    try {
      const cr =
        await dbClient.fetchDestinationChangeRequestByDestIdAndDestType(
          dest.destId,
          dest.destinationType.typeId
        )
      if (cr) {
        const crPassword = await dbClient
          .getRepository()
          .fetchChangeRequestPassword(cr.id)
        if (typeof crPassword === 'string' && crPassword.startsWith('==')) {
          logger.warn(
            `Change request ${cr.id} for destination ${dest.destId}/${dest.destinationType.typeId} is encrypted`
          )
          return false
        }
      }
    } catch (error) {
      logger.error(
        'Error fetching change request password while checking is database decrypted',
        {
          destinationId: dest.destId,
          destinationTypeId: dest.destinationType.typeId,
          errorMessage: error.message,
          errorType: error.name,
          stack: error.stack,
          operation: 'fetchChangeRequestPassword',
        }
      )
      return false
    }
  }
  // If all passwords are decrypted, return true
  return true
}
/**
 * Encrypts and updates the password for every destination in the database.
 * @param dbClient The database client implementing DbClient
 */
export async function encryptDb(dbClient: DbClient): Promise<void> {
  const destinations = await dbClient.fetchAllDestinations()
  for (const dest of destinations) {
    try {
      // Use the dbClient method to fetch the password for this destination
      const password = await dbClient.fetchDestinationPassword(
        dest.destId,
        dest.destinationType.typeId
      )
      if (
        typeof password === 'string' &&
        password &&
        !password.startsWith('==')
      ) {
        const encrypted = encrypt(password)
        // Create a copy to avoid mutating the original
        const updated: Destination = { ...dest, password: encrypted }
        await dbClient.getRepository().updateDestination(updated)
      }
    } catch (error) {
      logger.error('Error encrypting destination password', {
        destinationId: dest.destId,
        destinationTypeId: dest.destinationType.typeId,
        errorMessage: error.message,
        errorType: error.name,
        stack: error.stack,
        operation: 'encryptDb',
      })
    }
    try {
      const cr =
        await dbClient.fetchDestinationChangeRequestByDestIdAndDestType(
          dest.destId,
          dest.destinationType.typeId
        )
      if (cr) {
        const crPassword = await dbClient
          .getRepository()
          .fetchChangeRequestPassword(cr.id)
        if (typeof crPassword === 'string' && !crPassword.startsWith('==')) {
          const encrypted = encrypt(crPassword)
          const updatedCr: DestinationChangeRequest = {
            ...cr,
            requested: { ...cr.requested, password: encrypted },
          }
          await dbClient
            .getRepository()
            .upsertDestinationChangeRequest(updatedCr)
        }
      }
    } catch (error) {
      logger.error('Error encrypting destination change request password', {
        destinationId: dest.destId,
        destinationTypeId: dest.destinationType.typeId,
        errorMessage: error.message,
        errorType: error.name,
        stack: error.stack,
        operation: 'encryptDb',
      })
    }
  }
}

/**
 * Decrypts and updates the password for every destination in the database.
 * @param dbClient The database client implementing DbClient
 */
export async function decryptDb(dbClient: DbClient): Promise<void> {
  await encryptAllDestinationsWithKey(dbClient, null)
}

/**
 * Rotates the encryption key for the database, stores it, and then re-encrypts everything
 *
 * @param dbClient The database client implementing DbClient
 */
export async function rotateKey(dbClient: DbClient): Promise<void> {
  // Anyone reading should try with the previous key if the current key is not working,
  // so it is OK to just change the key.
  const newKey = crypto.randomBytes(KEY_LENGTH)
  await storeKeyInSecretsManager(newKey)
  await encryptAllDestinationsWithKey(dbClient, newKey)
  // re-initialize the CryptoSupport module
  await initCryptoSupport()
}
/**
 * Encrypts all destinations with the specified key
 *
 * @param dbClient The database client implementing DbClient
 * @param newKey The new encryption key (32 bytes)
 */
async function encryptAllDestinationsWithKey(
  dbClient: DbClient,
  newKey: Buffer | null
): Promise<void> {
  const destinations = await dbClient.fetchAllDestinations()
  for (const dest of destinations) {
    try {
      const password = await dbClient.fetchDestinationPassword(
        dest.destId,
        dest.destinationType.typeId
      )
      if (typeof password === 'string' && password) {
        const encrypted = newKey ? encryptWithKey(password, newKey) : password
        const updated: Destination = { ...dest, password: encrypted }
        await dbClient.getRepository().updateDestination(updated)
      }
    } catch (error) {
      logger.error('Error rotating key for destination password', {
        destinationId: dest.destId,
        destinationTypeId: dest.destinationType.typeId,
        errorMessage: error.message,
        errorType: error.name,
        stack: error.stack,
        operation: 'encryptAllDestinationsWithKey',
      })
    }
    try {
      const cr =
        await dbClient.fetchDestinationChangeRequestByDestIdAndDestType(
          dest.destId,
          dest.destinationType.typeId
        )
      if (cr) {
        const crPassword = await dbClient.fetchChangeRequestPassword(cr.id)
        if (crPassword) {
          const encrypted = newKey
            ? encryptWithKey(crPassword, newKey)
            : crPassword
          const updatedCr: DestinationChangeRequest = {
            ...cr,
            requested: { ...cr.requested, password: encrypted },
          }
          await dbClient
            .getRepository()
            .upsertDestinationChangeRequest(updatedCr)
        }
      }
    } catch (error) {
      logger.error('Error rotating key for  change request password', {
        destinationId: dest.destId,
        destinationTypeId: dest.destinationType.typeId,
        errorMessage: error.message,
        errorType: error.name,
        stack: error.stack,
        operation: 'encryptAllDestinationsWithKey',
      })
    }
  }
}

/**
 * Resets the password for every IIS destination in the database to a fixed pattern.  This does
 * not touch passwords on ADS endpoints.
 *
 * Throws an error if attempted in production, onboarding or staging environment.
 * This operation is not reversible.  It is useful to reset a database to a known state.
 *
 * @param dbClient The database client implementing DbClient
 */
export async function resetDb(dbClient: DbClient): Promise<void> {
  const destinations = await dbClient.fetchAllDestinations()
  let success = true
  for (const dest of destinations) {
    // Ensure we only mess with test and development environments with this function!
    if (
      dest.destinationType.typeId !== 2 &&
      dest.destinationType.typeId !== 5
    ) {
      throw new Error(
        `Will NOT reset passwords for production, onboarding or staging: ${dest.destinationType.typeId}`
      )
    }
    // Do NOT reset passwords for endpoints which take a SAS token, we don't control those!
    if (
      !dest.password ||
      (!dest.password.includes('&sv=') && !dest.password.includes('&sig='))
    ) {
      // Create a fixed password for each destination that is based on the destination information
      const password =
        'pass' +
        dest.destId +
        ' PASS' +
        dest.destId +
        dest.destinationType.typeId +
        dest.destId.charAt(0)
      const username = 'user' + dest.destId
      const facilityId = dest.destId
      // Create a copy to avoid mutating the original
      const updated: Destination = {
        ...dest,
        password: password,
        username: username,
        facilityId: facilityId,
      }
      success =
        success && (await dbClient.getRepository().updateDestination(updated))
    }
  }
}
