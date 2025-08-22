import DbClient from './DbClient'
import Dynamo from './dynamo'
import JDBC from './jdbc'
import ConfigConsoleFetchRepository from './ConfigConsoleFetchRepository'
import ConfigConsoleMutateRepository from './ConfigConsoleMutateRepository'
import { Destination } from '../type/Destination'
import { DestinationAudit } from '../type/DestinationAudit'
import { DestinationChangeRequest } from '../type/DestinationChangeRequest'
import { DestinationType } from '../type/DestinationType'
import { encrypt, decrypt, initCryptoSupport } from '../security/crypto/cryptoSupport'

export default interface DbClientFactory extends ConfigConsoleFetchRepository, ConfigConsoleMutateRepository {}
export default class DbClientFactory {
  static defaultClient: DbClient | null = null
  static async getDbClient(dbType?: string) : Promise<DbClient> {
    let type = dbType ? dbType.toLowerCase() : null
    if (!type) {
      if (DbClientFactory.defaultClient) {
        return DbClientFactory.defaultClient
      } else {
        type = process.env.DB_TYPE || 'dynamo'
      }
    }
    let db: DbClient | null = null;
    if (type === 'jdbc') {
      db = new JDBC()
    } else if (type === 'dynamo') {
      db = new Dynamo()
    }
    await initCryptoSupport() // Ensure crypto support is initialized

    db = db ? new EncryptedRepository(db) : null
    if (!dbType) {
      DbClientFactory.defaultClient = db
    }
    return db
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
  fetchDestinationType!: (destType: string) => Promise<DestinationType>;
  fetchDestinationAuditHistory!: (destId: string, destTypeId: number) => Promise<DestinationAudit[]>;
  deleteDestinationChangeRequest!: (id: number) => Promise<boolean>;
  private repository: DbClient

  constructor(repository: DbClient) {
    this.repository = repository;
    this.deleteDestinationChangeRequest = repository.deleteDestinationChangeRequest.bind(repository);
    this.fetchAllDestinations = repository.fetchAllDestinations.bind(repository);
    this.fetchDestinationAuditHistory = repository.fetchDestinationAuditHistory.bind(repository);
    this.fetchDestinationType = repository.fetchDestinationType.bind(repository);
    this.isDatabaseConnected = repository.isDatabaseConnected.bind(repository);
  }
  /** Return the base repository */
  getRepository(): DbClient {
    return this.repository;
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
      this.fetchDestinationChangeRequestByDestIdAndDestType(destId, dest_type)
    ]);
    const destPassword = destination?.password || '';
    const crPassword = changeRequest?.requested?.password || '';
    return destPassword !== crPassword;
  }
  async upsertDestinationChangeRequest(changeRequestData: DestinationChangeRequest): Promise<DestinationChangeRequest> {
    // Encrypt password if present
    const dataCopy = { ...changeRequestData };
    if (dataCopy.requested && typeof dataCopy.requested.password === 'string') {
      dataCopy.requested = { ...dataCopy.requested, password: encrypt(dataCopy.requested.password) };
    }
    return await this.repository.upsertDestinationChangeRequest(dataCopy);
  }
  async createDestinationChangeRequestDeploymentAudit(changeRequest: DestinationChangeRequest, user: string): Promise<boolean> {
    // Encrypt password if present
    const dataCopy = { ...changeRequest };
    if (dataCopy.requested && typeof dataCopy.requested.password === 'string') {
      dataCopy.requested = { ...dataCopy.requested, password: encrypt(dataCopy.requested.password) };
    }
    return await this.repository.createDestinationChangeRequestDeploymentAudit(dataCopy, user);
  }
  async updateDestination(destination: Destination): Promise<boolean> {
    // Encrypt password if present
    const destCopy = { ...destination };
    if (typeof destCopy.password === 'string') {
      destCopy.password = encrypt(destCopy.password);
    }
    return await this.repository.updateDestination(destCopy);
  }
  async fetchDestination(destId: string, destType: number): Promise<Destination> {
    const result = await this.repository.fetchDestination(destId, destType);
    if (result && typeof result.password === 'string') {
      result.password = decrypt(result.password);
    }
    return result;
  }
  async fetchLoggedInUsersDestinations(isAdmin: boolean, jurisdictions: Array<string>): Promise<Destination[]> {
    const results = await this.repository.fetchLoggedInUsersDestinations(isAdmin, jurisdictions);
    return results.map(dest => {
      if (dest && typeof dest.password === 'string') {
        return { ...dest, password: decrypt(dest.password) };
      }
      return dest;
    });
  }
  async fetchDestinationChangeRequestById(id: number): Promise<DestinationChangeRequest> {
    const result = await this.repository.fetchDestinationChangeRequestById(id);
    if (result && result.requested && typeof result.requested.password === 'string') {
      result.requested = { ...result.requested, password: decrypt(result.requested.password) };
    }
    return result;
  }
  async fetchDestinationChangeRequestByDestIdAndDestType(destId: string, destTypeId: number): Promise<DestinationChangeRequest> {
    const result = await this.repository.fetchDestinationChangeRequestByDestIdAndDestType(destId, destTypeId);
    if (result && result.requested && typeof result.requested.password === 'string') {
      result.requested = { ...result.requested, password: decrypt(result.requested.password) };
    }
    return result;
  }
  async fetchChangeRequestPassword(id: number): Promise<string> {
    const result = await this.repository.fetchChangeRequestPassword(id);
    if (typeof result === 'string') {
      return decrypt(result);
    }
    return result;
  }
  async fetchDestinationPassword(destId: string, destType: number): Promise<string> {
    const result = await this.repository.fetchDestinationPassword(destId, destType);
    if (typeof result === 'string') {
      return decrypt(result);
    }
    return result;
  }
}
