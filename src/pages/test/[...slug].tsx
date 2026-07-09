import * as React from 'react'
import TestConnection from '../../components/TestConnection'
import ErrorBoundary from '../../components/ErrorBoundary'
import Container from '../../components/Container'
import { InferGetServerSidePropsType } from 'next'
import _ from 'lodash'
import connectionTest from '../../lib/connectiontests'
import DbClientFactory from '../../lib/db/DbClientFactory'
import { withRequestContext } from '../../lib/requestContext'

// The whole read runs inside the request context (via withRequestContext) so
// its logs — and the connection test's logs — carry sessionUser, the same way
// API routes do (IGDD-2223). The existing userContext block is preserved.
export const getServerSideProps = withRequestContext(
  async (context, requestContext) => {
    const slug = (context.query.slug as string[]) || []
    const destId = slug[1]
    const destTypeId = _.toNumber(slug[0])
    const session = requestContext.session
    if (!session?.user) {
      return { redirect: { destination: '/api/auth/signin', permanent: false } }
    }
    const dbClient = await DbClientFactory.getDbClient()
    const destinationToTest = await dbClient.fetchDestination(
      destId?.toString(),
      destTypeId
    )
    const { connectionTestResult, numberOfTests } = await connectionTest(
      destinationToTest,
      {
        name: session.user.name,
        email: session.user.email,
        id: session.user.id,
      }
    )
    return {
      props: { connectionTestResult, numberOfTests },
    }
  }
)

const Test = (
  props: InferGetServerSidePropsType<typeof getServerSideProps>
) => {
  return (
    <Container title="Test Connection">
      <ErrorBoundary>
        <TestConnection
          connectionTestResult={props.connectionTestResult}
          numberOfTests={props.numberOfTests}
        />
      </ErrorBoundary>
    </Container>
  )
}

export default Test
