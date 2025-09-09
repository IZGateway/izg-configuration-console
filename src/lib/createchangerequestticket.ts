import _ from 'lodash'
import moment from 'moment-timezone'
import { DestinationChangeRequest } from './type/DestinationChangeRequest'
import { DestinationConnectionSettings } from './type/DestinationConnectionSettings'

const JIRA_API_URL = process.env.JIRA_API_URL || undefined
const JIRA_API_ISSUE_TYPE = process.env.JIRA_API_ISSUE_TYPE || undefined
const JIRA_API_PROJECT_ID = process.env.JIRA_API_PROJECT_ID || undefined
const JIRA_API_AUTH_BASE64 = process.env.JIRA_API_AUTH_BASE64 || undefined
const CHANGE_REQUESTED_EMPTY_VALUE = '<OLD VALUE REMOVED>'
const CURRENT_EMPTY_VALUE = ' '
const CHANGE_REQUEST_UNCHANGED_VALUE = 'UNCHANGED'
const CHANGE_REQUEST_URL = process.env.NEXTAUTH_URL || undefined

const getRequestedValue = (
  requestedFields: DestinationConnectionSettings,
  fieldToGetValueFrom: string
) => {
  return _.has(requestedFields, fieldToGetValueFrom)
    ? _.isEmpty(requestedFields[fieldToGetValueFrom])
      ? CHANGE_REQUESTED_EMPTY_VALUE
      : requestedFields[fieldToGetValueFrom]
    : CHANGE_REQUEST_UNCHANGED_VALUE
}

const createChangeRequestTicket = async (
  changeRequestData: DestinationChangeRequest
) => {
  const jiraBasicAuthHeader = 'Basic ' + JIRA_API_AUTH_BASE64
  const {
    current,
    requested,
    destId,
    destType,
    requestedBy,
    scheduledAt,
    isAsap,
  } = changeRequestData

  const scheduledDateTime = moment(scheduledAt)
    .tz('America/New_York')
    .format('ddd MMM DD YYYY HH:mm:ss [ET]')
  const changeRequestSummaryTemplate = `Destination ${destId} on ${
    destType.type
  } to be updated ${isAsap ? 'ASAP' : `on ${scheduledDateTime}`}`
  const changeRequestDetailsTemplate = `*Destination Id*: ${destId}\r\n*Environment*: ${
    destType.type
  }\r\n*Requested By*: ${requestedBy}\r\n|| ||CURRENT CONFIG VALUES||REQUESTED CONFIG VALUES||\r\n|*Endpoint URL*|${
    _.isEmpty(current.destUri) ? CURRENT_EMPTY_VALUE : current.destUri
  }|${getRequestedValue(requested, 'destUri')}|\r\n|*Username*|${
    _.isEmpty(current.username)
      ? CHANGE_REQUESTED_EMPTY_VALUE
      : current.username
  }|${getRequestedValue(requested, 'username')}|\r\n|*Password*|REDACTED |${
    !_.isEmpty(requested.password) ? '<UPDATED>' : 'REDACTED - NOT UPDATED'
  } |\r\n|*Facility id*|${
    _.isEmpty(current.facilityId) ? CURRENT_EMPTY_VALUE : current.facilityId
  }|${getRequestedValue(requested, 'facilityId')}|\r\n|*MSH3*|${
    _.isEmpty(current.MSH3) ? CURRENT_EMPTY_VALUE : current.MSH3
  }|${getRequestedValue(requested, 'MSH3')}|\r\n|*MSH4*|${
    _.isEmpty(current.MSH4) ? CURRENT_EMPTY_VALUE : current.MSH4
  }|${getRequestedValue(requested, 'MSH4')}|\r\n|*MSH5*|${
    _.isEmpty(current.MSH5) ? CURRENT_EMPTY_VALUE : current.MSH5
  }|${getRequestedValue(requested, 'MSH5')}|\r\n|*MSH6*|${
    _.isEmpty(current.MSH6) ? CURRENT_EMPTY_VALUE : current.MSH6
  }|${getRequestedValue(requested, 'MSH6')}|\r\n|*MSH22*|${
    _.isEmpty(current.MSH22) ? CURRENT_EMPTY_VALUE : current.MSH22
  }|${getRequestedValue(requested, 'MSH22')}|\r\n|*MSH11*|${
    _.isEmpty(current.MSH11) ? CURRENT_EMPTY_VALUE : current.MSH11
  }|${getRequestedValue(requested, 'MSH11')}|\r\n|*RXA11*|${
    _.isEmpty(current.RXA11) ? CURRENT_EMPTY_VALUE : current.RXA11
  }|${getRequestedValue(
    requested,
    'RXA11'
  )}|\r\n*Deploy Datetime*: ${scheduledDateTime}\r\n\r\n*Config Console Links*\r\n\*Review Change Request*: ${CHANGE_REQUEST_URL}/changerequest/${
    destType.typeId
  }/${destId}`

  const getChangedValues = (current, requested): string => {
    const changed: string[] = []

    const fieldsToCheck = [
      'destUri',
      'username',
      'password',
      'facilityId',
      'MSH3',
      'MSH4',
      'MSH5',
      'MSH6',
      'MSH22',
      'MSH11',
      'RXA11',
    ]

    fieldsToCheck.forEach((field) => {
      const currentValue = current[field] || ''
      const requestedValue = requested[field] || ''

      if (field === 'password') {
        if (requestedValue && requestedValue !== '') {
          changed.push(`${field}`)
        }
      } else if (currentValue !== requestedValue) {
        changed.push(`${field}`)
      }
    })

    return changed.length > 0 ? changed.join(', ') : 'No changes'
  }
  const jiraResponse = await fetch(JIRA_API_URL + '/issue', {
    method: 'POST',
    headers: new Headers({
      Authorization: jiraBasicAuthHeader,
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({
      fields: {
        project: {
          id: JIRA_API_PROJECT_ID,
        },
        summary: changeRequestSummaryTemplate,
        description: changeRequestDetailsTemplate,
        issuetype: {
          id: JIRA_API_ISSUE_TYPE,
        },
        customfield_10516: scheduledDateTime,
        customfield_10485: `Destination ${destId} on environment ${destType.type}`,
        customfield_10484: requestedBy,
        customfield_10487: getChangedValues(current, requested),
      },
    }),
  })
  if (!jiraResponse.ok) {
    throw new Error(`Bad Jira response: ${jiraResponse.status}`)
  }
  const changerequest = await jiraResponse.json()
  return changerequest
}

export default createChangeRequestTicket
