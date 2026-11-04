import React from 'react'
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  LinearProgress,
  Typography,
} from '@mui/material'
import useSWR from 'swr'
import palette from '../../styles/theme/palette'
import { useSession } from 'next-auth/react'

interface ResourceRowProps {
  label: string
  value: number | null
  color: string
}

const ResourceRow = ({ label, value, color }: ResourceRowProps) => {
  const displayValue = value === null ? 'N/A' : `${Math.round(value)}%`
  const progressValue = value ?? 0

  return (
    <Box sx={{ mb: 2 }}>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          mb: 0.5,
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: 600 }}>
          {label}
        </Typography>
        <Typography variant="body2" sx={{ color: palette.greyDarkTypography }}>
          {displayValue}
        </Typography>
      </Box>
      <LinearProgress
        variant="determinate"
        value={progressValue}
        sx={{
          height: 8,
          borderRadius: 10,
          backgroundColor: palette.greyLight,
          '& .MuiLinearProgress-bar': {
            backgroundColor: color,
          },
        }}
      />
    </Box>
  )
}

const toPercent = (value?: number | null) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return null
  }

  const normalized = value <= 1 ? value * 100 : value
  return Math.min(100, Math.max(0, normalized))
}

export const SYSTEM_RESOURCES_ENDPOINT = '/api/elasticsearch/query'
const REFRESH_INTERVAL_MS = 60000

// The server builds and runs the fixed status-report query; the widget only
// asks for it.
const requestSystemResources = async (url: string) => {
  const response = await fetch(url)
  if (!response.ok) {
    const details = await response.json().catch(() => ({}))
    throw new Error(
      details?.message ||
        details?.error ||
        `System resources request failed with status ${response.status}`
    )
  }
  return response.json()
}

const SystemResourcesWidget = () => {
  // [IGDD-3474] Shown to every signed-in user, not just isAdmin: the status
  // report is open to all roles and /api/elasticsearch/query serves only the
  // fixed host-metrics query. A null SWR key holds the request until the
  // session is authenticated.
  const { status } = useSession()

  const { data, error, isLoading } = useSWR(
    status === 'authenticated' ? SYSTEM_RESOURCES_ENDPOINT : null,
    requestSystemResources,
    { refreshInterval: REFRESH_INTERVAL_MS }
  )

  const cpu = toPercent(data?.aggregations?.cpu?.value)
  const memory = toPercent(data?.aggregations?.memory?.value)
  const disk = toPercent(data?.aggregations?.disk?.value)
  const establishedConnections = [data?.aggregations?.connections?.value].find(
    (value) => Number.isFinite(value)
  )
  const activeConnections = Number.isFinite(establishedConnections)
    ? Math.max(0, Math.round(establishedConnections as number))
    : null

  return (
    <Card
      sx={{
        width: '-webkit-fill-available',
        borderRadius: '0px 0px 30px 30px',
      }}
    >
      <CardHeader
        titleTypographyProps={{
          fontSize: { xs: '1.1em', md: '1.3em' },
          fontWeight: '500',
        }}
        title="System Resources"
        subheader="All Resources"
        sx={{ pt: 2, pl: 2, pb: 0 }}
      />
      <CardContent sx={{ px: { xs: 2, md: 3 } }}>
        {error && (
          <Typography variant="body2" sx={{ color: palette.error, mb: 2 }}>
            Unable to load system resources.
          </Typography>
        )}
        {isLoading && (
          <Typography
            variant="body2"
            sx={{ color: palette.greyDarkTypography, mb: 2 }}
          >
            Loading system resources...
          </Typography>
        )}
        <>
          <ResourceRow
            label="CPU Usage"
            value={error || isLoading ? null : cpu}
            color={palette.primary}
          />
          <ResourceRow
            label="Memory Usage"
            value={error || isLoading ? null : memory}
            color={palette.secondary}
          />
          <ResourceRow
            label="Disk Usage"
            value={error || isLoading ? null : disk}
            color={palette.primaryLight}
          />
          <Typography
            variant="body2"
            sx={{ color: palette.greyDarkTypography }}
          >
            Active Connections:{' '}
            {error || isLoading || activeConnections === null
              ? 'N/A'
              : activeConnections}
          </Typography>
        </>
      </CardContent>
    </Card>
  )
}

export default SystemResourcesWidget
