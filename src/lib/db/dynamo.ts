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

import { DynamoDBClient, DynamoDBClientConfig, ListTablesCommand } from '@aws-sdk/client-dynamodb'
import logger from '../../../logger'
import DbClient from './DbClient'
import {setImmediate} from 'timers' 
import { DestinationConnectionSettings } from '../type/DestinationConnectionSettings'
global.setImmediate = global.setImmediate || setImmediate

// DynamoDB Configuration
const endpoint: string = process.env.DYNAMODB_ENDPOINT || ''

const clientConfig: DynamoDBClientConfig = endpoint
  ? { endpoint: endpoint,
      region: process.env.AWS_REGION || 'us-east-1' 
  } : {}

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
  const endpoint = dynamodDbClient.config.endpoint ? await dynamodDbClient.config.endpoint() : `https://dynamodb.${region}.amazonaws.com`
  try {
    await dynamodDbClient.send(new ListTablesCommand({ Limit: 1 }));
    connected = true
  } catch (err) {
    logger.error(`DynamoDB connection error: ${err.message}`)
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
      getConnectionInfo().then(
        (info) => {
          logger.info(`DynamoDB ${info.connected ? 'connected' : 'not connected'} to ${info.endpoint}/${TABLE_NAME} in ${info.region}`)
        }
      )
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
    };
    const result = await dynamodDbDocClient.send(new QueryCommand(params));
    return await this.convertResponseToDestinations(result.Items || []);
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
        logger.error(`Error fetching jurisdiction: ${error.message}`)
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
      logger.error(`Error fetching destination: ${error.message}`)
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
        isPasswordDifferent: item.isPasswordDifferent || (item.newValues?.password !== item.oldValues?.password),
        createdAt: new Date(item.createdAt),
        id: item.sortKey,
      })) as DestinationAudit[]
    } catch (error) {
      logger.error(`Error fetching destination audit history: ${error.message}`)
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
      logger.error('Error with database connection check:', error)
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
        const value = destination[key] instanceof Date
            ? destination[key].toISOString()
            : destination[key]
        params.ExpressionAttributeValues[`:${key}`] = value ? value : null
      }
    }
    const data = await dynamodDbDocClient.send(new UpdateCommand(params))
    return true
  }
}

export default Dynamo
