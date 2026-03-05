import { useState, useEffect, useMemo } from 'react'
import MessagesWidgetContent, { Organization } from './MessagesWidgetContent'
import {
  MessageMetrics,
  FailureDetail,
  DEFAULT_MESSAGE_METRICS,
} from './types/messageMetrics'
import {
  ELASTICSEARCH_API_ENDPOINT,
  buildOutboundCombinedQuery,
} from './queries/outboundMessagesQuery'

interface Destination {
  destId: string
  jurisdictionName?: string
  jurisdiction?: {
    jurisdictionId: number
    name: string
    description: string
  }
  destinationType?: {
    typeId: number
    type: string
  }
}

interface OutboundMessagesWidgetProps {
  selectedConnection?: string
  selectedConnectionDescription?: string
  organizations?: Organization[]
  organizationsLoading?: boolean
  destinations?: Destination[]
  destTypeId?: number
  envTag?: string
}

const OutboundMessagesWidget = ({
  selectedConnection,
  selectedConnectionDescription,
  organizations = [],
  organizationsLoading = false,
  destinations = [],
  destTypeId,
  envTag,
}: OutboundMessagesWidgetProps) => {
  const [metrics, setMetrics] = useState<MessageMetrics>(
    DEFAULT_MESSAGE_METRICS
  )
  const [failures, setFailures] = useState<FailureDetail[]>([])
  const [loading, setLoading] = useState(false)
  const [showAllFailures, setShowAllFailures] = useState(false)

  const [selectedOrganization, setSelectedOrganization] = useState('IZGateway')

  // ## TOP FILTER ##
  // Compute principal names from destination's jurisdiction.name
  const principalNames = useMemo(() => {
    if (!selectedConnection) {
      return undefined
    }
    // Find the selected destination to get its jurisdiction.name
    const selectedDest = destinations.find(
      (d) => d.destId === selectedConnection
    )
    const jurisdictionName = selectedDest?.jurisdiction?.name
    if (!jurisdictionName) {
      return undefined
    }
    // Match jurisdiction name to organizationName and get principalNames
    const matchingOrg = organizations.find(
      (org) => org.organizationName === jurisdictionName
    )
    return matchingOrg?.principalNames
  }, [selectedConnection, destinations, organizations])

  // ## COMPONENT LEVEL FILTER ##
  // Compute destination ID from selected organization (reverse lookup)
  const destinationFromOrganization = useMemo(() => {
    if (selectedOrganization === 'IZGateway') {
      return undefined
    }
    // Find the destination where jurisdiction.name matches the selected organization name
    const matchingDest = destinations.find(
      (d) => d.jurisdiction?.name === selectedOrganization
    )
    return matchingDest?.destId
  }, [selectedOrganization, destinations])

  // Create a stable key for principalNames to avoid refetch on reference change
  // Spread to a copy before sorting to avoid mutating the memoized array
  const principalNamesKey = principalNames
    ? JSON.stringify([...principalNames].sort())
    : 'undefined'
  // Fetch message data from Elasticsearch
  useEffect(() => {
    if (!selectedConnection || !principalNames || principalNames.length === 0)
      return

    const controller = new AbortController()

    const fetchMessageData = async () => {
      setLoading(true)
      try {
        // Fetch combined metrics and errors data in a single call
        const combinedQuery = buildOutboundCombinedQuery(
          principalNames,
          destinationFromOrganization,
          destTypeId,
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
  }, [
    selectedConnection,
    principalNamesKey,
    selectedOrganization,
    destinationFromOrganization,
    destTypeId,
    envTag,
  ])
  // Note: Using principalNamesKey instead of principalNames to avoid refetch when array reference changes but content is same
  // principalNames is used inside the effect but we depend on principalNamesKey for stability

  return (
    <MessagesWidgetContent
      title="Outbound Messages"
      cardId="outbound-messages"
      direction="outbound"
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

export default OutboundMessagesWidget
