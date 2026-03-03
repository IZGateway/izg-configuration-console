import { useEffect, useState, useRef } from 'react'

interface AnimatedNumberProps {
  value: string | number
  duration?: number
  className?: string
}

/**
 * Component that animates numbers counting up from 0 to the target value
 */
const AnimatedNumber = ({
  value,
  duration = 1000,
  className,
}: AnimatedNumberProps) => {
  const [displayValue, setDisplayValue] = useState<string>('')
  const previousValueRef = useRef<number>(0)

  useEffect(() => {
    // Extract numeric value from string (handles "1,234", "95.5%", "2.5s", etc.)
    const extractNumber = (val: string | number): number => {
      if (typeof val === 'number') return val
      const numStr = val.replace(/[^0-9.-]/g, '')
      const parsed = parseFloat(numStr)
      return isNaN(parsed) ? NaN : parsed
    }

    // Extract suffix (%, s, msg/min, etc.)
    // Preserve any leading whitespace before the suffix so spacing matches the original value
    const extractSuffix = (val: string | number): string => {
      if (typeof val === 'number') return ''
      const match = val.match(/\s*[^\d.,\s-]+.*$/)
      return match ? match[0] : ''
    }

    // Check if value has decimals
    const hasDecimals = (val: string | number): boolean => {
      return val.toString().includes('.')
    }

    const targetNumber = extractNumber(value)
    const suffix = extractSuffix(value)
    const decimals = hasDecimals(value) ? 2 : 0

    // If the value is not a number (like "--"), just display it
    if (isNaN(targetNumber)) {
      setDisplayValue(value.toString())
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

      // Format with thousands separator
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
      }
    }

    animate()

    // Cleanup: cancel animation on unmount or when value/duration changes
    return () => {
      if (rafId) {
        cancelAnimationFrame(rafId)
      }
    }
  }, [value, duration])

  return <span className={className}>{displayValue}</span>
}

export default AnimatedNumber
