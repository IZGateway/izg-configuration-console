import { Card, CardHeader, Typography, Box } from '@mui/material'
import { MetricChange } from '../types/destinationMetrics'
import AnimatedNumber from './AnimatedNumber'
import palette from '../../../styles/theme/palette'

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
    if (!change) {
      return (
        <Typography fontWeight={600} variant="caption" color="textSecondary">
          <Box component="span">- No change</Box>
        </Typography>
      )
    }

    if (changeLabel === 'fasterslower') {
      return (
        <Typography fontWeight={600} variant="caption" color="textSecondary">
          <Box
            component="span"
            sx={{
              color: change.isUp ? palette.active : palette.error,
            }}
          >
            {change.isUp ? '↓' : '↑'} {change.percent}
          </Box>{' '}
          {change.isUp ? 'Faster' : 'Slower'} Than Yesterday
        </Typography>
      )
    }

    return (
      <Typography fontWeight={600} variant="caption" color="textSecondary">
        <Box
          component="span"
          sx={{
            color: change.isUp ? palette.active : palette.error,
          }}
        >
          {change.isUp ? '↑' : '↓'} {change.percent}
        </Box>{' '}
        {change.isUp ? 'Up' : 'Down'} From Yesterday
      </Typography>
    )
  }

  return (
    <Card
      sx={{
        marginTop: 4,
        borderRadius: '50px',
        boxShadow: 'none',
        border: `1px solid ${palette.border}`,
      }}
      id={id}
    >
      <CardHeader
        title={title}
        subheader={subheader}
        titleTypographyProps={{ fontWeight: 600, fontSize: '1.25rem' }}
        subheaderTypographyProps={{
          variant: 'body2',
          color: palette.greyDarkTypography,
        }}
        action={
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-end',
              mt: 0.5,
              gap: 0.5,
            }}
          >
            <Typography
              variant="h5"
              sx={{ color: palette.primary, fontWeight: 700 }}
            >
              <AnimatedNumber value={value} duration={1200} />
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
