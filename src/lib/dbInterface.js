/**
 *	The dbInterface object represents the interface to the database.  
 */
import { upsertDestinationChangeRequest, deleteDestinationChangeRequest } from './queries/mutate/destinationchangerequest' 
import deleteDraftValues from './queries/mutate/deleteDraftValues'
import cancelChangeRequest from './queries/mutate/cancelChangeRequest'
import updatedAuditedDestination from './queries/mutate/destination'
import upsertDraftRecord from './queries/mutate/upsertDraftRecord'
import maintenanceRequest from './queries/mutate/maintenanceRequest'
import updateChangeRequest from './queries/mutate/updateChangeRequest'

import destination from './queries/fetch/destination'
import destinations from './queries/fetch/destinations'
import destinationaudithistory from './queries/fetch/destinationaudithistory'
import destinationChangeRequest from './queries/fetch/destinationchangerequest'
import destinationType from './queries/fetch/destinationType'
import fetchDraftRecord from './queries/fetch/draftrecord'
import jurisdiction from './queries/fetch/jurisdiction'
import passwordComparison from './queries/fetch/passwordComparison'


export const dbInterface = {
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
	updateChangeRequest: updateChangeRequest
}

