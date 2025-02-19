import {
  DynamoDBClient,
  DynamoDBClientConfig,
  ListTablesCommand,
  ListTablesCommandOutput,
} from "@aws-sdk/client-dynamodb"
  
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

// To connect to local endpoint, use DYNAMODB_ENDPOINT = https://localhost:8000/ in .env.local
const endpoint : string = process.env.DYNAMODB_ENDPOINT || null
const clientConfig : DynamoDBClientConfig = endpoint ? { endpoint: endpoint } : {}

// DynamoDbClient gets the credentials from ECS or AWS configuration or environment
// To run with your AWS credentials, set them in the environment before starting VSCode,
// or set them as default credentials with your profile, rather than stuffing them into
// your .env.local (in general, it's not a good idea to store credentials in a file)

const tableName : string = process.env.DYNAMODB_ENDPOINT || "izgw-hub"

var dynamodDbClient : DynamoDBClient = null
export var dynamodDbDocClient : DynamoDBDocumentClient =  null

function connect() {
  try {
    if (dynamodDbClient == null) {
      dynamodDbClient = new DynamoDBClient(clientConfig)
    }
    if (dynamodDbDocClient == null) {
      dynamodDbDocClient = DynamoDBDocumentClient.from(dynamodDbClient)
    }
  } catch (err) {
    console.error(`Cannot create DynamoDbClient: ${err.message}}`, err)
    throw err
  }
}
/**
 * Ensures the database exists
 * 
 * @returns true if the database can be connected to and the default table exists
 */
export const doesDbExist = async function() {
  connect()

  const command = new ListTablesCommand({
    ExclusiveStartTableName: tableName.substring(0, tableName.length - 1),
  })
  var result : boolean = false
  var response: ListTablesCommandOutput = await dynamodDbClient.send(command)

  try {
    if (!response.TableNames || response.TableNames[0] != tableName ) {
      var message: string = `Table ${tableName} does not exist`
      console.error(message)
      result = false
    } else {
      console.info(`Connected to ${tableName} at: ${dynamodDbClient.config.endpoint}`)
      result = true
    }
  } catch(err) {
    console.error(`Unexpected error connecting to ${tableName} : ${err.message}`, err)
    throw err
  }

  if (result == true) {
    // TODO: Replace maint with dev when done testing
    var item = await findDestinationByIdAndType("maint", 5)
    if (item == null) {
      var message = "Missing dev destination, verify database migration"
      console.error(message)
      throw new Error(message)
    }
  }
  return result
}

/**
 * Rename properties in an object to support a different interface
 * @param obj The object to adjust
 * @param newKeys  A map of old to new key names
 * @returns The adjusted object
 */
function renameProperties(obj : any, newKeys: Record<string, string>) {
  const keyValues = Object.keys(obj).map(key => {
    const newKey = newKeys[key] || key;
    return { [newKey]: obj[key] };
  });
  return Object.assign({}, ...keyValues);
}

// DynamoDb Keys to remove (applies to any entry returned)
const keysToRemove = ["entityType", "sortKey"]

// New Names to map to for old DB Interface for destinations
const destinationFieldMap = {
  id: "sortKey",  // Rename sortKey to id for compatibility with prisma model
  destId: "dest_id",
  destTypeId: "dest_type",
  destUri: "dest_uri",
  destVersion: "dest_version",
  facilityId: "facility_id",
  jurisdictionId: "jurisdiction_id",
  maintReason: "maint_reason",
  maintStart: "maint_start",
  maintEnd: "maint_end",
  msh3: "msh3",
  msh4: "msh4",
  msh5: "msh5",
  msh6: "msh6",
  msh11: "msh11",
  msh22: "msh22",
  password: "password",
  rxa11: "rxa11",
  username: "username",
}

function reverseRecord<
  T extends PropertyKey,
  U extends PropertyKey,
>(input: Record<T, U>) {
  return Object.fromEntries(
    Object.entries(input).map(([key, value]) => [value, key])
  ) as Record<U, T>
}
// Create a reverse map for mapping in the other direction
const destinationReverseFieldMap =  reverseRecord(destinationFieldMap)

function adjustResult(obj: any, newKeys : Record<string, string>) {
  keysToRemove.map(r => delete obj[r])
  return renameProperties(obj, newKeys)
}

/**
 * Fix a destination object.
 * Calls on adjustResult to remove DynamoDb key values and remap names
 * Then does cleanup on destination and jursidictions values to match
 * expected result shown below.
 * 
   destination_type: {
        select: {
          type: true,
          type_id: true,
        },
      },
      jurisdiction: {
        select: {
          name: true,
          description: true,
        },
      },
 * @param destination The destination to fix
 */
const destTypeNames = ["PRODUCTION", "TEST", "ONBOARD", "STAGE", "DEV", "UNKNOWN",]
async function fixDestination(destination: any) {
  destination = adjustResult(destination, destinationFieldMap)

  // Adjust destination type
  var typeName = destination.dest_type && destination.dest_type > 0 && destination.dest_type < 7 ? 
    destTypeNames[destination.dest_type - 1] : destTypeNames[5]
  destination.destination_type = {
    type: typeName,
    type_id: destination.dest_type
  }
  delete destination.dest_type

  // Adjust jurisdiction name
  const jurisdiction = await getJurisdiction(destination.jurisdiction_id)
  destination.jurisdiction = {
    name: jurisdiction.name,
    description: jurisdiction.description
  }
  convertToDate(destination, [ "maint_start", "maint_end"])
  return destination
}

function convertToDate(obj: any, keys: Array<string>) {
  keys.forEach(k => { if (obj[k]) obj[k] = new Date(obj[k])})
}

function convertToDateString(obj: any, keys: Array<string>) {
  keys.forEach(k => { if (obj[k] && obj[k] instanceof Date) obj[k] = obj[k].toISOString()})
}

/**
 * Run a query and return the items or an empty array.
 * 
 * @param query the query to execute
 * @returns The items in the query
 */
async function runQuery(query: QueryCommandInput) {
  const response = await runRetryableCommand(new QueryCommand(query))
  if (response.Items) {
    return response.Items
  }
  return new Array()
}

async function runRetryableCommand(cmd: any) : Promise<any> {
  var retriesRemaining = 3
  var delay = 100
  while (true) {
    try {
      return await dynamodDbDocClient.send(cmd)
    } catch(err){
      if (!handleQueryError(err) || retriesRemaining-- > 0) {
        throw err
      }
      // Exponential backoff
      await new Promise(r => setTimeout(r, delay))
      delay += delay 
    }
  }
}

/**
 * Log the error and return if the request should be retried or not
 * @param err Error to log
 * @returns true if the request can be retried or false if it should not be retried
 */
function handleQueryError(err) {
  if (!err) {
    console.error('Encountered error object was empty');
    return false;
  }
  if (!err.code) {
    console.error(`An exception occurred, investigate and configure retry strategy. Error: ${err.message}`, err);
    return false;
  }
  switch (err.code) {
  case 'InternalServerError':
    console.error(`Internal Server Error, generally safe to retry with exponential back-off. Error: ${err.message}`, err);
    return true;
  case 'ProvisionedThroughputExceededException':
    console.error(`Request rate is too high. If you're using a custom retry strategy make sure to retry with exponential back-off. `
      + `Otherwise consider reducing frequency of requests or increasing provisioned capacity for your table or secondary index. Error: ${err.message}`, err);
    return true;
  case 'ResourceNotFoundException':
    console.error(`One of the tables was not found, verify table exists before retrying. Error: ${err.message}`, err);
    return false;
  case 'ServiceUnavailable':
    console.error(`Had trouble reaching DynamoDB. generally safe to retry with exponential back-off. Error: ${err.message}`, err);
    return true;
  case 'ThrottlingException':
    console.error(`Request denied due to throttling, generally safe to retry with exponential back-off. Error: ${err.message}`, err);
    return true;
  case 'UnrecognizedClientException':
    console.error(`The request signature is incorrect most likely due to an invalid AWS access key ID or secret key, fix before retrying. `
      + `Error: ${err.message}`, err);
    return false;
  case 'ValidationException':
    console.error(`The input fails to satisfy the constraints specified by DynamoDB, `
      + `fix input before retrying. Error: ${err.message}`, err);
    return false;
  case 'RequestLimitExceeded':
    console.error(`Throughput exceeds the current throughput limit for your account, `
      + `increase account level throughput before retrying. Error: ${err.message}`, err);
    return true;
  default:
    console.error(`An exception occurred, investigate and configure retry strategy. Error: ${err.message}`, err);
    return false;
  }
}
// Prefetch list of jurisdictions in a map indexed by identifier
var jurisdictions = null

async function getJurisdictions() {
  // Use cached value if available.  Jurisdictions changes so infrequently
  // it's not really worth loading each time.
  if (jurisdictions !== null) {
    return jurisdictions
  }
  const query: QueryCommandInput = {
    TableName: tableName,
    KeyConditionExpression: "entityType = :entityType",
    ExpressionAttributeValues: {
      ':entityType' : "Jurisdiction",
    },
  }
  var result = await runQuery(query)
  if (!result || result.length == 0) {
    return {};
  }
  jurisdictions = new Object()
  result.forEach(j => jurisdictions[j.jurisdictionId] = j)
  return jurisdictions
}

async function getJurisdiction(j: number) {
  if (jurisdictions == null || !jurisdictions[j]) {
    jurisdictions = null  // Clear cache to force reload when not found
    await getJurisdictions()
  }
  return jurisdictions[j]
}

/**
 * Find a destination by it's id and type
 * 
 * @param destId The destination id
 * @param destType The type of destination
 * @returns The matching destinations
 */
async function findDestinationByIdAndType(destId : string, destType : number, returnPassword? : boolean) {
  return await findByIdAndType(destId, destType, "Destination", returnPassword)
}

async function findChangeRequestByIdAndType(destId : string, destType : number, returnPassword? : boolean) {
  return await findByIdAndType(destId, destType, "ChangeRequest", returnPassword)
}

async function fetchDraftRecord(destId : string, destType : number) {
  var draft = await findChangeRequestByIdAndType(destId, destType)
  // Fetch draft record is like findChangeRequestByIdAndType, with additional constraint
  // the jira_id must be null.  So, if there is a jira_id, don't return the found record.
  if (draft && draft.jira_id) {
    draft = null
  }
  return draft
}

async function findAuditHistoryByIdAndType(destId : string, destType : number) {
  return await findByIdAndType(destId, destType, "AuditHistory")
}

/**
 * Find a destination or change request by it's id and type
 * @param entityType "Destination" || "ChangeRequest" || "AuditHistory" to indicate which type of entity to find
 * @param destId The destination id
 * @param destType The type of destination
 * @returns The matching destinations
 */
async function findByIdAndType(destId : string, destType : number, entityType : string, returnPassword? : boolean) {

  const query: QueryCommandInput = destType ? {
    TableName: tableName,
    KeyConditionExpression: "entityType = :entityType AND sortKey = :sortKey",
    ExpressionAttributeValues: {
      ':entityType' : entityType,
      ':sortKey': `${destType}#${destId}`,
    },
   } : {
      TableName: tableName,
      KeyConditionExpression: "entityType = :entityType",
      FilterExpression: "destId = :destId",
      ExpressionAttributeValues: {
        ':entityType' : entityType,
        ':destId': destId,
    },
  }
  var projection = "destId, destTypeId, destUri, destVersion, facilityId, jurisdictionId, username, "
    + "msh3, msh4, msh5, msh6, msh11, msh22, rxa11"

  switch (entityType) {
    case "Destination":
      projection += ", maintReason, maintStart, maintEnd"  // Destination specific
      break
    case "ChangeRequest":
      projection += ", id, requestedAt, requestedBy, scheduledAt" // ChangeRequest specific
      break
    case "AuditHistory":
      // Audit specific
      projection = "id, destId, destTypeId, tableName, userName, changeType, oldValues, newValues, createdAt"  
      break
    default:
      break
  }

  if (returnPassword) {
    projection += ", password"
  }

  query.ProjectionExpression = projection

  var result = await runQuery(query)
  if (!result || result.length == 0) {
    return null;
  }
  return await fixDestination(result[0])
}

/**
 * Converts destination type name to integer identifier
 * @param destType The destination type name
 * @returns The value as a type id
 */
async function getDestinationTypeIdFromName(destType: string) {
  switch (destType) {
    case 'DEV':
    case 'Development':
      return 5
    case 'PRODUCTION':
    case 'Production':
      return 1
    case 'TEST':
    case 'Testing':
      return 2
    case 'ONBOARD':
    case 'Onboarding':
      return 3
    case 'STAGE':
    case 'Staging':
      return 4
    case 'UNKNOWN':
    default:
      return 6
  }
}

// This is fixed, we could use database to make it configurable, but the reality
// is that it should be fixed.
const destinationTypes = [ "", "Production", "Testing", "Onboarding", "Staging", "Development", "UNKNOWN" ]

async function getJurisdictionFromDestId(destId: string) {
  const dest = await findDestinationByIdAndType(destId, null)
  if (dest) {
    return await getJurisdiction(dest.jurisdiction_id)
  }
}

async function lookupDestinationVersion(
  destination: any,
  destId: string,
  destType: number
) {
  if (!destination.dest_version) {
	  destination = await findDestinationByIdAndType(destId, destType)
  }
  if (!destination.dest_version) {
	  return '2014'
  }
  return destination.dest_version
}

async function upsertDestinationChangeRequest (changeRequestData: any) {
  // if requested password is empty and old password is NOT, set requested password to old password
  // Then create the record. 
  // TODO: The Work
  const dest = await findDestinationByIdAndType(changeRequestData.dest_id, changeRequestData.dest_type, true)
  if (!dest) {
    const dest_type = changeRequestData.dest_type < 1 || changeRequestData.dest_type > 5 ? 6 : changeRequestData.dest_type;
    throw new Error(`Cannot find matching destination for ${changeRequestData.dest_id} in ${destinationTypes[dest_type]}`)
  }
  if (changeRequestData.password !== "" && !changeRequestData.password) {
    // password is not empty string, and password is not present
    changeRequestData.password = dest.password
  }
  return await update("ChangeRequest", cr)
}

async function update(entityType : string, data : Record<string, string>) {
  const cr : Record<string, string> = Object.assign({}, data)
  cr.id = cr.dest_type + '#' + cr.dest_id
  cr.entityType = entityType
  convertToDateString(cr, ["maint_start", "maint_end", "requestedAt", "scheduledAt"])
 
  /* convert from what you see below to destType, jurisdictionId
     destinations: {
        select: {
          destination_type: {
            select: {
              type: true,
              type_id: true,
            },
          },
          jurisdiction: {
            select: {
              name: true,
              description: true,
            },
          },
        },
      },
  */
  const item = renameProperties(cr, destinationReverseFieldMap)
  const putCommand : PutCommandInput = {
    TableName: tableName,
    Item: null
  }
  putCommand.Item = cr
  const p: PutCommandOutput = await runRetryableCommand(new PutCommand(putCommand))
}

/**
 * Delete the specified change request
 * 
 * @param id The change request to delete
 * @returns The response to the delete request.  NOTE: This is not usually used
 */
async function deleteDestinationChangeRequest(id: string) {
  const deleteCmd : DeleteCommandInput = {
    TableName: tableName,
    Key: { 
      entityType: "ChangeRequest",
      sortKey: id
    },
  }
  return runRetryableCommand(new DeleteCommand(deleteCmd))
}

type ChangeTest = (changeRequest : any ) => boolean

async function cancelChangeRequest(destId: string, destType: number, test? : ChangeTest) {
  if (destType < 1 || destType > 6) {
    destType = 6
  }
  const changeRequest = await findChangeRequestByIdAndType(destId, destType)
  if (!changeRequest) {
    return
    // throw new Error(`Cannot find change request for ${destId} in ${destinationTypes[destType]}`)
  }

  if (test && !test(changeRequest)) {
    return
  }
  return deleteDestinationChangeRequest(changeRequest.id)
}

async function deleteDraftValues(destId: string, destType: number) {
  return cancelChangeRequest(destId, destType, (cr: any) => !cr.jira_id) // Do NOT delete draft values for submitted requests
}

async function hasPasswordChangedForDestination(destId: string, destType: number) {
  const dest = await findDestinationByIdAndType(destId, destType, true)
  const cr = await findChangeRequestByIdAndType(destId, destType, true)
  return cr.password != dest.password
}

async function updateAndAuditDestination(
  destId: string,
  destType: number,
  updatedData: Record<string, string>,
  user: string,
  oldValues: Record<string, string>,
  isPasswordDifferent: object
) {

  // We need to do two things:
  // 1. Update the Destination Item fields 
  // username, password, facility_id, msh3, msh4, msh5, msh6, msh11, msh22 and rxa11
  /*
  {
    username: "user",
    facilityId: "IZGW",
    msh3: "IZGW",
    msh4: "IZGW",
    msh5: "IZGW",
    msh6: "IZGW",
    msh11: "IZGW"
    msh22: "IZGW-22",
    rxa11: "IZGW-11",
  }*/
  var update : UpdateCommandInput = {
    TableName: tableName,
    Key: { 
      entityType: "Destination",
      sortKey: `${destType}#${destId}`,
    },
    UpdateExpression: "set #username = :username, #password = :password, #facility_id = :facility_id " +
      "#msh3 = :msh3, #msh4 = :msh4, #msh5 = :msh5, #msh6 = :msh6, #msh11 = :msh11, #msh22 = :msh22, #rxa11 = :rxa11",
    ExpressionAttributeNames: {
      "#username": "username",
      "#password": "password",
      "#facilityId" : "facilityId",
      "#msh3": "msh3",
      "#msh4": "msh4",
      "#msh5": "msh5",
      "#msh6": "msh6",
      "#msh11": "msh11",
      "#msh22": "msh22",
      "#rxa11": "rxa11",
    },
    ExpressionAttributeValues: {
      ":username": updatedData.username,
      ":password": updatedData.password,
      ":facilityId" : updatedData.facilityId,
      ":msh3": updatedData.msh3,
      ":msh4": updatedData.msh4,
      ":msh5": updatedData.msh5,
      ":msh6": updatedData.msh6,
      ":msh11": updatedData.msh11,
      ":msh22": updatedData.msh22,
      ":rxa11": updatedData.rxa11,
    },
    ReturnValues: "UPDATED_NEW"
  }

  const p: UpdateCommandOutput = await runRetryableCommand(new UpdateCommand(update))

  // and 2: Audit the change 
  // Unclear if these two are needed.
  const updated = renameProperties(updatedData, destinationReverseFieldMap)
  const old = renameProperties(oldValues, destinationReverseFieldMap)
  /*
  # id, dest_id, dest_type, tableName, userName, changeType, oldValues, newValues, createdAt
  */
 const createdAt = new Date()
  const item = {
    destId: updatedData.destId,
    destType: updatedData.destType,
    tableName: "Destination",
    userName: user,
    changeType: "Update",
    oldValues: old,
    newValues: updated,
    createdAt: createdAt,
    entityType: "AuditHistory",
    sortKey: `${updatedData.destId}#${updatedData.destType}#${createdAt}`
  }
  const putCommand : PutCommandInput = {
    TableName: tableName,
    Item: item
  }
  const q: PutCommandOutput = await runRetryableCommand(new PutCommand(putCommand))
}

const dynamoDbInterface = {
	findDestinationByIdAndType: findDestinationByIdAndType, // DONE
	getDestinationsForRole: null,  // Is NOT used.
	findAuditHistoryByIdAndType: findAuditHistoryByIdAndType, // DONE, but needs verification
	findChangeRequestByIdAndType: findChangeRequestByIdAndType, // DONE, but needs verification
	getDestinationTypeIdFromName : getDestinationTypeIdFromName, // DONE
	fetchDraftRecord: fetchDraftRecord, // DONE, but needs verification
	getJurisdictionFromDestId: getJurisdictionFromDestId, // DONE
	hasPasswordChangedForDestination: hasPasswordChangedForDestination,

	upsertDestinationChangeRequest: upsertDestinationChangeRequest,  // 
	deleteDestinationChangeRequest: deleteDestinationChangeRequest,  // DONE but needs verification
	deleteDraftValues: deleteDraftValues, // DONE but needs verification
	cancelChangeRequest: cancelChangeRequest, // DONE but needs verification
	updatedAuditedDestination: updateAndAuditDestination, // needs to call /rest/refresh?all=true in target environment
	upsertDraftRecord: null, // upsertDraftRecord,
	maintenanceRequest: null, // maintenanceRequest, // needs to call /rest/refresh?all=true in target environment
	updateChangeRequest: null, // updateChangeRequest, 
}

