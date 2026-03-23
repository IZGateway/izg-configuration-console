import type {
  CreateAccessGroupRequest,
  UpdateAccessGroupRequest,
} from '../type/AccessGroupApi'

/**
 * Validates environment is a valid number (1-5)
 */
function isValidEnvironment(env: unknown): env is number {
  const envNum = Number(env)
  return !isNaN(envNum) && envNum >= 1 && envNum <= 5
}

/**
 * Validates groupName is a non-empty string with reasonable length
 */
function isValidGroupName(name: unknown): name is string {
  return (
    typeof name === 'string' && name.trim().length > 0 && name.length <= 100
  )
}

/**
 * Validates roles is an array of strings
 */
function isValidRolesArray(roles: unknown): roles is string[] {
  return Array.isArray(roles) && roles.every((r) => typeof r === 'string')
}

/**
 * Validates users is an array of strings
 */
function isValidUsersArray(users: unknown): users is string[] {
  return Array.isArray(users) && users.every((u) => typeof u === 'string')
}

/**
 * Validates groups is an array of strings
 */
function isValidGroupsArray(groups: unknown): groups is string[] {
  return Array.isArray(groups) && groups.every((g) => typeof g === 'string')
}

/**
 * Type guard for CreateAccessGroupRequest
 */
export function isCreateAccessGroupRequest(
  data: unknown
): data is CreateAccessGroupRequest {
  if (!data || typeof data !== 'object') return false
  const obj = data as Record<string, unknown>

  // Required fields
  if (!obj.environment || !obj.groupName) return false
  if (!isValidEnvironment(obj.environment)) return false
  if (!isValidGroupName(obj.groupName)) return false

  // Optional arrays
  if (obj.roles !== undefined && !isValidRolesArray(obj.roles)) return false
  if (obj.users !== undefined && !isValidUsersArray(obj.users)) return false
  if (obj.groups !== undefined && !isValidGroupsArray(obj.groups)) return false

  // Validate description if provided
  if (obj.description !== undefined && typeof obj.description !== 'string')
    return false

  return true
}

/**
 * Type guard for UpdateAccessGroupRequest
 */
export function isUpdateAccessGroupRequest(
  data: unknown
): data is UpdateAccessGroupRequest {
  if (!data || typeof data !== 'object') return false
  const obj = data as Record<string, unknown>

  // Optional arrays
  if (obj.roles !== undefined && !isValidRolesArray(obj.roles)) return false
  if (obj.users !== undefined && !isValidUsersArray(obj.users)) return false
  if (obj.groups !== undefined && !isValidGroupsArray(obj.groups)) return false

  // Validate description if provided
  if (obj.description !== undefined && typeof obj.description !== 'string')
    return false

  return true
}
