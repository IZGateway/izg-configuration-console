/* eslint-disable @typescript-eslint/no-unused-vars */
import { Destination } from '../type/Destination'
import { DestinationAudit } from '../type/DestinationAudit'
import { DestinationChangeRequest } from '../type/DestinationChangeRequest'
import { DestinationType } from '../type/DestinationType'
import ConfigConsoleRepository from './ConfigConsoleFetchRepository'
import ConfigConsoleMutateRepository from './ConfigConsoleMutateRepository'

import {
  DeleteCommand,
  DeleteCommandInput,
  DynamoDBDocumentClient,
  GetCommand,
  GetCommandInput,
  GetCommandOutput,
  QueryCommand,
  QueryCommandInput,
  PutCommand,
  PutCommandInput,
  PutCommandOutput,
  UpdateCommand,
  UpdateCommandInput,
  UpdateCommandOutput,
} from "@aws-sdk/lib-dynamodb"

import {
  DynamoDBClient,
  DynamoDBClientConfig,
  ListTablesCommand,
  ListTablesCommandOutput,
} from "@aws-sdk/client-dynamodb"
import { hasActiveMaintenance, hasFutureMaintenance } from '../utils/endpointmaintainance'
import { rest, result } from 'lodash'

// To connect to local endpoint, use DYNAMODB_ENDPOINT = http://localhost:8000/ in .env.local
const endpoint : string = process.env.DYNAMODB_ENDPOINT || 'http://localhost:8000/'
const awsAccessKeyId = process.env.AWS_ACCESS_KEY_ID || '1f00xm'
const awsSecretAccessKey = process.env.AWS_SECRET_ACCESS_KEY || 'xwweg'

const clientConfig : DynamoDBClientConfig = endpoint ? { endpoint: endpoint, region: 'us-east-1' } : {}
if (awsAccessKeyId && awsSecretAccessKey) {
  clientConfig.credentials = {
    accessKeyId: awsAccessKeyId,
    secretAccessKey: awsSecretAccessKey
  }
}  

const marshallOptions = {
  // Whether to automatically convert empty strings, blobs, and sets to `null`.
  convertEmptyValues: false, // false, by default.
  // Whether to remove undefined values while marshalling.
  removeUndefinedValues: true, // false, by default.
  // Whether to convert typeof object to map attribute.
  convertClassInstanceToMap: false // false, by default. <---- Set this flag
}

const unmarshallOptions = {
  // Whether to return numbers as a string instead of converting them to native JavaScript numbers.
  wrapNumbers: false, // false, by default.
}

const translateConfig = { marshallOptions, unmarshallOptions }

const dynamodDbClient = new DynamoDBClient(clientConfig)
export const dynamodDbDocClient = DynamoDBDocumentClient.from(dynamodDbClient, translateConfig)

// DynamoDbClient gets the credentials from ECS or AWS configuration or environment
// To run with your AWS credentials, set them in the environment before starting VSCode,
// or set them as default credentials with your profile, rather than stuffing them into
// your .env.local (in general, it's not a good idea to store credentials in a file)
const TABLE_NAME : string = process.env.DYNAMODB_TABLE || "izgw-hub"
const DEST_TYPES = [null, 'PRODUCTION', 'TEST', 'ONBOARD', 'STAGE', 'DEV', 'UNKNOWN']

class Dynamo implements ConfigConsoleRepository, ConfigConsoleMutateRepository {
getTableName() {
  return TABLE_NAME
}
jurisdictions = new Map<String, any>
async getJurisdiction(jurisdictionId: string) {
  if (this.jurisdictions.size == 0 || !this.jurisdictions.has(jurisdictionId)) {
    const params: GetCommandInput = {
      TableName: TABLE_NAME,
      Key: {
        entityType: 'Jurisdiction',
        sortKey: `${jurisdictionId}`
      }
    }
    const result = await dynamodDbDocClient.send(new GetCommand(params))
    this.jurisdictions.set(jurisdictionId, result.Item)
  }
  return this.jurisdictions.get(jurisdictionId)
}

async fetchDestination(destId: string, destType: number): Promise<Destination> { // DONE
  const params: GetCommandInput = {
    TableName: TABLE_NAME,
    Key: {
      entityType: 'Destination',
      sortKey: `${destType}#${destId}`
    }
  }
  const result = await dynamodDbDocClient.send(new GetCommand(params))
  return await this.convertResponseToDestination(result.Item)
}

async convertResponseToDestination(item: any) : Promise<Destination> {
  const j = await this.getJurisdiction(item.jurisdictionId)
  const maintStart : Date = item.maintStart ? new Date(item.maintStart) : null
  const maintEnd : Date = item.maintEnd ? new Date(item.maintEnd) : null

  const dest : Destination = {
    destId: item.destId,
    destUri: item.destUri,
    destVersion: item.destVersion ?? null,
    username: item.username,
    MSH3: item.msh3 ?? null,
    MSH4: item.msh4 ?? null,
    MSH5: item.msh5 ?? null,
    MSH6: item.msh6 ?? null,
    MSH22: item.msh22 ?? null,
    RXA11: item.rxa11 ?? null,
    facilityId: item.facilityId ?? null,
    passExpiry: item.passExpiry ? new Date(item.passExpiry) : null,
    maintReason: item.maintReason ?? null,
    maintStart: item.maintStart ? maintStart : null,
    maintEnd: item.maintEnd ? maintEnd : null,
    destinationType: await this.fetchDestinationType(item.destTypeId),
    jurisdiction: {
      jurisdictionId: item.jurisdictionId,
      name: j.name,
      description: j.description,
    }, 
  }
  if (item.hasOwnProperty('msh11')) {
    dest.MSH11 = item.msh11
  }
  return dest as Destination
}
async convertResponseToDestinations(items: Record<string, any>[]) : Promise<Destination[]> {
  const result = []
  for (const item of items) {
    result.push(await this.convertResponseToDestination(item))
  }
  return result
}
async fetchLoggedInUsersDestinations(isAdmin: boolean, destinations: Array<string>): Promise<Destination[]> { // DONE
  const params: QueryCommandInput = {
    TableName: TABLE_NAME,
    KeyConditionExpression: 'entityType = :entityType',
    ExpressionAttributeValues: {
      ':entityType': 'Destination',
    }
  }
  if (!isAdmin) {
    var filter : string  = '('
    for (var i = 0; i < destinations.length; i++) {
      filter += ':d' + i + ','
      params.ExpressionAttributeValues[':d' + i] = destinations[i]
    }
    filter = filter.slice(0, -1) + ')'
    params.FilterExpression = 'destId IN ' + filter 
  }
  const result = await dynamodDbDocClient.send(new QueryCommand(params))
  return await this.convertResponseToDestinations(result.Items)
}

async fetchDestinationAuditHistory(destId: string, destTypeId: number): Promise<DestinationAudit[]> {
  const params: QueryCommandInput = {
    TableName: TABLE_NAME,
    KeyConditionExpression: 'entityType = :entityType and begins_with(sortKey, :sortKey)',
    ExpressionAttributeValues: {
      ':entityType': 'DestinationAudit',
      ':sortKey': `${destTypeId}#${destId}`
    }
  }
  const result = await dynamodDbDocClient.send(new QueryCommand(params))
  return result.Items as DestinationAudit[]
}

async fetchDestinationChangeRequestById(id: number): Promise<DestinationChangeRequest> {  // DONE
  const params: GetCommandInput = {
    TableName: TABLE_NAME,
    Key: {
      entityType: 'DestinationChangeRequest',
      sortKey: `${id}`
    }
  }
  const result = await dynamodDbDocClient.send(new GetCommand(params))
  return this.convertResponseToDestinationChangeRequest(result.Item)
}

async fetchDestinationChangeRequestByDestIdAndDestType(destId: string, destTypeId: number): Promise<DestinationChangeRequest> { // DONE
  return this.fetchDestinationChangeRequestById(this.getChangeRequestId(destId, destTypeId))
}

async convertResponseToDestinationChangeRequest(item: Record<string, any>) : Promise<DestinationChangeRequest> {
  const changeRequest = {
    id: Number.parseInt(item.sortKey),
    destId: item.destId,
    destType: await this.fetchDestinationType(item.destType),
    jiraId: item.jiraId,
    isDraft: item.isDraft ? true : false,
    requestedAt: item.requestedAt ? new Date(item.requestedAt) : null,
    requestedBy: item.requestedBy,
    scheduledAt: item.scheduledAt ? new Date(item.scheduledAt) : null,
    requested: {
      destUri: item.destUri,
      username: item.username,
      MSH3: item.msh3 || "",
      MSH4: item.msh4 || "",
      MSH5: item.msh5 || "",
      MSH6: item.msh6 || "",
      MSH22: item.msh22 || "",
      RXA11: item.RXA11 || "",
      facilityId: item.facilityId || "",
    },
  } as DestinationChangeRequest
  if (item.hasOwnProperty('isAsap')) {
    changeRequest.isAsap = item.isAs
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

async fetchDestinationType(destType: string): Promise<DestinationType> { // DONE
  const t: number = parseInt(destType)
  return {
    type: DEST_TYPES[t],
    typeId: t,
  } as DestinationType
}

async fetchChangeRequestPassword(id: number): Promise<string> { // DONE
  const params: GetCommandInput = {
    TableName: TABLE_NAME,
    Key: {
      entityType: 'DestinationChangeRequest',
      sortKey: `${id}`
    },
    ProjectionExpression: 'password'
  }
  const result = await dynamodDbDocClient.send(new GetCommand(params))
  return result.Item.password
}

async fetchDestinationPassword(destId: string, destType: number): Promise<string> { // DONE
  const params: GetCommandInput = {
    TableName: TABLE_NAME,
    Key: {
      entityType: 'Destination',
      sortKey: `${destType}#${destId}`
    },
    ProjectionExpression: 'password'
  }
  const result = await dynamodDbDocClient.send(new GetCommand(params))
  return result.Item.password
}

async isPasswordChanged(destId: string, destType: number): Promise<boolean> {
  const params: GetCommandInput = {
    TableName: TABLE_NAME,
    Key: {
      entityType: 'Destination',
      sortKey: `${destType}#${destId}`
    },
    ProjectionExpression: 'passwordChanged'
  }
  const result = await dynamodDbDocClient.send(new GetCommand(params))
  return result.Item.passwordChanged
}

async isDatabaseConnected(): Promise<boolean> {
  try {
    await dynamodDbDocClient.send(new QueryCommand({ TableName: TABLE_NAME, Limit: 1 }))
    return true
  } catch (error) {
    return false
  }
}

getChangeRequestId(destId: string, destType: number) {
  // If there is no id, we must generate one. JDBC uses Autoincrementing ID, but DynamoDB does 
  // not have that feature.  We can safely hash the destType and destId to generate a unique ID.
  // for all current values used for destinations known.  Since at most one change request can be
  // in progress for a destination, this should be unique.
  const idString = destType + destId
  var h = 0;
  for (var i = 0; i < idString.length; i++) {
    h = 31 * h + (idString.charCodeAt(i) & 0xff)
  }
  return h
}

async upsertDestinationChangeRequest(changeRequestData: DestinationChangeRequest): Promise<DestinationChangeRequest> {  // DONE

  const id = changeRequestData.id || 
    this.getChangeRequestId(changeRequestData.destId, changeRequestData.destType.typeId)

  const params: PutCommandInput = {
    TableName: TABLE_NAME,
    Item: {
      entityType: 'DestinationChangeRequest',
      sortKey: `${id}`,
      jiraId: changeRequestData.jiraId,
      scheduledAt: changeRequestData.scheduledAt.toISOString(),
      requestedAt: (changeRequestData.requestedAt || new Date()).toISOString(),
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
      msh22: changeRequestData.requested.MSH22 || null,
      rxa11: changeRequestData.requested.RXA11 || null,
    }
  }
  if (changeRequestData.hasOwnProperty('isAsap')) {
    params.Item.isAsap = changeRequestData.isAsap
  }
  if (changeRequestData.hasOwnProperty('isPasswordDifferent')) {
    params.Item.isPasswordDifferent = changeRequestData.isPasswordDifferent
  }
  if (changeRequestData.isPasswordDifferent) {
    params.Item.password = changeRequestData.requested.password || ""
  } 
  if (changeRequestData.requested.hasOwnProperty('MSH11')) {
    params.Item.msh11 = changeRequestData.requested.MSH11
  } 

  const result = await dynamodDbDocClient.send(new PutCommand(params))
  changeRequestData.id = id
  return await this.convertResponseToDestinationChangeRequest(params.Item)
}

async deleteDestinationChangeRequest(id: number): Promise<boolean> {
  const params: DeleteCommandInput = {
    TableName: TABLE_NAME,
    Key: {
      entityType: 'DestinationChangeRequest',
      sortKey: `${id}`
    }
  }
  await dynamodDbDocClient.send(new DeleteCommand(params))
  return true
}

async createDestinationChangeRequestDeploymentAudit(
  changeRequest: DestinationChangeRequest,
  user: string): Promise<boolean> {
  const auditData: DestinationAudit = {
    id: changeRequest.id,
    userName: user,
    createdAt: new Date(),
    changeType: 'DEPLOYMENT',
    destId: changeRequest.destId,
    destType: changeRequest.destType.typeId,
    tableName: 'DestinationAuditHistory',
    oldValues: null,
    newValues: null
  }
  const params: PutCommandInput = {
    TableName: TABLE_NAME,
    Item: {
      ...auditData,
      entityType: 'DestinationAudit',
      sortKey: `${changeRequest.destType.typeId}#${changeRequest.destId}#${auditData.createdAt.toISOString()}`
    }
  }
  await dynamodDbDocClient.send(new PutCommand(params))
  return true
}

async updateDestination(destination: Destination): Promise<boolean> {
  const params: UpdateCommandInput = {
    TableName: TABLE_NAME,
    Key: {
      entityType: 'Destination',
      sortKey: `${destination.destinationType}#${destination.destId}`
    },
    UpdateExpression: 'set #name = :name, #url = :url',
    ExpressionAttributeNames: {
      '#name': 'name',
      '#url': 'url'
    },
    ExpressionAttributeValues: {
      ':name': destination.destId,
      ':url': destination.destUri
    }
  }
  await dynamodDbDocClient.send(new UpdateCommand(params))
  return true
}

  // Other methods remain unchanged
}

export default Dynamo
