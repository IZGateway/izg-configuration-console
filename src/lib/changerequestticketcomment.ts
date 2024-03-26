const JIRA_API_URL = process.env.JIRA_API_URL || undefined
const JIRA_API_AUTH_BASE64 = process.env.JIRA_API_AUTH_BASE64 || undefined

const changeRequestTicketComment = async (
  jira_id,
  requestedAt,
  scheduledAt?,
  isAsap?
) => {
  const jiraBasicAuthHeader = 'Basic ' + JIRA_API_AUTH_BASE64
  let updateScheduleDateComment
  let cancelChangeRequestComment
  const requestedDateTime = new Intl.DateTimeFormat('en-US', {
    dateStyle: 'long',
    timeStyle: 'long',
  }).format(new Date(requestedAt))
  if (scheduledAt && isAsap) {
    const scheduledDateTime = new Intl.DateTimeFormat('en-US', {
      dateStyle: 'long',
      timeStyle: 'long',
    }).format(new Date(scheduledAt))

    updateScheduleDateComment = `Please update scheduled time for this ticket to be 
  ${
    isAsap ? 'ASAP' : `on ${scheduledDateTime}`
  } requested at ${requestedDateTime}`
  } else {
    cancelChangeRequestComment = `Cancelletion of this ticket is requested at ${requestedDateTime}`
  }
  const jiraResponse = await fetch(JIRA_API_URL + `/issue/${jira_id}/comment`, {
    method: 'POST',
    headers: new Headers({
      Authorization: jiraBasicAuthHeader,
      'Content-Type': 'application/json',
    }),
    body: JSON.stringify({
      body: isAsap ? updateScheduleDateComment : cancelChangeRequestComment,
    }),
  })
  if (!jiraResponse.ok) {
    throw new Error(`Bad Jira response: ${jiraResponse.status}`)
  }
  const changerequest = await jiraResponse.json()
  return changerequest
}

export default changeRequestTicketComment
