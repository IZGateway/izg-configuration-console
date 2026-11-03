import * as React from 'react'
import TestConnection from '../../components/TestConnection'
import ErrorBoundary from '../../components/ErrorBoundary'
import Container from '../../components/Container'
import AccessDenied from '../../components/AccessDenied'
import { InferGetServerSidePropsType } from 'next'
import _ from 'lodash'
import connectionTest from '../../lib/connectiontests'
import DbClientFactory from '../../lib/db/DbClientFactory'
import { withPageAccess } from '../../lib/security/pageAccessGate'
import hasAccessToDestId from '../../lib/accesshelper'

// The whole read runs inside the request context (via withPageAccess, which
// wraps withRequestContext) so its logs — and the connection test's logs —
// carry sessionUser, the same way API routes do (IGDD-2223). The existing
// userContext block is preserved. The session/sign-in check this page used to
// do manually is now withPageAccess's job, same as the access-denied check.
//
// `test.canRunConnectionTest` is a page-entry capability, which
// `withPageAccess` (like every page gate) checks with ANY_JURISDICTION, not
// REQUIRES_DESTINATION_SCOPE — page entry is not a data path. This page is
// the data path: it fetches one specific destination (named in the URL slug)
// and runs a live connection test against it, so it needs its own reach
// check, same as changerequest/[...slug].tsx already does for the same
// reason.
export const getServerSideProps = withPageAccess<
  'test',
  { connectionTestResult: unknown; numberOfTests: number }
>('test', async (context, requestContext) => {
  const slug = (context.query.slug as string[]) || []
  const destId = slug[1]
  const destTypeId = _.toNumber(slug[0])
  const session = requestContext.session
  if (!destId || Number.isNaN(destTypeId)) {
    return { notFound: true }
  }
  if (!hasAccessToDestId(destId, session)) {
    return { notFound: true }
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
})

const Test = (
  props: InferGetServerSidePropsType<typeof getServerSideProps>
) => {
  if (props.accessDenied) return <AccessDenied title="Test Connection" />

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
