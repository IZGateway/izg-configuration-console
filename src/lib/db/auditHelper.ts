import {
  PutCommand,
  PutCommandInput,
  PutCommandOutput,
  QueryCommand,
  QueryCommandInput,
  QueryCommandOutput,
  DynamoDBDocumentClient,
} from '@aws-sdk/lib-dynamodb'
import logger from '../../../logger'

/**
 * Configuration for creating an audit record
 */
export interface CreateAuditConfig<T> {
  entityType: string
  tableName: string
  sortKeyParts: (string | number)[]
  userName: string
  changeType: string
  oldValues: T | null
  newValues: T | null
  additionalData?: Record<string, unknown>
  serializeValues?: (value: T | null) => unknown
}

/**
 * Configuration for fetching audit history
 */
export interface FetchAuditConfig {
  entityType: string
  sortKeyPrefix: string
  identifyingFields: Record<string, unknown>
  transformResult?: (item: Record<string, unknown>) => unknown
}

/**
 * Generic function to create an audit record in DynamoDB
 *
 * @param dynamoClient - The DynamoDB document client
 * @param tableName - The DynamoDB table name
 * @param config - Configuration for the audit record
 * @returns Promise<boolean> - Returns true on success
 *
 * @example
 * ```typescript
 * await createAuditRecord(dynamodDbDocClient, TABLE_NAME, {
 *   entityType: 'AllowedUserAudit',
 *   tableName: 'allowed_users',
 *   sortKeyParts: [environment, destinationId, principal, timestamp],
 *   userName: 'user@example.com',
 *   changeType: 'Update',
 *   oldValues: existingUser,
 *   newValues: updatedUser,
 *   serializeValues: (user) => ({
 *     ...user,
 *     createdOn: user?.createdOn?.toISOString() || null
 *   })
 * })
 * ```
 */
export async function createAuditRecord<T>(
  dynamoClient: DynamoDBDocumentClient,
  tableName: string,
  config: CreateAuditConfig<T>
): Promise<boolean> {
  const {
    entityType,
    tableName: auditTableName,
    sortKeyParts,
    userName,
    changeType,
    oldValues,
    newValues,
    additionalData = {},
    serializeValues,
  } = config

  const timestamp = new Date().toISOString()
  const sortKey = [...sortKeyParts, timestamp].join('#')

  logger.info(`Creating ${entityType} audit record`, {
    entityType,
    changeType,
    sortKey,
    userName,
    hasOldValues: !!oldValues,
    hasNewValues: !!newValues,
  })

  // Serialize values if a serializer is provided
  const serializedOldValues = serializeValues
    ? serializeValues(oldValues)
    : oldValues
  const serializedNewValues = serializeValues
    ? serializeValues(newValues)
    : newValues

  const auditData = {
    tableName: auditTableName,
    userName,
    changeType,
    oldValues: JSON.stringify(serializedOldValues),
    newValues: JSON.stringify(serializedNewValues),
    createdAt: timestamp,
    ...additionalData,
  }

  const params: PutCommandInput = {
    TableName: tableName,
    Item: {
      ...auditData,
      entityType,
      sortKey,
    },
  }

  logger.info(`Prepared DynamoDB PutCommand for ${entityType}`, {
    tableName,
    entityType,
    sortKey,
    changeType,
  })

  try {
    const result: PutCommandOutput = await dynamoClient.send(
      new PutCommand(params)
    )
    logger.info(`Successfully created ${entityType} in DynamoDB`, {
      entityType,
      changeType,
      sortKey,
      tableName,
      httpStatusCode: result.$metadata.httpStatusCode,
      requestId: result.$metadata.requestId,
    })
    return true
  } catch (error) {
    logger.error(`Error creating ${entityType} in DynamoDB`, {
      entityType,
      tableName,
      sortKey,
      changeType,
      errorMessage: error.message,
      errorType: error.name,
      stack: error.stack,
      operation: `create${entityType}`,
    })
    throw error
  }
}

/**
 * Generic function to fetch audit history from DynamoDB
 *
 * @param dynamoClient - The DynamoDB document client
 * @param tableName - The DynamoDB table name
 * @param config - Configuration for fetching audit history
 * @returns Promise<T[]> - Array of audit records
 *
 * @example
 * ```typescript
 * const history = await fetchAuditHistory<AllowedUserAudit>(
 *   dynamodDbDocClient,
 *   TABLE_NAME,
 *   {
 *     entityType: 'AllowedUserAudit',
 *     sortKeyPrefix: `${environment}#${destinationId}#${principal}#`,
 *     identifyingFields: { principal, environment, destinationId },
 *   }
 * )
 * ```
 */
export async function fetchAuditHistory<T>(
  dynamoClient: DynamoDBDocumentClient,
  tableName: string,
  config: FetchAuditConfig
): Promise<T[]> {
  const { entityType, sortKeyPrefix, identifyingFields, transformResult } =
    config

  const params: QueryCommandInput = {
    TableName: tableName,
    KeyConditionExpression:
      'entityType = :entityType and begins_with(sortKey, :sortKey)',
    ExpressionAttributeValues: {
      ':entityType': entityType,
      ':sortKey': sortKeyPrefix,
    },
  }

  try {
    const result: QueryCommandOutput = await dynamoClient.send(
      new QueryCommand(params)
    )
    return (result.Items || []).map((item) => {
      const baseItem = {
        ...item,
        createdAt: new Date(item.createdAt as string | number | Date),
        id: item.sortKey,
      }
      return transformResult ? transformResult(baseItem) : baseItem
    }) as T[]
  } catch (error) {
    logger.error(`Error fetching ${entityType} from DynamoDB`, {
      ...identifyingFields,
      tableName,
      entityType,
      errorMessage: error.message,
      errorType: error.name,
      stack: error.stack,
      operation: `fetch${entityType}`,
    })
    throw error
  }
}

/**
 * Helper to serialize Date fields in an object to ISO strings
 *
 * @param obj - Object with potential Date fields
 * @param dateFields - Array of field names that contain Date objects
 * @returns Serialized object with Date fields as ISO strings
 *
 * @example
 * ```typescript
 * const serialized = serializeDateFields(user, ['createdOn', 'updatedOn', 'validatedOn'])
 * ```
 */
export function serializeDateFields<T extends Record<string, unknown>>(
  obj: T | null,
  dateFields: string[]
): Record<string, unknown> | null {
  if (!obj) return null

  const result: Record<string, unknown> = { ...obj }
  for (const field of dateFields) {
    if (result[field] instanceof Date) {
      result[field] = result[field].toISOString()
    } else if (result[field]) {
      // Already a string or other type, keep as-is
      result[field] = result[field]
    } else {
      result[field] = null
    }
  }
  return result
}
