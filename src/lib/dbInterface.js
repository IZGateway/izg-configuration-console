/**
 *	The dbInterface object represents the interface to the database.  
 */
import { upsertDestinationChangeRequest, deleteDestinationChangeRequest } from './queries/mutate/destinationchangerequest' 
import deleteDraftValues from './queries/mutate/deletedraftvalues'
import cancelChangeRequest from './queries/mutate/cancelChangeRequest'
import updatedAuditedDestination from './queries/mutate/destination'
import upsertDraftRecord from './queries/mutate/draftrecord'
import maintenanceRequest from './queries/mutate/maintenanceRequest'
import updateChangeRequest from './queries/mutate/updateChangeRequest'

import destination from './queries/fetch/destination'
import destinations from './queries/fetch/destinations'
import destinationaudithistory from './queries/fetch/destinationaudithistory'
import destinationChangeRequest from './queries/fetch/destinationchangerequest'
import destinationType from './queries/fetch/destinationtype'
import fetchDraftRecord from './queries/fetch/draftrecord'
import jurisdiction from './queries/fetch/jurisdiction'
import passwordComparison from './queries/fetch/passwordComparison'
import IZGHubStatusHistoryEndpoint from './IZGHubStatusHistoryEndpoint'

// Used for refresh, dramatically violates DRY, not sure where to put it
import https from 'https'
import axios from 'axios'
import * as fs from 'fs'
import path from 'path'

const IZG_STATUS_ENDPOINT_URL = process.env.IZG_STATUS_ENDPOINT_URL || ''
const configuredHubURLs = new IZGHubStatusHistoryEndpoint(IZG_STATUS_ENDPOINT_URL)

const IZG_ENDPOINT_CRT_PATH = process.env.IZG_ENDPOINT_CRT_PATH || ''
const IZG_ENDPOINT_KEY_PATH = process.env.IZG_ENDPOINT_KEY_PATH || ''
const IZG_ENDPOINT_PASSCODE = process.env.IZG_ENDPOINT_PASSCODE || ''
const httpsAgentOptions = {
  cert: fs.readFileSync(path.resolve(IZG_ENDPOINT_CRT_PATH), 'utf-8'),
  key: fs.readFileSync(path.resolve(IZG_ENDPOINT_KEY_PATH), 'utf-8'),
  passphrase: IZG_ENDPOINT_PASSCODE,
  rejectUnauthorized: false,
  keepAlive: true,
}

function refreshHub(destType) {
	// Call the refresh endpoint on the specified destination.
	// It is [host]/rest/refresh?all=true where host = status endpoint host for specified destId
	let url = configuredHubURLs.getIZGHubURL(destType)
	url = url.substring(0, url.indexOf("/rest/") + 6) + "refresh?all=true"
	axios.get(url, {
		httpsAgent: new https.Agent(httpsAgentOptions),
		timeout:5000,
	  })
}


async function lookupDestinationVersion(
  destination,
  destId,
  destType
) {
  if (!destination.dest_version) {
	destination = dbInterface.destination(destId, destType)
  }
  if (!destination.dest_version) {
	return '2014'
  }
  return destination.dest_version
}

const jdbcDbInterface = {
	destination: destination,
	destinations: destinations,
	destinationaudithistory: destinationaudithistory,
	destinationChangeRequest: destinationChangeRequest,
	destinationType : destinationType,
	fetchDraftRecord: fetchDraftRecord,
	jurisdiction: jurisdiction,
	passwordComparison: passwordComparison,

	upsertDestinationChangeRequest: upsertDestinationChangeRequest, 
	deleteDestinationChangeRequest: deleteDestinationChangeRequest,
	deleteDraftValues: deleteDraftValues,
	cancelChangeRequest: cancelChangeRequest,
	updatedAuditedDestination: updatedAuditedDestination,  // needs to call /rest/refresh?all=true in target environment
	upsertDraftRecord: upsertDraftRecord,
	maintenanceRequest: maintenanceRequest, // needs to call /rest/refresh?all=true in target environment
	updateChangeRequest: updateChangeRequest, 
	
	lookupDestinationVersion: lookupDestinationVersion,

	/**
	 * Force IZ Gateway Hub to refresh the destination entries from the database.
	 * @param {*} destId The destination type of the endpoint that was updated.
	 */
	refreshHub: refreshHub
}

const dbInterface = jdbcDbInterface
export default dbInterface