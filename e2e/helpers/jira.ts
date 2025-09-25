import type { APIRequestContext } from '@playwright/test'

const JIRA_API_BASE = process.env.JIRA_API_URL || undefined

const JIRA_API_AUTH_BASE64 = process.env.JIRA_API_AUTH_BASE64 || undefined
const jiraBasicAuthHeader = 'Basic ' + JIRA_API_AUTH_BASE64

export async function getIssueStatus(
  request: APIRequestContext,
  issueId: string
) {
  const response = await request.get(
    `${JIRA_API_BASE}/issue/${issueId}?fields=status`,
    {
      headers: {
        Authorization: jiraBasicAuthHeader,
        'Content-Type': 'application/json',
      },
    }
  )
  if (!response.ok())
    throw new Error(
      `Failed to fetch issue status: ${response.status()} ${await response.text()}`
    )
  const body = await response.json()
  return (body.fields?.status?.name ?? '').toString()
}

export async function getTransitions(
  request: APIRequestContext,
  issueId: string
) {
  const response = await request.get(
    `${JIRA_API_BASE}/issue/${issueId}/transitions`,
    {
      headers: {
        Authorization: jiraBasicAuthHeader,
        'Content-Type': 'application/json',
      },
    }
  )
  if (!response.ok())
    throw new Error(
      `Failed to fetch transitions: ${response.status()} ${await response.text()}`
    )
  const body = await response.json()
  return body.transitions as Array<any>
}

export async function transitionIssueTo(
  request: APIRequestContext,
  issueId: string,
  targetStatusName: string
) {
  const transitions = await getTransitions(request, issueId)
  const match = transitions.find((t) => {
    const transitionName = (t.name ?? '').toString().toLowerCase()
    return transitionName === targetStatusName.toLowerCase()
  })

  if (!match) {
    const available = transitions.map((t) => `${t.name}`).join(', ')

    throw new Error(
      `No transition found for "${targetStatusName}". Available transitions: ${available}`
    )
  }

  const payload: any = { transition: { id: match.id } }

  const response = await request.post(
    `${JIRA_API_BASE}/issue/${issueId}/transitions`,
    {
      headers: {
        Authorization: jiraBasicAuthHeader,
        'Content-Type': 'application/json',
      },
      data: payload,
    }
  )

  if (!response.ok()) {
    const txt = await response.text()
    throw new Error(`Transition POST failed: ${response.status()} ${txt}`)
  }

  const final = await getIssueStatus(request, issueId)
  if (final.toLowerCase().includes(targetStatusName.toLowerCase())) {
    return { success: true, transitionId: match.id, finalStatus: final }
  }

  throw new Error(
    `Timed out waiting for status "${targetStatusName}". Current: "${final}"`
  )
}
