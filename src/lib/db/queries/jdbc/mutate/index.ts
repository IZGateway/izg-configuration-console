import updateDestination from './destination'
import {
  upsertDestinationChangeRequest,
  updateDestinationChangeRequestDeploymentTime,
  deleteChangeRequest,
} from './destinationchangerequest'
import createDestinationAudit from './audithistory'

export {
  deleteChangeRequest,
  updateDestination,
  upsertDestinationChangeRequest,
  updateDestinationChangeRequestDeploymentTime,
  createDestinationAudit,
}
