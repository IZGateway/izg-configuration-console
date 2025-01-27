import updateDestination from './destination'
import {
  upsertDestinationChangeRequest,
  updateDestinationChangeRequestDeploymentTime,
  deleteChangeRequest,
} from './destinationchangerequest'
import maintenanceRequest from './maintenancerequest'
import createDestinationAudit from './audithistory'

export {
  deleteChangeRequest,
  updateDestination,
  maintenanceRequest,
  upsertDestinationChangeRequest,
  updateDestinationChangeRequestDeploymentTime,
  createDestinationAudit,
}
