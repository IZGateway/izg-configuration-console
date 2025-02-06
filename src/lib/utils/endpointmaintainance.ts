import _ from 'lodash'

const hasActiveMaintenance = (maintStart: Date, maintEnd: Date) => {
  const currentDateTime = new Date()
  if (_.isNull(maintStart) && _.isNull(maintEnd)) {
    return false
  } else {
    return (
      maintStart <= currentDateTime &&
      (_.isNull(maintEnd) || maintEnd >= currentDateTime)
    )
  }
}

const hasFutureMaintenance = (maintStart: Date, maintEnd: Date) => {
  const currentDateTime = new Date()
  if (_.isNull(maintStart) && _.isNull(maintEnd)) {
    return false
  } else {
    return (
      maintStart >= currentDateTime &&
      (_.isNull(maintEnd) || maintEnd >= currentDateTime)
    )
  }
}

export { hasActiveMaintenance, hasFutureMaintenance }
