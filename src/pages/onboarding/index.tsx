import React from 'react'
import Container from '../../components/Container'
import OnboardSender from '../../components/Onboarding'
import ErrorBoundary from '../../components/ErrorBoundary'
import AppHeaderBar from '../../components/AppHeader'
import { InferGetServerSidePropsType } from 'next'
import { SerializedAllowedUser } from '../../lib/type/AllowedUser'
import AccessDenied from '../../components/AccessDenied'
import { withPageAccess } from '../../lib/security/pageAccessGate'
import logger from '../../../logger'

const OnboardingPage = (
  props: InferGetServerSidePropsType<typeof getServerSideProps>
) => {
  if (props.accessDenied) return <AccessDenied title="Onboarding" />

  return (
    <Container title="Onboarding">
      <AppHeaderBar open />
      <ErrorBoundary>
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
export const getServerSideProps = withPageAccess<
  'onboarding',
  {
    allowedUsers: SerializedAllowedUser[]
    error?: string
  }
>('onboarding', async (context) => {
  try {
    // Use API endpoint instead of direct database access
    const protocol = context.req.headers['x-forwarded-proto'] || 'http'
    const host = context.req.headers.host
    const baseUrl = process.env.NEXTAUTH_URL || `${protocol}://${host}`

    const response = await fetch(`${baseUrl}/api/allowedusers/bydestination`, {
      headers: {
        cookie: context.req.headers.cookie || '',
      },
    })

    if (!response.ok) {
      throw new Error(
        `Failed to fetch allowed users: ${response.status} ${response.statusText}`
      )
    }

    const allowedUsers: SerializedAllowedUser[] = await response.json()

    return {
      props: {
        allowedUsers,
      },
    }
  } catch (error) {
    logger.error('Error fetching allowed users for onboarding page', {
      error: error instanceof Error ? error.message : 'Unknown error',
      // Node's fetch reports every transport failure as the bare message
      // "fetch failed" and puts the actual reason on `cause` — TLS rejection,
      // DNS, connection refused. Without this the log says nothing useful:
      // locally, where nginx serves a self-signed cert generated in
      // local-docker/Dockerfile and NEXTAUTH_URL is https://localhost, the
      // cause is certificate verification, which looks nothing like a
      // permission problem but is easily mistaken for one.
      cause:
        error instanceof Error && error.cause instanceof Error
          ? error.cause.message
          : undefined,
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
