import * as React from 'react'
import { Box, Typography, Button, Card, CardContent, Divider } from '@mui/material'
import ResetCircuitBreakerDialog from './ResetCircuitBreakerDialog'
import Loader from '../Loader'
import type { CircuitBreakerResetEnvironment } from '../../lib/utils/izghubcircuitbreakerreset'

interface CircuitBreakerCardProps {
  environments: CircuitBreakerResetEnvironment[]
  onResult: (result: { level: 'success' | 'error'; message: string }) => void
}

const getButtonId = (environment: CircuitBreakerResetEnvironment) =>
  `reset-${environment.destinationType.toLowerCase()}-circuit-breakers`

const CircuitBreakerCard = ({
  environments,
  onResult,
}: CircuitBreakerCardProps) => {
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [selectedEnvironment, setSelectedEnvironment] =
    React.useState<CircuitBreakerResetEnvironment | null>(null)
  const [loading, setLoading] = React.useState(false)

  const handleReset = async () => {
    const environment = selectedEnvironment

    if (!environment) {
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/status/reset', {
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
          message: `${environment.label} circuit breakers were reset.`,
        })
      } else {
        onResult({
          level: 'error',
          message: `Failed to reset ${environment.label} circuit breakers. ${
            data.error || 'Please try again.'
          }`,
        })
      }
    } catch {
      onResult({
        level: 'error',
        message: `Failed to reset ${environment.label} circuit breakers. Please try again.`,
      })
    } finally {
      setLoading(false)
      setConfirmOpen(false)
      setSelectedEnvironment(null)
    }
  }

  const openConfirmDialog = (environment: CircuitBreakerResetEnvironment) => {
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
          Circuit Breaker Reset
        </Typography>
        <Typography variant="h6" component="p" color="text.secondary">
          Recover connections and sync configurations instantly
        </Typography>
        <Divider sx={{ my: 2 }} />
        <Typography paragraph>
          Reset circuit breakers to recover from connection failures. When a
          circuit breaker is thrown, the affected destination becomes
          unreachable until manually reset. Use the controls below to reset the
          circuit breakers for a connected Hub environment.
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
              Reset {environment.label}
            </Button>
          ))}
          {environments.length === 0 && (
            <Typography color="text.secondary">
              No Hub environments are configured for circuit breaker reset.
            </Typography>
          )}
        </Box>
        <Loader open={loading} />
      </CardContent>

      {confirmOpen && selectedEnvironment && (
        <ResetCircuitBreakerDialog
          open={confirmOpen}
          target={`the ${selectedEnvironment.label} environment`}
          loading={loading}
          onConfirm={handleReset}
          onCancel={closeConfirmDialog}
        />
      )}
    </Card>
  )
}

export default CircuitBreakerCard
