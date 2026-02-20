import { Box, Typography, Link } from '@mui/material'
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline'

interface FailureItemProps {
  type: string
  logLevel: string
  count: number
  percentage: string
}

/**
 * Component for displaying a single failure item in the Recent Failures list
 */
const FailureItem = ({
  type,
  logLevel,
  count,
  percentage,
}: FailureItemProps) => {
  return (
    <Box
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
        <ErrorOutlineIcon sx={{ color: '#f44336', fontSize: 24 }} />
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
          sx={{ fontWeight: 700, color: '#f44336', mb: 0.5 }}
        >
          {count}
        </Typography>
        <Typography variant="caption" sx={{ color: '#999' }}>
          {percentage} of Traffic
        </Typography>
      </Box>
    </Box>
  )
}

export default FailureItem
