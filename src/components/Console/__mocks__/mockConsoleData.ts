/**
 * TEMP mock data for manual local testing of the Operations Console.
 * DELETE BEFORE MERGING.
 *
 * Usage — in Console/index.tsx (or any widget), swap the fetch calls:
 *
 *   import {
 *     mockDestinations,
 *     mockOrganizations,
 *     mockOutboundMetrics,
 *     mockOutboundFailures,
 *     mockInboundMetrics,
 *     mockInboundFailures,
 *     mockDestinationMetrics,
 *   } from './__mocks__/mockConsoleData'
 */

import { MessageMetrics, FailureDetail } from '../types/messageMetrics'
import { DestinationMetrics, StatusLevel } from '../types/destinationMetrics'
import { Organization } from '../MessagesWidgetContent'

export interface MockMetricStatuses {
  totalMessages?: StatusLevel
  successRate?: StatusLevel
  avgResponse?: StatusLevel
  totalFailures?: StatusLevel
}

// ── Destinations ──────────────────────────────────────────────────────────────
// Same shape as /api/destinations — flat array; one row per (destId × envType)

export const mockDestinations = [
  {
    destId: 'dev',
    jurisdictionName: 'Development Environment',
    jurisdiction: {
      jurisdictionId: 1,
      name: 'dev',
      description: 'Development Environment',
    },
    destinationType: { typeId: 1, type: 'DEV' },
  },
  {
    destId: 'dev',
    jurisdictionName: 'Development Environment',
    jurisdiction: {
      jurisdictionId: 1,
      name: 'dev',
      description: 'Development Environment',
    },
    destinationType: { typeId: 2, type: 'PRODUCTION' },
  },
  {
    destId: '101',
    jurisdictionName: 'New York CAIR2',
    jurisdiction: {
      jurisdictionId: 2,
      name: 'ny',
      description: 'New York CAIR2',
    },
    destinationType: { typeId: 3, type: 'PRODUCTION' },
  },
  {
    destId: '101',
    jurisdictionName: 'New York CAIR2',
    jurisdiction: {
      jurisdictionId: 2,
      name: 'ny',
      description: 'New York CAIR2',
    },
    destinationType: { typeId: 4, type: 'ONBOARD' },
  },
  {
    destId: '202',
    jurisdictionName: 'Florida SHOTS',
    jurisdiction: {
      jurisdictionId: 3,
      name: 'fl',
      description: 'Florida SHOTS',
    },
    destinationType: { typeId: 5, type: 'PRODUCTION' },
  },
  {
    destId: '303',
    jurisdictionName: 'Centers for Disease Control',
    jurisdiction: {
      jurisdictionId: 4,
      name: 'cdc',
      description: 'Centers for Disease Control',
    },
    destinationType: { typeId: 6, type: 'DEV' },
  },
]

// ── Organizations ─────────────────────────────────────────────────────────────
// Same shape as /api/organizations

export const mockOrganizations: Organization[] = [
  {
    organizationName: 'Org Alpha',
    principalNames: ['alpha-user-1', 'alpha-user-2'],
  },
  {
    organizationName: 'Org Beta',
    principalNames: ['beta-user-1'],
  },
  {
    organizationName: 'Org Gamma',
    principalNames: ['gamma-user-1', 'gamma-user-2', 'gamma-user-3'],
  },
]

// ── Outbound message metrics ──────────────────────────────────────────────────

export const mockOutboundMetrics: MessageMetrics = {
  totalMessages: 31204,
  successRate: '99.1%',
  avgResponseTime: '138ms',
  totalFailures: 311,
  lastUpdateTime: '14:32:08',
}

export const mockOutboundFailures: FailureDetail[] = [
  { type: 'TIMEOUT', logLevel: 'ERROR', count: 178, percentage: '0.6%' },
  { type: 'CONN REFUSED', logLevel: 'ERROR', count: 89, percentage: '0.3%' },
  { type: 'AUTH FAIL', logLevel: 'ERROR', count: 44, percentage: '0.1%' },
]

// ── Inbound message metrics ───────────────────────────────────────────────────

export const mockInboundMetrics: MessageMetrics = {
  totalMessages: 17108,
  successRate: '97.8%',
  avgResponseTime: '149ms',
  totalFailures: 376,
  lastUpdateTime: '14:32:08',
}

export const mockInboundFailures: FailureDetail[] = [
  { type: 'CONN REFUSED', logLevel: 'ERROR', count: 201, percentage: '1.2%' },
  { type: 'TIMEOUT', logLevel: 'ERROR', count: 130, percentage: '0.8%' },
  { type: 'AUTH FAIL', logLevel: 'ERROR', count: 45, percentage: '0.3%' },
]

// ── Destination detail metrics (left-column MetricCards) ──────────────────────

export const mockDestinationMetrics: DestinationMetrics = {
  izgatewayStatus: '94%',
  totalMessages: '48,312',
  messageChange: { percent: '11%', isUp: true },
  successRate: '98.7%',
  successRateChange: { percent: '0.3%', isUp: true },
  medianResponseTime: '142ms',
  medianResponseTimeChange: { percent: '8%', isUp: true }, // isUp=true → Faster
  percentile95ResponseTime: '1.84s',
  percentile95Change: { percent: '12%', isUp: false }, // isUp=false → Slower
  avgThroughput: '33.6 msg/s',
  peakThroughput: '41.2 msg/s',
  throughputChange: { percent: '5%', isUp: true },
  lastUpdateTime: '14:32:08',
}
// ── Mock status levels for testing (thresholds TBD) ────────────────────────────────────────

export const mockOutboundStatuses: MockMetricStatuses = {
  totalMessages: 'healthy',
  successRate:   'healthy',
  avgResponse:   'healthy',
  totalFailures: 'warning',
}

export const mockInboundStatuses: MockMetricStatuses = {
  totalMessages: 'healthy',
  successRate:   'warning',
  avgResponse:   'healthy',
  totalFailures: 'warning',
}

export const mockMetricCardStatuses: Record<string, StatusLevel> = {
  izgatewayStatus:          'healthy',
  totalMessages:            'healthy',
  successRate:              'healthy',
  avgThroughput:            'healthy',
  medianResponseTime:       'healthy',
  percentile95ResponseTime: 'warning',
}