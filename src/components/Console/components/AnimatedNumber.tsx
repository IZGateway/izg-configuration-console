import { useEffect, useState, useRef } from 'react'

interface AnimatedNumberProps {
  value: string | number
  duration?: number
  className?: string
  // false: no live region. The final value is still in the accessibility
  // tree, read in place, but not announced. For counts that sit in a page
  // header, where several announcing on load is noise.
  live?: boolean
}

// Visually-hidden live region: clip-path avoids WAVE small-text alert;
// explicit color prevents contrast inheritance from status-colored parents.
const srOnlyStyle: React.CSSProperties = {
  position: 'absolute',
  width: '1px',
  height: '1px',
  padding: 0,
  margin: '-1px',
  overflow: 'hidden',
  clipPath: 'inset(50%)',
  whiteSpace: 'nowrap',
  border: 0,
  color: '#101010',
}

/**
 * Component that animates numbers counting up from 0 to the target value.
 * The animated span is hidden from assistive technology; a separate live
 * region announces the final value once the animation completes.
 */
const AnimatedNumber = ({
  value,
  duration = 1000,
  className,
  live = true,
}: AnimatedNumberProps) => {
  const [displayValue, setDisplayValue] = useState<string>('')
  const [liveValue, setLiveValue] = useState<string>('')
  const previousValueRef = useRef<number>(0)

  useEffect(() => {
    const extractNumber = (val: string | number): number => {
      if (typeof val === 'number') return val
      const numStr = val.replace(/[^0-9.-]/g, '')
      const parsed = parseFloat(numStr)
      return isNaN(parsed) ? NaN : parsed
    }

    const extractSuffix = (val: string | number): string => {
      if (typeof val === 'number') return ''
      const match = val.match(/\s*[^\d.,\s-]+.*$/)
      return match ? match[0] : ''
    }

    const hasDecimals = (val: string | number): boolean => {
      return val.toString().includes('.')
    }

    const targetNumber = extractNumber(value)
    const suffix = extractSuffix(value)
    const decimals = hasDecimals(value) ? 2 : 0

    // If the value is not a number (like "--"), just display it
    if (isNaN(targetNumber)) {
      setDisplayValue(value.toString())
      setLiveValue(value.toString())
      return
    }

    const startValue = previousValueRef.current
    const startTime = Date.now()
    let rafId: number

    const animate = () => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(elapsed / duration, 1)

      // Ease-out cubic function for smooth animation
      const easeOut = 1 - Math.pow(1 - progress, 3)
      const currentValue = startValue + (targetNumber - startValue) * easeOut

      let formattedValue: string
      if (decimals > 0) {
        formattedValue = currentValue.toFixed(decimals)
      } else {
        formattedValue = Math.round(currentValue).toLocaleString()
      }

      setDisplayValue(formattedValue + suffix)

      if (progress < 1) {
        rafId = requestAnimationFrame(animate)
      } else {
        previousValueRef.current = targetNumber
        setLiveValue(formattedValue + suffix)
      }
    }

    animate()

    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId)
      }
    }
  }, [value, duration])

  return (
    <>
      {/* aria-hidden: intermediate animation values should not be read aloud */}
      <span className={className} aria-hidden="true">
        {displayValue}
      </span>
      {live ? (
        // Live region announces the final value once animation completes
        <span
          style={srOnlyStyle}
          role="status"
          aria-live="polite"
          aria-atomic="true"
        >
          {liveValue}
        </span>
      ) : (
        <span style={srOnlyStyle}>{value}</span>
      )}
    </>
  )
}

export default AnimatedNumber
