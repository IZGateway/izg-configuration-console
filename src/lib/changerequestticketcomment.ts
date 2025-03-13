const JIRA_API_URL = process.env.JIRA_API_URL || undefined
const JIRA_API_AUTH_BASE64 = process.env.JIRA_API_AUTH_BASE64 || undefined

const changeRequestTicketComment = async (
  jira_id: string,
  requestedAt: Date,
  scheduledAt?: Date,
  isAsap?: boolean
) => {
  const jiraBasicAuthHeader = 'Basic ' + JIRA_API_AUTH_BASE64
  const isScheduledAtDateProvided: boolean = scheduledAt !== undefined
  const isRescheduleRequest: boolean = isAsap || isScheduledAtDateProvided
  const requestedDateTime = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'long',
    timeStyle: 'long',
  }).format(new Date(requestedAt))

  const scheduledDateTime = isRescheduleRequest
    ? new Intl.DateTimeFormat('en-US', {
        dateStyle: 'long',
        timeStyle: 'long',
      }).format(new Date(scheduledAt))
    : null

  const updateScheduleDateComment = isRescheduleRequest
    ? `Please update scheduled time for this ticket to be 
  ${
    isAsap ? 'ASAP' : `on ${scheduledDateTime}`
  } requested on ${requestedDateTime}`
    : null

  const cancelChangeRequestComment = `Cancelletion of this ticket is requested on ${requestedDateTime}`

  const jiraResponse = await fetch(JIRA_API_URL + `/issue/${jira_id}/comment`, {
    method: 'POST',
    headers: new Headers({
      Authorization: jiraBasicAuthHeader,
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({
      body: isRescheduleRequest
        ? updateScheduleDateComment
        : cancelChangeRequestComment,
    }),
  })
  if (!jiraResponse.ok) {
    throw new Error(`Bad Jira response: ${jiraResponse.status}`)
  }
  const changerequest = await jiraResponse.json()
  return changerequest
}

export default changeRequestTicketComment
