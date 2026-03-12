import { useState, useEffect, useMemo } from 'react'
import MessagesWidgetContent, { Organization } from './MessagesWidgetContent'
import {
  MessageMetrics,
  FailureDetail,
  DEFAULT_MESSAGE_METRICS,
} from './types/messageMetrics'
import {
  ELASTICSEARCH_API_ENDPOINT,
  buildInboundCombinedQuery,
} from './queries/inboundMessagesQuery'

interface InboundMessagesWidgetProps {
  selectedConnection?: string
  selectedConnectionDescription?: string
  organizations?: Organization[]
  organizationsLoading?: boolean
  envTag?: string
}

const InboundMessagesWidget = ({
  selectedConnection,
  selectedConnectionDescription,
  organizations = [],
  organizationsLoading = false,
  envTag,
}: InboundMessagesWidgetProps) => {
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
        const combinedQuery = buildInboundCombinedQuery(
          selectedConnection,
          principalNames,
          envTag
        )

        const requestBody = {
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
  }, [selectedConnection, principalNamesKey, envTag])
  // Note: Using principalNamesKey instead of principalNames to avoid refetch when array reference changes but content is same
  // principalNames is used inside the effect but we depend on principalNamesKey for stability

  return (
    <MessagesWidgetContent
      title="Inbound Messages"
      cardId="inbound-messages"
      direction="inbound"
      selectedConnection={selectedConnection}
      selectedConnectionDescription={selectedConnectionDescription}
      metrics={metrics}
      failures={failures}
      loading={loading}
      showAllFailures={showAllFailures}
      selectedOrganization={selectedOrganization}
      organizationsLoading={organizationsLoading}
      organizations={organizations}
      onOrganizationChange={setSelectedOrganization}
      onToggleShowAll={() => setShowAllFailures(!showAllFailures)}
    />
  )
}

export default InboundMessagesWidget
