import _ from 'lodash'

const OPERATIONS_ROLES = ['IZG Operations', 'IZG Support']

export default function isOperationsRole(role) {
  return _.includes(OPERATIONS_ROLES, role)
}
