/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Destination } from '../type/Destination'
import { DestinationAudit } from '../type/DestinationAudit'
import { DestinationChangeRequest } from '../type/DestinationChangeRequest'
import { DestinationType } from '../type/DestinationType'

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
  UpdateCommand,
  UpdateCommandInput,
} from '@aws-sdk/lib-dynamodb'

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

function maskPassword(auditData: any) {
  if (auditData && auditData['password']) {
    auditData = { ...auditData }
    auditData['password'] = '.........'
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

const DEST_TYPES = [
  null,
  'PRODUCTION',
  'TEST',
  'ONBOARD',
  'STAGE',
  'DEV',
  'UNKNOWN',
]

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
  private jurisdictionsCache = new Map<string, any>()

  getTableName(): string {
    return TABLE_NAME
  }

  async getJurisdiction(jurisdictionId: string): Promise<any> {
    if (!this.jurisdictionsCache.has(jurisdictionId)) {
      const params: GetCommandInput = {
        TableName: TABLE_NAME,
        Key: {
          entityType: 'Jurisdiction',
          sortKey: `${jurisdictionId}`,
        },
      }
      try {
        const result = await dynamodDbDocClient.send(new GetCommand(params))
        this.jurisdictionsCache.set(jurisdictionId, result.Item || null)
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
    return this.jurisdictionsCache.get(jurisdictionId)
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
      jurisdiction: {
        jurisdictionId: item.jurisdictionId,
        name: jurisdiction?.name || '',
        description: jurisdiction?.description || '',
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
      type: DEST_TYPES[destTypeId] || 'UNKNOWN',
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
      return await this.convertResponseToDestinationChangeRequest(params.Item)
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
    const result = await dynamodDbDocClient.send(new DeleteCommand(params))
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
    const data = await dynamodDbDocClient.send(new UpdateCommand(params))
    return true
  }

  async fetchSenderData(): Promise<any> {
    const params: GetCommandInput = {
      TableName: TABLE_NAME,
      Key: {
        entityType: 'Sender', // update this table
      },
    }
    const result = await dynamodDbDocClient.send(new GetCommand(params))
    return result // May need to update this
  }

  async fetchAccessGroups(): Promise<any> {
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
      ...item,
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

  async fetchOrganizations(): Promise<any[]> {
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
  }): Promise<DenyListItem> {
    try {
      const timestamp = new Date().toISOString()
      const sortKey = `${denyListItem.environment}#${denyListItem.principal}`

      // Check if record already exists
      const recordExists = await this.checkDenyListRecordExists(sortKey)
      if (recordExists) {
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
        createdOn: timestamp,
        updatedOn: timestamp,
        createdBy: denyListItem.deniedBy || 'System',
        updatedBy: denyListItem.deniedBy || 'System',
      }

      const params: PutCommandInput = {
        TableName: TABLE_NAME,
        Item: itemToInsert,
      }

      await dynamodDbDocClient.send(new PutCommand(params))
      console.log(
        'Successfully added deny list record:',
        JSON.stringify(itemToInsert, null, 2)
      )
      const destinationType = await this.fetchDestinationType(
        denyListItem.environment.toString()
      )
      return {
        id: sortKey,
        name: await this.fetchOrganizationName(denyListItem.principal),
        reason: denyListItem.reason || 'Not specified',
        dateDenied: timestamp,
        deniedBy: 'System',
        certificationName: denyListItem.principal || 'N/A',
        environment: destinationType.type,
      }
    } catch (error) {
      console.error('Error adding deny list record:', error)
      throw error
    }
  }

  async deleteDenyListRecord(id: string): Promise<boolean> {
    try {
      const params: DeleteCommandInput = {
        TableName: TABLE_NAME,
        Key: {
          entityType: 'DenyListRecord',
          sortKey: id,
        },
        ConditionExpression: 'attribute_exists(entityType)',
      }

      await dynamodDbDocClient.send(new DeleteCommand(params))

      logger.info('Deny list record deleted successfully', {
        operation: 'deleteDenyListRecord',
        tableName: TABLE_NAME,
        entityType: 'DenyListRecord',
        sortKey: id,
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

    return (result.Items || []) as AdsFileTypeItem[]
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
        createdBy: fileTypeItem.createdBy || 'System',
        updatedBy: fileTypeItem.createdBy || 'System',
      }

      const params: PutCommandInput = {
        TableName: TABLE_NAME,
        Item: itemToInsert,
        ConditionExpression: 'attribute_not_exists(sortKey)',
      }

      await dynamodDbDocClient.send(new PutCommand(params))
      console.log(
        'Successfully added ads file type record:',
        JSON.stringify(itemToInsert, null, 2)
      )

      return true
    } catch (error) {
      console.error('Error adding a file type record:', error)
      throw error
    }
  }

  async deleteAdsFileTypeRecord(sortKey: string): Promise<boolean> {
    try {
      const params: DeleteCommandInput = {
        TableName: TABLE_NAME,
        Key: {
          entityType: 'FileType',
          sortKey: sortKey,
        },
        ConditionExpression: 'attribute_exists(entityType)',
      }

      await dynamodDbDocClient.send(new DeleteCommand(params))

      logger.info('ADS file type record deleted successfully', {
        operation: 'deleteAdsFileTypeRecord',
        tableName: TABLE_NAME,
        entityType: 'FileType',
        sortKey: sortKey,
      })

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
}

export default Dynamo
