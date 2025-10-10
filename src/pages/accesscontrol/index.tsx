/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import ErrorBoundary from '../../components/ErrorBoundary'
import Container from '../../components/Container'
import AppHeaderBar from '../../components/AppHeader'
import AccessControlComponent from '../../components/AccessControl'
const AccessControl = () => {
  return (
    <Container title="Access Control">
      <AppHeaderBar open />
      <ErrorBoundary>
        <AccessControlComponent hasKeyName={true} />
      </ErrorBoundary>
    </Container>
  )
}

export default AccessControl
