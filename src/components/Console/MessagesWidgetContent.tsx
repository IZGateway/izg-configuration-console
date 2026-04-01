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
import { StatusLevel } from './types/destinationMetrics'
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined'

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
  metricStatuses?: {
    totalMessages?: StatusLevel
    successRate?: StatusLevel
    avgResponse?: StatusLevel
    totalFailures?: StatusLevel
  }
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
  metricStatuses,
}: MessagesWidgetContentProps) => {
  return (
    <div>
      <Card
        aria-busy={loading}
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
            <Typography variant="h6" component="h2" sx={{ fontWeight: 600 }}>
              {title}
            </Typography>
          }
          action={
            <FormControl size="small" sx={{ minWidth: 200 }}>
              {/* Visually-hidden label gives WAVE a proper form label association */}
              <Box
                component="label"
                htmlFor={`${cardId}-org-select`}
                sx={{
                  position: 'absolute',
                  width: '1px',
                  height: '1px',
                  padding: 0,
                  margin: '-1px',
                  overflow: 'hidden',
                  clipPath: 'inset(50%)',
                  whiteSpace: 'nowrap',
                  border: 0,
                }}
              >
                Filter by organization
              </Box>
              <Select
                value={selectedOrganization}
                onChange={(e) => onOrganizationChange(e.target.value)}
                disabled={organizationsLoading}
                displayEmpty
                inputProps={{ id: `${cardId}-org-select` }}
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
                      {/* aria-hidden: direction is conveyed by widget title (Inbound/Outbound) */}
                      <span
                        aria-hidden="true"
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
              <CircularProgress aria-label="Loading messages data" />
            </Box>
          ) : error ? (
            <Box
              role="alert"
              sx={{
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                py: 8,
                textAlign: 'center',
              }}
            >
              <Typography variant="body2" sx={{ color: '#666' }}>
                {error}
              </Typography>
            </Box>
          ) : (
            <>
              {/* Metrics Row — dl/dt/dd for programmatic label-value association */}
              <Box
                component="dl"
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 3,
                  mb: 4,
                  '& dd': { m: 0 },
                  '& dt': { m: 0 },
                }}
              >
                <Box>
                  <Typography
                    component="dd"
                    variant="h4"
                    sx={{
                      fontWeight: 700,
                      color: metricStatuses?.totalMessages
                        ? STATUS_CONFIG[metricStatuses.totalMessages].color
                        : palette.primary,
                      mb: 0.5,
                    }}
                  >
                    {metricStatuses?.totalMessages && (
                      <Box
                        component="span"
                        aria-label={
                          STATUS_CONFIG[metricStatuses.totalMessages].label
                        }
                        sx={{
                          mr: 0.5,
                          fontSize: '0.6em',
                          verticalAlign: 'middle',
                        }}
                      >
                        {STATUS_CONFIG[metricStatuses.totalMessages].icon}
                      </Box>
                    )}
                    <AnimatedNumber
                      value={metrics.totalMessages}
                      duration={1200}
                    />
                  </Typography>
                  <Typography
                    component="dt"
                    variant="body2"
                    sx={{ color: '#666', mb: 0.5 }}
                  >
                    Total Messages
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#666' }}>
                    All Message Traffic
                  </Typography>
                </Box>

                <Box>
                  <Typography
                    component="dd"
                    variant="h4"
                    sx={{
                      fontWeight: 700,
                      color: metricStatuses?.successRate
                        ? STATUS_CONFIG[metricStatuses.successRate].color
                        : palette.primary,
                      mb: 0.5,
                    }}
                  >
                    {metricStatuses?.successRate && (
                      <Box
                        component="span"
                        aria-label={
                          STATUS_CONFIG[metricStatuses.successRate].label
                        }
                        sx={{
                          mr: 0.5,
                          fontSize: '0.6em',
                          verticalAlign: 'middle',
                        }}
                      >
                        {STATUS_CONFIG[metricStatuses.successRate].icon}
                      </Box>
                    )}
                    <AnimatedNumber
                      value={metrics.successRate}
                      duration={1200}
                    />
                  </Typography>
                  <Typography
                    component="dt"
                    variant="body2"
                    sx={{ color: '#666', mb: 0.5 }}
                  >
                    Success Rate
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#666' }}>
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
                    component="dd"
                    variant="h4"
                    sx={{
                      fontWeight: 700,
                      color: metricStatuses?.avgResponse
                        ? STATUS_CONFIG[metricStatuses.avgResponse].color
                        : palette.primary,
                      mb: 0.5,
                    }}
                  >
                    {metricStatuses?.avgResponse && (
                      <Box
                        component="span"
                        aria-label={
                          STATUS_CONFIG[metricStatuses.avgResponse].label
                        }
                        sx={{
                          mr: 0.5,
                          fontSize: '0.6em',
                          verticalAlign: 'middle',
                        }}
                      >
                        {STATUS_CONFIG[metricStatuses.avgResponse].icon}
                      </Box>
                    )}
                    <AnimatedNumber
                      value={metrics.avgResponseTime}
                      duration={1200}
                    />
                  </Typography>
                  <Typography
                    component="dt"
                    variant="body2"
                    sx={{ color: '#666', mb: 0.5 }}
                  >
                    Avg Response
                  </Typography>
                </Box>

                <Box>
                  <Typography
                    component="dd"
                    variant="h4"
                    sx={{
                      fontWeight: 700,
                      color: metricStatuses?.totalFailures
                        ? STATUS_CONFIG[metricStatuses.totalFailures].color
                        : palette.primary,
                      mb: 0.5,
                    }}
                  >
                    {metricStatuses?.totalFailures && (
                      <Box
                        component="span"
                        aria-label={
                          STATUS_CONFIG[metricStatuses.totalFailures].label
                        }
                        sx={{
                          mr: 0.5,
                          fontSize: '0.6em',
                          verticalAlign: 'middle',
                        }}
                      >
                        {STATUS_CONFIG[metricStatuses.totalFailures].icon}
                      </Box>
                    )}
                    <AnimatedNumber
                      value={metrics.totalFailures}
                      duration={1200}
                    />
                  </Typography>
                  <Typography
                    component="dt"
                    variant="body2"
                    sx={{ color: '#666', mb: 0.5 }}
                  >
                    Total Failures
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#666' }}>
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
                <Typography
                  variant="h6"
                  component="h3"
                  sx={{ fontWeight: 600 }}
                >
                  Recent Failures
                </Typography>
                {failures.length > 4 && (
                  <Link
                    component="button"
                    onClick={onToggleShowAll}
                    aria-label={
                      showAllFailures
                        ? 'Show fewer recent failures'
                        : 'Show all recent failures'
                    }
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
                <Box
                  component="ul"
                  aria-label="Recent failures list"
                  sx={{ m: 0, p: 0, listStyle: 'none' }}
                >
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
