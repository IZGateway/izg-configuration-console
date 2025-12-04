// TODO: Paul Cahill: Remove this file in favor of the pattern Anusha created for handling environments

/**
 * Centralized environment constants for IZ Gateway
 *
 * This file contains the mapping between environment IDs and names
 * used throughout the application.
 */

/**
 * Single source of truth for destination/environment types
 * Array indexed by environment ID (index 0 is null for 1-based indexing)
 * Used throughout the system for database compatibility and type mapping
 */
export const DEST_TYPES = [
  null,
  'PRODUCTION',
  'TEST',
  'ONBOARD',
  'STAGE',
  'DEV',
  'UNKNOWN',
] as const

/**
 * Map of environment names to their IDs
 * Derived from DEST_TYPES to maintain single source of truth
 */
export const ENVIRONMENT_IDS = DEST_TYPES.reduce((acc, name, index) => {
  if (name !== null) {
    acc[name] = index
  }
  return acc
}, {} as Record<string, number>)

/**
 * Reverse mapping: environment IDs to names
 * Derived from DEST_TYPES to maintain single source of truth
 */
export const ENVIRONMENT_NAMES = DEST_TYPES.reduce((acc, name, index) => {
  if (name !== null) {
    acc[index] = name
  }
  return acc
}, {} as Record<number, string>)

/**
 * Get environment name from environment ID
 * @param envId - The environment ID (1-6)
 * @returns The environment name or 'Unknown' if not found
 */
export function getEnvironmentName(envId: number): string {
  return DEST_TYPES[envId] || 'Unknown'
}

/**
 * Get environment ID from environment name
 * @param envName - The environment name (case-insensitive)
 * @returns The environment ID or undefined if not found
 */
export function getEnvironmentId(envName: string): number | undefined {
  const upperName = envName.toUpperCase()
  return ENVIRONMENT_IDS[upperName]
}

/**
 * Determine connection type based on environment ID
 * @param envId - The environment ID
 * @returns 'production' if envId is 1, otherwise 'onboarding'
 */
export function getConnectionType(envId: number): 'production' | 'onboarding' {
  return envId === 1 ? 'production' : 'onboarding'
}

export type EnvironmentId = 1 | 2 | 3 | 4 | 5 | 6
export type EnvironmentName =
  | 'PRODUCTION'
  | 'TEST'
  | 'ONBOARD'
  | 'STAGE'
  | 'DEV'
  | 'UNKNOWN'
export type ConnectionType = 'production' | 'onboarding'
