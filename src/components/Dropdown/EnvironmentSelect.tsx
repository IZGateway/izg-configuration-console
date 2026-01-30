import React from 'react'
import StandardSelect from './StandardSelect'

interface EnvironmentSelectProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
  required?: boolean
  helperText?: string
  label?: string
}

const allEnvironments = [
  { value: '1', label: 'Production' },
  { value: '2', label: 'Test' },
  { value: '3', label: 'Onboarding' },
  { value: '4', label: 'PreProduction' },
  { value: '5', label: 'Development' },
]

export const ENVIRONMENT_LABELS: Record<string, string> =
  allEnvironments.reduce((acc, env) => {
    acc[env.value] = env.label
    return acc
  }, {} as Record<string, string>)

// Environment selector component that filters available environments based on NEXT_PUBLIC_APP_ENV
const EnvironmentSelect: React.FC<EnvironmentSelectProps> = ({
  value,
  onChange,
  disabled = false,
  required = false,
  helperText = '',
  label = 'Environment',
}) => {
  const availableEnvironments = getAvailableEnvironments(disabled, value)

  return (
    <StandardSelect
      label={label}
      value={value}
      options={availableEnvironments}
      onChange={onChange}
      required={required}
      disabled={disabled}
      helperText={helperText}
    />
  )
}

/**
 * Get available environments based on NEXT_PUBLIC_APP_ENV filtering
 */
const getAvailableEnvironments = (
  disabled = false,
  currentValue = ''
): Array<{ value: string; label: string }> => {
  const appEnv =
    process.env.NEXT_PUBLIC_APP_ENV?.trim().toLowerCase() || 'development'
  const stringValue = String(currentValue)

  // Map NEXT_PUBLIC_APP_ENV to corresponding environment values
  const envMapping: Record<string, string[]> = {
    production: ['1', '3'], // Production shows both Production and Onboarding
    test: ['2'],
    onboarding: ['3'],
    preprod: ['4'],
    development: ['5', '2'], // Development shows both Development and Test
  }

  const allowedEnvValues = envMapping[appEnv]

  // Get filtered environments based on NEXT_PUBLIC_APP_ENV
  const filteredEnvironments = allowedEnvValues
    ? allEnvironments.filter((env) => allowedEnvValues.includes(env.value))
    : allEnvironments

  // If disabled (edit mode)
  if (disabled && stringValue) {
    const currentEnv = allEnvironments.find((env) => env.value === stringValue)
    const valueInFilteredList = filteredEnvironments.some(
      (env) => env.value === stringValue
    )

    // If current value not in filtered list, only show the current value
    if (currentEnv && !valueInFilteredList) {
      return [currentEnv]
    }
  }

  return filteredEnvironments
}

/**
 * Get the first available environment value based on NEXT_PUBLIC_APP_ENV
 * Returns the numeric index (1-5) of the first available environment
 */
export const getFirstAvailableEnvironment = (): number => {
  const filteredEnvironments = getAvailableEnvironments()

  // Return the first available environment's value as number, default to 3 (Onboarding)
  return filteredEnvironments.length > 0
    ? parseInt(filteredEnvironments[0].value, 10)
    : 3
}

export default EnvironmentSelect
