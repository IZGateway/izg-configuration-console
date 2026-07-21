import * as React from 'react'
import { Box, Typography, Button, Card, CardContent, Divider } from '@mui/material'
import ConfirmActionDialog from './ConfirmActionDialog'
import Loader from '../Loader'

interface DatabaseRefreshCardProps {
  onResult: (result: { level: 'success' | 'error'; message: string }) => void
}

const DatabaseRefreshCard = ({ onResult }: DatabaseRefreshCardProps) => {
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)

  const handleRefresh = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/status/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (res.ok) {
        onResult({
          level: 'success',
          message: 'Database refresh signaled to all hubs.',
        })
      } else {
        onResult({
          level: 'error',
          message: data.error || 'Failed to refresh the database.',
        })
      }
    } catch {
      onResult({
        level: 'error',
        message: 'Failed to refresh the database. Please try again.',
      })
    } finally {
      setLoading(false)
      setConfirmOpen(false)
    }
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
          Signal every hub instance across all environments to reload its
          configuration from the database, so recent changes take effect without
          a service restart.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <Button
            id="refresh-database"
            variant="contained"
            color="primary"
            size="large"
            disabled={loading}
            onClick={() => setConfirmOpen(true)}
            sx={{ borderRadius: 6, textTransform: 'uppercase' }}
          >
            Refresh Database
          </Button>
        </Box>
        <Loader open={loading} />
      </CardContent>

      {confirmOpen && (
        <ConfirmActionDialog
          open={confirmOpen}
          title="Refresh Database"
          message="Are you sure you want to signal all hubs to reload their configuration from the database? This action will be logged."
          confirmLabel="Confirm"
          loading={loading}
          onConfirm={handleRefresh}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </Card>
  )
}

export default DatabaseRefreshCard
