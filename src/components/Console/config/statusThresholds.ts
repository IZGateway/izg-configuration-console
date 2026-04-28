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
import { MessageMetrics } from '../types/messageMetrics'

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
 * Returns 'nodata' if the value is null / undefined / NaN, or if threshold is null
 * (meaning no business threshold has been defined for this metric yet).
 */
export function getStatusLevel(
  value: number | null | undefined,
  threshold: MetricThreshold | null
): StatusLevel {
  if (threshold == null) return 'nodata'
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

// ── Metric Descriptor infrastructure ─────────────────────────────────────────

/**
 * A self-contained descriptor for a single metric.
 * Owns both the value extraction / parsing logic and the threshold to evaluate against.
 *
 * Set threshold to null when no business threshold has been defined yet;
 * getStatusLevel will return 'nodata' and the metric card will render the '—' state.
 * To activate a threshold later, set it here — no widget code changes needed.
 */
export interface MetricDescriptor<TSource> {
  /** Extract and normalise the metric value from the source data object. */
  getValue: (source: TSource) => number | null
  threshold: MetricThreshold | null
}

/**
 * Evaluate every descriptor against the provided source and return a
 * Record<metricName, StatusLevel>.
 */
export function computeStatuses<TSource>(
  descriptors: Record<string, MetricDescriptor<TSource>>,
  source: TSource
): Record<string, StatusLevel> {
  return Object.fromEntries(
    Object.entries(descriptors).map(([key, descriptor]) => [
      key,
      getStatusLevel(descriptor.getValue(source), descriptor.threshold),
    ])
  )
}

// ── Source-data shape for DestinationDetailWidget ────────────────────────────

/** The subset of DestinationDetailWidget state used for status evaluation. */
export interface DestinationDetailSource {
  izgatewayStatus: string // e.g. "95.0%"
  totalMessages: string // e.g. "3,084"  (locale-formatted integer)
  successRate: string // e.g. "98.7%"
  avgThroughput: string // e.g. "2.14 msg/min" or "--"
  medianResponseTime: string // e.g. "0.61s"   or "--"
  percentile95ResponseTime: string // e.g. "1.33s"   or "--"
}

// ── Shared descriptor fragments ───────────────────────────────────────────────
// Individual descriptors reused across multiple metric maps.

/** Success rate parsed from a "98.7%" formatted string. */
const successRateDescriptor: MetricDescriptor<{ successRate: string }> = {
  getValue: (s) => {
    const v = parseFloat(s.successRate)
    return isNaN(v) ? null : v
  },
  threshold: SUCCESS_RATE_THRESHOLD,
}

/** Failure rate computed as (totalFailures / totalMessages) * 100. */
const failureRateDescriptor: MetricDescriptor<{
  totalMessages: number
  totalFailures: number
}> = {
  getValue: (m) =>
    m.totalMessages > 0 ? (m.totalFailures / m.totalMessages) * 100 : null,
  threshold: FAILURE_RATE_THRESHOLD,
}

/** Average response time parsed from a "1.2s" / "142ms" formatted string. */
const avgResponseDescriptor: MetricDescriptor<{ avgResponseTime: string }> = {
  getValue: (m) => parseResponseTimeMs(m.avgResponseTime),
  threshold: MEDIAN_RESPONSE_TIME_THRESHOLD,
}

// ── Per-widget descriptor maps ────────────────────────────────────────────────

export const DESTINATION_METRICS: Record<
  string,
  MetricDescriptor<DestinationDetailSource>
> = {
  izgatewayStatus: {
    getValue: (s) => {
      const v = parseFloat(s.izgatewayStatus)
      return isNaN(v) ? null : v
    },
    threshold: IZ_GATEWAY_STATUS_THRESHOLD,
  },
  totalMessages: {
    getValue: (s) => {
      const v = parseFloat(s.totalMessages.replace(/,/g, ''))
      return isNaN(v) ? null : v
    },
    threshold: null, // no business threshold defined yet — add one here when requirements are known
  },
  successRate: successRateDescriptor,
  avgThroughput: {
    getValue: (s) => {
      const v = parseFloat(s.avgThroughput)
      return isNaN(v) ? null : v
    },
    threshold: null, // AVG_THROUGHPUT_THRESHOLD is production-oriented (healthyMin: 10 msg/min);
    // low-traffic environments would always show critical — add an env-aware threshold when requirements are known
  },
  medianResponseTime: {
    getValue: (s) => parseResponseTimeMs(s.medianResponseTime),
    threshold: MEDIAN_RESPONSE_TIME_THRESHOLD,
  },
  percentile95ResponseTime: {
    getValue: (s) => parseResponseTimeMs(s.percentile95ResponseTime),
    threshold: P95_RESPONSE_TIME_THRESHOLD,
  },
}

/** Shared descriptor map for inbound and outbound MessageMetrics widgets. */
export const MESSAGE_METRICS: Record<
  string,
  MetricDescriptor<MessageMetrics>
> = {
  totalMessages: {
    getValue: (m) => m.totalMessages,
    threshold: null, // no business threshold defined yet — add one here when requirements are known
  },
  successRate: successRateDescriptor,
  avgResponse: avgResponseDescriptor,
  totalFailures: failureRateDescriptor,
}

export const OUTBOUND_METRICS = MESSAGE_METRICS
export const INBOUND_METRICS = MESSAGE_METRICS
