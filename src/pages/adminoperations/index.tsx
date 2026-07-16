import * as React from 'react'
import { GetServerSideProps } from 'next'
import Container from '../../components/Container'
import AppHeaderBar from '../../components/AppHeader'
import ErrorBoundary from '../../components/ErrorBoundary'
import AdminOperations from '../../components/AdminOperations'
import AdminGuard from '../../components/AdminGuard'

const AdminOperationsPage = ({ hasKeyName }: { hasKeyName: boolean }) => {
  return (
    <Container title="Admin Operations">
      <AppHeaderBar open />
      <ErrorBoundary>
        <AdminOperations hasKeyName={hasKeyName} />
      </ErrorBoundary>
    </Container>
  )
}

export const getServerSideProps: GetServerSideProps<{
  hasKeyName: boolean
}> = async () => {
  const hasKeyName = !!process.env.DB_ENCRYPTION_KEYNAME?.trim()
  return { props: { hasKeyName } }
}

export default AdminGuard(AdminOperationsPage)
