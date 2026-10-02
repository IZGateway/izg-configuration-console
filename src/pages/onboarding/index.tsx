import React from 'react'
import { Alert } from '@mui/material'
import Container from '../../components/Container'
import OnboardSender from '../../components/Onboarding'
import ErrorBoundary from '../../components/ErrorBoundary'
import AppHeaderBar from '../../components/AppHeader'
import { InferGetServerSidePropsType } from 'next'
import {
  SerializedAllowedUser,
  serializeAllowedUser,
} from '../../lib/type/AllowedUser'
import AccessDenied from '../../components/AccessDenied'
import { withPageAccess } from '../../lib/security/pageAccessGate'
import DbClientFactory from '../../lib/db/DbClientFactory'
import isOperationsRole from '../../lib/security/accessutils'
import logger from '../../../logger'

const OnboardingPage = (
  props: InferGetServerSidePropsType<typeof getServerSideProps>
) => {
  if (props.accessDenied) return <AccessDenied title="Onboarding" />

  return (
    <Container title="Onboarding">
      <AppHeaderBar open />
      <ErrorBoundary>
        {props.error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {props.error}
          </Alert>
        )}
        <OnboardSender allowedUsers={props.allowedUsers} />
      </ErrorBoundary>
    </Container>
  )
}

// Checked session presence and no capability before IGDD-3472, so any
// authenticated user reached it by URL — including Sender Operations, which
// holds canViewOnboarding: false. The gate now covers both the page and the
// three allowed-user routes behind it, so the write endpoints are closed too,
// not just the page.
//
// Reads the DB directly, like manageconnections, rather than calling
// /api/allowedusers/bydestination over HTTP (IGDD-3469). That server-side
// self-fetch carried only the session cookie, never a DPoP proof, so once the
// browser had bound its key the middleware redirected it to the sign-in page
// and the page rendered an empty grid. Row scoping matches the API route.
export const getServerSideProps = withPageAccess<
  'onboarding',
  {
    allowedUsers: SerializedAllowedUser[]
    error?: string
  }
>('onboarding', async (context, requestContext) => {
  const session = requestContext.session

  try {
    const dbClient = await DbClientFactory.getDbClient()
    const allowedUsers = await dbClient.fetchAllowedUsersByDestination(
      isOperationsRole(session.user.roles),
      session.user.jurisdictions || []
    )

    return {
      props: {
        allowedUsers: allowedUsers.map(serializeAllowedUser),
      },
    }
  } catch (error) {
    logger.error('Error fetching allowed users for onboarding page', {
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined,
    })

    // Return error state instead of silently returning empty array
    return {
      props: {
        allowedUsers: [],
        error: 'Failed to load onboarding data. Please try again later.',
      },
    }
  }
})

export default OnboardingPage
