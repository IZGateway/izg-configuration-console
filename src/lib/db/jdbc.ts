import {
  fetchDestination,
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
import ConfigConsoleFetchRepository from './ConfigConsoleFetchRepository'
import ConfigConsoleMutateRepository from './ConfigConsoleMutateRepository'
import { withIZGHubRefresh } from '../hubrefresher'
class JDBC
  implements ConfigConsoleFetchRepository, ConfigConsoleMutateRepository
{
  //fetch
  fetchDestination = fetchDestination
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
}
export default JDBC
