import * as React from 'react'
import ConnectionsTable from '../../components/ConnectionTable'
import ErrorBoundary from '../../components/ErrorBoundary'
import Container from '../../components/Container'
import { useEffect, useState, useContext } from 'react'
import CustomSnackbar from '../../components/SnackBar'
import CombinedContext from '../../contexts/app'
import _ from 'lodash'

const Manage = () => {
  const { alert } = useContext(CombinedContext)
  const [showSnackbar, setShowSnackbar] = useState(false)

  useEffect(() => {
    if (_.isEmpty(alert.level)) {
      setShowSnackbar(true)
    }
  }, [alert])

  const renderMessage = (level, jurisdiction, destType) => {
    switch (level) {
      case 'error':
        return `Error creating change request ticket for ${jurisdiction} on environment ${destType}. Please try again later!`
      case 'success':
        return `Change request is created successfully for ${jurisdiction} on environment ${destType}!`
    }
  }
  return (
    <Container title="Manage Connections">
      <ErrorBoundary>
        <ConnectionsTable />
        {showSnackbar && (
          <CustomSnackbar
            severity={alert.level}
            message={renderMessage(
              alert.level,
              alert.jurisdiction,
              alert.dest_type
            )}
          />
        )}
      </ErrorBoundary>
    </Container>
  )
}

export default Manage
