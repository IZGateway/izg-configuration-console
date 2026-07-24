import * as React from 'react'
import { GetServerSideProps } from 'next'
import Container from '../../components/Container'
import AppHeaderBar from '../../components/AppHeader'
import ErrorBoundary from '../../components/ErrorBoundary'
import AdminOperations from '../../components/AdminOperations'
import AdminGuard from '../../components/AdminGuard'
import {
  getCircuitBreakerResetEnvironments,
  type CircuitBreakerResetEnvironment,
} from '../../lib/utils/izghubcircuitbreakerreset'

interface AdminOperationsPageProps {
  hasKeyName: boolean
  circuitBreakerResetEnvironments: CircuitBreakerResetEnvironment[]
}

const AdminOperationsPage = ({
  hasKeyName,
  circuitBreakerResetEnvironments,
}: AdminOperationsPageProps) => {
  return (
    <Container title="Admin Operations">
      <AppHeaderBar open />
      <ErrorBoundary>
        <AdminOperations
          hasKeyName={hasKeyName}
          circuitBreakerResetEnvironments={circuitBreakerResetEnvironments}
        />
      </ErrorBoundary>
    </Container>
  )
}

export const getServerSideProps: GetServerSideProps<
  AdminOperationsPageProps
> = async () => {
  const hasKeyName = !!process.env.DB_ENCRYPTION_KEYNAME?.trim()
  const circuitBreakerResetEnvironments = getCircuitBreakerResetEnvironments()
  return { props: { hasKeyName, circuitBreakerResetEnvironments } }
}

export default AdminGuard(AdminOperationsPage)
