import * as React from 'react'
import { Box, Typography, Button, Card, CardContent, Divider } from '@mui/material'
import ConfirmActionDialog from './ConfirmActionDialog'
import Loader from '../Loader'
import type { HubEnvironment } from '../../lib/utils/izghubenvironments'

interface DatabaseRefreshCardProps {
  environments: HubEnvironment[]
  onResult: (result: { level: 'success' | 'error'; message: string }) => void
}

const getButtonId = (environment: HubEnvironment) =>
  `refresh-${environment.destinationType.toLowerCase()}-database`

const DatabaseRefreshCard = ({
  environments,
  onResult,
}: DatabaseRefreshCardProps) => {
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [selectedEnvironment, setSelectedEnvironment] =
    React.useState<HubEnvironment | null>(null)
  const [loading, setLoading] = React.useState(false)

  const handleRefresh = async () => {
    const environment = selectedEnvironment

    if (!environment) {
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/status/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinationTypeId: environment.destinationTypeId,
        }),
      })
      const data = await res.json()
      if (res.ok) {
        onResult({
          level: 'success',
          message: `${environment.label} database refresh was signaled.`,
        })
      } else {
        onResult({
          level: 'error',
          message: `Failed to signal ${environment.label} database refresh. ${
            data.error || 'Please try again.'
          }`,
        })
      }
    } catch {
      onResult({
        level: 'error',
        message: `Failed to signal ${environment.label} database refresh. Please try again.`,
      })
    } finally {
      setLoading(false)
      setConfirmOpen(false)
      setSelectedEnvironment(null)
    }
  }

  const openConfirmDialog = (environment: HubEnvironment) => {
    setSelectedEnvironment(environment)
    setConfirmOpen(true)
  }

  const closeConfirmDialog = () => {
    setConfirmOpen(false)
    setSelectedEnvironment(null)
  }

  return (
    <Card elevation={2} sx={{ borderRadius: 3, height: '100%' }}>
      <CardContent sx={{ p: 4 }}>
        <Typography variant="h4" component="h2">
          Database Refresh
        </Typography>
        <Typography variant="h6" component="p" color="text.secondary">
          Reload hub configuration from the database
        </Typography>
        <Divider sx={{ my: 2 }} />
        <Typography paragraph>
          Signal a connected Hub environment to reload its configuration from
          the database, so recent changes take effect without a service restart.
        </Typography>
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mt: 2 }}>
          {environments.map((environment) => (
            <Button
              key={environment.destinationTypeId}
              id={getButtonId(environment)}
              variant="contained"
              color="primary"
              size="large"
              disabled={loading}
              onClick={() => openConfirmDialog(environment)}
              sx={{ borderRadius: 6, textTransform: 'uppercase' }}
            >
              Refresh {environment.label}
            </Button>
          ))}
          {environments.length === 0 && (
            <Typography color="text.secondary">
              No Hub environments are configured for database refresh.
            </Typography>
          )}
        </Box>
        <Loader open={loading} />
      </CardContent>

      {confirmOpen && selectedEnvironment && (
        <ConfirmActionDialog
          open={confirmOpen}
          title="Refresh Database"
          message={`Are you sure you want to signal the ${selectedEnvironment.label} hub to reload its configuration from the database? This action will be logged.`}
          confirmLabel="Confirm"
          loading={loading}
          onConfirm={handleRefresh}
          onCancel={closeConfirmDialog}
        />
      )}
    </Card>
  )
}

export default DatabaseRefreshCard
