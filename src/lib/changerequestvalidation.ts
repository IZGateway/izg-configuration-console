import validationRules from './../lib/destinationvaluesvalidationrules'
import { validate as uuidValidate } from 'uuid'
import * as _ from 'lodash'

const changeRequestValidation = (valuesToValidate, facilityId, destType) => {
  let errors = {}

  if (
    _.has(valuesToValidate, 'newPassword') &&
    _.has(valuesToValidate, 'confirmPassword')
  ) {
    if (
      !_.isEqual(valuesToValidate.newPassword, valuesToValidate.confirmPassword)
    ) {
      errors = {
        ...errors,
        confirmPassword: 'New Password and Confirm New Password must match',
      }
    } else if (uuidValidate(valuesToValidate.newPassword)) {
      errors = {
        ...errors,
        newPassword: 'Password must not be in the form of UUID',
      }
    } else if (_.isEqual(valuesToValidate.confirmPassword, facilityId)) {
      errors = {
        ...errors,
        confirmPassword: 'Password must not be same as Facility ID',
      }
    }
  }

  if (
    _.has(valuesToValidate, 'MSH3') &&
    _.has(valuesToValidate, 'MSH4') &&
    _.isEmpty(valuesToValidate.MSH3) &&
    _.isEmpty(valuesToValidate.MSH4)
  ) {
    errors = {
      ...errors,
      MSH3: 'At least one of MSH-3 and MSH-4 must be provided',
    }
  }

  if (
    _.has(valuesToValidate, 'MSH5') &&
    _.has(valuesToValidate, 'MSH6') &&
    _.isEmpty(valuesToValidate.MSH5) &&
    _.isEmpty(valuesToValidate.MSH6)
  ) {
    errors = {
      ...errors,
      MSH5: 'At least one of MSH-5 and MSH-6 must be provided',
    }
  }

  if (_.has(valuesToValidate, 'MSH11')) {
    const msh11 = valuesToValidate.MSH11

    if (destType.toUpperCase() === 'PRODUCTION' && msh11 !== 'P') {
      errors = {
        ...errors,
        MSH11: 'MSH-11 must be "P" when environment of the destinaiton is production',
      }
    } else if (destType.toUpperCase() !== 'PRODUCTION' && !['P', 'T'].includes(msh11)) {
      errors = {
        ...errors,
        MSH11: 'MSH-11 must be "P" or "T"',
      }
    }
  }


  Object.keys(valuesToValidate).forEach((key) => {
    const value = valuesToValidate[key]
    if (!validationRules[key]?.regex.test(value)) {
      errors = {
        ...errors,
        [key]: validationRules[key]?.message,
      }
    }
  })
  return {
    errors,
  }
}

export default changeRequestValidation
