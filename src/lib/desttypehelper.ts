/**
 * Centralized destination type constants and helpers for IZ Gateway
 *
 * This file contains the mapping between destination type IDs and names,
 * plus helper functions for formatting and type conversion.
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
 * Map of destination type names to their IDs
 * Derived from DEST_TYPES to maintain single source of truth
 */
export const DEST_TYPE_IDS = DEST_TYPES.reduce((acc, name, index) => {
  if (name !== null) {
    acc[name] = index
  }
  return acc
}, {} as Record<string, number>)

/**
 * Reverse mapping: destination type IDs to names
 * Derived from DEST_TYPES to maintain single source of truth
 * Note: DEST_TYPES constant array already exists above, this provides ID->name lookup
 */
export const DEST_TYPE_NAMES = DEST_TYPES.reduce((acc, name, index) => {
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
  return DEST_TYPES[envId] || 'UNKNOWN'
}

/**
 * Get destination type ID from destination type name
 * @param envName - The destination type name (case-insensitive)
 * @returns The destination type ID or undefined if not found
 */
export function getDestinationTypeId(envName: string): number | undefined {
  const upperName = envName.toUpperCase()
  return DEST_TYPE_IDS[upperName]
}

/**
 * Determine destination type based on environment ID
 * @param envId - The environment ID
 * @returns The environment name or 'Unknown' if not found
 */
export function getDestinationType(envId: number): string {
  return DEST_TYPES[envId] || 'UNKNOWN'
}

/**
 * Format destination type from display format to database format
 * @param dest - The destination type in display format
 * @returns The destination type in database format
 */
function destTypeFormattedToSyncWithDB(dest: string) {
  switch (dest) {
    case 'Development':
      return 'DEV'
    case 'Production':
      return 'PRODUCTION'
    case 'Testing':
      return 'TEST'
    case 'Onboarding':
      return 'ONBOARD'
    case 'Staging':
      return 'STAGE'
    case 'UNKNOWN':
      return 'UNKNOWN'
    default:
      return 'NA'
  }
}

/**
 * Format destination type from database format to API/display format
 * @param dest - The destination type in database format
 * @returns The destination type in display format
 */
function destTypeFormattedToSyncWithApi(dest: string) {
  switch (dest) {
    case 'DEV':
      return 'Development'
    case 'PRODUCTION':
      return 'Production'
    case 'TEST':
      return 'Testing'
    case 'ONBOARD':
      return 'Onboarding'
    case 'STAGE':
      return 'Staging'
    case 'UNKNOWN':
      return 'UNKNOWN'
    default:
      return 'NA'
  }
}

/**
 * Get the Elasticsearch environment tag for a given destination type name.
 * Maps the DB type string to the corresponding Elasticsearch index tag.
 * @param destType - The destination type string (e.g. 'PRODUCTION', 'ONBOARD')
 * @returns The Elasticsearch tag string
 */
export function getElasticEnvTag(destType: string): string {
  const tagMap: Record<string, string> = {
    PRODUCTION: 'prod',
    ONBOARD: 'onboard',
    STAGE: 'staging',
    DEV: 'dev',
    TEST: 'test',
  }
  return (
    tagMap[destType?.toUpperCase()] ??
    process.env.NEXT_PUBLIC_ELASTIC_ENV_TAG ??
    'dev'
  )
}

const desttypehelper = {
  destTypeFormattedToSyncWithApi,
  destTypeFormattedToSyncWithDB,
}

export default desttypehelper
