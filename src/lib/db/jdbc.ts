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
} from './queries/jdbc/fetch'
import {
  upsertDestinationChangeRequest,
  updateDestinationChangeRequestDeploymentTime,
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

  //mutate
  upsertDestinationChangeRequest = upsertDestinationChangeRequest
  updateDestinationChangeRequestDeploymentTime =
    updateDestinationChangeRequestDeploymentTime
  deleteDestinationChangeRequest = deleteChangeRequest
  updateDestination = withIZGHubRefresh(updateDestination)
  createDestinationChangeRequestDeploymentAudit = createDestinationAudit
}
export default JDBC
