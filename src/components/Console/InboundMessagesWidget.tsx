import { useState, useEffect, useMemo } from 'react'
import MessagesWidgetContent, { Organization } from './MessagesWidgetContent'
import {
  MessageMetrics,
  FailureDetail,
  DEFAULT_MESSAGE_METRICS,
} from './types/messageMetrics'
import {
  ALL_ORGANIZATIONS,
  fetchConsoleMetrics,
} from '../../lib/console/consoleMetricsClient'
import { computeStatuses, INBOUND_METRICS } from './config/statusThresholds'

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
  const [selectedOrganization, setSelectedOrganization] =
    useState(ALL_ORGANIZATIONS)
  // Shown in place of the metrics: why the server found nothing to show (e.g.
  // the selected organization has no principals configured, rather than a
  // wider, unfiltered result), or that the request failed.
  const [errorMessage, setErrorMessage] = useState<string>()

  // Fetch message data from Elasticsearch
  useEffect(() => {
    if (!selectedConnection) return

    const controller = new AbortController()

    // Back to the empty state, so nothing from the previous selection is
    // shown under the new one.
    const clearResults = () => {
      setMetrics(DEFAULT_MESSAGE_METRICS)
      setFailures([])
    }

    const fetchMessageData = async () => {
      setLoading(true)
      setErrorMessage(undefined)
      try {
        // Fetch combined metrics and errors data in a single call. The server
        // builds the query and resolves the organization's principals itself.
        const response = await fetchConsoleMetrics(
          {
            view: 'inbound',
            destId: selectedConnection,
            envTag,
            organization: selectedOrganization,
          },
          controller.signal
        )

        if (!response.ok) {
          throw new Error('Failed to fetch message data')
        }

        const data = await response.json()
        if (controller.signal.aborted) return

        if (data?.unavailable) {
          setErrorMessage(data.unavailable)
          clearResults()
          return
        }

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
              : '--'

          // Get average response time (median - 50th percentile)
          const medianResponseTime =
            bucket['3-bucket']?.['3-metric']?.values?.['50.0']

          // Format response time: show ms for < 1000ms, else show seconds
          let avgResponseTime = '--'
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
        setErrorMessage('Unable to load inbound message data.')
        clearResults()
      } finally {
        setLoading(false)
      }
    }

    fetchMessageData()
    return () => controller.abort()
  }, [selectedConnection, selectedOrganization, envTag])

  const metricStatuses = useMemo(
    () => computeStatuses(INBOUND_METRICS, metrics),
    [metrics]
  )

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
      error={errorMessage}
      metricStatuses={metricStatuses}
    />
  )
}

export default InboundMessagesWidget
