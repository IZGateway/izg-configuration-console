import * as React from 'react'
import { Box, Typography, Button, Card, CardContent, Divider } from '@mui/material'
import ResetCircuitBreakerDialog from './ResetCircuitBreakerDialog'
import Loader from '../Loader'
import type { HubEnvironment } from '../../lib/utils/izghubenvironments'
import {
  hubOperationLevel,
  regionsNotComplete,
  HUB_REGION_COMPLETE,
  HUB_REGION_FAILED,
  type HubRegionStatuses,
} from '../../lib/utils/hubregionstatus'

interface CircuitBreakerCardProps {
  environments: HubEnvironment[]
  // IGDD-3599: `warning` covers a reset that reached some regions and not
  // others. `persistent` keeps such a message on screen until the operator
  // dismisses it, through the Alert member IGDD-3566 added.
  onResult: (result: {
    level: 'success' | 'warning' | 'error'
    message: string
    persistent?: boolean
  }) => void
}

const getButtonId = (environment: HubEnvironment) =>
  `reset-${environment.destinationType.toLowerCase()}-circuit-breakers`

const regionStatusColor = (status: string) => {
  if (status === HUB_REGION_COMPLETE) {
    // `success.dark`, not `success.main`: this theme sets `success.main` to
    // #025eaa, the same blue as `primary.main`, so a complete region rendered
    // in it reads as a link rather than as a good outcome — and sits beside
    // the blue RESET buttons. `success.dark` (#1E4D3B) is the green.
    return 'success.dark'
  }
  if (status === HUB_REGION_FAILED) {
    return 'error.main'
  }
  // `partial`, and any word a later hub release adds. Both are "not complete".
  return 'warning.main'
}

interface RegionOutcome {
  label: string
  regions: HubRegionStatuses
}

const CircuitBreakerCard = ({
  environments,
  onResult,
}: CircuitBreakerCardProps) => {
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [selectedEnvironment, setSelectedEnvironment] =
    React.useState<HubEnvironment | null>(null)
  const [loading, setLoading] = React.useState(false)
  const [outcome, setOutcome] = React.useState<RegionOutcome | null>(null)

  const handleReset = async () => {
    const environment = selectedEnvironment

    if (!environment) {
      return
    }

    setLoading(true)
    // Never show one environment's regions beside another's result.
    setOutcome(null)
    try {
      const res = await fetch('/api/status/reset', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          destinationTypeId: environment.destinationTypeId,
        }),
      })
      const data = await res.json()
      const regions: HubRegionStatuses | undefined = data?.result?.regions
      // The hub answers 200 even when a region did not fully reset, so the
      // status code cannot decide this. An older hub sends no block, and the
      // level is then undefined: fall back to the pre-IGDD-3599 behaviour.
      const level = hubOperationLevel(regions)

      if (level) {
        setOutcome({ label: environment.label, regions })
      }

      if (level === 'success' || (!level && res.ok)) {
        onResult({
          level: 'success',
          message: `${environment.label} circuit breakers were reset.`,
        })
      } else if (level === 'warning') {
        onResult({
          level: 'warning',
          message: `${
            environment.label
          } circuit breakers were not reset in every region. Still not complete: ${regionsNotComplete(
            regions
          ).join(', ')}.`,
          persistent: true,
        })
      } else if (level === 'error') {
        onResult({
          level: 'error',
          message: `${environment.label} circuit breakers were not reset in any region.`,
          persistent: true,
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
          circuit breakers for a connected Hub environment. The Hub clears the
          breakers on every instance it runs, in every region, and reports the
          result for each region below.
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
        {outcome && (
          <Box sx={{ mt: 3 }} data-testid="circuit-breaker-region-outcome">
            <Typography variant="subtitle2" color="text.secondary">
              {outcome.label} — result by region
            </Typography>
            {Object.keys(outcome.regions).map((region) => (
              <Typography key={region} variant="body2" sx={{ mt: 0.5 }}>
                {region} —{' '}
                <Box
                  component="span"
                  sx={{
                    color: regionStatusColor(outcome.regions[region]),
                    fontWeight: 600,
                  }}
                >
                  {outcome.regions[region]}
                </Box>
              </Typography>
            ))}
          </Box>
        )}
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
