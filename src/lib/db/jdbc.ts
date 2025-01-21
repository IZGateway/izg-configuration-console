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
  passwordComparison,
} from './queries/jdbc/fetch'
import {
  upsertDestinationChangeRequest,
  deleteDraftValues,
  deleteChangeRequest,
  updatedAuditedDestination,
  upsertDraftRecord,
  maintenanceRequest,
  updateChangeRequest,
} from './queries/jdbc/mutate'
import ConfigConsoleFetchRepository from './ConfigConsoleFetchRepository'
import ConfigConsoleMutateRepository from './ConfigConsoleMutateRepository'
import { withIZGHubRefresh } from '../hubrefresher'

class JDBC
  implements ConfigConsoleFetchRepository, ConfigConsoleMutateRepository
{
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
  deleteDraftValues = deleteDraftValues
  deleteChangeRequest = deleteChangeRequest
  updatedAuditedDestination = withIZGHubRefresh(updatedAuditedDestination) // needs to call /rest/refresh?all=true in target environment
  maintenanceRequest = withIZGHubRefresh(maintenanceRequest) // needs to call /rest/refresh?all=true in target environment
  upsertDraftRecord = upsertDraftRecord
  updateChangeRequest = updateChangeRequest
}
export default JDBC
