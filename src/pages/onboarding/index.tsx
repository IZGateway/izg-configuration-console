import React from 'react'
import Container from '../../components/Container'
import OnboardSender from '../../components/Onboarding'
import ErrorBoundary from '../../components/ErrorBoundary'
import AppHeaderBar from '../../components/AppHeader'
import { InferGetServerSidePropsType } from 'next'
import DbClientFactory from '../../lib/db/DbClientFactory'
import { SerializedAllowedUser } from '../../lib/type/AllowedUser'

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

export const getServerSideProps = async () => {
  try {
    // Fetch allowed users directly from database
    const dbClient = await DbClientFactory.getDbClient()
    const allowedUsers = await dbClient.fetchAllowedUsers()

    // Convert Date objects to ISO strings for serialization
    const serializedUsers: SerializedAllowedUser[] = allowedUsers.map(
      (user) => ({
        principal: user.principal,
        environment: user.environment,
        destinationId: user.destinationId,
        enabled: user.enabled,
        createdBy: user.createdBy,
        createdOn: user.createdOn?.toISOString(),
        updatedBy: user.updatedBy,
        updatedOn: user.updatedOn?.toISOString(),
        validatedOn: user.validatedOn?.toISOString(),
      })
    )

    return {
      props: {
        allowedUsers: serializedUsers,
      },
    }
  } catch (error) {
    console.error('Error fetching allowed users:', error)
    return {
      props: {
        allowedUsers: [],
      },
    }
  }
}

export default OnboardingPage
