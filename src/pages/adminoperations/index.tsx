import * as React from 'react'
import { GetServerSideProps } from 'next'
import Container from '../../components/Container'
import AppHeaderBar from '../../components/AppHeader'
import ErrorBoundary from '../../components/ErrorBoundary'
import AdminOperations from '../../components/AdminOperations'
import AdminGuard from '../../components/AdminGuard'
import {
  getHubEnvironments,
  type HubEnvironment,
} from '../../lib/utils/izghubenvironments'

interface AdminOperationsPageProps {
  hasKeyName: boolean
  hubEnvironments: HubEnvironment[]
}

const AdminOperationsPage = ({
  hasKeyName,
  hubEnvironments,
}: AdminOperationsPageProps) => {
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

export const getServerSideProps: GetServerSideProps<
  AdminOperationsPageProps
> = async () => {
  const hasKeyName = !!process.env.DB_ENCRYPTION_KEYNAME?.trim()
  const hubEnvironments = getHubEnvironments()
  return { props: { hasKeyName, hubEnvironments } }
}

export default AdminGuard(AdminOperationsPage)
