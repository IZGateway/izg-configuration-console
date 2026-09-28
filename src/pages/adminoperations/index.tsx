import * as React from 'react'
import { InferGetServerSidePropsType } from 'next'
import Container from '../../components/Container'
import AppHeaderBar from '../../components/AppHeader'
import ErrorBoundary from '../../components/ErrorBoundary'
import AdminOperations from '../../components/AdminOperations'
import AccessDenied from '../../components/AccessDenied'
import { withPageAccess } from '../../lib/security/pageAccessGate'
import {
  getHubEnvironments,
  type HubEnvironment,
} from '../../lib/utils/izghubenvironments'

// A `type` alias, not an `interface`: withRequestContext takes
// `P extends Record<string, unknown>`, and an interface gets no implicit index
// signature while a type alias does.
type AdminOperationsPageProps = {
  hasKeyName: boolean
  hubEnvironments: HubEnvironment[]
}

const AdminOperationsPage = ({
  accessDenied,
  hasKeyName,
  hubEnvironments,
}: InferGetServerSidePropsType<typeof getServerSideProps>) => {
  if (accessDenied) return <AccessDenied title="Admin Operations" />

  return (
    <Container title="Admin Operations">
      <AppHeaderBar open />
      <ErrorBoundary>
        <AdminOperations
          hasKeyName={hasKeyName}
          hubEnvironments={hubEnvironments}
        />
      </ErrorBoundary>
    </Container>
  )
}

// Guarded only by AdminGuard before IGDD-3472 — a client-side useEffect
// redirect, which means the page and its props were server-rendered and sent
// before anything checked. The gate now runs before the handler below, so a
// denied user never reaches getHubEnvironments at all.
export const getServerSideProps = withPageAccess<
  'adminoperations',
  AdminOperationsPageProps
>('adminoperations', async () => {
  const hasKeyName = !!process.env.DB_ENCRYPTION_KEYNAME?.trim()
  const hubEnvironments = getHubEnvironments()
  return { props: { hasKeyName, hubEnvironments } }
})

export default AdminOperationsPage
