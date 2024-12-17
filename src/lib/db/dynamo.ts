import ConfigConsoleRepository from './ConfigConsoleRepository'

class Dynamo implements ConfigConsoleRepository {
  lookupDestinationVersion: null
  refreshHub: null
  destinationChangeRequestId = null
  fetchDestinationByIdAndType = null
  destinations = null
  destinationaudithistory = null
  destinationChangeRequest = null
  destinationType = null
  fetchDraftRecord = null
  jurisdiction = null
  passwordComparison = null

  upsertDestinationChangeRequest = null
  deleteDestinationChangeRequest = null
  deleteDraftValues = null
  cancelChangeRequest = null
  updatedAuditedDestination = null
  upsertDraftRecord = null
  maintenanceRequest = null
  updateChangeRequest = null
}

export default Dynamo
