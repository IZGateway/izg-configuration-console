/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import { InferGetServerSidePropsType } from 'next'
import ErrorBoundary from '../../components/ErrorBoundary'
import Container from '../../components/Container'
import AppHeaderBar from '../../components/AppHeader'
import PasswordEncryptionConsole from '../../components/PasswordEncryptionConsole'
import AccessDenied from '../../components/AccessDenied'
import { withPageAccess } from '../../lib/security/pageAccessGate'

const PasswordEncryption = ({
  accessDenied,
  hasKeyName,
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  if (accessDenied) return <AccessDenied title="Password Encryption" />

  return (
    <Container title="Manage Connections">
      <AppHeaderBar open />
      <ErrorBoundary>
        <PasswordEncryptionConsole hasKeyName={hasKeyName} />
      </ErrorBoundary>
    </Container>
  )
}

// Uses the `adminoperations` page key rather than one of its own: this page
// duplicates the Admin Operations password card, so a separate key would mean
// two capabilities that must always be granted together.
export const getServerSideProps = withPageAccess<
  'adminoperations',
  { hasKeyName: boolean }
>('adminoperations', async () => {
  const hasKeyName = !!process.env.DB_ENCRYPTION_KEYNAME?.trim()
  return { props: { hasKeyName } }
})

export default PasswordEncryption
