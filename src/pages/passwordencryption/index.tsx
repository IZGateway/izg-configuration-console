/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import ErrorBoundary from '../../components/ErrorBoundary'
import Container from '../../components/Container'
import AppHeaderBar from '../../components/AppHeader'
import PasswordEncryptionConsole from '../../components/PasswordEncryptionConsole'
import { GetServerSideProps } from 'next'

const PasswordEncryption = ({ hasKeyName }) => {
  return (
    <Container title="Manage Connections">
      <AppHeaderBar open />
      <ErrorBoundary>
        <PasswordEncryptionConsole hasKeyName={hasKeyName} />
      </ErrorBoundary>
    </Container>
  )
}

export const getServerSideProps: GetServerSideProps<{
  hasKeyName: boolean
}> = async () => {
  const hasKeyName = !!process.env.DDB_ENCRYPTION_KEYNAME?.trim()
  return { props: { hasKeyName } }
}

export default PasswordEncryption
