import { Card, CardHeader, Typography, Box } from '@mui/material'
import { MetricChange } from '../types/destinationMetrics'

interface MetricCardProps {
  id: string
  title: string
  subheader: string
  value: string
  change?: MetricChange
  changeLabel?: 'updown' | 'fasterslower'
}

/**
 * Reusable metric card component for displaying dashboard metrics
 */
const MetricCard = ({
  id,
  title,
  subheader,
  value,
  change,
  changeLabel = 'updown',
}: MetricCardProps) => {
  const getChangeText = () => {
    if (!change) return null

    if (changeLabel === 'fasterslower') {
      return (
        <Typography variant="body2" color="textSecondary">
          <span
            style={{
              color: change.isUp ? '#4caf50' : '#f44336',
            }}
          >
            {change.isUp ? '↑' : '↓'}
          </span>{' '}
          {change.percent} {change.isUp ? 'Faster' : 'Slower'} Than Yesterday
        </Typography>
      )
    }

    return (
      <Typography variant="body2" color="textSecondary">
        <span
          style={{
            color: change.isUp ? '#4caf50' : '#f44336',
          }}
        >
          {change.isUp ? '↑' : '↓'}
        </span>{' '}
        {change.percent} {change.isUp ? 'Up' : 'Down'} From Yesterday
      </Typography>
    )
  }

  return (
    <Card
      sx={{
        marginTop: 4,
        borderRadius: '50px',
        boxShadow: 'none',
        border: '1px solid #e0e0e0',
      }}
      id={id}
    >
      <CardHeader
        title={title}
        subheader={subheader}
        subheaderTypographyProps={{ variant: 'body2', color: '#999' }}
        action={
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              mt: 0.5,
            }}
          >
            <Typography variant="h5" sx={{ color: '#1976d2', fontWeight: 700 }}>
              {value}
            </Typography>
            {getChangeText()}
          </Box>
        }
        sx={{ pb: 2, px: 4 }}
      />
    </Card>
  )
}

export default MetricCard
