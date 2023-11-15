import axios from 'axios'
import https from 'https'

const JIRA_API_AUTH_BASE64 = process.env.JIRA_API_AUTH_BASE64 || undefined
const JIRA_API_URL = process.env.JIRA_API_URL || undefined
const getChangeRequestStatus = async (id) => {
  const jiraBasicAuthHeader = 'Basic ' + JIRA_API_AUTH_BASE64
  const config = {
    method: 'GET',
    url: `${JIRA_API_URL}/issue/${id}?fields=status`,
    headers: {
      Authorization: jiraBasicAuthHeader,
      'Content-Type': 'application/json',
    },
    httpsAgent: new https.Agent({ rejectUnauthorized: false }), ///Confirm with Brian if this is Okay
  }

  const jiraResponse = await axios(config)
    .then((response) => {
      return response.data
    })
    .catch((error) => {
      throw new Error(error.message)
    })
  return jiraResponse
}

export default getChangeRequestStatus
