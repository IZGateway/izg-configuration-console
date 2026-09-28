import * as React from 'react'
import { GetServerSideProps, InferGetServerSidePropsType } from 'next'
import Container from '../../components/Container'
import AppHeaderBar from '../../components/AppHeader'
import ErrorBoundary from '../../components/ErrorBoundary'
import ApiKeyManagement from '../../components/ApiKeyManagement'
import AccessDenied from '../../components/AccessDenied'
import { withPageAccess } from '../../lib/security/pageAccessGate'
import { isApiKeyManagementEnabled } from '../../lib/security/apiKeyAuthz'

const gate = withPageAccess('apikeys')

export const getServerSideProps: GetServerSideProps = async (context) => {
  // The feature-wide kill switch runs BEFORE the capability gate, deliberately.
  // When the feature is off the page does not exist for anyone, which is what
  // `notFound` says. Putting this inside the gate would show an access-denied
  // message for a disabled feature — and would tell a user without the
  // capability that the page exists at all. See apiKeyAuthz.ts.
  if (!isApiKeyManagementEnabled()) {
    return { notFound: true }
  }
  return gate(context)
}

const ApiKeys = ({
  accessDenied,
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  // Was ApiKeyAccessGuard, a client-side useEffect that pushed non-holders to
  // /manageconnections (IGDD-3472). Two problems with that: the page and its
  // props were server-rendered and sent before anything checked, and a silent
  // redirect is indistinguishable from a broken link — no message, no audit
  // event. The capability checked is the same one, canListApiKeys.
  if (accessDenied) return <AccessDenied title="API Key Management" />

  return (
    <Container title="API Key Management">
      <AppHeaderBar open />
      <ErrorBoundary>
        <ApiKeyManagement />
      </ErrorBoundary>
    </Container>
  )
}

export default ApiKeys
