import React from 'react'
import Container from '../../components/Container'
import OnboardSender from '../../components/Onboarding'
import ErrorBoundary from '../../components/ErrorBoundary'
import AppHeaderBar from '../../components/AppHeader'
import { InferGetServerSidePropsType } from 'next'
import { SerializedAllowedUser } from '../../lib/type/AllowedUser'
import { withRequestContext } from '../../lib/requestContext'
import logger from '../../../logger'

const OnboardingPage = (
  props: InferGetServerSidePropsType<typeof getServerSideProps>
) => {
  return (
    <Container title="Onboarding">
      <AppHeaderBar open />
      <ErrorBoundary>
        <OnboardSender allowedUsers={props.allowedUsers} />
      </ErrorBoundary>
    </Container>
  )
}

export const getServerSideProps = withRequestContext<{
  allowedUsers: SerializedAllowedUser[]
  error?: string
}>(async (context, requestContext) => {
  try {
    const session = requestContext.session

    // Check if session exists before accessing user properties
    if (!session?.user) {
      logger.warn('Unauthorized access attempt to onboarding page')
      return {
        redirect: {
          destination: '/api/auth/signin',
          permanent: false,
        },
      }
    }

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
