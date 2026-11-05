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
    <Container title="Password Encryption">
      <AppHeaderBar open />
      <ErrorBoundary>
        <PasswordEncryptionConsole hasKeyName={hasKeyName} />
      </ErrorBoundary>
    </Container>
  )
}

// Gated on its `ROUTE_ENTRY` row in accessregistry, not a `PAGE_ENTRY` key:
// this page shares the `adminoperations` block but is entered on
// `canManagePasswordEncryption`, which only IZG Security holds (IGDD-3498).
export const getServerSideProps = withPageAccess<
  'passwordencryption',
  { hasKeyName: boolean }
>('passwordencryption', async () => {
  const hasKeyName = !!process.env.DB_ENCRYPTION_KEYNAME?.trim()
  return { props: { hasKeyName } }
})

export default PasswordEncryption
