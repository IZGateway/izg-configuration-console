import {
  destination,
  destinations,
  destinationaudithistory,
  destinationChangeRequest,
  destinationType,
  fetchDraftRecord,
} from './queries/jdbc/fetch'
import {
  deleteDraftValues,
  cancelChangeRequest,
  updatedAuditedDestination,
  maintenanceRequest,
  updateChangeRequest,
  upsertDestinationChangeRequest,
  deleteDestinationChangeRequest,
} from './queries/jdbc/mutate'
import jurisdiction from './queries/jdbc/fetch/jurisdiction'
import passwordComparison from './queries/jdbc/fetch/passwordComparison'
import upsertDraftRecord from './queries/jdbc/mutate/draftrecord'
import ConfigConsoleRepository from './ConfigConsoleRepository'
import { withIZGHubRefresh } from '../hubrefresher'

class JDBC implements ConfigConsoleRepository {
  destination = destination
  destinations = destinations
  destinationaudithistory = destinationaudithistory
  destinationChangeRequest = destinationChangeRequest
  destinationType = destinationType
  fetchDraftRecord = fetchDraftRecord
  jurisdiction = jurisdiction
  passwordComparison = passwordComparison

  upsertDestinationChangeRequest = upsertDestinationChangeRequest
  deleteDestinationChangeRequest = deleteDestinationChangeRequest
  deleteDraftValues = deleteDraftValues
  cancelChangeRequest = cancelChangeRequest
  updatedAuditedDestination = withIZGHubRefresh(updatedAuditedDestination) // needs to call /rest/refresh?all=true in target environment
  upsertDraftRecord = upsertDraftRecord
  maintenanceRequest = withIZGHubRefresh(maintenanceRequest) // needs to call /rest/refresh?all=true in target environment
  updateChangeRequest = updateChangeRequest
}
export default JDBC
