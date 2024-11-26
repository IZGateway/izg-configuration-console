/**
 *	The dbInterface object represents the interface to the database.  
 */
import { upsertDestinationChangeRequest, deleteDestinationChangeRequest } from './lib/queries/mutate/destinationchangerequest' 
import deleteDraftValues from './lib/queries/mutate/deleteDraftValues'
import cancelChangeRequest from './lib/queries/mutate/cancelChangeRequest'
import updatedAuditedDestination from './lib/queries/mutate/destination'
import upsertDraftRecord from './lib/queries/mutate/upsertDraftRecord'
import maintenanceRequest from './lib/queries/mutate/maintenanceRequest'
import updateChangeRequest from './lib/queries/mutate/updateChangeRequest'

import destination from './lib/queries/fetch/destination'
import destinations from './lib/queries/fetch/destinations'
import destinationaudithistory from './lib/queries/fetch/destinationaudithistory'
import destinationchangerequest from './lib/queries/fetch/destinationchangerequest'
import destinationType from './lib/queries/fetch/destinationType'
import fetchDraftRecord from './lib/queries/fetch/draftrecord'
import jurisdiction from './lib/queries/fetch/jurisdiction'
import passwordComparison from './lib/queries/fetch/passwordComparison'


export const dbInterface = {
	destination: destination,
	destinations: destinations,
	destinationaudithistory: destinationaudithistory,
	destinationchangerequest: destinationchangerequest,
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

