import React from 'react'
import { useRouter } from 'next/router'
import Container from '../../../components/Container'
import ErrorBoundary from '../../../components/ErrorBoundary'
import AdminGuard from '../../../components/AdminGuard'
import EditSenderAccess from '../../../components/AccessControl/EditSenderAccess'

const EditSenderAccessPage = () => {
  const router = useRouter()
  const { isReady, query } = router
  const Guarded = AdminGuard(EditSenderAccess)

  if (!isReady) return <>Loading...</>

  const id = (query.id as string) || ''

  return (
    <Container title="Edit Sender Access">
      <ErrorBoundary>
        <Guarded senderId={id} />
      </ErrorBoundary>
    </Container>
  )
}

export default EditSenderAccessPage
