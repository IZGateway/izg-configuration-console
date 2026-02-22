export interface MessageMetrics {
  totalMessages: number
  successRate: string
  avgResponseTime: string
  totalFailures: number
  lastUpdateTime: string
}

export interface FailureDetail {
  type: string
  count: number
  logLevel: string
  percentage: string
}

export const DEFAULT_MESSAGE_METRICS: MessageMetrics = {
  totalMessages: 0,
  successRate: '0%',
  avgResponseTime: '0s',
  totalFailures: 0,
  lastUpdateTime: '--',
}
