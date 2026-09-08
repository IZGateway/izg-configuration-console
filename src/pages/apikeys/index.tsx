import * as React from 'react'
import { GetServerSideProps } from 'next'
import Container from '../../components/Container'
import AppHeaderBar from '../../components/AppHeader'
import ErrorBoundary from '../../components/ErrorBoundary'
import ApiKeyManagement from '../../components/ApiKeyManagement'
import ApiKeyAccessGuard from '../../components/ApiKeyAccessGuard'
import { isApiKeyManagementEnabled } from '../../lib/security/apiKeyAuthz'

// Feature-wide kill switch, checked server-side before the page (or its
// client-side role guard) ever renders — so a direct URL visit 404s instead
// of showing a page that then errors on every API call. See apiKeyAuthz.ts.
export const getServerSideProps: GetServerSideProps = async () => {
  if (!isApiKeyManagementEnabled()) {
    return { notFound: true }
  }
  return { props: {} }
}

const ApiKeys = () => {
  return (
    <Container title="API Key Management">
      <AppHeaderBar open />
      <ErrorBoundary>
        <ApiKeyManagement />
      </ErrorBoundary>
    </Container>
  )
}

export default ApiKeyAccessGuard(ApiKeys)
