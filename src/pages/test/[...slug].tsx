import * as React from 'react'
import TestConnection from '../../components/TestConnection'
import ErrorBoundary from '../../components/ErrorBoundary'
import Container from '../../components/Container'
import { InferGetServerSidePropsType } from 'next'
import _ from 'lodash'
import connectionTest from '../../lib/connectiontests'
import DbClientFactory from '../../lib/db/DbClientFactory'
import { asyncRequestContext } from '../../lib/Context'
import { buildRequestContext } from '../../lib/requestContext'

export async function getServerSideProps(context) {
  const { req, res } = context
  const destId = context.query.slug[1]
  const destTypeId = _.toNumber(context.query.slug[0])
  const requestContext = await buildRequestContext(req, res)
  const session = requestContext.session
  // Run the read inside the request context so its logs (and the connection
  // test's logs) carry sessionUser, the same way API routes do (IGDD-2223).
  const { connectionTestResult, numberOfTests } = await asyncRequestContext.run(
    requestContext,
    async () => {
      const dbClient = await DbClientFactory.getDbClient()
      const destinationToTest = await dbClient.fetchDestination(
        destId?.toString(),
        destTypeId
      )
      return connectionTest(destinationToTest, {
        name: session.user.name,
        email: session.user.email,
        id: session.user.id,
      })
    }
  )
  return {
    props: { connectionTestResult, numberOfTests },
  }
}

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
