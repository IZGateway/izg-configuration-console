/**
 * Status thresholds for the Operations Console.
 *
 * Each metric entry defines the boundary values between Healthy / Warning / Critical.
 * Two threshold shapes are supported:
 *
 *  • higherIsBetter  (e.g. success rate, IZ Gateway status)
 *      value >= healthyMin  → healthy
 *      value >= warningMin  → warning
 *      otherwise            → critical
 *
 *  • lowerIsBetter  (e.g. response time, failure count, failure rate)
 *      value <= healthyMax  → healthy
 *      value <= warningMax  → warning
 *      otherwise            → critical
 *
 * All numeric values for percentage metrics should be expressed as plain numbers
 * (e.g. 98.5 for 98.5%).  Time values should be in milliseconds.
 *
 * Values last updated: 2026-03-31
 */

import { StatusLevel } from '../types/destinationMetrics'

// ── Threshold type definitions ────────────────────────────────────────────────

interface HigherIsBetterThreshold {
  direction: 'higherIsBetter'
  /** Value must be >= this to be Healthy */
  healthyMin: number
  /** Value must be >= this to be Warning (and < healthyMin) */
  warningMin: number
  // Anything below warningMin is Critical
}

interface LowerIsBetterThreshold {
  direction: 'lowerIsBetter'
  /** Value must be <= this to be Healthy */
  healthyMax: number
  /** Value must be <= this to be Warning (and > healthyMax) */
  warningMax: number
  // Anything above warningMax is Critical
}

export type MetricThreshold = HigherIsBetterThreshold | LowerIsBetterThreshold

// ── Threshold evaluator ───────────────────────────────────────────────────────

/**
 * Given a numeric value and a threshold config, returns the StatusLevel.
 * Returns 'nodata' if the value is null / undefined / NaN.
 */
export function getStatusLevel(
  value: number | null | undefined,
  threshold: MetricThreshold
): StatusLevel {
  if (value == null || isNaN(value)) return 'nodata'

  if (threshold.direction === 'higherIsBetter') {
    if (value >= threshold.healthyMin) return 'healthy'
    if (value >= threshold.warningMin) return 'warning'
    return 'critical'
  } else {
    if (value <= threshold.healthyMax) return 'healthy'
    if (value <= threshold.warningMax) return 'warning'
    return 'critical'
  }
}

// ── Per-metric threshold configs ──────────────────────────────────────────────

/**
 * IZ Gateway Status (connectivity test pass rate, %)
 * e.g. izgatewayStatus = '94%' → parse to 94 before calling getStatusLevel
 */
export const IZ_GATEWAY_STATUS_THRESHOLD: MetricThreshold = {
  direction: 'higherIsBetter',
  healthyMin: 95, // >= 95% → Healthy
  warningMin: 80, // >= 80% → Warning,  < 80% → Critical
}

/**
 * Success Rate — outbound or inbound message success rate (%)
 * e.g. successRate = '98.7%' → parse to 98.7
 */
export const SUCCESS_RATE_THRESHOLD: MetricThreshold = {
  direction: 'higherIsBetter',
  healthyMin: 95, // >= 95% → Healthy
  warningMin: 85, // >= 85% → Warning,  < 85% → Critical
}

/**
 * Total Failures — raw count of failed messages in 24 h
 */
export const TOTAL_FAILURES_THRESHOLD: MetricThreshold = {
  direction: 'lowerIsBetter',
  healthyMax: 100, // <= 100  → Healthy
  warningMax: 500, // <= 500  → Warning, > 500  → Critical
}

/**
 * Failure Rate — failures as a percentage of total messages (%)
 * e.g. compute (totalFailures / totalMessages) * 100 before calling getStatusLevel
 */
export const FAILURE_RATE_THRESHOLD: MetricThreshold = {
  direction: 'lowerIsBetter',
  healthyMax: 1, // <= 1%   → Healthy
  warningMax: 5, // <= 5%   → Warning, > 5%   → Critical
}

/**
 * Median Response Time (ms)
 * e.g. medianResponseTime = '142ms' → parse to 142
 */
export const MEDIAN_RESPONSE_TIME_THRESHOLD: MetricThreshold = {
  direction: 'lowerIsBetter',
  healthyMax: 3000, // <= 3000ms  → Healthy
  warningMax: 10000, // <= 10000ms → Warning, > 10000ms → Critical
}

/**
 * 95th Percentile Response Time (ms)
 */
export const P95_RESPONSE_TIME_THRESHOLD: MetricThreshold = {
  direction: 'lowerIsBetter',
  healthyMax: 10000, // <= 10000ms → Healthy
  warningMax: 20000, // <= 20000ms → Warning, > 20000ms → Critical
}

/**
 * Average Throughput (messages per minute)
 * e.g. avgThroughput = '33.6 msg/s' — parse numeric portion and convert units as needed
 */
export const AVG_THROUGHPUT_THRESHOLD: MetricThreshold = {
  direction: 'higherIsBetter',
  healthyMin: 10, // >= 10 msg/min → Healthy
  warningMin: 1, // >= 1  msg/min → Warning,  < 1 → Critical
}

// ── Value parsers for formatted metric strings ────────────────────────────────

/**
 * Parses a formatted response time string ("142ms", "1.2s") to milliseconds.
 * Returns null for missing / placeholder values so getStatusLevel returns 'nodata'.
 */
export function parseResponseTimeMs(
  value: string | null | undefined
): number | null {
  if (!value || value === '--') return null
  if (value.endsWith('ms')) return parseFloat(value)
  if (value.endsWith('s')) return parseFloat(value) * 1000
  return null
}

// ── Convenience map keyed by metric name ──────────────────────────────────────
// Matches the keys used in mockMetricCardStatuses and MessagesWidgetContent.

export const THRESHOLD_MAP: Record<string, MetricThreshold> = {
  // Left-column MetricCards (DestinationDetailWidget)
  izgatewayStatus: IZ_GATEWAY_STATUS_THRESHOLD,
  totalMessages: TOTAL_FAILURES_THRESHOLD, // placeholder — no business threshold defined yet
  successRate: SUCCESS_RATE_THRESHOLD,
  avgThroughput: AVG_THROUGHPUT_THRESHOLD,
  medianResponseTime: MEDIAN_RESPONSE_TIME_THRESHOLD,
  percentile95ResponseTime: P95_RESPONSE_TIME_THRESHOLD,

  // Inbound / Outbound widget metrics
  outboundTotalMessages: TOTAL_FAILURES_THRESHOLD, // placeholder — no business threshold defined yet
  outboundSuccessRate: SUCCESS_RATE_THRESHOLD,
  outboundAvgResponse: MEDIAN_RESPONSE_TIME_THRESHOLD,
  outboundTotalFailures: TOTAL_FAILURES_THRESHOLD,

  inboundTotalMessages: TOTAL_FAILURES_THRESHOLD, // placeholder — no business threshold defined yet
  inboundSuccessRate: SUCCESS_RATE_THRESHOLD,
  inboundAvgResponse: MEDIAN_RESPONSE_TIME_THRESHOLD,
  inboundTotalFailures: TOTAL_FAILURES_THRESHOLD,
}
