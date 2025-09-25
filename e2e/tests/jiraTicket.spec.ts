import { test, expect } from '@playwright/test'
import { transitionIssueTo } from '../helpers/jira'

test('approve jira ticket', async ({ request }) => {
  const issueId = process.env.TEST_ISSUE_ID
  const targetStatus = 'Approve'
  const result = await transitionIssueTo(request, 'CCT-103', targetStatus) //replace issueId

  expect(result.success).toBeTruthy()
})
