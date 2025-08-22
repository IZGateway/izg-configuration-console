import {
  fetchDestination,
  fetchAllDestinations,
  fetchLoggedInUsersDestinations,
  destinationaudithistory,
  fetchDestinationChangeRequestByDestIdAndDestType,
  fetchDestinationChangeRequestById,
  fetchChangeRequestPassword,
  destinationType,
  fetchDestinationPassword,
  passwordComparison,
  isDatabaseConnected,
} from './queries/jdbc/fetch'
import {
  upsertDestinationChangeRequest,
  deleteChangeRequest,
  updateDestination,
  createDestinationAudit,
} from './queries/jdbc/mutate'
import { withIZGHubRefresh } from '../hubrefresher'
import DbClient from './DbClient'
class JDBC implements DbClient
{
  //fetch
  fetchDestination = fetchDestination
  fetchAllDestinations = fetchAllDestinations
  fetchLoggedInUsersDestinations = fetchLoggedInUsersDestinations
  fetchDestinationAuditHistory = destinationaudithistory
  fetchDestinationChangeRequestByDestIdAndDestType =
    fetchDestinationChangeRequestByDestIdAndDestType
  fetchDestinationChangeRequestById = fetchDestinationChangeRequestById
  fetchDestinationType = destinationType
  isPasswordChanged = passwordComparison
  fetchChangeRequestPassword = fetchChangeRequestPassword
  fetchDestinationPassword = fetchDestinationPassword
  isDatabaseConnected = isDatabaseConnected

  //mutate
  upsertDestinationChangeRequest = upsertDestinationChangeRequest
  deleteDestinationChangeRequest = deleteChangeRequest
  updateDestination = withIZGHubRefresh(updateDestination)
  createDestinationChangeRequestDeploymentAudit = createDestinationAudit

  getRepository() {
    return this;
  }
}
export default JDBC
