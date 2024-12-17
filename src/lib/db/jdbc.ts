import {
  fetchDestinationByIdAndType,
  fetchLoggedInUsersDestinations,
  destinationaudithistory,
  fetchDestinationChangeRequestByIdAndType,
  fetchChangeRequestPasswordByIdAndType,
  destinationType,
  fetchDraftRecord,
  fetchDestinationPasswordByIdAndType,
  fetchJurisdictionByDestId,
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
import passwordComparison from './queries/jdbc/fetch/passwordComparison'
import upsertDraftRecord from './queries/jdbc/mutate/draftrecord'
import ConfigConsoleRepository from './ConfigConsoleRepository'
import { withIZGHubRefresh } from '../hubrefresher'

class JDBC implements ConfigConsoleRepository {
  //fetch
  fetchDestinationByIdAndType = fetchDestinationByIdAndType //done
  fetchLoggedInUsersDestinations = fetchLoggedInUsersDestinations //done
  fetchDestinationAuditHistoryByIdAndType = destinationaudithistory //done
  fetchDestinationChangeRequestByIdAndType =
    fetchDestinationChangeRequestByIdAndType //done
  fetchDestinationType = destinationType //done
  fetchDraftRecord = fetchDraftRecord
  fetchJurisdictionByDestId = fetchJurisdictionByDestId //done
  isPasswordChangedForIdAndType = passwordComparison //done
  fetchChangeRequestPasswordByIdAndType = fetchChangeRequestPasswordByIdAndType //done
  fetchDestinationPasswordByIdAndType = fetchDestinationPasswordByIdAndType //done

  //mutate
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
