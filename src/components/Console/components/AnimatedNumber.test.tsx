import { render, screen, waitFor, act } from '@testing-library/react'
import AnimatedNumber from './AnimatedNumber'

// Mock requestAnimationFrame and cancelAnimationFrame
const rafCallbacks = new Map<number, FrameRequestCallback>()
let rafId = 0

const mockRequestAnimationFrame = jest.fn((callback: FrameRequestCallback) => {
  const id = ++rafId
  rafCallbacks.set(id, callback)
  return id
})

const mockCancelAnimationFrame = jest.fn((id: number) => {
  rafCallbacks.delete(id)
})

global.requestAnimationFrame = mockRequestAnimationFrame as any
global.cancelAnimationFrame = mockCancelAnimationFrame as any

beforeEach(() => {
  rafId = 0
  rafCallbacks.clear()
  mockRequestAnimationFrame.mockClear()
  mockCancelAnimationFrame.mockClear()
  jest.useFakeTimers()
})

afterEach(() => {
  jest.runOnlyPendingTimers()
  jest.useRealTimers()
})

// Helper to run animations
const runAnimation = (duration: number) => {
  act(() => {
    Array.from(rafCallbacks.values()).forEach((cb) => cb(Date.now()))
    rafCallbacks.clear()
    jest.advanceTimersByTime(duration)
    Array.from(rafCallbacks.values()).forEach((cb) => cb(Date.now()))
    rafCallbacks.clear()
  })
}

describe('AnimatedNumber', () => {
  describe('Basic Rendering', () => {
    it('renders and animates a numeric value', async () => {
      render(<AnimatedNumber value={100} />)
      runAnimation(1000)

      await waitFor(() => {
        const liveRegion = screen.getByRole('status')
        expect(liveRegion).toHaveTextContent('100')
      })
    })

    it('renders and animates a string numeric value', async () => {
      render(<AnimatedNumber value="250" />)
      runAnimation(1000)

      await waitFor(() => {
        const liveRegion = screen.getByRole('status')
        expect(liveRegion).toHaveTextContent('250')
      })
    })

    it('applies custom className', () => {
      const { container } = render(
        <AnimatedNumber value={100} className="custom-class" />
      )
      const span = container.querySelector('.custom-class')
      expect(span).toBeInTheDocument()
    })
  })

  describe('Placeholder Values', () => {
    it('displays "--" without animation', () => {
      const { container } = render(<AnimatedNumber value="--" />)
      const displayed = container.querySelector('[aria-hidden="true"]')
      expect(displayed).toHaveTextContent('--')
      expect(mockRequestAnimationFrame).not.toHaveBeenCalled()
    })

    it('displays "N/A" without animation', () => {
      const { container } = render(<AnimatedNumber value="N/A" />)
      const displayed = container.querySelector('[aria-hidden="true"]')
      expect(displayed).toHaveTextContent('N/A')
      expect(mockRequestAnimationFrame).not.toHaveBeenCalled()
    })

    it('displays empty string without animation', () => {
      render(<AnimatedNumber value="" />)
      expect(mockRequestAnimationFrame).not.toHaveBeenCalled()
    })
  })

  describe('Values with Suffixes', () => {
    it('animates percentage values', async () => {
      render(<AnimatedNumber value="99.5%" duration={100} />)
      runAnimation(100)

      await waitFor(() => {
        const liveRegion = screen.getByRole('status')
        expect(liveRegion).toHaveTextContent('99.50%')
      })
    })

    it('animates time values with "ms" suffix', async () => {
      render(<AnimatedNumber value="142ms" duration={100} />)
      runAnimation(100)

      await waitFor(() => {
        const liveRegion = screen.getByRole('status')
        expect(liveRegion).toHaveTextContent('142ms')
      })
    })

    it('animates time values with "s" suffix', async () => {
      render(<AnimatedNumber value="1.84s" duration={100} />)
      runAnimation(100)

      await waitFor(() => {
        const liveRegion = screen.getByRole('status')
        expect(liveRegion).toHaveTextContent('1.84s')
      })
    })

    it('animates throughput values with "msg/s" suffix', async () => {
      render(<AnimatedNumber value="33.6 msg/s" duration={100} />)
      runAnimation(100)

      await waitFor(() => {
        const liveRegion = screen.getByRole('status')
        expect(liveRegion).toHaveTextContent('33.60 msg/s')
      })
    })

    it('preserves whitespace in suffix', async () => {
      render(<AnimatedNumber value="100 units" duration={100} />)
      runAnimation(100)

      await waitFor(() => {
        const liveRegion = screen.getByRole('status')
        expect(liveRegion).toHaveTextContent('100 units')
      })
    })
  })

  describe('Number Formatting', () => {
    it('formats large numbers with commas', async () => {
      render(<AnimatedNumber value="48312" duration={100} />)
      runAnimation(100)

      await waitFor(() => {
        const liveRegion = screen.getByRole('status')
        expect(liveRegion).toHaveTextContent('48,312')
      })
    })

    it('formats decimal numbers with 2 decimal places', async () => {
      render(<AnimatedNumber value="98.7" duration={100} />)
      runAnimation(100)

      await waitFor(() => {
        const liveRegion = screen.getByRole('status')
        expect(liveRegion).toHaveTextContent('98.70')
      })
    })

    it('formats string numbers with commas', async () => {
      render(<AnimatedNumber value="48,312" duration={100} />)
      runAnimation(100)

      await waitFor(() => {
        const liveRegion = screen.getByRole('status')
        expect(liveRegion).toHaveTextContent('48,312')
      })
    })
  })

  describe('Animation Behavior', () => {
    it('triggers requestAnimationFrame for numeric values', (done) => {
      jest.useRealTimers()
      render(<AnimatedNumber value={100} />)

      setTimeout(() => {
        expect(mockRequestAnimationFrame).toHaveBeenCalled()
        jest.useFakeTimers()
        done()
      }, 0)
    })

    it('respects custom duration', async () => {
      render(<AnimatedNumber value="500" duration={2000} />)

      // Animation should complete after 2000ms
      runAnimation(2000)

      await waitFor(() => {
        const liveRegion = screen.getByRole('status')
        expect(liveRegion).toHaveTextContent('500')
      })
    })

    it('animates from previous value to new value', async () => {
      const { rerender } = render(<AnimatedNumber value="100" duration={100} />)
      runAnimation(100)

      await waitFor(() => {
        const liveRegion = screen.getByRole('status')
        expect(liveRegion).toHaveTextContent('100')
      })

      // Update to new value
      rerender(<AnimatedNumber value="200" duration={100} />)
      runAnimation(100)

      await waitFor(() => {
        const liveRegion = screen.getByRole('status')
        expect(liveRegion).toHaveTextContent('200')
      })
    })
  })

  describe('Animation Cleanup', () => {
    it('calls cancelAnimationFrame on unmount', (done) => {
      jest.useRealTimers()
      const { unmount } = render(<AnimatedNumber value={100} />)

      setTimeout(() => {
        expect(mockRequestAnimationFrame).toHaveBeenCalled()
        expect(mockCancelAnimationFrame).not.toHaveBeenCalled()

        unmount()
        expect(mockCancelAnimationFrame).toHaveBeenCalled()
        jest.useFakeTimers()
        done()
      }, 0)
    })

    it('cancels previous animation when value changes', (done) => {
      jest.useRealTimers()
      const { rerender } = render(
        <AnimatedNumber value="100" duration={1000} />
      )

      setTimeout(() => {
        const firstCallCount = mockRequestAnimationFrame.mock.calls.length

        rerender(<AnimatedNumber value="200" duration={1000} />)

        setTimeout(() => {
          expect(mockCancelAnimationFrame).toHaveBeenCalled()
          expect(mockRequestAnimationFrame.mock.calls.length).toBeGreaterThan(
            firstCallCount
          )
          jest.useFakeTimers()
          done()
        }, 0)
      }, 0)
    })

    it('cleans up when changing from number to placeholder', (done) => {
      jest.useRealTimers()
      const { rerender, container } = render(
        <AnimatedNumber value="100" duration={100} />
      )

      setTimeout(() => {
        expect(mockRequestAnimationFrame).toHaveBeenCalled()

        rerender(<AnimatedNumber value="--" duration={100} />)

        setTimeout(() => {
          expect(mockCancelAnimationFrame).toHaveBeenCalled()

          const displayed = container.querySelector('[aria-hidden="true"]')
          expect(displayed).toHaveTextContent('--')
          jest.useFakeTimers()
          done()
        }, 0)
      }, 0)
    })
  })

  describe('Accessibility', () => {
    it('renders animated value with aria-hidden', () => {
      const { container } = render(<AnimatedNumber value={100} />)
      const animatedSpan = container.querySelector('[aria-hidden="true"]')
      expect(animatedSpan).toHaveAttribute('aria-hidden', 'true')
    })

    it('renders live region with proper ARIA attributes', () => {
      render(<AnimatedNumber value={100} />)
      const liveRegion = screen.getByRole('status')
      expect(liveRegion).toHaveAttribute('aria-live', 'polite')
      expect(liveRegion).toHaveAttribute('aria-atomic', 'true')
    })

    it('announces final value in live region after animation', async () => {
      render(<AnimatedNumber value="250" duration={100} />)
      runAnimation(100)

      await waitFor(() => {
        const liveRegion = screen.getByRole('status')
        expect(liveRegion).toHaveTextContent('250')
      })
    })

    it('live region has visually hidden styles', () => {
      render(<AnimatedNumber value={100} />)
      const liveRegion = screen.getByRole('status')
      expect(liveRegion).toHaveAttribute('style')
      expect(liveRegion.getAttribute('style')).toContain('position: absolute')
    })
  })

  describe('Edge Cases', () => {
    it('handles zero value', async () => {
      render(<AnimatedNumber value={0} duration={100} />)
      runAnimation(100)

      await waitFor(() => {
        const liveRegion = screen.getByRole('status')
        expect(liveRegion).toHaveTextContent('0')
      })
    })

    it('handles negative numbers', async () => {
      render(<AnimatedNumber value="-50" duration={100} />)
      runAnimation(100)

      await waitFor(() => {
        const liveRegion = screen.getByRole('status')
        expect(liveRegion).toHaveTextContent('-50')
      })
    })

    it('handles very large numbers', async () => {
      render(<AnimatedNumber value="1234567890" duration={100} />)
      runAnimation(100)

      await waitFor(() => {
        const liveRegion = screen.getByRole('status')
        expect(liveRegion).toHaveTextContent('1,234,567,890')
      })
    })

    it('handles decimal with percentage', async () => {
      render(<AnimatedNumber value="0.3%" duration={100} />)
      runAnimation(100)

      await waitFor(() => {
        const liveRegion = screen.getByRole('status')
        expect(liveRegion).toHaveTextContent('0.30%')
      })
    })

    it('handles number with complex suffix', async () => {
      render(<AnimatedNumber value="33.6 msg/s" duration={100} />)
      runAnimation(100)

      await waitFor(() => {
        const liveRegion = screen.getByRole('status')
        expect(liveRegion).toHaveTextContent('33.60 msg/s')
      })
    })

    it('handles value changing from higher to lower', async () => {
      const { rerender } = render(<AnimatedNumber value="100" duration={50} />)
      runAnimation(50)

      await waitFor(() => {
        const liveRegion = screen.getByRole('status')
        expect(liveRegion).toHaveTextContent('100')
      })

      rerender(<AnimatedNumber value="50" duration={50} />)
      runAnimation(50)

      await waitFor(() => {
        const liveRegion = screen.getByRole('status')
        expect(liveRegion).toHaveTextContent('50')
      })
    })
  })

  describe('Number Extraction and Suffix Handling', () => {
    it('extracts number from string with suffix', async () => {
      render(<AnimatedNumber value="94%" duration={100} />)
      runAnimation(100)

      await waitFor(() => {
        const liveRegion = screen.getByRole('status')
        expect(liveRegion).toHaveTextContent('94%')
      })
    })

    it('returns original value for non-numeric strings', () => {
      const { container } = render(<AnimatedNumber value="invalid" />)
      const displayed = container.querySelector('[aria-hidden="true"]')
      expect(displayed).toHaveTextContent('invalid')
      expect(mockRequestAnimationFrame).not.toHaveBeenCalled()
    })

    it('handles numbers with hyphens correctly', async () => {
      render(<AnimatedNumber value="-10" duration={100} />)
      runAnimation(100)

      await waitFor(() => {
        const liveRegion = screen.getByRole('status')
        expect(liveRegion).toHaveTextContent('-10')
      })
    })

    it('preserves single letter suffix', async () => {
      render(<AnimatedNumber value="1.84s" duration={100} />)
      runAnimation(100)

      await waitFor(() => {
        const liveRegion = screen.getByRole('status')
        expect(liveRegion).toHaveTextContent('1.84s')
      })
    })

    it('preserves multi-character suffix', async () => {
      render(<AnimatedNumber value="142ms" duration={100} />)
      runAnimation(100)

      await waitFor(() => {
        const liveRegion = screen.getByRole('status')
        expect(liveRegion).toHaveTextContent('142ms')
      })
    })

    it('preserves suffix with spaces', async () => {
      render(<AnimatedNumber value="41.2 msg/s" duration={100} />)
      runAnimation(100)

      await waitFor(() => {
        const liveRegion = screen.getByRole('status')
        expect(liveRegion).toHaveTextContent('41.20 msg/s')
      })
    })

    it('handles plain numbers without suffix', async () => {
      render(<AnimatedNumber value={12345} duration={100} />)
      runAnimation(100)

      await waitFor(() => {
        const liveRegion = screen.getByRole('status')
        expect(liveRegion).toHaveTextContent('12,345')
      })
    })
  })
})
