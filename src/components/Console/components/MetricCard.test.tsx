import React from 'react'
import { render, screen } from '@testing-library/react'
import MetricCard from './MetricCard'
import { MetricChange } from '../types/destinationMetrics'

describe('MetricCard Component', () => {
  const defaultProps = {
    id: 'test-metric',
    title: 'Test Metric',
    subheader: 'Test Subheader',
    value: '100',
  }

  describe('Basic Rendering', () => {
    it('should render the title', () => {
      render(<MetricCard {...defaultProps} />)
      expect(screen.getByText('Test Metric')).toBeInTheDocument()
    })

    it('should render the subheader', () => {
      render(<MetricCard {...defaultProps} />)
      expect(screen.getByText('Test Subheader')).toBeInTheDocument()
    })

    it('should render the value', () => {
      render(<MetricCard {...defaultProps} />)
      expect(screen.getByText('100')).toBeInTheDocument()
    })

    it('should have the correct id', () => {
      render(<MetricCard {...defaultProps} />)
      expect(document.getElementById('test-metric')).toBeInTheDocument()
    })
  })

  describe('Without change prop', () => {
    it('should not render change text when no change is provided', () => {
      render(<MetricCard {...defaultProps} />)
      expect(screen.queryByText(/From Yesterday/)).not.toBeInTheDocument()
      expect(screen.queryByText(/Than Yesterday/)).not.toBeInTheDocument()
    })
  })

  describe('With updown changeLabel (default)', () => {
    it('should show Up with green arrow when isUp is true', () => {
      const change: MetricChange = { percent: '12%', isUp: true }
      render(<MetricCard {...defaultProps} change={change} />)

      expect(screen.getByText(/12%/)).toBeInTheDocument()
      expect(screen.getByText(/Up/)).toBeInTheDocument()
      expect(screen.getByText(/From Yesterday/)).toBeInTheDocument()
      expect(screen.getByText('↑')).toBeInTheDocument()
    })

    it('should show Down with red arrow when isUp is false', () => {
      const change: MetricChange = { percent: '5%', isUp: false }
      render(<MetricCard {...defaultProps} change={change} />)

      expect(screen.getByText(/5%/)).toBeInTheDocument()
      expect(screen.getByText(/Down/)).toBeInTheDocument()
      expect(screen.getByText(/From Yesterday/)).toBeInTheDocument()
      expect(screen.getByText('↓')).toBeInTheDocument()
    })

    it('should apply green color when isUp is true', () => {
      const change: MetricChange = { percent: '10%', isUp: true }
      render(<MetricCard {...defaultProps} change={change} />)

      const arrow = screen.getByText('↑')
      expect(arrow).toHaveStyle({ color: '#4caf50' })
    })

    it('should apply red color when isUp is false', () => {
      const change: MetricChange = { percent: '10%', isUp: false }
      render(<MetricCard {...defaultProps} change={change} />)

      const arrow = screen.getByText('↓')
      expect(arrow).toHaveStyle({ color: '#B50E16' })
    })
  })

  describe('With fasterslower changeLabel', () => {
    it('should show Faster with down arrow when isUp is true (lower response time is better)', () => {
      const change: MetricChange = { percent: '15%', isUp: true }
      render(
        <MetricCard
          {...defaultProps}
          change={change}
          changeLabel="fasterslower"
        />
      )

      expect(screen.getByText(/15%/)).toBeInTheDocument()
      expect(screen.getByText(/Faster/)).toBeInTheDocument()
      expect(screen.getByText(/Than Yesterday/)).toBeInTheDocument()
      expect(screen.getByText('↓')).toBeInTheDocument()
    })

    it('should show Slower with up arrow when isUp is false', () => {
      const change: MetricChange = { percent: '8%', isUp: false }
      render(
        <MetricCard
          {...defaultProps}
          change={change}
          changeLabel="fasterslower"
        />
      )

      expect(screen.getByText(/8%/)).toBeInTheDocument()
      expect(screen.getByText(/Slower/)).toBeInTheDocument()
      expect(screen.getByText(/Than Yesterday/)).toBeInTheDocument()
      expect(screen.getByText('↑')).toBeInTheDocument()
    })

    it('should apply green color for Faster (isUp true)', () => {
      const change: MetricChange = { percent: '10%', isUp: true }
      render(
        <MetricCard
          {...defaultProps}
          change={change}
          changeLabel="fasterslower"
        />
      )

      const arrow = screen.getByText('↓')
      expect(arrow).toHaveStyle({ color: '#4caf50' })
    })

    it('should apply red color for Slower (isUp false)', () => {
      const change: MetricChange = { percent: '10%', isUp: false }
      render(
        <MetricCard
          {...defaultProps}
          change={change}
          changeLabel="fasterslower"
        />
      )

      const arrow = screen.getByText('↑')
      expect(arrow).toHaveStyle({ color: '#B50E16' })
    })
  })

  describe('Edge cases', () => {
    it('should handle 0% change', () => {
      const change: MetricChange = { percent: '0%', isUp: true }
      render(<MetricCard {...defaultProps} change={change} />)

      // Use regex since text may be broken up by elements
      expect(screen.getByText(/0%/)).toBeInTheDocument()
    })

    it('should handle large percentage values', () => {
      const change: MetricChange = { percent: '999.9%', isUp: true }
      render(<MetricCard {...defaultProps} change={change} />)

      // Use regex since text may be broken up by elements
      expect(screen.getByText(/999\.9%/)).toBeInTheDocument()
    })

    it('should handle special characters in title and subheader', () => {
      render(
        <MetricCard
          {...defaultProps}
          title="95th Percentile Response Time"
          subheader="Peak: 0.05 msg/min"
        />
      )

      expect(
        screen.getByText('95th Percentile Response Time')
      ).toBeInTheDocument()
      expect(screen.getByText('Peak: 0.05 msg/min')).toBeInTheDocument()
    })
  })
})
