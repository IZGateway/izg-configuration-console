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

/**
 * Environment selector component that filters available environments based on APP_ENV
 *
 * Environment values:
 * - '1': Production
 * - '2': Test
 * - '3': Onboard
 * - '4': PreProd/Stage
 * - '5': Development
 *
 * APP_ENV behavior:
 * - production/prod: Only shows Production
 * - test: Only shows Test
 * - onboard/onboarding: Only shows Onboard
 * - stage/staging/preprod: Only shows PreProd
 * - dev/development: Shows Development and Test
 * - not set or unrecognized: Shows all options
 */
const EnvironmentSelect: React.FC<EnvironmentSelectProps> = ({
  value,
  onChange,
  disabled = false,
  required = false,
  helperText = '',
  label = 'Environment',
}) => {
  const getAvailableEnvironments = () => {
    const environments = allEnvironments

    const appEnv = process.env.NEXT_PUBLIC_APP_ENV?.toLowerCase() || 'dev'
    // Ensure value is a string for comparison
    const stringValue = String(value)

    // Map APP_ENV to corresponding environment values
    const envMapping: Record<string, string[]> = {
      production: ['1', '3'], // Production shows both Production and Onboarding
      test: ['2'],
      onboarding: ['3'],
      preprod: ['4'],
      development: ['5', '2'], // Development shows both Development and Test
    }

    const allowedEnvValues = envMapping[appEnv]

    // Get filtered environments based on APP_ENV
    const filteredEnvironments = allowedEnvValues
      ? environments.filter((env) => allowedEnvValues.includes(env.value))
      : environments

    // If disabled (edit mode)
    if (disabled && stringValue) {
      const currentEnv = environments.find((env) => env.value === stringValue)
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

  const availableEnvironments = getAvailableEnvironments()

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
 * Get the first available environment value based on APP_ENV
 * Returns the numeric index (1-5) of the first available environment
 */
export const getFirstAvailableEnvironment = (): number => {
  const appEnv = process.env.NEXT_PUBLIC_APP_ENV?.toLowerCase() || 'dev'

  const envMapping: Record<string, string[]> = {
    production: ['1', '3'],
    test: ['2'],
    onboarding: ['3'],
    preprod: ['4'],
    development: ['5', '2'],
  }

  const allowedEnvValues = envMapping[appEnv]

  const filteredEnvironments = allowedEnvValues
    ? allEnvironments.filter((env) => allowedEnvValues.includes(env.value))
    : allEnvironments

  // Return the first available environment's value as number, default to 3 (Onboarding)
  return filteredEnvironments.length > 0
    ? parseInt(filteredEnvironments[0].value, 10)
    : 3
}

export default EnvironmentSelect
