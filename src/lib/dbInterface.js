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
	updatedAuditedDestination: updatedAuditedDestination,
	upsertDraftRecord: upsertDraftRecord,
	maintenanceRequest: maintenanceRequest,
	updateChangeRequest: updateChangeRequest,
	
	lookupDestinationVersion: lookupDestinationVersion
}

const dbInterface = jdbcDbInterface
export default dbInterface