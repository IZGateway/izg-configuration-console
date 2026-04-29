/**
 * @jest-environment node
 */
import {
  getStatusLevel,
  parseResponseTimeMs,
  computeStatuses,
  DESTINATION_METRICS,
  OUTBOUND_METRICS,
  INBOUND_METRICS,
  type DestinationDetailSource,
} from './statusThresholds'
import type { MessageMetrics } from '../types/messageMetrics'

// ── getStatusLevel ────────────────────────────────────────────────────────────

describe('getStatusLevel', () => {
  describe('null / missing threshold', () => {
    it('returns nodata when threshold is null', () => {
      expect(getStatusLevel(100, null)).toBe('nodata')
    })
  })

  describe('null / NaN value', () => {
    it('returns nodata for null value', () => {
      expect(
        getStatusLevel(null, {
          direction: 'higherIsBetter',
          healthyMin: 95,
          warningMin: 80,
        })
      ).toBe('nodata')
    })

    it('returns nodata for undefined value', () => {
      expect(
        getStatusLevel(undefined, {
          direction: 'lowerIsBetter',
          healthyMax: 100,
          warningMax: 500,
        })
      ).toBe('nodata')
    })

    it('returns nodata for NaN value', () => {
      expect(
        getStatusLevel(NaN, {
          direction: 'higherIsBetter',
          healthyMin: 95,
          warningMin: 80,
        })
      ).toBe('nodata')
    })
  })

  describe('higherIsBetter', () => {
    const threshold = {
      direction: 'higherIsBetter' as const,
      healthyMin: 95,
      warningMin: 80,
    }

    it('returns healthy when value >= healthyMin', () => {
      expect(getStatusLevel(95, threshold)).toBe('healthy')
      expect(getStatusLevel(100, threshold)).toBe('healthy')
    })

    it('returns warning when value >= warningMin and < healthyMin', () => {
      expect(getStatusLevel(80, threshold)).toBe('warning')
      expect(getStatusLevel(94.9, threshold)).toBe('warning')
    })

    it('returns critical when value < warningMin', () => {
      expect(getStatusLevel(79.9, threshold)).toBe('critical')
      expect(getStatusLevel(0, threshold)).toBe('critical')
    })
  })

  describe('lowerIsBetter', () => {
    const threshold = {
      direction: 'lowerIsBetter' as const,
      healthyMax: 100,
      warningMax: 500,
    }

    it('returns healthy when value <= healthyMax', () => {
      expect(getStatusLevel(0, threshold)).toBe('healthy')
      expect(getStatusLevel(100, threshold)).toBe('healthy')
    })

    it('returns warning when value > healthyMax and <= warningMax', () => {
      expect(getStatusLevel(101, threshold)).toBe('warning')
      expect(getStatusLevel(500, threshold)).toBe('warning')
    })

    it('returns critical when value > warningMax', () => {
      expect(getStatusLevel(501, threshold)).toBe('critical')
      expect(getStatusLevel(10000, threshold)).toBe('critical')
    })
  })
})

// ── parseResponseTimeMs ───────────────────────────────────────────────────────

describe('parseResponseTimeMs', () => {
  it('returns null for null input', () =>
    expect(parseResponseTimeMs(null)).toBeNull())
  it('returns null for undefined input', () =>
    expect(parseResponseTimeMs(undefined)).toBeNull())
  it('returns null for "--" placeholder', () =>
    expect(parseResponseTimeMs('--')).toBeNull())
  it('returns null for empty string', () =>
    expect(parseResponseTimeMs('')).toBeNull())

  it('parses millisecond strings', () =>
    expect(parseResponseTimeMs('500ms')).toBe(500))
  it('parses second strings', () =>
    expect(parseResponseTimeMs('1.5s')).toBe(1500))
  it('parses sub-second strings', () =>
    expect(parseResponseTimeMs('0.61s')).toBeCloseTo(610))
})

// ── computeStatuses ───────────────────────────────────────────────────────────

describe('computeStatuses', () => {
  it('evaluates each descriptor and returns a matching record', () => {
    const descriptors = {
      rate: {
        getValue: (_: { rate: number }) => _.rate,
        threshold: {
          direction: 'higherIsBetter' as const,
          healthyMin: 95,
          warningMin: 80,
        },
      },
      count: {
        getValue: (_: { rate: number }) => null as number | null,
        threshold: null,
      },
    }

    const result = computeStatuses(descriptors, { rate: 97 })
    expect(result.rate).toBe('healthy')
    expect(result.count).toBe('nodata')
  })
})

// ── DESTINATION_METRICS ───────────────────────────────────────────────────────

describe('DESTINATION_METRICS', () => {
  const base: DestinationDetailSource = {
    izgatewayStatus: '100.0%',
    totalMessages: '3,084',
    successRate: '100.0%',
    avgThroughput: '2.14 msg/min',
    medianResponseTime: '0.61s',
    percentile95ResponseTime: '1.33s',
  }

  describe('izgatewayStatus', () => {
    const { getValue, threshold } = DESTINATION_METRICS.izgatewayStatus

    it('parses percentage string correctly', () =>
      expect(getValue(base)).toBeCloseTo(100))
    it('returns null for "--"', () =>
      expect(getValue({ ...base, izgatewayStatus: '--' })).toBeNull())
    it('healthy at 100%', () =>
      expect(getStatusLevel(getValue(base), threshold)).toBe('healthy'))
    it('warning at 85%', () =>
      expect(
        getStatusLevel(
          getValue({ ...base, izgatewayStatus: '85.0%' }),
          threshold
        )
      ).toBe('warning'))
    it('critical at 75%', () =>
      expect(
        getStatusLevel(
          getValue({ ...base, izgatewayStatus: '75.0%' }),
          threshold
        )
      ).toBe('critical'))
  })

  describe('totalMessages', () => {
    const { getValue, threshold } = DESTINATION_METRICS.totalMessages

    it('parses locale-formatted integer', () =>
      expect(getValue(base)).toBe(3084))
    it('always returns nodata (no threshold defined)', () =>
      expect(getStatusLevel(getValue(base), threshold)).toBe('nodata'))
  })

  describe('successRate', () => {
    const { getValue, threshold } = DESTINATION_METRICS.successRate

    it('parses percentage string correctly', () =>
      expect(getValue(base)).toBeCloseTo(100))
    it('healthy at 100%', () =>
      expect(getStatusLevel(getValue(base), threshold)).toBe('healthy'))
    it('warning at 90%', () =>
      expect(
        getStatusLevel(getValue({ ...base, successRate: '90.0%' }), threshold)
      ).toBe('warning'))
    it('critical at 80%', () =>
      expect(
        getStatusLevel(getValue({ ...base, successRate: '80.0%' }), threshold)
      ).toBe('critical'))
  })

  describe('avgThroughput', () => {
    const { getValue, threshold } = DESTINATION_METRICS.avgThroughput

    it('parses numeric portion of unit string', () =>
      expect(getValue(base)).toBeCloseTo(2.14))
    it('returns null for "--"', () =>
      expect(getValue({ ...base, avgThroughput: '--' })).toBeNull())
    it('always returns nodata (no threshold defined)', () =>
      expect(getStatusLevel(getValue(base), threshold)).toBe('nodata'))
  })

  describe('medianResponseTime', () => {
    const { getValue, threshold } = DESTINATION_METRICS.medianResponseTime

    it('converts seconds to ms', () => expect(getValue(base)).toBeCloseTo(610))
    it('returns null for "--"', () =>
      expect(getValue({ ...base, medianResponseTime: '--' })).toBeNull())
    it('healthy at 0.61s (610ms)', () =>
      expect(getStatusLevel(getValue(base), threshold)).toBe('healthy'))
    it('warning at 5s', () =>
      expect(
        getStatusLevel(
          getValue({ ...base, medianResponseTime: '5.00s' }),
          threshold
        )
      ).toBe('warning'))
    it('critical at 15s', () =>
      expect(
        getStatusLevel(
          getValue({ ...base, medianResponseTime: '15.00s' }),
          threshold
        )
      ).toBe('critical'))
  })

  describe('percentile95ResponseTime', () => {
    const { getValue, threshold } = DESTINATION_METRICS.percentile95ResponseTime

    it('converts seconds to ms', () => expect(getValue(base)).toBeCloseTo(1330))
    it('healthy at 1.33s (1330ms)', () =>
      expect(getStatusLevel(getValue(base), threshold)).toBe('healthy'))
    it('warning at 15s', () =>
      expect(
        getStatusLevel(
          getValue({ ...base, percentile95ResponseTime: '15.00s' }),
          threshold
        )
      ).toBe('warning'))
    it('critical at 25s', () =>
      expect(
        getStatusLevel(
          getValue({ ...base, percentile95ResponseTime: '25.00s' }),
          threshold
        )
      ).toBe('critical'))
  })

  it('full computeStatuses call returns expected shape', () => {
    const statuses = computeStatuses(DESTINATION_METRICS, base)
    expect(statuses.izgatewayStatus).toBe('healthy')
    expect(statuses.totalMessages).toBe('nodata')
    expect(statuses.successRate).toBe('healthy')
    expect(statuses.avgThroughput).toBe('nodata') // no threshold defined — production thresholds not suitable for low-traffic environments
    expect(statuses.medianResponseTime).toBe('healthy')
    expect(statuses.percentile95ResponseTime).toBe('healthy')
  })
})

// ── OUTBOUND_METRICS / INBOUND_METRICS ────────────────────────────────────────

const MESSAGE_METRICS_CASES = [
  { label: 'OUTBOUND_METRICS', descriptors: OUTBOUND_METRICS },
  { label: 'INBOUND_METRICS', descriptors: INBOUND_METRICS },
]

MESSAGE_METRICS_CASES.forEach(({ label, descriptors }) => {
  describe(label, () => {
    const base: MessageMetrics = {
      totalMessages: 3084,
      successRate: '99.90%',
      avgResponseTime: '2.00s',
      totalFailures: 6,
      lastUpdateTime: '1:50:32 PM',
    }

    it('totalMessages: always nodata (no threshold)', () =>
      expect(
        getStatusLevel(
          descriptors.totalMessages.getValue(base),
          descriptors.totalMessages.threshold
        )
      ).toBe('nodata'))

    describe('successRate', () => {
      const { getValue, threshold } = descriptors.successRate
      it('parses percentage string', () =>
        expect(getValue(base)).toBeCloseTo(99.9))
      it('healthy at 99.9%', () =>
        expect(getStatusLevel(getValue(base), threshold)).toBe('healthy'))
      it('warning at 90%', () =>
        expect(
          getStatusLevel(getValue({ ...base, successRate: '90.0%' }), threshold)
        ).toBe('warning'))
      it('critical at 80%', () =>
        expect(
          getStatusLevel(getValue({ ...base, successRate: '80.0%' }), threshold)
        ).toBe('critical'))
    })

    describe('avgResponse', () => {
      const { getValue, threshold } = descriptors.avgResponse
      it('converts "2.00s" to 2000ms', () => expect(getValue(base)).toBe(2000))
      it('healthy at 2s', () =>
        expect(getStatusLevel(getValue(base), threshold)).toBe('healthy'))
      it('warning at 5s', () =>
        expect(
          getStatusLevel(
            getValue({ ...base, avgResponseTime: '5.00s' }),
            threshold
          )
        ).toBe('warning'))
      it('critical at 15s', () =>
        expect(
          getStatusLevel(
            getValue({ ...base, avgResponseTime: '15.00s' }),
            threshold
          )
        ).toBe('critical'))
      it('nodata for "--"', () =>
        expect(
          getStatusLevel(
            getValue({ ...base, avgResponseTime: '--' }),
            threshold
          )
        ).toBe('nodata'))
    })

    describe('totalFailures', () => {
      const { getValue, threshold } = descriptors.totalFailures
      // getValue now returns failure rate (%) = totalFailures / totalMessages * 100
      it('computes failure rate as percentage', () =>
        expect(getValue(base)).toBeCloseTo((6 / 3084) * 100))
      it('returns null when totalMessages is 0', () =>
        expect(getValue({ ...base, totalMessages: 0 })).toBeNull())
      it('healthy at 0.19% failure rate (6/3084)', () =>
        expect(getStatusLevel(getValue(base), threshold)).toBe('healthy'))
      it('warning at 3% failure rate', () =>
        // 3% of 1000 = 30 failures
        expect(
          getStatusLevel(
            getValue({ ...base, totalMessages: 1000, totalFailures: 30 }),
            threshold
          )
        ).toBe('warning'))
      it('critical at 14.1% failure rate (69/490)', () =>
        expect(
          getStatusLevel(
            getValue({ ...base, totalMessages: 490, totalFailures: 69 }),
            threshold
          )
        ).toBe('critical'))
    })

    it('full computeStatuses call returns expected shape', () => {
      const statuses = computeStatuses(descriptors, base)
      expect(statuses.totalMessages).toBe('nodata')
      expect(statuses.successRate).toBe('healthy')
      expect(statuses.avgResponse).toBe('healthy')
      expect(statuses.totalFailures).toBe('healthy')
    })
  })
})
