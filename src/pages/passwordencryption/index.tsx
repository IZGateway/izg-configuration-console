/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import ErrorBoundary from '../../components/ErrorBoundary'
import Container from '../../components/Container'
import AppHeaderBar from '../../components/AppHeader'
import PasswordEncryptionConsole from '../../components/PasswordEncryptionConsole'

const PasswordEncryption = () => {
  return (
    <Container title="Manage Connections">
      <AppHeaderBar open />
      <ErrorBoundary>
        <PasswordEncryptionConsole />
      </ErrorBoundary>
    </Container>
  )
}

export default PasswordEncryption
