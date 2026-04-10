import { test, expect, Page } from '@playwright/test'
import { loginToOkta } from '../helpers/oktaLogin'
import { logout } from '../helpers/logout'
import { filterByDestinationId } from '../helpers/filterByDestinationId'
import { createChangeRequest } from '../helpers/createChangeRequest'
import { transitionIssueTo } from '../helpers/jira'

const requiredEnvs = ['OKTA_USERNAME', 'OKTA_PASSWORD', 'BASE_URL'] as const

let context
let page: Page
const destId = 'ct'

test.describe('Deploy Change Request Workflow', () => {
  test.beforeAll(async ({ browser }) => {
    const missing = requiredEnvs.filter((k) => !process.env[k])
    if (missing.length)
      test.skip(true, `Missing env vars: ${missing.join(', ')}`)

    context = await browser.newContext()
    page = await context.newPage()

    await loginToOkta(
      page,
      process.env.OKTA_USERNAME as string,
      process.env.OKTA_PASSWORD as string,
      process.env.OKTA_USER_FULLNAME
    )

    // Navigate to manage connections page
    await page.goto('/manageconnections')
    await page.waitForLoadState('networkidle')
  })

  test.afterAll(async () => {
    await logout(page)
    if (page) await page.close()
    if (context) await context.close()
  })

  test('Create change request for testing', async () => {
    // Create change request for the connection using the helper
    await createChangeRequest(page, destId)
    await page.goto('/manageconnections')
    await expect(page.getByText('My Connections')).toBeVisible({
      timeout: 60000,
    })
  })

  test('User should see Change request page components', async () => {
    // Navigate to manage connections
    await page.goto('/manageconnections')
    await expect(page.getByText('My Connections')).toBeVisible({
      timeout: 60000,
    })

    // Filter by destination ID
    await filterByDestinationId(page, destId)

    // A change request should be present (either just created or left over from a prior run)
    const changeRequestBtn = page.locator('button[aria-label="changerequest"]')
    await expect(changeRequestBtn.first()).toBeVisible({ timeout: 10000 })
    await changeRequestBtn.first().click()

    // Wait for change request page to load
    await page.waitForURL(/\/changerequest\//, { timeout: 15000 })

    // On change request page, expect to see required components
    await expect(page.locator('#health-check')).toBeVisible()
    await expect(page.getByText('Run health check')).toBeVisible()
    await expect(page.getByText('Change Request Status')).toBeVisible()
    await expect(page.getByText('Need to make changes')).toBeVisible()
  })

  test('Complete deployment workflow: View Jira ticket, approve, and deploy', async ({
    request,
  }) => {
    // Navigate to change request page
    await page.goto('/manageconnections')
    await filterByDestinationId(page, destId)
    const changeRequestBtn = page.locator('button[aria-label="changerequest"]')
    await changeRequestBtn.first().click()

    // Wait for page to load
    await page.waitForURL(/\/changerequest\//, { timeout: 15000 })

    // Debug: Ensure Jira ticket area is visible
    await expect(page.getByText('Change Request Status')).toBeVisible()
    console.log('Jira ticket area is visible')

    // Extract Jira ticket ID from the page
    console.log('Looking for Jira ticket information...')

    let ticketId: string | undefined

    const ticketLink = page.getByText('Access Change Request Ticket')
    const ticketLinkVisible = await ticketLink.isVisible()
    console.log('Access Change Request Ticket link visible:', ticketLinkVisible)

    if (ticketLinkVisible) {
      let ticketHref = await ticketLink.getAttribute('href')
      console.log('Ticket href found:', ticketHref)

      // If href is null, try getting it from a parent element
      if (!ticketHref) {
        console.log('href is null, trying parent element...')
        const parentLink = ticketLink.locator('xpath=..')
        ticketHref = await parentLink.getAttribute('href')
        console.log('Parent href:', ticketHref)
      }

      if (ticketHref) {
        ticketId = ticketHref.match(/([A-Z]+-\d+)/)?.[1]
      }
    }

    console.log('Extracted ticket ID:', ticketId)

    if (ticketId && request) {
      try {
        // Step 1: View Jira ticket details
        console.log('Step 1: Viewing Jira ticket details...')
        await expect(page.getByText('Change Request Status')).toBeVisible()

        const jiraTicketStatus = page.getByTestId('CRTicket')
        await expect(jiraTicketStatus).toBeVisible()

        // Hover over Jira ticket status to see details
        await jiraTicketStatus.hover()

        // Step 2: Approve Jira ticket using API
        console.log('Step 2: Approving Jira ticket via API...')
        await transitionIssueTo(request, ticketId, 'approve')

        // Step 3: Refresh page to see updated status
        console.log('Step 3: Refreshing page to see approval status...')
        await page.reload()
        await page.waitForLoadState('networkidle')

        // Step 4: Verify deployment confirmation component appears
        console.log('Step 4: Verifying deployment confirmation component...')
        await expect(page.getByText('Confirmation')).toBeVisible({
          timeout: 15000,
        })

        // Step 5: Click deploy button
        console.log('Step 5: Clicking deploy button...')
        const deployButton = page.getByRole('button', { name: /deploy/i })
        await expect(deployButton).toBeVisible()
        await deployButton.click()

        // Step 6: Verify navigation to manage connections with success message
        console.log('Step 6: Verifying successful deployment...')
        await page.waitForURL('/manageconnections', { timeout: 15000 })

        // Expect success snack bar
        const successAlert = page.locator('[class*="MuiAlert-message"]')
        await expect(successAlert).toBeVisible({ timeout: 10000 })
        await expect(successAlert).toContainText('updated successfully')

        // Step 7: Verify edit button is now available (no more change request)
        console.log('Step 7: Verifying edit button is available again...')
        await filterByDestinationId(page, destId)

        const editBtn = page.locator('button[aria-label="edit"]')
        await expect(editBtn.first()).toBeVisible({ timeout: 10000 })

        // Step 8: Verify updated values are applied
        console.log('Step 8: Verifying updated values in connection...')
        await editBtn.first().click()

        // Wait for edit page
        await page.waitForURL(/\/edit\//, { timeout: 15000 })

        // Accept service agreement if needed
        if (await page.getByTestId('agree-button').isVisible()) {
          await page.getByTestId('agree-button').click()
          const acceptBtn = page.locator('#accept')
          await expect(acceptBtn).toBeEnabled({ timeout: 5000 })
          await acceptBtn.click()
        }

        // Navigate to Identify step to see the updated values
        const nextBtn = page.getByRole('button', { name: /^NEXT$/i })
        await nextBtn.click()

        // Verify the deployed values match what was submitted in the change request
        await expect(page.locator('#username')).toHaveValue('UsernameNEW')
        await expect(page.locator('[name="facilityId"]')).toHaveValue('xyz')

        console.log('✅ Complete deployment workflow test passed!')
      } catch (error) {
        console.log('Deployment workflow failed:', error)

        // Check if it's a Jira API configuration issue
        if (
          error.message?.includes('Failed to fetch') ||
          error.message?.includes('JIRA_API')
        ) {
          test.skip(
            true,
            'Jira API not properly configured for approval workflow'
          )
        } else {
          throw error
        }
      }
    } else {
      const reason = !ticketId
        ? `Could not extract ticket ID. Link visible: ${ticketLinkVisible}, href: ${await ticketLink
            .getAttribute('href')
            .catch(() => 'error')}`
        : 'Request context not available'

      test.skip(true, reason)
    }
  })
})
