import { Destination } from '../type/Destination'
import { DestinationAudit } from '../type/DestinationAudit'
import { DestinationChangeRequest } from '../type/DestinationChangeRequest'
import { DestinationType } from '../type/DestinationType'
import ConfigConsoleRepository from './ConfigConsoleFetchRepository'
import ConfigConsoleMutateRepository from './ConfigConsoleMutateRepository'
import AWS from 'aws-sdk'

const dynamoDb = new AWS.DynamoDB.DocumentClient()
class Dynamo implements ConfigConsoleRepository, ConfigConsoleMutateRepository {
  async fetchDestination(
    destId: string,
    destType: number
  ): Promise<Destination> {
    const params = {
      TableName: 'Destinations',
      Key: { destId, destType },
    }
    const result = await dynamoDb.get(params).promise()
    return result.Item as Destination
  }

  async fetchLoggedInUsersDestinations(
    isAdmin: boolean,
    jurisdictions: string[]
  ): Promise<Destination[]> {
    const params = {
      TableName: 'Destinations',
      FilterExpression:
        'isAdmin = :isAdmin AND jurisdiction IN (:jurisdictions)',
      ExpressionAttributeValues: {
        ':isAdmin': isAdmin,
        ':jurisdictions': jurisdictions,
      },
    }
    const result = await dynamoDb.scan(params).promise()
    return result.Items as Destination[]
  }

  async fetchDestinationAuditHistory(
    destId: string,
    destTypeId: number
  ): Promise<DestinationAudit[]> {
    const params = {
      TableName: 'DestinationAudit',
      KeyConditionExpression: 'destId = :destId AND destTypeId = :destTypeId',
      ExpressionAttributeValues: {
        ':destId': destId,
        ':destTypeId': destTypeId,
      },
    }
    const result = await dynamoDb.query(params).promise()
    return result.Items as DestinationAudit[]
  }

  async fetchDestinationChangeRequestById(
    id: number
  ): Promise<DestinationChangeRequest> {
    const params = {
      TableName: 'DestinationChangeRequests',
      Key: { id },
    }
    const result = await dynamoDb.get(params).promise()
    return result.Item as DestinationChangeRequest
  }

  async fetchDestinationChangeRequestByDestIdAndDestType(
    destId: string,
    destTypeId: number
  ): Promise<DestinationChangeRequest> {
    const params = {
      TableName: 'DestinationChangeRequests',
      KeyConditionExpression: 'destId = :destId AND destTypeId = :destTypeId',
      ExpressionAttributeValues: {
        ':destId': destId,
        ':destTypeId': destTypeId,
      },
    }
    const result = await dynamoDb.query(params).promise()
    return result.Items[0] as DestinationChangeRequest
  }

  async fetchDestinationType(destType: string): Promise<DestinationType> {
    const params = {
      TableName: 'DestinationTypes',
      Key: { destType },
    }
    const result = await dynamoDb.get(params).promise()
    return result.Item as DestinationType
  }

  async fetchChangeRequestPassword(id: number): Promise<string> {
    const params = {
      TableName: 'ChangeRequestPasswords',
      Key: { id },
    }
    const result = await dynamoDb.get(params).promise()
    return result.Item.password
  }

  async fetchDestinationPassword(
    destId: string,
    destType: number
  ): Promise<string> {
    const params = {
      TableName: 'DestinationPasswords',
      Key: { destId, destType },
    }
    const result = await dynamoDb.get(params).promise()
    return result.Item.password
  }

  async isPasswordChanged(destId: string, dest_type: number): Promise<boolean> {
    const params = {
      TableName: 'DestinationPasswords',
      Key: { destId, dest_type },
    }
    const result = await dynamoDb.get(params).promise()
    return result.Item.passwordChanged
  }

  async isDatabaseConnected(): Promise<boolean> {
    try {
      await dynamoDb.scan({ TableName: 'Destinations', Limit: 1 }).promise()
      return true
    } catch (error) {
      return false
    }
  }
}

export default Dynamo
