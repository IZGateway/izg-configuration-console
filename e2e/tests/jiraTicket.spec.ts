import { test, expect } from '@playwright/test'
import { transitionIssueTo } from '../helpers/jira'

//Making this test skip as it was for sppike. Once actual test is implemented, skip can be removed.
test.skip('approve jira ticket', async ({ request }) => {
  const issueId = process.env.TEST_ISSUE_ID
  const targetStatus = 'Approve'
  const result = await transitionIssueTo(request, 'CCT-103', targetStatus) //replace issueId

  expect(result.success).toBeTruthy()
})
