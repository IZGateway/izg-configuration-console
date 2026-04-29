import { Card, CardHeader, Typography, Box } from '@mui/material'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'
import { MetricChange, StatusLevel } from '../types/destinationMetrics'
import AnimatedNumber from './AnimatedNumber'
import palette from '../../../styles/theme/palette'
import { showStatus } from '../utils/statusUtils'

const STATUS_CONFIG: Record<
  StatusLevel,
  { icon: React.ReactNode; color: string; label: string }
> = {
  healthy: { icon: '\u2713', color: palette.activeDark, label: 'Healthy' },
  warning: {
    icon: (
      <WarningAmberOutlinedIcon
        sx={{ fontSize: 'inherit', color: palette.warningAccessible }}
      />
    ),
    color: palette.warningAccessible,
    label: 'Warning',
  },
  critical: { icon: '\u2715', color: palette.error, label: 'Critical' },
  nodata: { icon: '\u2014', color: palette.greyText, label: 'No Data' },
}

interface MetricCardProps {
  id: string
  title: string
  subheader: string
  value: string
  change?: MetricChange
  changeLabel?: 'updown' | 'fasterslower'
  status?: StatusLevel
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
  status,
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
              color: change.isUp ? palette.activeDark : palette.error,
            }}
          >
            {/* aria-hidden: direction text ('Faster'/'Slower') already conveys meaning */}
            <Box component="span" aria-hidden="true">
              {change.isUp ? '↑' : '↓'}{' '}
            </Box>
            {change.percent}
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
            color: change.isUp ? palette.activeDark : palette.error,
          }}
        >
          {/* aria-hidden: direction text ('Up'/'Down') already conveys meaning */}
          <Box component="span" aria-hidden="true">
            {change.isUp ? '↑' : '↓'}{' '}
          </Box>
          {change.percent}
        </Box>{' '}
        {change.isUp ? 'Up' : 'Down'} From Yesterday
      </Typography>
    )
  }

  return (
    <Card
      role="region"
      aria-label={title}
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
        titleTypographyProps={{
          component: 'h2',
          fontWeight: 600,
          fontSize: '1.25rem',
        }}
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
              component="span"
              sx={{
                display: 'block',
                color: showStatus(status)
                  ? STATUS_CONFIG[status].color
                  : palette.primary,
                fontWeight: 700,
              }}
            >
              {showStatus(status) && (
                <Box
                  component="span"
                  aria-label={STATUS_CONFIG[status].label}
                  sx={{ mr: 0.5, fontSize: '0.85em', verticalAlign: 'middle' }}
                >
                  {STATUS_CONFIG[status].icon}
                </Box>
              )}
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
