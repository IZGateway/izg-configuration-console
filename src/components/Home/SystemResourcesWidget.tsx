import React from 'react'
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  LinearProgress,
  Typography,
} from '@mui/material'
import useElasticTemplateQuery from '../../lib/services/useElasticTemplateQuery'
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

const SystemResourcesWidget = () => {
  const { data: session } = useSession()

  const now = new Date()
  const start = new Date(now.getTime() - 15 * 60 * 1000).toISOString()
  const end = now.toISOString()

  const elasticIndex = process.env.NEXT_PUBLIC_ELASTIC_INDEX
  if (!elasticIndex) {
    throw new Error('NEXT_PUBLIC_ELASTIC_INDEX environment variable is not set.')
  }

  const { data, error, isLoading } = useElasticTemplateQuery({
    index: elasticIndex,
    template: {
      size: 0,
      query: {
        range: {
          '@timestamp': {
            gte: '${start}',
            lte: '${end}',
          },
        },
      },
      aggs: {
        cpu: { avg: { field: 'system.cpu.total.pct' } },
        memory: { avg: { field: 'system.memory.actual.used.pct' } },
        disk: { avg: { field: 'system.filesystem.used.pct' } },
        connections: { max: { field: 'system.socket.summary.tcp.all' } },
      },
    },
    params: { start, end },
    enabled: Boolean(session?.user?.isAdmin),
    swrOptions: {
      refreshInterval: 60000, // Refresh every 60 seconds
    },
  })

  const cpu = toPercent(data?.aggregations?.cpu?.value)
  const memory = toPercent(data?.aggregations?.memory?.value)
  const disk = toPercent(data?.aggregations?.disk?.value)
  const connections = data?.aggregations?.connections?.value

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
        <Typography variant="body2" sx={{ color: palette.greyDarkTypography }}>
          Active Connections:{' '}
          {error || isLoading ? 'N/A' : connections ?? 'N/A'}
        </Typography>
        <Typography
          variant="caption"
          sx={{ display: 'block', mt: 1, color: palette.grey }}
        >
          Scheduled maintenance: Not reported
        </Typography>
      </CardContent>
    </Card>
  )
}

export default SystemResourcesWidget
