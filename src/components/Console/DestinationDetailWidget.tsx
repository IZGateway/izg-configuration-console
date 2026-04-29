import { useState, useEffect, useMemo } from 'react'
import { Box } from '@mui/material'
import MetricCard from './components/MetricCard'
import { MetricChange, DEFAULT_METRIC_CHANGE } from './types/destinationMetrics'
import {
  buildDestinationMetricsQuery,
  ELASTICSEARCH_API_ENDPOINT,
} from './queries/destinationMetricsQuery'
import { computeStatuses, DESTINATION_METRICS } from './config/statusThresholds'

interface DestinationDetailWidgetProps {
  selectedConnection?: string
  envTag?: string
}

const DestinationDetailWidget = (props: DestinationDetailWidgetProps) => {
  const { selectedConnection, envTag } = props
  const [izgatewayStatus, setIzgatewayStatus] = useState<string>('--')
  const [totalMessages, setTotalMessages] = useState<string>('--')
  const [messageChange, setMessageChange] = useState<MetricChange>(
    DEFAULT_METRIC_CHANGE
  )
  const [successRate, setSuccessRate] = useState<string>('--')
  const [successRateChange, setSuccessRateChange] = useState<MetricChange>(
    DEFAULT_METRIC_CHANGE
  )
  const [medianResponseTime, setMedianResponseTime] = useState<string>('--')
  const [medianResponseTimeChange, setMedianResponseTimeChange] =
    useState<MetricChange>(DEFAULT_METRIC_CHANGE)
  const [percentile95ResponseTime, setPercentile95ResponseTime] =
    useState<string>('--')
  const [percentile95Change, setPercentile95Change] = useState<MetricChange>(
    DEFAULT_METRIC_CHANGE
  )
  const [avgThroughput, setAvgThroughput] = useState<string>('--')
  const [peakThroughput, setPeakThroughput] = useState<string>('--')
  const [throughputChange, setThroughputChange] = useState<MetricChange>(
    DEFAULT_METRIC_CHANGE
  )
  const [lastUpdateTime, setLastUpdateTime] = useState<string>('--')

  const metricStatuses = useMemo(
    () =>
      computeStatuses(DESTINATION_METRICS, {
        izgatewayStatus,
        totalMessages,
        successRate,
        avgThroughput,
        medianResponseTime,
        percentile95ResponseTime,
      }),
    [
      izgatewayStatus,
      totalMessages,
      successRate,
      avgThroughput,
      medianResponseTime,
      percentile95ResponseTime,
    ]
  )

  // Fetch data from Elasticsearch when selectedConnection changes
  useEffect(() => {
    if (!selectedConnection) return

    const fetchDestinationData = async () => {
      try {
        const query = buildDestinationMetricsQuery(selectedConnection, envTag)

        const response = await fetch(ELASTICSEARCH_API_ENDPOINT, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: query,
          }),
        })

        if (!response.ok) {
          throw new Error('Failed to fetch destination data')
        }

        const data = await response.json()

        if (data?.aggregations) {
          const bucket0 = data.aggregations['0']?.buckets?.['Last 24h']
          const prevBucket = data.aggregations['0']?.buckets?.['Previous 24h']
          if (bucket0) {
            // Connectivity Test buckets
            const ctErrors = bucket0['1-bucket']?.doc_count || 0 // connectivityTest errors
            const ctSuccess = bucket0['2-bucket']?.doc_count || 0 // connectivityTest success

            // HL7 Message buckets (submitSingleMessage)
            const hl7Success = bucket0['3-bucket']?.doc_count || 0 // submitSingleMessage success
            const hl7Errors = bucket0['4-bucket']?.doc_count || 0 // submitSingleMessage errors

            const totalHL7 = hl7Success + hl7Errors
            const hl7SuccessRatePercent =
              totalHL7 > 0
                ? ((hl7Success / totalHL7) * 100).toFixed(1) + '%'
                : '--'

            const prevHl7Success = prevBucket?.['3-bucket']?.doc_count || 0
            const prevHl7Errors = prevBucket?.['4-bucket']?.doc_count || 0
            const prevTotalHL7 = prevHl7Success + prevHl7Errors

            let changePercent = 0
            let isUp = true
            if (prevTotalHL7 > 0) {
              changePercent = ((totalHL7 - prevTotalHL7) / prevTotalHL7) * 100
              isUp = changePercent >= 0
            } else if (totalHL7 > 0) {
              changePercent = 100
              isUp = true
            }

            // Calculate success rate change
            const currentSuccessRate =
              totalHL7 > 0 ? (hl7Success / totalHL7) * 100 : 0
            const prevSuccessRate =
              prevTotalHL7 > 0 ? (prevHl7Success / prevTotalHL7) * 100 : 0
            const successRateDiff = currentSuccessRate - prevSuccessRate
            const isSuccessRateUp = successRateDiff >= 0

            // IZ Gateway Status - only connectivity tests
            const ctTotal = ctSuccess + ctErrors
            const gatewayStatusPercent =
              ctTotal > 0
                ? ((ctSuccess / ctTotal) * 100).toFixed(1) + '%'
                : '--'

            const medianTime = bucket0['median-response-time']?.values?.['50.0']
            const percentile95Time =
              bucket0['95-response-time']?.values?.['95.0']
            const prevMedianTime =
              prevBucket?.['median-response-time']?.values?.['50.0']
            const prevPercentile95Time =
              prevBucket?.['95-response-time']?.values?.['95.0']

            setTotalMessages(totalHL7.toLocaleString())
            setMessageChange({
              percent: Math.abs(changePercent).toFixed(1) + '%',
              isUp: isUp,
            })
            setSuccessRate(hl7SuccessRatePercent)
            setSuccessRateChange({
              percent: Math.abs(successRateDiff).toFixed(1) + '%',
              isUp: isSuccessRateUp,
            })
            setIzgatewayStatus(gatewayStatusPercent)
            setMedianResponseTime(
              medianTime ? (medianTime / 1000).toFixed(2) + 's' : '--'
            )
            // Calculate median response time change (lower is better, so invert isUp)
            if (medianTime && prevMedianTime) {
              const medianChangePct =
                ((medianTime - prevMedianTime) / prevMedianTime) * 100
              setMedianResponseTimeChange({
                percent: Math.abs(medianChangePct).toFixed(1) + '%',
                isUp: medianChangePct <= 0, // Lower response time is better
              })
            }
            setPercentile95ResponseTime(
              percentile95Time
                ? (percentile95Time / 1000).toFixed(2) + 's'
                : '--'
            )
            // Calculate 95th percentile change (lower is better, so invert isUp)
            if (percentile95Time && prevPercentile95Time) {
              const p95ChangePct =
                ((percentile95Time - prevPercentile95Time) /
                  prevPercentile95Time) *
                100
              setPercentile95Change({
                percent: Math.abs(p95ChangePct).toFixed(1) + '%',
                isUp: p95ChangePct <= 0, // Lower response time is better
              })
            }

            // messages per minute (1440 min/day)
            const throughputPerMin = totalHL7 / 1440
            const prevThroughputPerMin = prevTotalHL7 / 1440
            setAvgThroughput(throughputPerMin.toFixed(2) + ' msg/min')

            let throughputChangePercent = 0
            let isThroughputUp = true
            if (prevThroughputPerMin > 0) {
              throughputChangePercent =
                ((throughputPerMin - prevThroughputPerMin) /
                  prevThroughputPerMin) *
                100
              isThroughputUp = throughputChangePercent >= 0
            } else if (throughputPerMin > 0) {
              throughputChangePercent = 100
              isThroughputUp = true
            }
            setThroughputChange({
              percent: Math.abs(throughputChangePercent).toFixed(1) + '%',
              isUp: isThroughputUp,
            })

            // Calculate peak throughput from hourly histogram
            const hourlyBuckets = bucket0['hourly-throughput']?.buckets || []
            let maxHourlyCount = 0
            for (const hourBucket of hourlyBuckets) {
              const hl7Count = hourBucket['hl7-messages']?.doc_count || 0
              if (hl7Count > maxHourlyCount) {
                maxHourlyCount = hl7Count
              }
            }
            const peakPerMin = (maxHourlyCount / 60).toFixed(2)
            setPeakThroughput(peakPerMin + ' msg/min')
            setLastUpdateTime(new Date().toLocaleTimeString())
          }
        }
      } catch (err) {
        if (err instanceof Error) {
          console.error('Error fetching destination data:', err)
        }
      }
    }

    fetchDestinationData()
  }, [selectedConnection, envTag])

  return (
    <Box component="section" aria-label="Destination detail metrics">
      {/* Polite live region announces when metrics data refreshes */}
      <Box
        aria-live="polite"
        aria-atomic="true"
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
        {lastUpdateTime !== '--'
          ? `Destination metrics updated at ${lastUpdateTime}`
          : ''}
      </Box>
      {/* IZ Gateway Status */}
      <MetricCard
        id="my-izGateway-status-widget"
        title="My IZ Gateway Status"
        subheader={`Status Health - Last Updated at ${lastUpdateTime}`}
        value={izgatewayStatus}
        status={metricStatuses.izgatewayStatus}
      />

      {/* Total Messages */}
      <MetricCard
        id="total-messages"
        title="Total Messages (24h)"
        subheader="All Message Traffic"
        value={totalMessages}
        change={messageChange}
        changeLabel="updown"
        status={metricStatuses.totalMessages}
      />

      {/* Success Rate */}
      <MetricCard
        id="success-rate"
        title="Success Rate"
        subheader="Message Processing Status"
        value={successRate}
        change={successRateChange}
        changeLabel="updown"
        status={metricStatuses.successRate}
      />

      {/* Average Throughput */}
      <MetricCard
        id="avg-throughput"
        title="Average Throughput"
        subheader={`Peak: ${peakThroughput}`}
        value={avgThroughput}
        change={throughputChange}
        changeLabel="updown"
        status={metricStatuses.avgThroughput}
      />

      {/* Median Response Time */}
      <MetricCard
        id="median-response-time"
        title="Median Response Time"
        subheader="50th Percentile"
        value={medianResponseTime}
        change={medianResponseTimeChange}
        changeLabel="fasterslower"
        status={metricStatuses.medianResponseTime}
      />

      {/* 95th Percentile Response Time */}
      <MetricCard
        id="percentile-95-response-time"
        title="95th Percentile Response Time"
        subheader="Response Time Threshold"
        value={percentile95ResponseTime}
        change={percentile95Change}
        changeLabel="fasterslower"
        status={metricStatuses.percentile95ResponseTime}
      />
    </Box>
  )
}

export default DestinationDetailWidget
