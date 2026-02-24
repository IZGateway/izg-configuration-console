import { useState, useEffect, useMemo } from 'react'
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
import {
  MessageMetrics,
  FailureDetail,
  DEFAULT_MESSAGE_METRICS,
} from './types/messageMetrics'
import {
  ELASTICSEARCH_INDEX,
  ELASTICSEARCH_API_ENDPOINT,
} from './queries/inboundMessagesQuery'

export interface Organization {
  organizationName: string
  principalNames: string[]
}

interface MessagesWidgetProps {
  title: string
  cardId: string
  selectedConnection?: string
<<<<<<< HEAD
  direction: 'inbound' | 'outbound'
  organizations?: Organization[]
  organizationsLoading?: boolean
  queryBuilder: (
    connection: string,
    principalNames?: string[],
    organization?: string
  ) => any
=======
  organizations?: Organization[]
  organizationsLoading?: boolean
  queryBuilder: (connection: string, principalNames?: string[]) => any
>>>>>>> develop
}

const MessagesWidget = ({
  title,
  cardId,
  selectedConnection,
<<<<<<< HEAD
  direction,
=======
>>>>>>> develop
  organizations = [],
  organizationsLoading = false,
  queryBuilder,
}: MessagesWidgetProps) => {
  const [metrics, setMetrics] = useState<MessageMetrics>(
    DEFAULT_MESSAGE_METRICS
  )
  const [failures, setFailures] = useState<FailureDetail[]>([])
  const [loading, setLoading] = useState(false)
  const [showAllFailures, setShowAllFailures] = useState(false)
  const [selectedOrganization, setSelectedOrganization] = useState('IZGateway')

  // Compute principal names for the selected organization
  const principalNames = useMemo(() => {
    if (selectedOrganization === 'IZGateway') {
      return undefined
    }
    const selectedOrg = organizations.find(
      (org) => org.organizationName === selectedOrganization
    )
    return selectedOrg?.principalNames
  }, [selectedOrganization, organizations])

  // Create a stable key for principalNames to avoid refetch on reference change
  // Spread to a copy before sorting to avoid mutating the memoized array
  const principalNamesKey = principalNames
    ? JSON.stringify([...principalNames].sort())
    : 'undefined'

  // Fetch message data from Elasticsearch
  useEffect(() => {
    if (!selectedConnection) return

    const controller = new AbortController()

    const fetchMessageData = async () => {
      setLoading(true)
      try {
        // Fetch combined metrics and errors data in a single call
        const combinedQuery = queryBuilder(selectedConnection, principalNames)

        const requestBody = {
          index: ELASTICSEARCH_INDEX,
          query: combinedQuery,
        }

        const response = await fetch(ELASTICSEARCH_API_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error('Failed to fetch message data')
        }

        const data = await response.json()

        // Track the calculated total messages for percentage calculations
        let calculatedTotalMessages = 0

        // Process metrics data
        if (data?.aggregations?.metrics?.buckets?.['Last 24h']) {
          const bucket = data.aggregations.metrics.buckets['Last 24h']

          // Get message counts
          const hl7Success = bucket['1-bucket']?.doc_count || 0
          const hl7Errors = bucket['2-bucket']?.doc_count || 0
          const totalMessages = hl7Success + hl7Errors
          calculatedTotalMessages = totalMessages

          // Calculate success rate
          const successRate =
            totalMessages > 0
              ? ((hl7Success / totalMessages) * 100).toFixed(1) + '%'
              : '0%'

          // Get average response time (median - 50th percentile)
          const medianResponseTime =
            bucket['3-bucket']?.['3-metric']?.values?.['50.0']

          // Format response time: show ms for < 1000ms, else show seconds
          let avgResponseTime = '0s'
          if (medianResponseTime && medianResponseTime > 0) {
            if (medianResponseTime < 1000) {
              avgResponseTime = medianResponseTime.toFixed(0) + 'ms'
            } else {
              avgResponseTime = (medianResponseTime / 1000).toFixed(1) + 's'
            }
          }

          setMetrics({
            totalMessages,
            successRate,
            avgResponseTime,
            totalFailures: hl7Errors,
            lastUpdateTime: new Date().toLocaleTimeString(),
          })
        }

        // Process errors data
        if (data?.aggregations?.errors?.organizations?.buckets) {
          const orgBuckets = data.aggregations.errors.organizations.buckets
          const failureTypes: FailureDetail[] = []

          // Aggregate error types across all organizations
          const errorTypeCounts: { [key: string]: number } = {}

          orgBuckets.forEach((orgBucket: any) => {
            const filters = orgBucket['1']?.buckets
            if (filters) {
              // Use organization bucket's doc_count to get total errors for this org
              const totalErrorsForOrg = orgBucket.doc_count

              Object.keys(filters).forEach((errorType) => {
                // Skip meta categories and use individual error types
                if (
                  errorType !== '*' &&
                  errorType !== 'HTTP Errors (All)' // Skip the HTTP Errors (All) category too
                ) {
                  const count = filters[errorType]?.doc_count || 0
                  if (count > 0) {
                    errorTypeCounts[errorType] =
                      (errorTypeCounts[errorType] || 0) + count
                  }
                }
              })

              // Calculate uncategorized errors
              const categorizedSum = Object.keys(filters)
                .filter((key) => key !== '*' && key !== 'HTTP Errors (All)')
                .reduce((sum, key) => sum + (filters[key]?.doc_count || 0), 0)

              const uncategorized = totalErrorsForOrg - categorizedSum
              if (uncategorized > 0) {
                errorTypeCounts['Other Errors'] =
                  (errorTypeCounts['Other Errors'] || 0) + uncategorized
              }
            }
          })

          // Convert to FailureDetail array and sort by count
          // Use calculatedTotalMessages from the current query for percentage calculation
          const totalForPercentage = calculatedTotalMessages || 1

          Object.entries(errorTypeCounts)
            .sort(([, a], [, b]) => b - a)
            .forEach(([errorType, count]) => {
              const percentage =
                totalForPercentage > 0
                  ? ((count / totalForPercentage) * 100).toFixed(1) + '%'
                  : '0%'

              failureTypes.push({
                type: errorType,
                count: count,
                logLevel: 'Expand Details',
                percentage: percentage,
              })
            })

          setFailures(failureTypes)
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        console.error('Error fetching message data:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchMessageData()
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedConnection, principalNamesKey, queryBuilder])
  // Note: Using principalNamesKey instead of principalNames to avoid refetch when array reference changes but content is same
  // principalNames is used inside the effect but we depend on principalNamesKey for stability

  return (
    <div>
      <Card
        sx={{
          marginTop: 4,
          borderRadius: '0px 0px 16px 16px',
          boxShadow: 'none',
          border: '1px solid #E0E0E0',
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
                onChange={(e) => setSelectedOrganization(e.target.value)}
                disabled={organizationsLoading}
                displayEmpty
                sx={{
                  fontSize: '14px',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: '#e0e0e0',
                  },
                }}
                renderValue={(selected) => {
<<<<<<< HEAD
                  const dest = selectedConnection || 'Destination'
                  const org =
                    !selected || selected === 'IZGateway'
                      ? 'IZGateway'
                      : selected
                  return direction === 'inbound'
                    ? `${org} - ${dest}`
                    : `${dest} - ${org}`
=======
                  if (!selected || selected === 'IZGateway') {
                    return `IZGateway - ${selectedConnection || 'Destination'}`
                  }
                  return `${selected} - ${selectedConnection || 'Destination'}`
>>>>>>> develop
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
                    {metrics.totalMessages.toLocaleString()}
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
                    {metrics.successRate}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666', mb: 0.5 }}>
                    Success Rate
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#999' }}>
                    (
                    {(
                      metrics.totalMessages - metrics.totalFailures
                    ).toLocaleString()}
                    /{metrics.totalMessages.toLocaleString()} Successful)
                  </Typography>
                </Box>

                <Box>
                  <Typography
                    variant="h4"
                    sx={{ fontWeight: 700, color: '#1976d2', mb: 0.5 }}
                  >
                    {metrics.avgResponseTime}
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
                    {metrics.totalFailures}
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#666', mb: 0.5 }}>
                    Total Failures
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#999' }}>
                    {metrics.totalMessages > 0
                      ? (
                          (metrics.totalFailures / metrics.totalMessages) *
                          100
                        ).toFixed(1)
                      : 0}
                    % of Traffic
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
                    onClick={() => setShowAllFailures(!showAllFailures)}
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
<<<<<<< HEAD
                    (failure, index) => (
                      <FailureItem
                        key={index}
=======
                    (failure) => (
                      <FailureItem
                        key={failure.type}
>>>>>>> develop
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

export default MessagesWidget
