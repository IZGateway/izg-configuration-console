/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from 'react'
import { InferGetServerSidePropsType } from 'next'
import ErrorBoundary from '../../components/ErrorBoundary'
import Container from '../../components/Container'
import AppHeaderBar from '../../components/AppHeader'
import AccessControlComponent from '../../components/AccessControl'
import AccessDenied from '../../components/AccessDenied'
import { withPageAccess } from '../../lib/security/pageAccessGate'

const AccessControl = ({
  accessDenied,
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  if (accessDenied) return <AccessDenied title="Access Control" />

  return (
    <Container title="Access Control">
      <AppHeaderBar open />
      <ErrorBoundary>
        <AccessControlComponent />
      </ErrorBoundary>
    </Container>
  )
}

// Had no access check of any kind before IGDD-3472 — the nav link was hidden
// for non-admins, but typing the URL rendered the page.
export const getServerSideProps = withPageAccess('accesscontrol')

export default AccessControl
