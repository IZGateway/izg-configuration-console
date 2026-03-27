import { Box, Typography } from '@mui/material'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'
import AnimatedNumber from './AnimatedNumber'
import palette from '../../../styles/theme/palette'

interface FailureItemProps {
  type: string
  logLevel: string
  count: number
  percentage: string
}

/**
 * Component for displaying a single failure item in the Recent Failures list
 */
const FailureItem = ({ type, count, percentage }: FailureItemProps) => {
  return (
    <Box
      component="li"
      sx={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        py: 2,
        borderBottom: '1px solid #f0f0f0',
        '&:last-child': {
          borderBottom: 'none',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
        <ErrorOutlineIcon
          sx={{ color: palette.error, fontSize: 24 }}
          aria-hidden="true"
        />
        <Box>
          <Typography
            variant="body1"
            sx={{ fontWeight: 600, color: '#333', mb: 0.5 }}
          >
            {type}
          </Typography>
        </Box>
      </Box>
      <Box sx={{ textAlign: 'right' }}>
        <Typography
          variant="h6"
          component="span"
          sx={{
            display: 'block',
            fontWeight: 700,
            color: palette.error,
            mb: 0.5,
          }}
        >
          <AnimatedNumber value={count} duration={1200} />
        </Typography>
        <Typography variant="caption" sx={{ color: '#666' }}>
          <AnimatedNumber value={percentage} duration={1200} /> of Traffic
        </Typography>
      </Box>
    </Box>
  )
}

export default FailureItem
