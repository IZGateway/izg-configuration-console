import * as React from 'react'
import Container from '../../components/Container'
import AppHeaderBar from '../../components/AppHeader'
import ErrorBoundary from '../../components/ErrorBoundary'
import ApiKeyManagement from '../../components/ApiKeyManagement'
import ApiKeyAccessGuard from '../../components/ApiKeyAccessGuard'

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
