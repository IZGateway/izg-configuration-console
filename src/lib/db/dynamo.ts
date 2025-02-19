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

const dynamodDbClient = new DynamoDBClient(clientConfig)
export const dynamodDbDocClient = DynamoDBDocumentClient.from(dynamodDbClient)

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
  if (item.msh11) {
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

async fetchDestinationChangeRequestById(id: number): Promise<DestinationChangeRequest> {
  const params: GetCommandInput = {
    TableName: TABLE_NAME,
    Key: {
      typeName: 'DestinationChangeRequest',
      sortKey: `ID#${id}`
    }
  }
  const result = await dynamodDbDocClient.send(new GetCommand(params))
  return result.Item as DestinationChangeRequest
}

async fetchDestinationChangeRequestByDestIdAndDestType(destId: string, destTypeId: number): Promise<DestinationChangeRequest> {
  const params: QueryCommandInput = {
    TableName: TABLE_NAME,
    KeyConditionExpression: 'typeName = :typeName and begins_with(sortKey, :sortKeyPrefix)',
    ExpressionAttributeValues: {
      ':typeName': 'DestinationChangeRequest',
      ':sortKeyPrefix': `${destTypeId}#${destId}`
    }
  }
  const result = await dynamodDbDocClient.send(new QueryCommand(params))
  return result.Items[0] as DestinationChangeRequest
}

async fetchDestinationType(destType: string): Promise<DestinationType> { // DONE
  const t: number = parseInt(destType)
  const destinationType: DestinationType = {
    type: DEST_TYPES[t],
    typeId: t,
  }
  return destinationType
}

async fetchChangeRequestPassword(id: number): Promise<string> {
  const params: GetCommandInput = {
    TableName: TABLE_NAME,
    Key: {
      typeName: 'DestinationChangeRequest',
      sortKey: `ID#${id}`
    },
    ProjectionExpression: 'password'
  }
  const result = await dynamodDbDocClient.send(new GetCommand(params))
  return result.Item.password
}

async fetchDestinationPassword(destId: string, destType: number): Promise<string> {
  const params: GetCommandInput = {
    TableName: TABLE_NAME,
    Key: {
      typeName: 'Destination',
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
      typeName: 'Destination',
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

async upsertDestinationChangeRequest(changeRequestData: DestinationChangeRequest): Promise<DestinationChangeRequest> {
  const params: PutCommandInput = {
    TableName: TABLE_NAME,
    Item: {
      ...changeRequestData,
      typeName: 'DestinationChangeRequest',
      sortKey: `ID#${changeRequestData.id}`
    }
  }
  await dynamodDbDocClient.send(new PutCommand(params))
  return changeRequestData
}

async deleteDestinationChangeRequest(id: number): Promise<boolean> {
  const params: DeleteCommandInput = {
    TableName: TABLE_NAME,
    Key: {
      typeName: 'DestinationChangeRequest',
      sortKey: `ID#${id}`
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
      typeName: 'DestinationAudit',
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
      typeName: 'Destination',
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
