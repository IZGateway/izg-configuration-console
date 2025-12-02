import DbClient from './DbClient'
import Dynamo from './dynamo'
import { Destination } from '../type/Destination'
import { DestinationAudit } from '../type/DestinationAudit'
import { DestinationChangeRequest } from '../type/DestinationChangeRequest'
import { DestinationType } from '../type/DestinationType'
import { OrganizationRecord } from '../type/OrganizationRecord'
import { DenyListItem } from '../type/DenyList'
import { AccessGroupRecord } from '../type/AccessGroupRecord'
import { FileTypeRecord } from '../type/FileTypeRecord'
import { SenderRecord } from '../type/SenderRecord'
import {
  encrypt,
  decrypt,
  initCryptoSupport,
  KEY_NAME,
} from '../security/crypto/cryptoSupport'
import logger from '../../../logger'

export default class DbClientFactory {
  static defaultClient: DbClient | null = null
  static async getDbClient(dbType?: string): Promise<DbClient> {
    let type = dbType ? dbType.toLowerCase() : null
    if (!type) {
      if (DbClientFactory.defaultClient) {
        return DbClientFactory.defaultClient
      } else {
        type = process.env.DB_TYPE || 'dynamo'
      }
    }
    let db: DbClient | null = null
    db = new Dynamo()
    await initCryptoSupport() // Ensure crypto support is initialized

    // Don't bother to wrap with EncryptedRepository if KEY_NAME is not set
    db = db != null && KEY_NAME ? new EncryptedRepository(db) : db
    if (!KEY_NAME) {
      logger.warn(`No encryption key configured for database ${type}`)
    }
    if (!dbType) {
      DbClientFactory.defaultClient = db
    }
    return db
  }
}

/**
 * Decrypts a password with retries in case of failure because of a key rotation
 *
 * @param password The password to decrypt
 * @returns The decrypted password
 */
async function decryptWithRetries(password: string): Promise<string> {
  try {
    return decrypt(password)
  } catch (error) {
    if (error.message?.match(/authenticate/i)) {
      // We failed with current, and previous, did someone rotate keys
      // while we weren't looking?
      await initCryptoSupport() // reinitialize keys
      return decrypt(password)
    }
    throw error
  }
}
/**
 * The EncryptedRepository wraps a database repository and encrypts sensitive data before storing
 * it and decrypts it after reading it. Calls which do not involve sensitive data are passed through
 * without any encryption or decryption operations.
 */
class EncryptedRepository implements DbClient {
  isDatabaseConnected!: () => Promise<boolean>
  fetchAllDestinations!: () => Promise<Destination[]>
  fetchDestinationType!: (destType: string) => Promise<DestinationType>
  fetchDestinationAuditHistory!: (
    destId: string,
    destTypeId: number
  ) => Promise<DestinationAudit[]>
  deleteDestinationChangeRequest!: (id: number) => Promise<boolean>
  fetchDestinationChangeRequestById!: (
    id: number
  ) => Promise<DestinationChangeRequest>
  fetchDestinationChangeRequestByDestIdAndDestType!: (
    destId: string,
    destTypeId: number
  ) => Promise<DestinationChangeRequest>

  private repository: DbClient

  constructor(repository: DbClient) {
    this.repository = repository
    this.deleteDestinationChangeRequest =
      repository.deleteDestinationChangeRequest.bind(repository)
    this.fetchAllDestinations = repository.fetchAllDestinations.bind(repository)
    this.fetchDestinationAuditHistory =
      repository.fetchDestinationAuditHistory.bind(repository)
    this.fetchDestinationType = repository.fetchDestinationType.bind(repository)
    this.fetchDestinationChangeRequestById =
      repository.fetchDestinationChangeRequestById.bind(repository)
    this.fetchDestinationChangeRequestByDestIdAndDestType =
      repository.fetchDestinationChangeRequestByDestIdAndDestType.bind(
        repository
      )
    this.isDatabaseConnected = repository.isDatabaseConnected.bind(repository)
  }
  /** Return the base repository */
  getRepository(): DbClient {
    return this.repository
  }

  /**
   * The isPasswordChanged method does password comparison between the destination
   * and its change request using fetch operations instead of direct database queries.
   * This is because each password is encrypted with its own initialization vector, and
   * no two passwords are encrypted the same way, even if they have the same value.
   */
  async isPasswordChanged(destId: string, dest_type: number): Promise<boolean> {
    // Fetch destination and change request, compare passwords
    const [destination, changeRequest] = await Promise.all([
      this.fetchDestination(destId, dest_type),
      this.fetchDestinationChangeRequestByDestIdAndDestType(destId, dest_type),
    ])
    const destPassword = destination?.password || ''
    const crPassword = changeRequest?.requested?.password || ''
    return destPassword !== crPassword
  }
  async upsertDestinationChangeRequest(
    changeRequestData: DestinationChangeRequest
  ): Promise<DestinationChangeRequest> {
    // Encrypt password if present
    const dataCopy = { ...changeRequestData }
    if (dataCopy.requested && typeof dataCopy.requested.password === 'string') {
      dataCopy.requested = {
        ...dataCopy.requested,
        password: encrypt(dataCopy.requested.password),
      }
    }
    return await this.repository.upsertDestinationChangeRequest(dataCopy)
  }
  async createDestinationChangeRequestDeploymentAudit(
    changeRequest: DestinationChangeRequest,
    user: string
  ): Promise<boolean> {
    // Encrypt password if present
    const dataCopy = { ...changeRequest }
    if (dataCopy.requested && typeof dataCopy.requested.password === 'string') {
      dataCopy.requested = {
        ...dataCopy.requested,
        password: encrypt(dataCopy.requested.password),
      }
    }
    return await this.repository.createDestinationChangeRequestDeploymentAudit(
      dataCopy,
      user
    )
  }
  async updateDestination(destination: Destination): Promise<boolean> {
    // Encrypt password if present
    const destCopy = { ...destination }
    if (typeof destCopy.password === 'string') {
      destCopy.password = encrypt(destCopy.password)
    }
    return await this.repository.updateDestination(destCopy)
  }
  async fetchDestination(
    destId: string,
    destType: number
  ): Promise<Destination> {
    const result = await this.repository.fetchDestination(destId, destType)
    if (result && typeof result.password === 'string') {
      result.password = await decryptWithRetries(result.password)
    }
    return result
  }

  async fetchDestinationPassword(
    destId: string,
    destType: number
  ): Promise<string> {
    let result = await this.repository.fetchDestinationPassword(
      destId,
      destType
    )
    if (result && typeof result === 'string') {
      result = await decryptWithRetries(result)
    }
    return result
  }

  async fetchLoggedInUsersDestinations(
    isAdmin: boolean,
    jurisdictions: Array<string>
  ): Promise<Destination[]> {
    const results = await this.repository.fetchLoggedInUsersDestinations(
      isAdmin,
      jurisdictions
    )
    for (const dest of results) {
      if (dest && typeof dest.password === 'string') {
        dest.password = await decryptWithRetries(dest.password)
      }
    }
    return results
  }

  async fetchChangeRequestPassword(id: number): Promise<string> {
    const result = await this.repository.fetchChangeRequestPassword(id)
    if (result && typeof result === 'string') {
      return await decryptWithRetries(result)
    }
    return result
  }

  async fetchSenderData(): Promise<SenderRecord> {
    const result = await this.repository.fetchSenderData()
    return result
  }

  async fetchAccessGroups(): Promise<AccessGroupRecord[]> {
    const result = await this.repository.fetchAccessGroups()
    return result
  }

  async fetchDenyListData(): Promise<DenyListItem[]> {
    const result = await this.repository.fetchDenyListData()
    return result
  }

  async fetchFileTypeList(): Promise<FileTypeRecord[]> {
    const result = await this.repository.fetchFileTypeList()
    return result
  }
  async fetchOrganizations(): Promise<OrganizationRecord[]> {
    const result = await this.repository.fetchOrganizations()
    return result
  }

  async checkDenyListRecordExists(sortKey: string): Promise<boolean> {
    const result = await this.repository.checkDenyListRecordExists(sortKey)
    return result
  }

  async addDenyListRecord(denyListItem: {
    principal: string
    environment: number
    reason?: string
    deniedBy?: string
    createdBy?: string
  }): Promise<DenyListItem> {
    const createdBy =
      denyListItem.createdBy || denyListItem.deniedBy || 'System'
    const result = await this.repository.addDenyListRecord({
      ...denyListItem,
      createdBy,
    })
    return result
  }

  async deleteDenyListRecord(id: string): Promise<boolean> {
    return await this.repository.deleteDenyListRecord(id)
  }

  async addAdsFileTypeRecord(fileTypeItem: {
    fileTypeName: string
    sortKey: string
    description: string
    createdBy: string
  }): Promise<boolean> {
    return await this.repository.addAdsFileTypeRecord(fileTypeItem)
  }

  async deleteAdsFileTypeRecord(sortKey: string): Promise<boolean> {
    return await this.repository.deleteAdsFileTypeRecord(sortKey)
  }

  async checkAdsFileTypeRecordExists(sortKey: string): Promise<boolean> {
    return await this.repository.checkAdsFileTypeRecordExists(sortKey)
  }
}
