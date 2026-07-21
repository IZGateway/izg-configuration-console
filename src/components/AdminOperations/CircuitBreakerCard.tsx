import * as React from 'react'
import { Box, Typography, Button, Card, CardContent, Divider } from '@mui/material'
import ResetCircuitBreakerDialog from './ResetCircuitBreakerDialog'
import Loader from '../Loader'

interface CircuitBreakerCardProps {
  onResult: (result: { level: 'success' | 'error'; message: string }) => void
}

const CircuitBreakerCard = ({ onResult }: CircuitBreakerCardProps) => {
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [loading, setLoading] = React.useState(false)

  const handleReset = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/status/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      })
      const data = await res.json()
      if (res.ok) {
        onResult({
          level: 'success',
          message: 'All circuit breakers were reset.',
        })
      } else {
        onResult({
          level: 'error',
          message: data.error || 'Failed to reset circuit breakers.',
        })
      }
    } catch {
      onResult({
        level: 'error',
        message: 'Failed to reset circuit breakers. Please try again.',
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
          Circuit Breaker Reset
        </Typography>
        <Typography variant="h6" component="p" color="text.secondary">
          Recover connections and sync configurations instantly
        </Typography>
        <Divider sx={{ my: 2 }} />
        <Typography paragraph>
          Reset circuit breakers globally to recover from connection failures.
          When a circuit breaker is thrown, the affected destination becomes
          unreachable until manually reset. Resetting signals every hub instance
          across all environments to restore connectivity; the updated status
          reflects once the operation completes.
        </Typography>
        <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
          <Button
            id="reset-all-circuit-breakers"
            variant="contained"
            color="primary"
            size="large"
            disabled={loading}
            onClick={() => setConfirmOpen(true)}
            sx={{ borderRadius: 6, textTransform: 'uppercase' }}
          >
            Reset All Circuit Breakers
          </Button>
        </Box>
        <Loader open={loading} />
      </CardContent>

      {confirmOpen && (
        <ResetCircuitBreakerDialog
          open={confirmOpen}
          target="all destinations across every Hub environment"
          loading={loading}
          onConfirm={handleReset}
          onCancel={() => setConfirmOpen(false)}
        />
      )}
    </Card>
  )
}

export default CircuitBreakerCard
