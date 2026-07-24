import * as React from 'react'
import { Box, Typography, Card, CardContent } from '@mui/material'
import Close from '../Close'
import CustomSnackbar from '../SnackBar'
import CombinedContext from '../../contexts/app'
import PasswordEncryptionCard from './PasswordEncryptionCard'
import CircuitBreakerCard from './CircuitBreakerCard'
import DatabaseRefreshCard from './DatabaseRefreshCard'
import InfoPanel from './InfoPanel'
import type { CircuitBreakerResetEnvironment } from '../../lib/utils/izghubcircuitbreakerreset'

interface AdminOperationsProps {
  hasKeyName: boolean
  circuitBreakerResetEnvironments: CircuitBreakerResetEnvironment[]
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
  circuitBreakerResetEnvironments,
}: AdminOperationsProps) => {
  const { setAlert, alert } = React.useContext(CombinedContext)
  const [showSnackbar, setShowSnackbar] = React.useState(false)

  const handleResult = (result: {
    level: 'success' | 'error'
    message: string
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
      <Card elevation={2} sx={{ borderRadius: 3, mb: 4 }}>
        <CardContent sx={{ p: 4 }}>
          <Typography variant="h3" component="h1" fontWeight={700}>
            Admin Operations
          </Typography>
          <Typography variant="h6" component="p" color="text.secondary">
            Secure credentials, restore connections, and manage configurations
          </Typography>
        </CardContent>
      </Card>

      {/* Password Encryption */}
      <Box sx={rowSx}>
        <PasswordEncryptionCard hasKeyName={hasKeyName} onResult={handleResult} />
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

      {/* Circuit Breaker Reset */}
      <Box sx={{ mb: 4 }}>
        <CircuitBreakerCard
          environments={circuitBreakerResetEnvironments}
          onResult={handleResult}
        />
      </Box>

      {/* Database Refresh */}
      <Box sx={rowSx}>
        <DatabaseRefreshCard onResult={handleResult} />
        <InfoPanel
          title="Configuration Sync"
          note="Reloads each hub's configuration from the database across all environments."
          rows={[
            { label: 'Scope', value: 'All hub environments' },
            { label: 'Requires restart', value: 'No' },
          ]}
        />
      </Box>

      <CustomSnackbar
        open={showSnackbar}
        severity={alert.level}
        message={alert.message}
        onClose={handleCloseSnackbar}
      />
    </>
  )
}

export default AdminOperations
