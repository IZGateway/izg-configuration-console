/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Destination } from '../type/Destination'
import { DestinationAudit } from '../type/DestinationAudit'
import { DestinationChangeRequest } from '../type/DestinationChangeRequest'
import { DestinationType } from '../type/DestinationType'
import { OrganizationRecord } from '../type/OrganizationRecord'
import { AccessGroupRecord } from '../type/AccessGroupRecord'
import { SenderRecord } from '../type/SenderRecord'
import { AllowedUser } from '../type/AllowedUser'
import { AllowedUserAudit } from '../type/AllowedUserAudit'
import type { ApiKeyCredential } from '../type/ApiKeyCredential'
import type { AllowedUseType } from '../type/AllowedUseType'
import type { Jurisdiction } from '../type/Jurisdiction'
import { isValidUseType } from '../type/AllowedUseType'
import { asyncRequestContext } from '../Context'
import os from 'os'
import {
  DeleteCommand,
  DeleteCommandInput,
  DynamoDBDocumentClient,
  GetCommand,
  GetCommandInput,
  QueryCommand,
  QueryCommandInput,
  PutCommand,
  PutCommandInput,
  ScanCommand,
  ScanCommandInput,
  UpdateCommand,
  UpdateCommandInput,
} from '@aws-sdk/lib-dynamodb'

import { getEnvironmentName } from '../desttypehelper'

import {
  DynamoDBClient,
  DynamoDBClientConfig,
  ListTablesCommand,
} from '@aws-sdk/client-dynamodb'
import logger from '../../../logger'
import DbClient from './DbClient'
import { setImmediate } from 'timers'
import { DenyListItem } from '../type/DenyList'
import { AdsFileTypeItem } from '../type/AdsFileType'
import {
  createAuditRecord,
  fetchAuditHistory,
  serializeDateFields,
} from './auditHelper'

global.setImmediate = global.setImmediate || setImmediate

// DynamoDB Configuration
const endpoint: string = process.env.DYNAMODB_ENDPOINT || ''

const clientConfig: DynamoDBClientConfig = endpoint
  ? { endpoint: endpoint, region: process.env.AWS_REGION || 'us-east-1' }
  : {}

if (process.env.AWS_ACCESS_KEY_ID) {
  clientConfig.credentials = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    sessionToken: process.env.AWS_SESSION_TOKEN,
  }
}

function getAuditUserString(): string {
  const context = asyncRequestContext.getStore()
  const user = context?.user || 'system'
  const ipAddress = context?.ipAddress || os.hostname()
  return `${user}@${ipAddress}`
}

function maskPassword(auditData: any) {
  if (auditData && auditData['password']) {
    auditData = { ...auditData }
    auditData['password'] = '.........'
  }
  if (auditData && auditData[':password']) {
    auditData = { ...auditData }
    auditData[':password'] = '.........'
  }
  return auditData
}

const translateConfig = {
  marshalOptions: {
    convertEmptyValues: false,
    removeUndefinedValues: true,
    convertClassInstanceToMap: false,
  },
  unmarshallOptions: {
    wrapNumbers: false,
    // Ensure sets are converted to arrays
    convertEmptyValues: false,
  },
}

const dynamodDbClient = new DynamoDBClient(clientConfig)
export const dynamodDbDocClient = DynamoDBDocumentClient.from(
  dynamodDbClient,
  translateConfig
)

const TABLE_NAME: string = process.env.DYNAMODB_TABLE || 'izgw-hub'

async function getConnectionInfo() {
  let connected = false
  const region = await dynamodDbClient.config.region()
  const endpoint = dynamodDbClient.config.endpoint
    ? await dynamodDbClient.config.endpoint()
    : `https://dynamodb.${region}.amazonaws.com`
  try {
    await dynamodDbClient.send(new ListTablesCommand({ Limit: 1 }))
    connected = true
  } catch (error) {
    logger.error('DynamoDB connection error', {
      errorMessage: error.message,
      errorType: error.name,
      stack: error.stack,
      service: 'DynamoDB',
    })
    connected = false
  }
  return { region: region, endpoint: endpoint, connected: connected }
}

class Dynamo implements DbClient {
  static loggedIt = false
  constructor() {
    if (!Dynamo.loggedIt) {
      Dynamo.loggedIt = true
      // Fire-and-forget async logging
      getConnectionInfo().then((info) => {
        logger.info(
          `DynamoDB ${info.connected ? 'connected' : 'not connected'} to ${
            info.endpoint
          }/${TABLE_NAME} in ${info.region}`
        )
      })
    }
  }

  getRepository(): DbClient {
    return this
  }

  async fetchAllDestinations(): Promise<Destination[]> {
    const params: QueryCommandInput = {
      TableName: TABLE_NAME,
      KeyConditionExpression: 'entityType = :entityType',
      ExpressionAttributeValues: {
        ':entityType': 'Destination',
      },
    }
    const result = await dynamodDbDocClient.send(new QueryCommand(params))
    return await this.convertResponseToDestinations(result.Items || [])
  }
  private jurisdictionsCache = new Map<string, Jurisdiction>()

  getTableName(): string {
    return TABLE_NAME
  }

  /**
   * Normalize a raw DynamoDB Jurisdiction item into a `Jurisdiction`. Shared by
   * `getJurisdiction` and `fetchJurisdictions` so both return the same shape —
   * previously only the latter normalized, so a caller reading `useTypes` off
   * `getJurisdiction`'s result got the raw attribute (a native `Set`, since these
   * are persisted as DynamoDB String Sets) rather than the `AllowedUseType[]` the
   * type promises, and missed the `name`/`description` fallbacks.
   */
  private mapJurisdictionItem(item: Record<string, any>): Jurisdiction {
    return {
      jurisdictionId: item.jurisdictionId,
      sortKey: item.sortKey,
      name: item.name || item.sortKey,
      description: item.description || item.name || item.sortKey,
      // Short code (e.g. "AINQ") — the identifier Okta group membership is
      // keyed on, so it's what jurisdiction-ownership checks compare against.
      // Distinct from `name`/`description`; projected deliberately, not for display.
      prefix: item.prefix,
      // Use-type policy fields (IGDD-3140). Read robustly whether stored as a
      // DynamoDB List or a String Set (both are iterable once unmarshalled),
      // filtered to the known enum. allowedUseTypes = jurisdiction/destination
      // policy; useTypes = sender/submitter capability. Absent → undefined.
      allowedUseTypes: item.allowedUseTypes
        ? Array.from(item.allowedUseTypes as Iterable<string>).filter(isValidUseType)
        : undefined,
      useTypes: item.useTypes
        ? Array.from(item.useTypes as Iterable<string>).filter(isValidUseType)
        : undefined,
      createdBy: item.createdBy,
      createdOn: item.createdOn,
    } as Jurisdiction
  }

  async getJurisdiction(jurisdictionId: string): Promise<Jurisdiction | null> {
    const cached = this.jurisdictionsCache.get(jurisdictionId)
    if (cached) {
      return cached
    }
    const params: GetCommandInput = {
      TableName: TABLE_NAME,
      Key: {
        entityType: 'Jurisdiction',
        sortKey: `${jurisdictionId}`,
      },
    }
    try {
      const result = await dynamodDbDocClient.send(new GetCommand(params))
      if (!result.Item) {
        // Deliberately NOT cached. This cache has no TTL and no invalidation, so
        // caching a miss would pin the "does not exist" answer for the lifetime of
        // the process — and a jurisdiction that is absent now may well exist a
        // moment later (the IGDD-3258 seeding/backfill adds sender rows and
        // populates `prefix` on existing ones). Since `prefix` drives the
        // ownership check in lib/security/apiKeyAuthz, a cached miss would lock an
        // organization out until the next redeploy, with no operator remedy. A
        // repeated read for a genuinely missing jurisdiction is the cheaper
        // trade-off.
        return null
      }
      const jurisdiction = this.mapJurisdictionItem(result.Item)
      this.jurisdictionsCache.set(jurisdictionId, jurisdiction)
      return jurisdiction
    } catch (error) {
      logger.error('Error fetching jurisdiction from DynamoDB', {
        jurisdictionId,
        tableName: TABLE_NAME,
        entityType: 'Jurisdiction',
        errorMessage: error.message,
        errorType: error.name,
        stack: error.stack,
        operation: 'getJurisdiction',
      })
      throw error
    }
  }

  async fetchJurisdictions(): Promise<any[]> {
    const params: QueryCommandInput = {
      TableName: TABLE_NAME,
      KeyConditionExpression: 'entityType = :entityType',
      ExpressionAttributeValues: {
        ':entityType': 'Jurisdiction',
      },
    }
    try {
      const result = await dynamodDbDocClient.send(new QueryCommand(params))
      return (result.Items || []).map((item) => this.mapJurisdictionItem(item))
    } catch (error) {
      logger.error('Error fetching jurisdictions', {
        errorMessage: error.message,
        errorType: error.name,
        stack: error.stack,
        operation: 'fetchJurisdictions',
      })
      throw error
    }
  }

  async getApiKeyDomain(sortKey: string): Promise<any | null> {
    try {
      const result = await dynamodDbDocClient.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: { entityType: 'ApiKeyDomain', sortKey },
        })
      )
      if (!result.Item) return null
      const item = result.Item
      return {
        sortKey: item.sortKey,
        domain: item.domain,
        // Number(item.env) tolerates any pre-existing row written back when
        // this attribute was a String.
        env: Number(item.env),
        jurisdictionId: item.jurisdictionId,
        status: item.status,
        challengeUuid: item.challengeUuid,
        challengeExpiresAt: item.challengeExpiresAt ? new Date(item.challengeExpiresAt) : null,
        requestedBy: item.requestedBy,
        validatedAt: item.validatedAt ? new Date(item.validatedAt) : null,
        authExpiresAt: item.authExpiresAt ? new Date(item.authExpiresAt) : null,
        createdBy: item.createdBy,
        createdOn: item.createdOn ? new Date(item.createdOn) : null,
      }
    } catch (error) {
      logger.error('Error fetching ApiKeyDomain', {
        sortKey,
        errorMessage: error.message,
        operation: 'getApiKeyDomain',
      })
      throw error
    }
  }

  async upsertApiKeyDomain(params: {
    sortKey: string
    domain: string
    env: number
    jurisdictionId: string
    status: 'pending_challenge' | 'authorized'
    challengeUuid?: string
    challengeExpiresAt?: string
    requestedBy?: string
    validatedAt?: string
    authExpiresAt?: string
  }): Promise<void> {
    const item: Record<string, unknown> = {
      entityType: 'ApiKeyDomain',
      sortKey: params.sortKey,
      domain: params.domain,
      env: params.env,
      jurisdictionId: params.jurisdictionId,
      status: params.status,
      ...(params.challengeUuid !== undefined ? { challengeUuid: params.challengeUuid } : {}),
      ...(params.challengeExpiresAt ? { challengeExpiresAt: params.challengeExpiresAt } : {}),
      ...(params.requestedBy ? { requestedBy: params.requestedBy } : {}),
      ...(params.validatedAt ? { validatedAt: params.validatedAt } : {}),
      ...(params.authExpiresAt !== undefined ? { authExpiresAt: params.authExpiresAt } : {}),
    }
    try {
      await dynamodDbDocClient.send(new PutCommand({ TableName: TABLE_NAME, Item: item }))
      logger.info('ApiKeyDomain upserted', {
        sortKey: params.sortKey,
        status: params.status,
        operation: 'upsertApiKeyDomain',
      })
    } catch (error) {
      logger.error('Error upserting ApiKeyDomain', {
        sortKey: params.sortKey,
        errorMessage: error.message,
        operation: 'upsertApiKeyDomain',
      })
      throw error
    }
  }

  /**
   * Enforces GLOBAL domain exclusivity: a domain belongs to exactly one
   * jurisdiction across every environment — unlike `ApiKeyDomain`, which is
   * keyed per (env, jurisdiction, domain) and so cannot express a
   * cross-jurisdiction constraint by itself. Uses a race-safe conditional
   * write on a separate lock item (`ApiKeyDomainOwner`, keyed by the
   * normalized domain alone) so the uniqueness check works regardless of how
   * many environments a credential spans. Domain names are matched
   * case-insensitively (DNS names are not case-sensitive).
   */
  async claimDomainOwnership(
    domain: string,
    jurisdictionId: string
  ): Promise<{ claimed: boolean; ownerJurisdictionId?: string }> {
    const sortKey = domain.toLowerCase()
    try {
      await dynamodDbDocClient.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: {
            entityType: 'ApiKeyDomainOwner',
            sortKey,
            jurisdictionId,
            claimedAt: new Date().toISOString(),
          },
          // Succeeds if unclaimed, or already claimed by this same
          // jurisdiction (idempotent re-verification/renewal) — fails only
          // when a DIFFERENT jurisdiction already owns this domain.
          ConditionExpression:
            'attribute_not_exists(sortKey) OR jurisdictionId = :jurisdictionId',
          ExpressionAttributeValues: { ':jurisdictionId': jurisdictionId },
        })
      )
      return { claimed: true }
    } catch (error) {
      if (error.name === 'ConditionalCheckFailedException') {
        const existing = await dynamodDbDocClient.send(
          new GetCommand({
            TableName: TABLE_NAME,
            Key: { entityType: 'ApiKeyDomainOwner', sortKey },
          })
        )
        return {
          claimed: false,
          ownerJurisdictionId: existing.Item?.jurisdictionId as string | undefined,
        }
      }
      logger.error('Error claiming ApiKeyDomainOwner', {
        domain,
        jurisdictionId,
        errorMessage: error.message,
        operation: 'claimDomainOwnership',
      })
      throw error
    }
  }

  /**
   * Read-only lookup of a domain's current owner, if any — does NOT claim it.
   * Used as an early, non-authoritative check at credential-creation time so a
   * caller isn't sent through the DNS challenge for a domain another
   * jurisdiction already owns. `claimDomainOwnership` (a conditional write)
   * remains the sole authoritative enforcement at verify time; this must never
   * write, since doing so would let a domain be "reserved" by merely starting
   * a create request, without ever proving DNS ownership.
   */
  async getDomainOwner(domain: string): Promise<string | undefined> {
    const result = await dynamodDbDocClient.send(
      new GetCommand({
        TableName: TABLE_NAME,
        Key: { entityType: 'ApiKeyDomainOwner', sortKey: domain.toLowerCase() },
      })
    )
    return result.Item?.jurisdictionId as string | undefined
  }

  async fetchAuthorizedApiKeyDomains(
    envId: number,
    jurisdictionId: string
  ): Promise<any[]> {
    const nowMs = Date.now()
    try {
      // Filtering by env/jurisdictionId/authExpiresAt is done in application
      // code (with Number()/String() coercion) rather than in a DynamoDB
      // FilterExpression, because DynamoDB comparisons are type-strict — if
      // those attributes were ever hand-entered as the wrong type, a
      // `env = :env` expression would silently (and confusingly) exclude an
      // otherwise-matching item instead of erroring.
      const result = await dynamodDbDocClient.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: 'entityType = :et',
          ExpressionAttributeValues: { ':et': 'ApiKeyDomain' },
        })
      )
      return (result.Items || [])
        .filter((item) => {
          const authExpiresAtMs = item.authExpiresAt
            ? new Date(item.authExpiresAt).getTime()
            : NaN
          return (
            String(item.status) === 'authorized' &&
            Number(item.env) === envId &&
            String(item.jurisdictionId) === String(jurisdictionId) &&
            !isNaN(authExpiresAtMs) &&
            authExpiresAtMs > nowMs
          )
        })
        .map((item) => ({
          sortKey: item.sortKey,
          domain: item.domain,
          env: Number(item.env),
          jurisdictionId: item.jurisdictionId,
          status: item.status,
          validatedAt: item.validatedAt ? new Date(item.validatedAt) : null,
          authExpiresAt: item.authExpiresAt ? new Date(item.authExpiresAt) : null,
        }))
    } catch (error) {
      logger.error('Error fetching authorized ApiKeyDomains', {
        envId,
        jurisdictionId,
        errorMessage: error.message,
        operation: 'fetchAuthorizedApiKeyDomains',
      })
      throw error
    }
  }

  async fetchDestination(
    destId: string,
    destTypeId: number
  ): Promise<Destination | null> {
    const params: GetCommandInput = {
      TableName: TABLE_NAME,
      Key: {
        entityType: 'Destination',
        sortKey: `${destTypeId}#${destId}`,
      },
    }
    try {
      const result = await dynamodDbDocClient.send(new GetCommand(params))
      if (!result.Item) {
        logger.info(
          `No destination found for destId: ${destId} and destTypeId: ${destTypeId}`
        )
        return null
      }
      return await this.convertResponseToDestination(result.Item)
    } catch (error) {
      logger.error('Error fetching destination from DynamoDB', {
        destId,
        destTypeId,
        tableName: TABLE_NAME,
        entityType: 'Destination',
        errorMessage: error.message,
        errorType: error.name,
        stack: error.stack,
        operation: 'fetchDestination',
      })
      throw error
    }
  }

  private async convertResponseToDestination(
    item: Record<string, any>
  ): Promise<Destination> {
    const jurisdiction = await this.getJurisdiction(item.jurisdictionId)
    const maintStart = item.maintStart ? new Date(item.maintStart) : null
    const maintEnd = item.maintEnd ? new Date(item.maintEnd) : null

    return {
      destId: item.destId,
      destUri: item.destUri,
      destVersion: item.destVersion ?? null,
      username: item.username,
      MSH3: item.msh3 ?? null,
      MSH4: item.msh4 ?? null,
      MSH5: item.msh5 ?? null,
      MSH6: item.msh6 ?? null,
      MSH11: item.msh11 ?? null,
      MSH22: item.msh22 ?? null,
      RXA11: item.rxa11 ?? null,
      facilityId: item.facilityId ?? null,
      passExpiry: item.passExpiry ? new Date(item.passExpiry) : null,
      maintReason: item.maintReason ?? null,
      maintStart,
      maintEnd,
      destinationType: await this.fetchDestinationType(item.destTypeId),
      createdBy: item?.createdBy,
      createdOn: item?.createdOn,
      updatedBy: item?.updatedBy,
      updatedOn: item?.updatedOn,
      jurisdiction: {
        jurisdictionId: item.jurisdictionId,
        name: jurisdiction?.name || '',
        description: jurisdiction?.description || '',
        createdBy: jurisdiction?.createdBy,
        createdOn: jurisdiction?.createdOn,
        updatedBy: jurisdiction?.updatedBy,
        updatedOn: jurisdiction?.updatedOn,
      },
    }
  }

  async convertResponseToDestinations(
    items: Record<string, any>[]
  ): Promise<Destination[]> {
    return Promise.all(
      items.map((item) => this.convertResponseToDestination(item))
    )
  }

  async fetchLoggedInUsersDestinations(
    isAdmin: boolean,
    destinations: Array<string>
  ): Promise<Destination[]> {
    // DONE
    const params: QueryCommandInput = {
      TableName: TABLE_NAME,
      KeyConditionExpression: 'entityType = :entityType',
      ExpressionAttributeValues: {
        ':entityType': 'Destination',
      },
    }
    if (!isAdmin) {
      let filter = '('
      for (let i = 0; i < destinations.length; i++) {
        filter += ':d' + i + ','
        params.ExpressionAttributeValues[':d' + i] = destinations[i]
      }
      filter = filter.slice(0, -1) + ')'
      params.FilterExpression = 'destId IN ' + filter
    }
    const result = await dynamodDbDocClient.send(new QueryCommand(params))
    return await this.convertResponseToDestinations(result.Items)
  }

  async fetchDestinationAuditHistory(
    destId: string,
    destTypeId: number
  ): Promise<DestinationAudit[]> {
    // DONE
    const params: QueryCommandInput = {
      TableName: TABLE_NAME,
      KeyConditionExpression:
        'entityType = :entityType and begins_with(sortKey, :sortKey)',
      ExpressionAttributeValues: {
        ':entityType': 'DestinationAudit',
        ':sortKey': `${destTypeId}#${destId}#`,
      },
    }
    try {
      const result = await dynamodDbDocClient.send(new QueryCommand(params))
      return result.Items.map((item) => ({
        ...item,
        isPasswordDifferent:
          item.isPasswordDifferent ||
          item.newValues?.password !== item.oldValues?.password,
        createdAt: new Date(item.createdAt),
        id: item.sortKey,
      })) as DestinationAudit[]
    } catch (error) {
      logger.error('Error fetching destination audit history from DynamoDB', {
        destId,
        destTypeId,
        tableName: TABLE_NAME,
        entityType: 'DestinationAudit',
        errorMessage: error.message,
        errorType: error.name,
        stack: error.stack,
        operation: 'fetchDestinationAuditHistory',
      })
      throw error
    }
  }

  async fetchDestinationChangeRequestById(
    id: number
  ): Promise<DestinationChangeRequest> {
    const params: GetCommandInput = {
      TableName: TABLE_NAME,
      Key: {
        entityType: 'DestinationChangeRequest',
        sortKey: `${id}`,
      },
    }
    const result = await dynamodDbDocClient.send(new GetCommand(params))
    if (!result.Item) {
      logger.debug(`Destination Change Request not found for id: ${id}`)
      return null
    }
    return this.convertResponseToDestinationChangeRequest(result.Item)
  }

  async fetchDestinationChangeRequestByDestIdAndDestType(
    destId: string,
    destTypeId: number
  ): Promise<DestinationChangeRequest> {
    return this.fetchDestinationChangeRequestById(
      this.getChangeRequestId(destId, destTypeId)
    )
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async convertResponseToDestinationChangeRequest(
    item: Record<string, any>
  ): Promise<DestinationChangeRequest> {
    const destination = await this.fetchDestination(item.destId, item.destType)
    const changeRequest = {
      id: Number.parseInt(item.sortKey),
      destId: item.destId,
      destType: await this.fetchDestinationType(item.destType),
      jiraId: item.jiraId,
      isDraft: item.jiraId === null ? true : false,
      requestedAt: item.requestedAt ? new Date(item.requestedAt) : null,
      requestedBy: item.requestedBy,
      scheduledAt: item.scheduledAt ? new Date(item.scheduledAt) : null,
      createdBy: item?.createdBy,
      createdOn: item?.createdOn,
      updatedBy: item?.updatedBy,
      updatedOn: item?.updatedOn,
      jurisdiction: destination.jurisdiction,
      requested: {
        destUri: item.destUri,
        username: item.username,
        MSH3: item.msh3 || '',
        MSH4: item.msh4 || '',
        MSH5: item.msh5 || '',
        MSH6: item.msh6 || '',
        MSH11: item.msh11 || '',
        MSH22: item.msh22 || '',
        RXA11: item.rxa11 || '',
        facilityId: item.facilityId || '',
      },
      current: {
        destUri: destination.destUri,
        username: destination.username,
        MSH3: destination.MSH3,
        MSH4: destination.MSH4,
        MSH5: destination.MSH5,
        MSH6: destination.MSH6,
        MSH11: destination.MSH11,
        MSH22: destination.MSH22,
        RXA11: destination.RXA11,
        facilityId: destination.facilityId,
      },
    } as DestinationChangeRequest
    if (item.hasOwnProperty('isAsap')) {
      changeRequest.isAsap = item.isAsap
    }
    if (item.hasOwnProperty('isPasswordDifferent')) {
      changeRequest.isPasswordDifferent = item.isPasswordDifferent
    }
    if (changeRequest.isPasswordDifferent) {
      changeRequest.requested.password = item.password
    }
    if (item.hasOwnProperty('msh11')) {
      changeRequest.requested.MSH11 = item.msh11
    }

    return changeRequest
  }

  async fetchDestinationType(destType: string): Promise<DestinationType> {
    const destTypeId = parseInt(destType, 10)
    return {
      type: getEnvironmentName(destTypeId),
      typeId: destTypeId,
    }
  }

  async fetchChangeRequestPassword(id: number): Promise<string> {
    // DONE
    const params: GetCommandInput = {
      TableName: TABLE_NAME,
      Key: {
        entityType: 'DestinationChangeRequest',
        sortKey: `${id}`,
      },
      ProjectionExpression: 'password',
    }
    const result = await dynamodDbDocClient.send(new GetCommand(params))
    return result.Item ? result.Item.password : null
  }

  async fetchDestinationPassword(
    destId: string,
    destType: number
  ): Promise<string> {
    // DONE
    const params: GetCommandInput = {
      TableName: TABLE_NAME,
      Key: {
        entityType: 'Destination',
        sortKey: `${destType}#${destId}`,
      },
      ProjectionExpression: 'password',
    }
    const result = await dynamodDbDocClient.send(new GetCommand(params))
    return result.Item ? result.Item.password : null
  }

  async isPasswordChanged(destId: string, destType: number): Promise<boolean> {
    const params: GetCommandInput = {
      TableName: TABLE_NAME,
      Key: {
        entityType: 'Destination',
        sortKey: `${destType}#${destId}`,
      },
      ProjectionExpression: 'passwordChanged',
    }
    const result = await dynamodDbDocClient.send(new GetCommand(params))
    return result.Item.passwordChanged
  }

  async isDatabaseConnected(): Promise<boolean> {
    try {
      const result = await dynamodDbDocClient.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: 'entityType = :entityType',
          ExpressionAttributeValues: {
            ':entityType': 'Destination',
          },
          Limit: 1,
        })
      )
      logger.debug('DynamoDB connection successful')
      return !!result
    } catch (error) {
      logger.error('Error with database connection check', {
        tableName: TABLE_NAME,
        entityType: 'Destination',
        errorMessage: error.message,
        errorType: error.name,
        stack: error.stack,
        operation: 'isDatabaseConnected',
      })
      return false
    }
  }

  getChangeRequestId(destId: string, destType: number) {
    // If there is no id, we must generate one. JDBC uses Autoincrementing ID, but DynamoDB does
    // not have that feature.  We can safely hash the destType and destId to generate a unique ID.
    // for all current values used for destinations known.  Since at most one change request can be
    // in progress for a destination, this should be unique.
    const idString = destType + destId
    let h = 0
    for (let i = 0; i < idString.length; i++) {
      h = 31 * h + (idString.charCodeAt(i) & 0xff) // Same as Java String.hashCode()
    }
    return h
  }

  async upsertDestinationChangeRequest(
    changeRequestData: DestinationChangeRequest
  ): Promise<DestinationChangeRequest> {
    const id =
      changeRequestData.id ||
      this.getChangeRequestId(
        changeRequestData.destId,
        changeRequestData.destType.typeId
      )

    // Determine if this is an update or insert
    const getParams: GetCommandInput = {
      TableName: TABLE_NAME,
      Key: {
        entityType: 'DestinationChangeRequest',
        sortKey: `${id}`,
      },
    }
    const existing = await dynamodDbDocClient.send(new GetCommand(getParams))
    const isUpdate = !!existing.Item
    const ts = new Date().toISOString()
    const params: PutCommandInput = {
      TableName: TABLE_NAME,
      Item: {
        entityType: 'DestinationChangeRequest',
        sortKey: `${id}`,
        jiraId: changeRequestData.jiraId,
        scheduledAt: new Date(changeRequestData.scheduledAt).toISOString(),
        requestedAt: new Date().toISOString(),
        requestedBy: changeRequestData.requestedBy,
        destType: changeRequestData.destType.typeId,
        destId: changeRequestData.destId,
        destUri: changeRequestData.requested.destUri,
        username: changeRequestData.requested.username,
        facilityId: changeRequestData.requested.facilityId || null,
        msh3: changeRequestData.requested.MSH3 || null,
        msh4: changeRequestData.requested.MSH4 || null,
        msh5: changeRequestData.requested.MSH5 || null,
        msh6: changeRequestData.requested.MSH6 || null,
        msh11: changeRequestData.requested.MSH11 || null,
        msh22: changeRequestData.requested.MSH22 || null,
        rxa11: changeRequestData.requested.RXA11 || null,
        createdBy: isUpdate ? existing.Item.createdBy : getAuditUserString(),
        createdOn: isUpdate ? existing.Item.createdOn : ts,
        updatedBy: getAuditUserString(),
        updatedOn: ts,
      },
    }
    if (changeRequestData.hasOwnProperty('isAsap')) {
      params.Item.isAsap = changeRequestData.isAsap
    }
    if (changeRequestData.hasOwnProperty('isPasswordDifferent')) {
      params.Item.isPasswordDifferent = changeRequestData.isPasswordDifferent
    }
    if (changeRequestData.isPasswordDifferent) {
      params.Item.password = changeRequestData.requested.password || ''
    }
    if (changeRequestData.requested.hasOwnProperty('MSH11')) {
      params.Item.msh11 = changeRequestData.requested.MSH11
    }

    const result = await dynamodDbDocClient.send(new PutCommand(params))
    if (result) {
      changeRequestData.id = id
      const dcr = await this.convertResponseToDestinationChangeRequest(
        params.Item
      )
      const maskedDcr = { ...dcr } as DestinationChangeRequest
      maskPassword(maskedDcr.requested)
      maskPassword(maskedDcr.current)
      logger.info('DestinationChangeRequest upserted', {
        changeRequest: maskedDcr,
      })
      return dcr
    }
    return null
  }

  async deleteDestinationChangeRequest(id: number): Promise<boolean> {
    const params: DeleteCommandInput = {
      TableName: TABLE_NAME,
      Key: {
        entityType: 'DestinationChangeRequest',
        sortKey: `${id}`,
      },
    }
    const dcr = await this.fetchDestinationChangeRequestById(id)
    const result = await dynamodDbDocClient.send(new DeleteCommand(params))
    if (!!result && dcr) {
      maskPassword(dcr.requested)
      maskPassword(dcr.current)
      logger.info('Deleted DestinationChangeRequest', { changeRequest: dcr })
    }
    return !!result
  }

  async createDestinationChangeRequestDeploymentAudit(
    changeRequest: DestinationChangeRequest,
    user: string
  ): Promise<boolean> {
    // DONE
    if (!changeRequest.current) {
      changeRequest.current = await this.fetchDestination(
        changeRequest.destId,
        changeRequest.destType.typeId
      )
    }
    const auditData = {
      tableName: 'destinations',
      destId: changeRequest.destId,
      destType: changeRequest.destType.typeId,
      userName: user,
      changeType: 'Update',
      isPasswordDifferent: changeRequest.isPasswordDifferent,
      oldValues: maskPassword(changeRequest.current),
      newValues: maskPassword(changeRequest.requested),
      createdAt: new Date().toISOString(),
    }
    const params: PutCommandInput = {
      TableName: TABLE_NAME,
      Item: {
        ...auditData,
        entityType: 'DestinationAudit',
        sortKey: `${changeRequest.destType.typeId}#${changeRequest.destId}#${auditData.createdAt}`,
      },
    }
    await dynamodDbDocClient.send(new PutCommand(params))
    logger.info('Created DestinationAudit', { deploymentAudit: auditData })
    return true
  }

  async updateDestination(destination: Destination): Promise<boolean> {
    const params: UpdateCommandInput = {
      TableName: TABLE_NAME,
      Key: {
        entityType: 'Destination',
        sortKey: `${destination.destinationType.typeId}#${destination.destId}`,
      },
      UpdateExpression: '',
      ExpressionAttributeValues: {},
      ReturnValues: 'ALL_NEW',
    }

    let separator = 'set'
    const stringKeys = [
      'facilityId',
      'username',
      'destUri',
      'password',
      'MSH3',
      'MSH4',
      'MSH5',
      'MSH6',
      'MSH11',
      'MSH22',
      'RXA11',
      'maintReason',
    ]
    const lowerKeys = [
      'MSH3',
      'MSH4',
      'MSH5',
      'MSH6',
      'MSH11',
      'MSH22',
      'RXA11',
    ]
    const dateKeys = ['passExpiry', 'maintStart', 'maintEnd']
    for (const key of stringKeys) {
      if (destination[key] !== undefined) {
        const key2 = lowerKeys.includes(key) ? key.toLowerCase() : key
        params.UpdateExpression += `${separator} ${key2} = :${key}`
        separator = ','
        params.ExpressionAttributeValues[`:${key}`] = destination[key] || ''
      }
    }
    for (const key of dateKeys) {
      if (destination[key] !== undefined) {
        params.UpdateExpression += `${separator} ${key} = :${key}`
        separator = ','
        const value =
          destination[key] instanceof Date
            ? destination[key].toISOString()
            : destination[key]
        params.ExpressionAttributeValues[`:${key}`] = value ? value : null
      }
    }
    destination.updatedBy = getAuditUserString()
    destination.updatedOn = new Date()
    params.UpdateExpression += `${separator} updatedBy = :updatedBy, updatedOn = :updatedOn`
    params.ExpressionAttributeValues[':updatedBy'] = destination.updatedBy
    params.ExpressionAttributeValues[':updatedOn'] =
      destination.updatedOn.toISOString()
    const data = await dynamodDbDocClient.send(new UpdateCommand(params))
    const maskedDest = maskPassword({ ...destination })
    const maskedAttributes = maskPassword(params.ExpressionAttributeValues)

    // Check if maintenance-related fields were updated
    const maintFields = [':maintReason', ':maintStart', ':maintEnd']
    const hasMaintChange = maintFields.some((field) =>
      Object.prototype.hasOwnProperty.call(maskedAttributes, field)
    )

    if (hasMaintChange) {
      const maintStart = maskedAttributes[':maintStart']
      const logMessage = maintStart
        ? 'Maintenance Scheduled'
        : 'Maintenance Cancelled'

      logger.info(logMessage, {
        destination: maskedDest,
        updatedAttributes: maskedAttributes,
      })
    } else {
      logger.info('Updated Destination', {
        destination: maskedDest,
        updatedAttributes: maskedAttributes,
      })
    }

    return true
  }

  async updateAccessGroup(sortKey: string, updateData: any): Promise<any> {
    logger.info('updateAccessGroup called', {
      sortKey,
      updateData: JSON.stringify(updateData),
    })

    const params: UpdateCommandInput = {
      TableName: TABLE_NAME,
      Key: {
        entityType: 'AccessGroup',
        sortKey: sortKey,
      },
      UpdateExpression: '',
      ExpressionAttributeNames: {},
      ExpressionAttributeValues: {},
      ConditionExpression:
        'attribute_exists(entityType) AND attribute_exists(sortKey)',
      ReturnValues: 'ALL_NEW',
    }

    const updates: string[] = []

    // Update description if provided
    if (updateData.description !== undefined) {
      updates.push('#description = :description')
      params.ExpressionAttributeNames['#description'] = 'description'
      params.ExpressionAttributeValues[':description'] = updateData.description
    }

    // Update roles (String Set)
    if (updateData.roles && Array.isArray(updateData.roles)) {
      if (updateData.roles.length > 0) {
        updates.push('#roles = :roles')
        params.ExpressionAttributeNames['#roles'] = 'roles'
        params.ExpressionAttributeValues[':roles'] = new Set(updateData.roles)
      } else {
        updates.push('REMOVE #roles')
        params.ExpressionAttributeNames['#roles'] = 'roles'
      }
    }

    // Update users (String Set)
    if (updateData.users && Array.isArray(updateData.users)) {
      if (updateData.users.length > 0) {
        updates.push('#users = :users')
        params.ExpressionAttributeNames['#users'] = 'users'
        params.ExpressionAttributeValues[':users'] = new Set(updateData.users)
      } else {
        updates.push('REMOVE #users')
        params.ExpressionAttributeNames['#users'] = 'users'
      }
    }

    // Update groups (String Set)
    if (updateData.groups && Array.isArray(updateData.groups)) {
      if (updateData.groups.length > 0) {
        updates.push('#groups = :groups')
        params.ExpressionAttributeNames['#groups'] = 'groups'
        params.ExpressionAttributeValues[':groups'] = new Set(updateData.groups)
      } else {
        updates.push('REMOVE #groups')
        params.ExpressionAttributeNames['#groups'] = 'groups'
      }
    }

    // Always update updatedBy and updatedOn
    updates.push('#updatedBy = :updatedBy')
    updates.push('#updatedOn = :updatedOn')
    params.ExpressionAttributeNames['#updatedBy'] = 'updatedBy'
    params.ExpressionAttributeNames['#updatedOn'] = 'updatedOn'
    // Set updatedBy to user@ipAddress from DbRequestContext

    params.ExpressionAttributeValues[':updatedBy'] = getAuditUserString()
    params.ExpressionAttributeValues[':updatedOn'] = new Date().toISOString()

    // Build the update expression
    const setExpressions = updates.filter((u) => !u.startsWith('REMOVE'))
    const removeExpressions = updates.filter((u) => u.startsWith('REMOVE'))

    if (setExpressions.length > 0) {
      params.UpdateExpression += 'SET ' + setExpressions.join(', ')
    }
    if (removeExpressions.length > 0) {
      if (params.UpdateExpression.length > 0) {
        params.UpdateExpression += ' '
      }
      params.UpdateExpression += removeExpressions.join(', ')
    }

    try {
      // Fetch the existing record to capture old values for audit logging
      const oldRecord = await dynamodDbDocClient.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: {
            entityType: 'AccessGroup',
            sortKey: sortKey,
          },
        })
      )
      const oldValues = oldRecord.Item
        ? {
            description: oldRecord.Item.description,
            roles: Array.isArray(oldRecord.Item.roles)
              ? oldRecord.Item.roles
              : oldRecord.Item.roles
              ? Array.from(oldRecord.Item.roles)
              : [],
            users: Array.isArray(oldRecord.Item.users)
              ? oldRecord.Item.users
              : oldRecord.Item.users
              ? Array.from(oldRecord.Item.users)
              : [],
            groups: Array.isArray(oldRecord.Item.groups)
              ? oldRecord.Item.groups
              : oldRecord.Item.groups
              ? Array.from(oldRecord.Item.groups)
              : [],
            updatedBy: oldRecord.Item.updatedBy,
            updatedOn: oldRecord.Item.updatedOn,
          }
        : null

      const result = await dynamodDbDocClient.send(new UpdateCommand(params))

      if (result.Attributes) {
        const agr = {
          ...result.Attributes,
          roles: Array.isArray(result.Attributes.roles)
            ? result.Attributes.roles
            : result.Attributes.roles
            ? Array.from(result.Attributes.roles)
            : [],
          users: Array.isArray(result.Attributes.users)
            ? result.Attributes.users
            : result.Attributes.users
            ? Array.from(result.Attributes.users)
            : [],
          groups: Array.isArray(result.Attributes.groups)
            ? result.Attributes.groups
            : result.Attributes.groups
            ? Array.from(result.Attributes.groups)
            : [],
        }
        logger.info('Updated AccessGroupRecord', {
          sortKey,
          accessGroup: {
            entityType: 'AccessGroup',
            groupName: result.Attributes.groupName,
            environment: getEnvironmentName(
              Number(result.Attributes.environment)
            ),
            oldValues,
            newValues: {
              description: result.Attributes.description,
              roles: agr.roles,
              users: agr.users,
              groups: agr.groups,
              updatedBy: result.Attributes.updatedBy,
              updatedOn: result.Attributes.updatedOn,
            },
          },
          operation: 'updateAccessGroup',
        })
        return agr
      }

      return result.Attributes
    } catch (error) {
      if (error.name === 'ConditionalCheckFailedException') {
        logger.error('Access group not found in DynamoDB', {
          sortKey: sortKey,
          entityType: 'AccessGroup',
          operation: 'updateAccessGroup',
          errorMessage: 'Item does not exist - cannot update',
        })
        throw new Error(`Access group with sortKey ${sortKey} not found`)
      }

      logger.error('Error updating access group in DynamoDB', {
        sortKey,
        updateData,
        tableName: TABLE_NAME,
        errorMessage: error.message,
        errorType: error.name,
        stack: error.stack,
        operation: 'updateAccessGroup',
      })
      throw error
    }
  }

  async addAccessGroup(accessGroup: {
    environment: string
    groupName: string
    description?: string
    roles?: string[]
    users?: string[]
    groups?: string[]
    createdBy: string
  }): Promise<AccessGroupRecord> {
    const sortKey = `${accessGroup.environment}#${accessGroup.groupName}`
    const now = new Date().toISOString()

    const item = {
      entityType: 'AccessGroup',
      sortKey: sortKey,
      environment: accessGroup.environment,
      groupName: accessGroup.groupName,
      description: accessGroup.description || '',
      roles:
        accessGroup.roles && accessGroup.roles.length > 0
          ? new Set(accessGroup.roles)
          : undefined,
      users:
        accessGroup.users && accessGroup.users.length > 0
          ? new Set(accessGroup.users)
          : undefined,
      groups:
        accessGroup.groups && accessGroup.groups.length > 0
          ? new Set(accessGroup.groups)
          : undefined,
      createdBy: getAuditUserString(),
      updatedBy: getAuditUserString(),
      createdOn: now,
      updatedOn: now,
    }

    // Remove undefined fields
    Object.keys(item).forEach(
      (key) => item[key] === undefined && delete item[key]
    )

    const params: PutCommandInput = {
      TableName: TABLE_NAME,
      Item: item,
      ConditionExpression: 'attribute_not_exists(sortKey)',
    }

    try {
      await dynamodDbDocClient.send(new PutCommand(params))

      logger.info('Added AccessGroupRecord', {
        sortKey: sortKey,
        accessGroup: {
          ...item,
          environment: getEnvironmentName(Number(item.environment)),
        },
        operation: 'addAccessGroup',
      })

      // Return the created item in the expected format
      return {
        environment: item.environment,
        groupName: item.groupName,
        sortKey: item.sortKey,
        entityType: item.entityType,
        description: item?.description,
        roles: item.roles ? Array.from(item.roles) : [],
        users: item.users ? Array.from(item.users) : [],
        groups: item.groups ? Array.from(item.groups) : [],
        createdBy: item?.createdBy,
        createdOn: item.createdOn ? new Date(item.createdOn) : null,
        updatedBy: item?.updatedBy,
        updatedOn: item.updatedOn ? new Date(item.updatedOn) : null,
      } as AccessGroupRecord
    } catch (error) {
      if (error.name === 'ConditionalCheckFailedException') {
        logger.error('Access group already exists', {
          sortKey,
          groupName: accessGroup.groupName,
          operation: 'addAccessGroup',
        })
        throw new Error(
          `Access group with name "${accessGroup.groupName}" already exists in environment ${accessGroup.environment}`
        )
      }

      logger.error('Error adding access group to DynamoDB', {
        sortKey,
        accessGroup,
        errorMessage: error.message,
        errorType: error.name,
        stack: error.stack,
      })
      throw error
    }
  }

  async deleteAccessGroup(sortKey: string): Promise<boolean> {
    const params: DeleteCommandInput = {
      TableName: TABLE_NAME,
      Key: {
        entityType: 'AccessGroup',
        sortKey: sortKey,
      },
      ConditionExpression:
        'attribute_exists(entityType) AND attribute_exists(sortKey)',
    }

    try {
      const agr = await this.fetchAccessGroups().then((groups) =>
        groups.find((g) => g.sortKey === sortKey)
      )

      await dynamodDbDocClient.send(new DeleteCommand(params))

      if (agr) {
        logger.info('Deleted AccessGroupRecord', {
          sortKey: sortKey,
          accessGroup: {
            ...agr,
            environment: getEnvironmentName(Number(agr.environment)),
          },
          operation: 'deleteAccessGroup',
        })
      }

      return true
    } catch (error) {
      if (error.name === 'ConditionalCheckFailedException') {
        logger.error('Access group not found for deletion', {
          sortKey,
          operation: 'deleteAccessGroup',
        })
        throw new Error(`Access group with sortKey ${sortKey} not found`)
      }

      logger.error('Error deleting access group from DynamoDB', {
        sortKey: sortKey,
        errorMessage: error.message,
        errorType: error.name,
        stack: error.stack,
      })
      throw error
    }
  }

  async fetchSenderData(): Promise<SenderRecord> {
    const params: GetCommandInput = {
      TableName: TABLE_NAME,
      Key: {
        entityType: 'Sender', // update this table
      },
    }
    const result = await dynamodDbDocClient.send(new GetCommand(params))
    return result.Item as SenderRecord
  }

  async fetchAccessGroups(): Promise<AccessGroupRecord[]> {
    const params: QueryCommandInput = {
      TableName: TABLE_NAME,
      KeyConditionExpression: 'entityType = :entityType',
      ExpressionAttributeValues: {
        ':entityType': 'AccessGroup',
      },
    }

    const result = await dynamodDbDocClient.send(new QueryCommand(params))

    if (!result.Items || result.Items.length === 0) {
      return []
    }

    return result.Items.map((item) => ({
      environment: item.environment as string,
      groupName: item.groupName as string,
      sortKey: item.sortKey as string,
      entityType: item.entityType as string,
      updatedOn: item.updatedOn ? new Date(item.updatedOn) : null,
      createdOn: item.createdOn ? new Date(item.createdOn) : null,
      updatedBy: item.updatedBy as string,
      createdBy: item.createdBy as string,
      description: item.description as string | undefined,
      roles: Array.isArray(item.roles)
        ? item.roles
        : item.roles
        ? Array.from(item.roles)
        : [],
      users: Array.isArray(item.users)
        ? item.users
        : item.users
        ? Array.from(item.users)
        : [],
      groups: Array.isArray(item.groups)
        ? item.groups
        : item.groups
        ? Array.from(item.groups)
        : [],
    }))
  }

  async fetchApiKeyCredentials(): Promise<ApiKeyCredential[]> {
    // Page through the full result set. A single Query returns at most 1MB of
    // items, so without following LastEvaluatedKey the credential list would
    // silently truncate as the table grows (terminal/cancelled rows are retained
    // for audit, so it only grows over time).
    const items: Record<string, any>[] = []
    let lastEvaluatedKey: Record<string, any> | undefined
    do {
      const result = await dynamodDbDocClient.send(
        new QueryCommand({
          TableName: TABLE_NAME,
          KeyConditionExpression: 'entityType = :entityType',
          ExpressionAttributeValues: { ':entityType': 'ApiKeyCredential' },
          ExclusiveStartKey: lastEvaluatedKey,
        })
      )
      if (result.Items) items.push(...result.Items)
      lastEvaluatedKey = result.LastEvaluatedKey
    } while (lastEvaluatedKey)

    if (items.length === 0) {
      return []
    }

    // Resolve each DISTINCT jurisdiction exactly once (one read per jurisdiction,
    // not per key — mapping over every credential concurrently would fire
    // duplicate reads before the memo is populated). Rows are then built from
    // these resolved values rather than by reaching back into
    // `jurisdictionsCache`, so this does not depend on what that cache chooses to
    // memoize — notably, `getJurisdiction` deliberately does not cache misses.
    const distinctJurisdictionIds = [
      ...new Set(items.map((item) => item.jurisdictionId as string)),
    ]
    const jurisdictionsById = new Map(
      await Promise.all(
        distinctJurisdictionIds.map(
          async (id) => [id, await this.getJurisdiction(id)] as const
        )
      )
    )

    return items.map((item) => {
      const jurisdiction = jurisdictionsById.get(item.jurisdictionId)
      return {
        jti: item.jti as string,
        sortKey: item.sortKey as string,
        jurisdictionId: item.jurisdictionId as string,
        jurisdictionDescription: jurisdiction?.description ?? item.jurisdictionId,
        status: item.status as ApiKeyCredential['status'],
        expiresAt: item.expiresAt ? new Date(item.expiresAt) : null,
        issuedAt: item.issuedAt ? new Date(item.issuedAt) : null,
        revokedAt: item.revokedAt ? new Date(item.revokedAt) : null,
        cancelledBy: item.cancelledBy as string | undefined,
        cancelledAt: item.cancelledAt ? new Date(item.cancelledAt) : null,
        // Falls back to the legacy singular `env` attribute for rows written
        // before the environments-list migration, so existing credentials
        // don't lose their environment on read. `environments` is a deduped
        // DynamoDB Number Set (see createApiKeyCredential); `Array.from` +
        // `Number` also tolerates any interim rows written as a List or with
        // string elements.
        environments: item.environments
          ? Array.from(item.environments as Iterable<string | number>, Number)
          : item.env
            ? [Number(item.env)]
            : [],
        description: item.description as string | undefined,
        domain: item.domain as string | undefined,
        viewedAt: item.viewedAt ? new Date(item.viewedAt) : null,
        graceExpiresAt: item.graceExpiresAt ? new Date(item.graceExpiresAt) : null,
        useTypes: item.useTypes
          ? Array.from(item.useTypes as Iterable<string>).filter(isValidUseType)
          : undefined,
        createdOn: item.createdOn ? new Date(item.createdOn) : null,
        createdBy: item.createdBy as string,
        updatedOn: item.updatedOn ? new Date(item.updatedOn) : null,
        updatedBy: item.updatedBy as string,
      }
    })
  }

  async getApiKeyCredential(sortKey: string): Promise<ApiKeyCredential | null> {
    try {
      const result = await dynamodDbDocClient.send(
        new GetCommand({
          TableName: TABLE_NAME,
          Key: { entityType: 'ApiKeyCredential', sortKey },
        })
      )
      if (!result.Item) return null
      const item = result.Item
      const jurisdiction = await this.getJurisdiction(item.jurisdictionId)
      return {
        jti: item.jti as string,
        sortKey: item.sortKey as string,
        jurisdictionId: item.jurisdictionId as string,
        jurisdictionDescription: jurisdiction?.description ?? item.jurisdictionId,
        status: item.status as ApiKeyCredential['status'],
        expiresAt: item.expiresAt ? new Date(item.expiresAt) : null,
        issuedAt: item.issuedAt ? new Date(item.issuedAt) : null,
        revokedAt: item.revokedAt ? new Date(item.revokedAt) : null,
        cancelledBy: item.cancelledBy as string | undefined,
        cancelledAt: item.cancelledAt ? new Date(item.cancelledAt) : null,
        // Falls back to the legacy singular `env` attribute for rows written
        // before the environments-list migration, so existing credentials
        // don't lose their environment on read. `environments` is a deduped
        // DynamoDB Number Set (see createApiKeyCredential); `Array.from` +
        // `Number` also tolerates any interim rows written as a List or with
        // string elements.
        environments: item.environments
          ? Array.from(item.environments as Iterable<string | number>, Number)
          : item.env
            ? [Number(item.env)]
            : [],
        description: item.description as string | undefined,
        domain: item.domain as string | undefined,
        viewedAt: item.viewedAt ? new Date(item.viewedAt) : null,
        graceExpiresAt: item.graceExpiresAt ? new Date(item.graceExpiresAt) : null,
        useTypes: item.useTypes
          ? Array.from(item.useTypes as Iterable<string>).filter(isValidUseType)
          : undefined,
        createdOn: item.createdOn ? new Date(item.createdOn) : null,
        createdBy: item.createdBy as string,
        updatedOn: item.updatedOn ? new Date(item.updatedOn) : null,
        updatedBy: item.updatedBy as string,
      }
    } catch (error) {
      logger.error('Error fetching ApiKeyCredential', {
        sortKey,
        errorMessage: error.message,
        operation: 'getApiKeyCredential',
      })
      throw error
    }
  }

  async revokeApiKeyCredential(
    sortKey: string,
    revokedBy: string,
    revokedAt: string,
    reason?: string,
    expectedStatuses?: string[]
  ): Promise<void> {
    const updateParts = [
      '#status = :status',
      '#revokedBy = :revokedBy',
      '#revokedAt = :revokedAt',
    ]
    const attrNames: Record<string, string> = {
      '#status': 'status',
      '#revokedBy': 'revokedBy',
      '#revokedAt': 'revokedAt',
    }
    const attrValues: Record<string, unknown> = {
      ':status': 'revoked',
      ':revokedBy': revokedBy,
      ':revokedAt': revokedAt,
    }
    if (reason) {
      updateParts.push('#reason = :reason')
      attrNames['#reason'] = 'reason'
      attrValues[':reason'] = reason
    }
    // Pinning the write to the CALLER's own revocable-status list (rather than
    // hardcoding one here) keeps a single source of truth while still making
    // the check atomic — the route's pre-check is a stale read, this is what
    // actually prevents a concurrent status change (e.g. a race with cancel or
    // renewal) from letting a revoke land on a credential that no longer
    // qualifies.
    let conditionExpression =
      'attribute_exists(entityType) AND attribute_exists(sortKey)'
    if (expectedStatuses && expectedStatuses.length > 0) {
      const statusPlaceholders = expectedStatuses.map((_, i) => `:expectedStatus${i}`)
      statusPlaceholders.forEach((placeholder, i) => {
        attrValues[placeholder] = expectedStatuses[i]
      })
      conditionExpression += ` AND #status IN (${statusPlaceholders.join(', ')})`
    }
    const params: UpdateCommandInput = {
      TableName: TABLE_NAME,
      Key: {
        entityType: 'ApiKeyCredential',
        sortKey,
      },
      UpdateExpression: `SET ${updateParts.join(', ')}`,
      ExpressionAttributeNames: attrNames,
      ExpressionAttributeValues: attrValues,
      ConditionExpression: conditionExpression,
    }
    try {
      await dynamodDbDocClient.send(new UpdateCommand(params))
      logger.info('Revoked ApiKeyCredential', {
        sortKey,
        revokedBy,
        revokedAt,
        operation: 'revokeApiKeyCredential',
      })
    } catch (error) {
      logger.error('Error revoking ApiKeyCredential', {
        sortKey,
        errorMessage: error.message,
        errorType: error.name,
        stack: error.stack,
        operation: 'revokeApiKeyCredential',
      })
      throw error
    }
  }

  async cancelApiKeyCredential(
    sortKey: string,
    cancelledBy: string,
    cancelledAt: string
  ): Promise<void> {
    // Soft-cancel: the record is RETAINED with status 'cancelled' (plus who/when)
    // for audit history rather than hard-deleted. Permitted only while the
    // credential is still in ready_for_validation; any other status must go
    // through revoke. The ConditionExpression makes this atomic against a
    // concurrent status change.
    const params: UpdateCommandInput = {
      TableName: TABLE_NAME,
      Key: {
        entityType: 'ApiKeyCredential',
        sortKey,
      },
      UpdateExpression:
        'SET #status = :cancelled, #cancelledBy = :cancelledBy, #cancelledAt = :cancelledAt',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#cancelledBy': 'cancelledBy',
        '#cancelledAt': 'cancelledAt',
      },
      ExpressionAttributeValues: {
        ':cancelled': 'cancelled',
        ':cancelledBy': cancelledBy,
        ':cancelledAt': cancelledAt,
        ':readyForValidation': 'ready_for_validation',
      },
      ConditionExpression:
        'attribute_exists(sortKey) AND #status = :readyForValidation',
    }
    try {
      await dynamodDbDocClient.send(new UpdateCommand(params))
      logger.info('Cancelled ApiKeyCredential (soft)', {
        sortKey,
        cancelledBy,
        cancelledAt,
        operation: 'cancelApiKeyCredential',
      })
    } catch (error) {
      logger.error('Error cancelling ApiKeyCredential', {
        sortKey,
        errorMessage: error.message,
        errorType: error.name,
        stack: error.stack,
        operation: 'cancelApiKeyCredential',
      })
      throw error
    }
  }

  async supersedeApiKeyCredential(params: {
    sortKey: string
    renewedBy: string
    renewedAt: string
    graceExpiresAt: string
    supersededBy: string
  }): Promise<void> {
    const command = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { entityType: 'ApiKeyCredential', sortKey: params.sortKey },
      UpdateExpression:
        'SET #status = :status, #renewedBy = :renewedBy, #renewedAt = :renewedAt, #graceExpiresAt = :graceExpiresAt, #supersededBy = :supersededBy, #updatedBy = :updatedBy, #updatedOn = :updatedOn',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#renewedBy': 'renewedBy',
        '#renewedAt': 'renewedAt',
        '#graceExpiresAt': 'graceExpiresAt',
        '#supersededBy': 'supersededBy',
        '#updatedBy': 'updatedBy',
        '#updatedOn': 'updatedOn',
      },
      ExpressionAttributeValues: {
        // The renewed credential enters its grace window. Status value and the
        // `supersededBy` (successor jti) attribute name MUST match the Hub's
        // contract (izgw-hub ApiKeyCredential model + GracePeriodRevocationScheduler,
        // IGDD-2711): status 'grace_period' is what the Hub treats as usable and
        // what its grace-revocation sweep looks for.
        ':status': 'grace_period',
        ':renewedBy': params.renewedBy,
        ':renewedAt': params.renewedAt,
        ':graceExpiresAt': params.graceExpiresAt,
        ':supersededBy': params.supersededBy,
        ':updatedBy': params.renewedBy,
        ':updatedOn': params.renewedAt,
        ':expectedStatus': 'active',
      },
      // Renewal is only ever valid from `active` (enforced by the caller
      // before this is invoked) — pinning it here too makes that atomic
      // against a concurrent status change, matching the guard pattern
      // already used by cancelApiKeyCredential/updateApiKeyCredentialStatus.
      ConditionExpression:
        'attribute_exists(entityType) AND attribute_exists(sortKey) AND #status = :expectedStatus',
    })
    try {
      await dynamodDbDocClient.send(command)
      logger.info('ApiKeyCredential superseded', {
        sortKey: params.sortKey,
        supersededBy: params.supersededBy,
        graceExpiresAt: params.graceExpiresAt,
        operation: 'supersedeApiKeyCredential',
      })
    } catch (error) {
      logger.error('Error superseding ApiKeyCredential', {
        sortKey: params.sortKey,
        errorMessage: error.message,
        errorType: error.name,
        stack: error.stack,
        operation: 'supersedeApiKeyCredential',
      })
      throw error
    }
  }

  async createApiKeyCredential(params: {
    jti: string
    sortKey: string
    jurisdictionId: string
    environments: number[]
    status: string
    createdOn: Date
    expiresAt?: Date | null
    createdBy: string
    description?: string
    domain?: string
    useTypes?: AllowedUseType[]
  }): Promise<void> {
    const item: Record<string, unknown> = {
      entityType: 'ApiKeyCredential',
      sortKey: params.sortKey,
      jti: params.jti,
      jurisdictionId: params.jurisdictionId,
      // Stored as a deduped DynamoDB Number Set (`NS`), same rationale as
      // useTypes below: a Set enforces uniqueness natively (a List would allow
      // duplicate environment ids). Matches the Hub's own model, which moves
      // `environments` from `List<Integer>` to `Set<Integer>` in lockstep with
      // this change (izgw-hub, IGDD-3257). Callers guarantee at least one
      // environment — an empty NS is not a legal DynamoDB value.
      environments: new Set(params.environments),
      status: params.status,
      createdOn: params.createdOn.toISOString(),
      // Expiry is only stored once the key is issued. A ready_for_validation
      // record has no expiry yet — it is stamped at activation.
      ...(params.expiresAt ? { expiresAt: params.expiresAt.toISOString() } : {}),
      createdBy: params.createdBy,
      ...(params.description ? { description: params.description } : {}),
      ...(params.domain ? { domain: params.domain } : {}),
      // Stored as a DynamoDB String Set (deduped). AllowedUseType[] is the app-side type;
      // the Hub reads this by jti at routing time (it is NOT a JWT claim).
      ...(params.useTypes && params.useTypes.length
        ? { useTypes: new Set(params.useTypes) }
        : {}),
    }
    const command = new PutCommand({
      TableName: TABLE_NAME,
      Item: item,
    })
    try {
      await dynamodDbDocClient.send(command)
      logger.info('ApiKeyCredential created', {
        jti: params.jti,
        sortKey: params.sortKey,
        operation: 'createApiKeyCredential',
      })
    } catch (error) {
      logger.error('Error creating ApiKeyCredential', {
        jti: params.jti,
        errorMessage: error.message,
        errorType: error.name,
        stack: error.stack,
        operation: 'createApiKeyCredential',
      })
      throw error
    }
  }

  async updateApiKeyCredentialStatus(params: {
    sortKey: string
    status: string
    expiresAt?: string
    issuedAt?: string
    expectedStatus?: string
  }): Promise<void> {
    const updateParts = ['#status = :status']
    const attrNames: Record<string, string> = { '#status': 'status' }
    const attrValues: Record<string, unknown> = { ':status': params.status }
    if (params.expiresAt) {
      updateParts.push('#expiresAt = :expiresAt')
      attrNames['#expiresAt'] = 'expiresAt'
      attrValues[':expiresAt'] = params.expiresAt
    }
    if (params.issuedAt) {
      updateParts.push('#issuedAt = :issuedAt')
      attrNames['#issuedAt'] = 'issuedAt'
      attrValues[':issuedAt'] = params.issuedAt
    }
    // Optional atomic precondition on the CURRENT status. Used by activation to
    // require the credential still be `ready_for_validation`, so the write can
    // never flip an unexpected state (e.g. resurrect a revoked/cancelled key)
    // even under a concurrent change.
    let conditionExpression =
      'attribute_exists(entityType) AND attribute_exists(sortKey)'
    if (params.expectedStatus) {
      conditionExpression += ' AND #status = :expectedStatus'
      attrValues[':expectedStatus'] = params.expectedStatus
    }
    const command = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { entityType: 'ApiKeyCredential', sortKey: params.sortKey },
      UpdateExpression: `SET ${updateParts.join(', ')}`,
      ExpressionAttributeNames: attrNames,
      ExpressionAttributeValues: attrValues,
      ConditionExpression: conditionExpression,
    })
    try {
      await dynamodDbDocClient.send(command)
      logger.info('ApiKeyCredential status updated', {
        sortKey: params.sortKey,
        status: params.status,
        operation: 'updateApiKeyCredentialStatus',
      })
    } catch (error) {
      logger.error('Error updating ApiKeyCredential status', {
        sortKey: params.sortKey,
        errorMessage: error.message,
        errorType: error.name,
        stack: error.stack,
        operation: 'updateApiKeyCredentialStatus',
      })
      throw error
    }
  }

  async markApiKeyCredentialViewed(sortKey: string, viewedAt: string): Promise<void> {
    const command = new UpdateCommand({
      TableName: TABLE_NAME,
      Key: { entityType: 'ApiKeyCredential', sortKey },
      UpdateExpression: 'SET #viewedAt = :viewedAt',
      ExpressionAttributeNames: { '#viewedAt': 'viewedAt' },
      ExpressionAttributeValues: { ':viewedAt': viewedAt },
      // attribute_not_exists(viewedAt) makes "viewed exactly once" atomic: the
      // caller's earlier `if (credential.viewedAt)` read-then-check is only a
      // fast-path optimization, not the enforcement — without this, two
      // concurrent token requests could both pass that stale-read check and
      // both succeed here.
      ConditionExpression:
        'attribute_exists(entityType) AND attribute_exists(sortKey) AND attribute_not_exists(#viewedAt)',
    })
    try {
      await dynamodDbDocClient.send(command)
      logger.info('ApiKeyCredential marked viewed', {
        sortKey,
        viewedAt,
        operation: 'markApiKeyCredentialViewed',
      })
    } catch (error) {
      logger.error('Error marking ApiKeyCredential viewed', {
        sortKey,
        errorMessage: error.message,
        errorType: error.name,
        stack: error.stack,
        operation: 'markApiKeyCredentialViewed',
      })
      throw error
    }
  }

  async fetchOrganizationName(principal: string): Promise<string> {
    try {
      const params: QueryCommandInput = {
        TableName: TABLE_NAME,
        KeyConditionExpression: 'entityType = :entityType',
        ExpressionAttributeValues: {
          ':entityType': 'OrganizationRecord',
        },
      }

      const result = await dynamodDbDocClient.send(new QueryCommand(params))
      if (!result.Items || result.Items.length === 0) {
        return 'Unknown Organization'
      }

      const matchingOrg = result.Items.find((org) => {
        if (org.principalNames) {
          return org.principalNames.has(principal)
        }
        return false
      })

      return matchingOrg?.organizationName || 'Unknown Organization'
    } catch (error) {
      console.error('Error fetching organization name:', error)
      return 'Unknown Organization'
    }
  }

  async fetchOrganizations(): Promise<OrganizationRecord[]> {
    try {
      const params: QueryCommandInput = {
        TableName: TABLE_NAME,
        KeyConditionExpression: 'entityType = :entityType',
        ExpressionAttributeValues: {
          ':entityType': 'OrganizationRecord',
        },
      }

      const result = await dynamodDbDocClient.send(new QueryCommand(params))

      if (!result.Items || result.Items.length === 0) {
        return []
      }

      return result.Items.map((item) => ({
        organizationName: item.organizationName,
        principalNames: Array.isArray(item.principalNames)
          ? item.principalNames
          : item.principalNames
          ? Array.from(item.principalNames)
          : [],
        updatedOn: item.updatedOn ? new Date(item.updatedOn) : null,
        createdOn: item.createdOn ? new Date(item.createdOn) : null,
        updatedBy: item.updatedBy as string,
        createdBy: item.createdBy as string,
      }))
    } catch (error) {
      console.error('Error querying organizations:', error)
      throw error
    }
  }

  async fetchDenyListData(): Promise<DenyListItem[]> {
    try {
      const params: QueryCommandInput = {
        TableName: TABLE_NAME,
        KeyConditionExpression: 'entityType = :entityType',
        ExpressionAttributeValues: {
          ':entityType': 'DenyListRecord',
        },
      }

      const result = await dynamodDbDocClient.send(new QueryCommand(params))

      if (!result.Items || result.Items.length === 0) {
        return []
      }

      return Promise.all(
        result.Items.map(async (item) => {
          const [destinationType, organizationName] = await Promise.all([
            this.fetchDestinationType(item.environment?.toString()),
            this.fetchOrganizationName(item.principal),
          ])

          return {
            id: item.sortKey,
            name: organizationName,
            reason: item.reason || 'Not specified',
            dateDenied: item.createdOn || 'Unknown',
            deniedBy: item.createdBy || 'System',
            certificationName: item.principal,
            environment: destinationType.type,
            createdBy: item.createdBy || 'System',
            createdOn: item.createdOn ? new Date(item.createdOn) : new Date(),
            updatedBy: item.updatedBy,
            updatedOn: item.updatedOn ? new Date(item.updatedOn) : undefined,
          }
        })
      )
    } catch (error) {
      console.error('Error querying DynamoDB:', error)
      throw error
    }
  }

  async checkDenyListRecordExists(sortKey: string): Promise<boolean> {
    try {
      const params: GetCommandInput = {
        TableName: TABLE_NAME,
        Key: {
          entityType: 'DenyListRecord',
          sortKey: sortKey,
        },
      }

      const result = await dynamodDbDocClient.send(new GetCommand(params))
      return !!result.Item
    } catch (error) {
      logger.error('Error checking deny list record existence', {
        operation: 'checkDenyListRecordExists',
        tableName: TABLE_NAME,
        sortKey: sortKey,
        errorMessage: error.message,
        errorType: error.name,
        stack: error.stack,
      })
      throw error
    }
  }

  async checkAdsFileTypeRecordExists(sortKey: string): Promise<boolean> {
    try {
      const params: GetCommandInput = {
        TableName: TABLE_NAME,
        Key: {
          entityType: 'FileType',
          sortKey: sortKey,
        },
      }

      const result = await dynamodDbDocClient.send(new GetCommand(params))
      return !!result.Item
    } catch (error) {
      logger.error('Error checking ads file type record existence', {
        operation: 'checkAdsFileTypeRecordExists',
        tableName: TABLE_NAME,
        sortKey: sortKey,
        errorMessage: error.message,
        errorType: error.name,
        stack: error.stack,
      })
      throw error
    }
  }

  async addDenyListRecord(denyListItem: {
    principal: string
    environment: number
    reason?: string
    deniedBy?: string
    createdBy: string
  }): Promise<DenyListItem> {
    try {
      const ts = new Date()
      const timestamp = ts.toISOString()
      const sortKey = `${denyListItem.environment}#${denyListItem.principal}`

      // Check if record already exists
      const recordExists = await this.checkDenyListRecordExists(sortKey)
      if (recordExists) {
        logger.warn('Deny list entry already exists', {
          operation: 'addDenyListRecord',
          principal: denyListItem.principal,
          environment: denyListItem.environment,
        })
        const error = new Error(
          `A deny list entry already exists for certificate ${denyListItem.principal} for this environment.`
        )
        error.name = 'ConditionalCheckFailedException'
        throw error
      }

      const itemToInsert = {
        entityType: 'DenyListRecord',
        principal: denyListItem.principal,
        environment: denyListItem.environment,
        sortKey: sortKey,
        reason: denyListItem.reason || '',
        dateDenied: timestamp,
        deniedBy: getAuditUserString(),
        createdOn: timestamp,
        updatedOn: timestamp,
        createdBy: getAuditUserString(),
        updatedBy: getAuditUserString(),
      }

      const params: PutCommandInput = {
        TableName: TABLE_NAME,
        Item: itemToInsert,
      }

      await dynamodDbDocClient.send(new PutCommand(params))

      const [organizationName, destinationType] = await Promise.all([
        this.fetchOrganizationName(denyListItem.principal),
        this.fetchDestinationType(denyListItem.environment.toString()),
      ])

      logger.info('Deny list record added successfully', {
        operation: 'addDenyListRecord',
        entityType: 'DenyListRecord',
        name: organizationName,
        certificateName: denyListItem.principal,
        environment: destinationType.type,
        sortKey: sortKey,
        reason: denyListItem.reason || '',
        dateDenied: timestamp,
        deniedBy: getAuditUserString(),
        createdOn: timestamp,
        updatedOn: timestamp,
        createdBy: getAuditUserString(),
        updatedBy: getAuditUserString(),
      })

      const dlr = {
        id: sortKey,
        name: organizationName,
        reason: itemToInsert.reason || 'Not specified',
        dateDenied: timestamp,
        deniedBy: itemToInsert.deniedBy,
        certificationName: denyListItem.principal || 'N/A',
        environment: destinationType.type,
        createdBy: itemToInsert.createdBy,
        createdOn: ts,
        updatedBy: itemToInsert.updatedBy,
        updatedOn: ts,
      }
      return dlr
    } catch (error) {
      console.error('Error adding deny list record:', error)
      throw error
    }
  }

  async deleteDenyListRecord(id: string): Promise<boolean> {
    try {
      const dlr = await this.fetchDenyListData().then((records) =>
        records.find((r) => r.id === id)
      )
      const params: DeleteCommandInput = {
        TableName: TABLE_NAME,
        Key: {
          entityType: 'DenyListRecord',
          sortKey: id,
        },
        ConditionExpression: 'attribute_exists(entityType)',
      }

      await dynamodDbDocClient.send(new DeleteCommand(params))

      logger.info('Deleted DenyListRecord', {
        sortKey: id,
        denyListRecord: dlr,
      })

      return true
    } catch (error) {
      if (error.name === 'ConditionalCheckFailedException') {
        logger.warn('Attempted to delete non-existent deny list record', {
          operation: 'deleteDenyListRecord',
          tableName: TABLE_NAME,
          entityType: 'DenyListRecord',
          sortKey: id,
          errorType: 'RecordNotFound',
        })
        return false
      }

      logger.error('Error deleting deny list record from DynamoDB', {
        operation: 'deleteDenyListRecord',
        tableName: TABLE_NAME,
        entityType: 'DenyListRecord',
        sortKey: id,
        errorMessage: error.message,
        errorType: error.name,
        stack: error.stack,
      })

      throw error
    }
  }

  async fetchFileTypeList(): Promise<AdsFileTypeItem[]> {
    const params: QueryCommandInput = {
      TableName: TABLE_NAME,
      KeyConditionExpression: 'entityType = :entityType',
      ExpressionAttributeValues: {
        ':entityType': 'FileType',
      },
    }

    const result = await dynamodDbDocClient.send(new QueryCommand(params))

    return (result.Items || []).map((item) => ({
      id: item.sortKey,
      sortKey: item.sortKey,
      name: item.fileTypeName,
      fileTypeName: item.fileTypeName,
      description: item.description,
      createdOn: item.createdOn ? new Date(item.createdOn) : undefined,
      updatedOn: item.updatedOn ? new Date(item.updatedOn) : undefined,
      createdBy: item.createdBy,
      updatedBy: item.updatedBy,
    })) as AdsFileTypeItem[]
  }

  async addAdsFileTypeRecord(fileTypeItem: {
    fileTypeName: string
    sortKey: string
    description: string
    createdBy: string
  }): Promise<boolean> {
    try {
      const timestamp = new Date().toISOString()

      // Check if record already exists
      const recordExists = await this.checkAdsFileTypeRecordExists(
        fileTypeItem.sortKey
      )
      if (recordExists) {
        const error = new Error(
          `A file type entry already exists with ID "${fileTypeItem.sortKey}". Please use a different ID.`
        )
        error.name = 'ConditionalCheckFailedException'
        throw error
      }

      const itemToInsert = {
        entityType: 'FileType',
        description: fileTypeItem.description,
        fileTypeName: fileTypeItem.fileTypeName,
        sortKey: fileTypeItem.sortKey,
        createdOn: timestamp,
        updatedOn: timestamp,
        createdBy: getAuditUserString(),
        updatedBy: getAuditUserString(),
      }

      const params: PutCommandInput = {
        TableName: TABLE_NAME,
        Item: itemToInsert,
        ConditionExpression: 'attribute_not_exists(sortKey)',
      }

      await dynamodDbDocClient.send(new PutCommand(params))
      logger.info('Created FileType', {
        fileTypeRecord: itemToInsert,
      })

      return true
    } catch (error) {
      console.error('Error adding a file type record:', error)
      throw error
    }
  }

  async deleteAdsFileTypeRecord(sortKey: string): Promise<boolean> {
    try {
      const ftr = await this.fetchFileTypeList().then((records) =>
        records.find((r) => r.sortKey === sortKey)
      )
      const params: DeleteCommandInput = {
        TableName: TABLE_NAME,
        Key: {
          entityType: 'FileType',
          sortKey: sortKey,
        },
        ConditionExpression: 'attribute_exists(entityType)',
      }

      await dynamodDbDocClient.send(new DeleteCommand(params))

      if (ftr) {
        logger.info('Deleted FileType', {
          fileType: ftr,
        })
      }

      return true
    } catch (error) {
      if (error.name === 'ConditionalCheckFailedException') {
        logger.warn('Attempted to delete non-existent ADS file type record', {
          operation: 'deleteAdsFileTypeRecord',
          tableName: TABLE_NAME,
          entityType: 'FileType',
          sortKey: sortKey,
          errorType: 'RecordNotFound',
        })
        return false
      }

      logger.error('Error deleting ADS file type record from DynamoDB', {
        operation: 'deleteAdsFileTypeRecord',
        tableName: TABLE_NAME,
        entityType: 'FileType',
        sortKey: sortKey,
        errorMessage: error.message,
        errorType: error.name,
        stack: error.stack,
      })

      throw error
    }
  }

  async fetchAllowedUser(
    environment: number,
    destinationId: string,
    principal: string
  ): Promise<AllowedUser | null> {
    logger.debug(
      `Fetching allowed user: environment=${environment}, destinationId=${destinationId}, principal=${principal}`
    )
    const params: GetCommandInput = {
      TableName: TABLE_NAME,
      Key: {
        entityType: 'AllowedUser',
        sortKey: `${environment}#${destinationId}#${principal}`,
      },
    }
    try {
      const result = await dynamodDbDocClient.send(new GetCommand(params))
      if (!result.Item) {
        logger.debug(
          `No allowed user found for environment=${environment}, destinationId=${destinationId}, principal=${principal}`
        )
        return null
      }
      logger.debug(
        `Successfully fetched allowed user: environment=${environment}, destinationId=${destinationId}, principal=${principal}`
      )
      return this.convertResponseToAllowedUser(result.Item)
    } catch (error) {
      logger.error('Error fetching allowed user from DynamoDB', {
        environment,
        destinationId,
        principal,
        tableName: TABLE_NAME,
        entityType: 'AllowedUser',
        errorMessage: error.message,
        errorType: error.name,
        stack: error.stack,
        operation: 'fetchAllowedUser',
      })
      throw error
    }
  }

  async fetchAllowedUsers(): Promise<AllowedUser[]> {
    logger.debug('Fetching all allowed users')
    const params: QueryCommandInput = {
      TableName: TABLE_NAME,
      KeyConditionExpression: 'entityType = :entityType',
      ExpressionAttributeValues: {
        ':entityType': 'AllowedUser',
      },
    }
    try {
      const result = await dynamodDbDocClient.send(new QueryCommand(params))
      logger.debug(`Fetched ${result.Items?.length || 0} allowed users`)
      return result.Items.map((item) => this.convertResponseToAllowedUser(item))
    } catch (error) {
      logger.error('Error fetching all allowed users from DynamoDB', {
        tableName: TABLE_NAME,
        entityType: 'AllowedUser',
        errorMessage: error.message,
        errorType: error.name,
        stack: error.stack,
        operation: 'fetchAllowedUsers',
      })
      throw error
    }
  }

  async fetchAllowedUsersByDestination(
    isAdmin: boolean,
    destinations: Array<string>
  ): Promise<AllowedUser[]> {
    // NOTE: Query cannot filter on sortKey fragments using FilterExpression referencing primary key.
    // For non-admin with destination restrictions we fall back to Scan + FilterExpression on destinationId attribute.
    // Optimization: add a GSI on destinationId to allow efficient queries later.
    if (isAdmin || destinations.length === 0) {
      const params: QueryCommandInput = {
        TableName: TABLE_NAME,
        KeyConditionExpression: 'entityType = :entityType',
        ExpressionAttributeValues: {
          ':entityType': 'AllowedUser',
        },
      }
      const result = await dynamodDbDocClient.send(new QueryCommand(params))
      return result.Items.map((item) => this.convertResponseToAllowedUser(item))
    } else {
      // Restricted destinations: perform Scan with FilterExpression destinationId IN (...)
      // DynamoDB does not support IN for attribute names in legacy doc client with Scan; emulate via OR chain.
      let filterExpr = ''
      const exprAttrValues: Record<string, any> = {
        ':entityType': 'AllowedUser',
      }
      for (let i = 0; i < destinations.length; i++) {
        const placeholder = `:d${i}`
        filterExpr +=
          (i === 0 ? '(' : ' OR ') + `destinationId = ${placeholder}`
        exprAttrValues[placeholder] = destinations[i]
      }
      filterExpr += ')'
      const scanParams: ScanCommandInput = {
        TableName: TABLE_NAME,
        FilterExpression: `entityType = :entityType AND ${filterExpr}`,
        ExpressionAttributeValues: exprAttrValues,
      }
      try {
        const result = (await dynamodDbDocClient.send(
          new ScanCommand(scanParams)
        )) as { Items?: Array<Record<string, any>> }
        logger.debug(
          `Scanned ${
            result.Items?.length || 0
          } allowed users (restricted) for destinations=${destinations.join(
            ', '
          )}`
        )
        return result.Items.map((item) =>
          this.convertResponseToAllowedUser(item)
        )
      } catch (error) {
        logger.error(
          'Error scanning allowed users by destination from DynamoDB',
          {
            isAdmin,
            destinations,
            tableName: TABLE_NAME,
            entityType: 'AllowedUser',
            errorMessage: error.message,
            errorType: error.name,
            stack: error.stack,
            operation: 'fetchAllowedUsersByDestination',
          }
        )
        throw error
      }
    }
  }

  async upsertAllowedUser(allowedUser: AllowedUser): Promise<AllowedUser> {
    logger.debug(
      `Upserting allowed user: environment=${allowedUser.environment}, destinationId=${allowedUser.destinationId}, principal=${allowedUser.principal}`
    )
    const getParams: GetCommandInput = {
      TableName: TABLE_NAME,
      Key: {
        entityType: 'AllowedUser',
        sortKey: `${allowedUser.environment}#${allowedUser.destinationId}#${allowedUser.principal}`,
      },
    }
    const existing = await dynamodDbDocClient.send(new GetCommand(getParams))
    const isUpdate = !!existing.Item // true if update, false if insert

    const now = new Date().toISOString()
    const params: PutCommandInput = {
      TableName: TABLE_NAME,
      Item: {
        entityType: 'AllowedUser',
        sortKey: `${allowedUser.environment}#${allowedUser.destinationId}#${allowedUser.principal}`,
        principal: allowedUser.principal,
        environment: allowedUser.environment,
        destinationId: allowedUser.destinationId,
        organization: allowedUser.organization,
        enabled: allowedUser.enabled ?? true,
        createdBy: isUpdate ? existing.Item.createdBy : getAuditUserString(),
        createdOn: isUpdate ? existing.Item.createdOn : now,
        updatedBy: getAuditUserString(),
        updatedOn: now,
        // Honor provided validatedOn (can be null) instead of always now
        validatedOn: allowedUser.validatedOn
          ? allowedUser.validatedOn.toISOString()
          : null,
      },
    }

    const changeType = isUpdate ? 'Update' : 'Create'
    try {
      await dynamodDbDocClient.send(new PutCommand(params))
      logger.info(
        `Successfully ${isUpdate ? 'updated' : 'created'} AllowedUser`,
        {
          changeType,
          allowedUser: params.Item,
        }
      )
      return {
        ...allowedUser,
        updatedOn: new Date(now),
        createdOn: allowedUser.createdOn || new Date(now),
      }
    } catch (error) {
      logger.error('Error upserting allowed user to DynamoDB', {
        environment: allowedUser.environment,
        destinationId: allowedUser.destinationId,
        principal: allowedUser.principal,
        tableName: TABLE_NAME,
        entityType: 'AllowedUser',
        errorMessage: error.message,
        errorType: error.name,
        stack: error.stack,
        operation: 'upsertAllowedUser',
      })
      throw error
    }
  }

  async deleteAllowedUser(
    principal: string,
    environment: number,
    destinationId: string
  ): Promise<boolean> {
    logger.debug(
      `Deleting allowed user: environment=${environment}, destinationId=${destinationId}, principal=${principal}`
    )

    const params: DeleteCommandInput = {
      TableName: TABLE_NAME,
      Key: {
        entityType: 'AllowedUser',
        sortKey: `${environment}#${destinationId}#${principal}`,
      },
    }

    try {
      // Fetch the AllowedUser before deletion
      const allowedUser = await this.fetchAllowedUser(
        environment,
        destinationId,
        principal
      )
      await dynamodDbDocClient.send(new DeleteCommand(params))
      logger.info('Successfully deleted AllowedUser', {
        allowedUser: allowedUser || { environment, destinationId, principal },
      })
      return true
    } catch (error) {
      logger.error('Error deleting allowed user from DynamoDB', {
        environment,
        destinationId,
        principal,
        tableName: TABLE_NAME,
        entityType: 'AllowedUser',
        errorMessage: error.message,
        errorType: error.name,
        stack: error.stack,
        operation: 'deleteAllowedUser',
      })
      throw error
    }
  }

  async createAllowedUserAudit(
    changeType: string,
    principal: string,
    environment: number,
    destinationId: string,
    userName: string,
    oldValues: AllowedUser | null,
    newValues: AllowedUser | null
  ): Promise<boolean> {
    return createAuditRecord<AllowedUser>(dynamodDbDocClient, TABLE_NAME, {
      entityType: 'AllowedUserAudit',
      tableName: 'allowed_users',
      sortKeyParts: [environment, destinationId, principal],
      userName,
      changeType,
      oldValues,
      newValues,
      additionalData: { principal, environment, destinationId },
      serializeValues: (user) =>
        serializeDateFields(user, ['createdOn', 'updatedOn', 'validatedOn']),
    })
  }

  async createAccessGroupAudit(
    changeType: string,
    sortKey: string,
    userName: string,
    oldValues: AccessGroupRecord | null,
    newValues: AccessGroupRecord | null
  ): Promise<boolean> {
    return createAuditRecord<AccessGroupRecord>(dynamodDbDocClient, TABLE_NAME, {
      entityType: 'AccessGroupAudit',
      tableName: 'access_groups',
      sortKeyParts: [sortKey],
      userName,
      changeType,
      oldValues,
      newValues,
      additionalData: { sortKey },
      serializeValues: (record) =>
        serializeDateFields(
          record as unknown as Record<string, unknown> | null,
          ['createdOn', 'updatedOn']
        ),
    })
  }

  async createDenyListAudit(
    changeType: string,
    id: string,
    userName: string,
    oldValues: DenyListItem | null,
    newValues: DenyListItem | null
  ): Promise<boolean> {
    return createAuditRecord<DenyListItem>(dynamodDbDocClient, TABLE_NAME, {
      entityType: 'DenyListAudit',
      tableName: 'deny_list',
      sortKeyParts: [id],
      userName,
      changeType,
      oldValues,
      newValues,
      additionalData: { id },
      serializeValues: (record) =>
        serializeDateFields(
          record as unknown as Record<string, unknown> | null,
          ['createdOn', 'updatedOn']
        ),
    })
  }

  async createAdsFileTypeAudit(
    changeType: string,
    sortKey: string,
    userName: string,
    oldValues: AdsFileTypeItem | null,
    newValues: AdsFileTypeItem | null
  ): Promise<boolean> {
    return createAuditRecord<AdsFileTypeItem>(dynamodDbDocClient, TABLE_NAME, {
      entityType: 'AdsFileTypeAudit',
      tableName: 'ads_file_types',
      sortKeyParts: [sortKey],
      userName,
      changeType,
      oldValues,
      newValues,
      additionalData: { sortKey },
      serializeValues: (record) =>
        serializeDateFields(
          record as unknown as Record<string, unknown> | null,
          ['createdOn', 'updatedOn']
        ),
    })
  }

  async fetchAllowedUserAuditHistory(
    principal: string,
    environment: number,
    destinationId: string
  ): Promise<AllowedUserAudit[]> {
    return fetchAuditHistory<AllowedUserAudit>(dynamodDbDocClient, TABLE_NAME, {
      entityType: 'AllowedUserAudit',
      sortKeyPrefix: `${environment}#${destinationId}#${principal}#`,
      identifyingFields: { principal, environment, destinationId },
    })
  }

  private convertResponseToAllowedUser(item: Record<string, any>): AllowedUser {
    return {
      principal: item.principal,
      environment: item.environment,
      destinationId: item.destinationId,
      organization: item.organization || '',
      enabled: item.enabled ?? true,
      createdBy: item.createdBy,
      createdOn: item.createdOn ? new Date(item.createdOn) : null,
      updatedBy: item.updatedBy,
      updatedOn: item.updatedOn ? new Date(item.updatedOn) : null,
      validatedOn: item.validatedOn ? new Date(item.validatedOn) : null,
    }
  }
}

export default Dynamo
