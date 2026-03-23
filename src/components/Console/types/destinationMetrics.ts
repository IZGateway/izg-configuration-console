export type StatusLevel = 'healthy' | 'warning' | 'critical' | 'nodata'

export interface MetricChange {
  percent: string
  isUp: boolean
}

export interface DestinationMetrics {
  izgatewayStatus: string
  totalMessages: string
  messageChange: MetricChange
  successRate: string
  successRateChange: MetricChange
  medianResponseTime: string
  medianResponseTimeChange: MetricChange
  percentile95ResponseTime: string
  percentile95Change: MetricChange
  avgThroughput: string
  peakThroughput: string
  throughputChange: MetricChange
  lastUpdateTime: string
}

export const DEFAULT_METRIC_CHANGE: MetricChange = {
  percent: '0%',
  isUp: true,
}
