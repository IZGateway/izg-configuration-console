import {
  Card,
  CardContent,
  CardHeader,
  Divider,
  Box,
  Typography,
  Link,
  FormControl,
  Select,
  MenuItem,
  CircularProgress,
} from '@mui/material'
import FailureItem from './components/FailureItem'
import { MessageMetrics, FailureDetail } from './types/messageMetrics'
import AnimatedNumber from './components/AnimatedNumber'
import palette from '../../styles/theme/palette'

// Common types
export interface Organization {
  organizationName: string
  principalNames: string[]
}

interface MessagesWidgetContentProps {
  title: string
  cardId: string
  direction: 'inbound' | 'outbound'
  selectedConnection?: string
  selectedConnectionDescription?: string
  metrics: MessageMetrics
  failures: FailureDetail[]
  loading: boolean
  showAllFailures: boolean
  selectedOrganization: string
  organizationsLoading: boolean
  organizations: Organization[]
  onOrganizationChange: (org: string) => void
  onToggleShowAll: () => void
  error?: string
}

const MessagesWidgetContent = ({
  title,
  cardId,
  direction,
  selectedConnection,
  selectedConnectionDescription,
  metrics,
  failures,
  loading,
  showAllFailures,
  selectedOrganization,
  organizationsLoading,
  organizations,
  onOrganizationChange,
  onToggleShowAll,
  error,
}: MessagesWidgetContentProps) => {
  return (
    <div>
      <Card
        sx={{
          marginTop: 4,
          borderRadius: '0px 0px 16px 16px',
          boxShadow: 'none',
          border: `1px solid ${palette.divider}`,
        }}
        id={cardId}
      >
        <CardHeader
          title={
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              {title}
            </Typography>
          }
          action={
            <FormControl size="small" sx={{ minWidth: 200 }}>
              <Select
                value={selectedOrganization}
                onChange={(e) => onOrganizationChange(e.target.value)}
                disabled={organizationsLoading}
                displayEmpty
                sx={{
                  fontSize: '14px',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#e0e0e0',
                  },
                }}
                MenuProps={{
                  PaperProps: {
                    sx: {
                      maxHeight: 300,
                      right: 64,
                      maxWidth: 300,
                    },
                  },
                }}
                renderValue={(selected) => {
                  const dest =
                    selectedConnectionDescription ||
                    selectedConnection ||
                    'Destination'
                  const org =
                    !selected || selected === 'IZGateway'
                      ? 'IZGateway'
                      : selected
                  return (
                    <span>
                      {direction === 'inbound' ? org : dest}
                      <span
                        style={{
                          color: palette.secondary,
                          margin: '0 4px',
                          fontWeight: 'bold',
                          fontSize: '16px',
                        }}
                      >
                        →
                      </span>
                      {direction === 'inbound' ? dest : org}
                    </span>
                  )
                }}
              >
                <MenuItem value="IZGateway">
                  IZGateway (All Organizations)
                </MenuItem>
                {organizations.map((org) => (
                  <MenuItem
                    key={org.organizationName}
                    value={org.organizationName}
                  >
                    {org.organizationName}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          }
        />
        <Divider />
        <CardContent>
          {loading ? (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                py: 8,
              }}
            >
              <CircularProgress />
            </Box>
          ) : error ? (
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                py: 8,
                textAlign: 'center',
              }}
            >
              <Typography variant="body2" sx={{ color: '#999' }}>
                {error}
              </Typography>
            </Box>
          ) : (
            <>
              {/* Metrics Row */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 3,
                  mb: 4,
                }}
              >
                <Box>
                  <Typography
                    variant="h4"
                    sx={{ fontWeight: 700, color: '#1976d2', mb: 0.5 }}
                  >
                    <AnimatedNumber
                      value={metrics.totalMessages}
                      duration={1200}
                    />
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666', mb: 0.5 }}>
                    Total Messages
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#999' }}>
                    All Message Traffic
                  </Typography>
                </Box>

                <Box>
                  <Typography
                    variant="h4"
                    sx={{ fontWeight: 700, color: '#1976d2', mb: 0.5 }}
                  >
                    <AnimatedNumber
                      value={metrics.successRate}
                      duration={1200}
                    />
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666', mb: 0.5 }}>
                    Success Rate
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#999' }}>
                    (
                    <AnimatedNumber
                      value={metrics.totalMessages - metrics.totalFailures}
                      duration={1200}
                    />
                    /
                    <AnimatedNumber
                      value={metrics.totalMessages}
                      duration={1200}
                    />{' '}
                    Successful)
                  </Typography>
                </Box>

                <Box>
                  <Typography
                    variant="h4"
                    sx={{ fontWeight: 700, color: '#1976d2', mb: 0.5 }}
                  >
                    <AnimatedNumber
                      value={metrics.avgResponseTime}
                      duration={1200}
                    />
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666', mb: 0.5 }}>
                    Avg Response
                  </Typography>
                </Box>

                <Box>
                  <Typography
                    variant="h4"
                    sx={{ fontWeight: 700, color: '#1976d2', mb: 0.5 }}
                  >
                    <AnimatedNumber
                      value={metrics.totalFailures}
                      duration={1200}
                    />
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666', mb: 0.5 }}>
                    Total Failures
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#999' }}>
                    <AnimatedNumber
                      value={
                        metrics.totalMessages > 0
                          ? (
                              (metrics.totalFailures / metrics.totalMessages) *
                              100
                            ).toFixed(1) + '%'
                          : '0%'
                      }
                      duration={1200}
                    />{' '}
                    of Traffic
                  </Typography>
                </Box>
              </Box>

              <Divider sx={{ mb: 3 }} />

              {/* Recent Failures Section */}
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2,
                }}
              >
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  Recent Failures
                </Typography>
                {failures.length > 4 && (
                  <Link
                    component="button"
                    onClick={onToggleShowAll}
                    sx={{
                      color: '#1976d2',
                      textDecoration: 'none',
                      fontSize: '14px',
                      fontWeight: 500,
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                    }}
                  >
                    {showAllFailures ? 'Show Less' : 'Show All'}
                  </Link>
                )}
              </Box>

              {/* Failure Items */}
              {failures.length > 0 ? (
                <Box>
                  {(showAllFailures ? failures : failures.slice(0, 4)).map(
                    (failure) => (
                      <FailureItem
                        key={failure.type}
                        type={failure.type}
                        logLevel={failure.logLevel}
                        count={failure.count}
                        percentage={failure.percentage}
                      />
                    )
                  )}
                </Box>
              ) : (
                <Box sx={{ py: 4, textAlign: 'center' }}>
                  <Typography variant="body2" color="textSecondary">
                    No failures detected in the last 24 hours
                  </Typography>
                </Box>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default MessagesWidgetContent
