import * as React from 'react'
import { Box } from '@mui/material'
import Close from '../Close'
import CustomSnackbar from '../SnackBar'
import CombinedContext from '../../contexts/app'
import PasswordEncryptionCard from './PasswordEncryptionCard'
import CircuitBreakerCard from './CircuitBreakerCard'
import DatabaseRefreshCard from './DatabaseRefreshCard'
import InfoPanel from './InfoPanel'
import useRoleAccess from '../../lib/security/useRoleAccess'
import type { HubEnvironment } from '../../lib/utils/izghubenvironments'
import PageHeader from '../PageHeader'

interface AdminOperationsProps {
  hasKeyName: boolean
  hubEnvironments: HubEnvironment[]
}

// Two-column responsive grid: operation card on the left, info panel on the right.
const rowSx = {
  display: 'grid',
  gridTemplateColumns: { xs: '1fr', lg: '2fr 1fr' },
  gap: 4,
  mb: 4,
} as const

const AdminOperations = ({
  hasKeyName,
  hubEnvironments,
}: AdminOperationsProps) => {
  const { setAlert, alert } = React.useContext(CombinedContext)
  const [showSnackbar, setShowSnackbar] = React.useState(false)
  // Three action flags from one call. Entering the page does not imply
  // permission to act on it: a user may hold canViewAdminOperations and none
  // of these, in which case the page renders with no operation cards.
  const {
    canManagePasswordEncryption,
    canResetHubCircuitBreakers,
    canRefreshHubDatabase,
  } = useRoleAccess('adminoperations')

  // IGDD-3599: `warning` is the level for a reset that reached some Hub
  // regions and not others. `persistent` rides along on the alert and is
  // honoured below; `Alert.level` in contexts/app.tsx is already `string`, so
  // only this inline union needed widening.
  const handleResult = (result: {
    level: 'success' | 'warning' | 'error'
    message: string
    persistent?: boolean
  }) => {
    setAlert(result)
    setShowSnackbar(true)
  }

  const handleCloseSnackbar = () => {
    setShowSnackbar(false)
    setAlert({ level: '', message: '' })
  }

  return (
    <>
      <Close />
      {/* Page header */}
      <PageHeader
        title="Admin Operations"
        subtitle="Secure credentials, restore connections, and manage configurations."
        sx={{ mb: 4 }}
      />

      {/* Password Encryption. Gated on the capability alone. `hasKeyName` is a
          configuration precondition, not a permission, and is forwarded to the
          card to decide what to show — it is deliberately NOT part of this
          condition, so a missing DB_ENCRYPTION_KEYNAME still renders the card.
          (An earlier version of this comment claimed the two were ANDed. They
          are not. Raised by review on PR #700.) */}
      {canManagePasswordEncryption && (
        <Box sx={rowSx}>
          <PasswordEncryptionCard
            hasKeyName={hasKeyName}
            onResult={handleResult}
          />
          <InfoPanel
            title="Details & Critical Security Operations"
            note="*Please ensure you have proper database backups before proceeding."
            rows={[
              { label: 'Algorithm', value: 'AES-256-GCM' },
              { label: 'Key Provider', value: 'AWS KMS / HSM' },
              { label: 'Isolation', value: 'Environment-scoped' },
            ]}
          />
        </Box>
      )}

      {/* Circuit Breaker Reset — the HUB-WIDE reset. Deliberately a different
          capability from manageconnections.canResetCircuitBreaker, which
          covers the per-destination reset. */}
      {canResetHubCircuitBreakers && (
        <Box sx={{ mb: 4 }}>
          <CircuitBreakerCard
            environments={hubEnvironments}
            onResult={handleResult}
          />
        </Box>
      )}

      {/* Database Refresh */}
      {canRefreshHubDatabase && (
        <Box sx={rowSx}>
          <DatabaseRefreshCard
            environments={hubEnvironments}
            onResult={handleResult}
          />
          <InfoPanel
            title="Configuration Sync"
            note="Reloads the selected hub environment's configuration from the database."
            rows={[
              { label: 'Scope', value: 'Selected hub environment' },
              { label: 'Requires restart', value: 'No' },
            ]}
          />
        </Box>
      )}

      {/* IGDD-3566: an alert marked persistent waits for a dismissal. A
          partial circuit breaker reset uses it, so the region that did not
          complete does not scroll past on a 6 second timer. */}
      <CustomSnackbar
        open={showSnackbar}
        severity={alert.level}
        message={alert.message}
        onClose={handleCloseSnackbar}
        autoHideDuration={alert.persistent ? null : undefined}
      />
    </>
  )
}

export default AdminOperations
