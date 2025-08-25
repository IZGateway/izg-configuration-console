import * as React from 'react'
import TestConnection from '../../components/TestConnection'
import ErrorBoundary from '../../components/ErrorBoundary'
import Container from '../../components/Container'
import { getServerSession } from 'next-auth'
import { authOptions } from '../api/auth/[...nextauth]'
import { InferGetServerSidePropsType } from 'next'
import _ from 'lodash'
import connectionTest from '../../lib/connectiontests'
import DbClientFactory from '../../lib/db/DbClientFactory'

export async function getServerSideProps(context) {
  const { req, res } = context
  const destId = context.query.slug[1]
  const destTypeId = _.toNumber(context.query.slug[0])
  const session = await getServerSession(req, res, authOptions)
  const dbClient = await DbClientFactory.getDbClient()
  const destinationToTest = await dbClient.fetchDestination(
    destId?.toString(),
    destTypeId
  )
  const { connectionTestResult, numberOfTests } = await connectionTest(
    destinationToTest,
    session.user.email
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
