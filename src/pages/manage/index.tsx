import * as React from 'react'
import ConnectionsTable from '../../components/ConnectionTable'
import ErrorBoundary from '../../components/ErrorBoundary'
import Container from '../../components/Container'
import { useEffect, useState } from 'react'
import CustomSnackbar from '../../components/SnackBar'
import { useRouter } from 'next/router'

const Manage = () => {
  const router = useRouter()
  const [showSnackbar, setShowSnackbar] = useState(false)
  const query = router.query
  useEffect(() => {
    if (query.alert) {
      setShowSnackbar(true)
    }
  }, [query, query.alert])

  const renderMessage = (severity) => {
    switch (severity) {
      case 'error':
        return 'Error creating change request. Please try again later!'
      case 'success':
        return 'Change request is created successfully!'
    }
  }
  return (
    <Container title="Manage Connections">
      <ErrorBoundary>
        <ConnectionsTable />
        {showSnackbar && (
          <CustomSnackbar
            severity={query.alert}
            message={renderMessage(query.alert)}
          />
        )}
      </ErrorBoundary>
    </Container>
  )
}

export default Manage
