/**
 * Okta group ingestion: raw group claims -> CC roles.
 *
 * This is the layer *before* authorization. It answers "which CC roles does this
 * person hold?" and nothing else — no permission or tenancy decisions are made
 * here. Those live in `policy.ts`, which is pure and takes an `AuthzSubject`.
 *
 * Replaces the former `roles.ts`, which listed role strings that doubled as Okta
 * group names. Three problems with that arrangement, all fixed here:
 *
 *  1. It listed seven roles, three of which (`IZG Program`, `CDC Program`,
 *     `CDC CISO`) had no entry in the access matrix. They could be selected at
 *     login and then resolve to no permissions — and worse, displace a role that
 *     would have worked. Only roles that exist in the matrix can be named now.
 *  2. Group names were matched exactly and case-sensitively, so an Okta group
 *     called `IZG-Operations` silently granted nothing, indistinguishable from
 *     the group not existing. Names are normalized now.
 *  3. Okta group names *were* the permission vocabulary, so renaming a group in
 *     Okta meant a code change in authorization logic. The mapping decouples them.
 *
 * The shape follows `izg-transformation-ui`'s `src/lib/rbac.ts`, which solves the
 * same ingestion problem against the same Okta tenant. Its *evaluation* model is
 * deliberately not copied — see the note in `policy.ts`.
 */

/** Roles CC understands. Every value here must have an `accessLevel` entry. */
export type CcRole =
  | 'IZG Operations'
  | 'IZG Support'
  | 'Jurisdiction Operations'
  | 'Jurisdiction Support'

/**
 * Ordering for the resolved role array.
 *
 * Note this is *presentation* order, not privilege arbitration: permissions are
 * a union across all held roles, so precedence no longer decides what a user can
 * do. It only makes `session.user.roles` stable for logs and display, and makes
 * `Decision.grantedBy` deterministic when more than one role would allow an
 * action. Kept in the same order the old `roles.ts` used, minus the three
 * unmapped entries, so nothing about existing output order changes.
 */
export const ROLE_PRECEDENCE: CcRole[] = [
  'IZG Operations',
  'IZG Support',
  'Jurisdiction Operations',
  'Jurisdiction Support',
]

/**
 * Okta group name -> the CC roles it grants.
 *
 * Deliberately initialized one-to-one with the pre-existing behaviour: every
 * group grants exactly the role that used to share its name. That is what makes
 * "no existing user's access changes" verifiable rather than merely asserted.
 * The one-to-many capability exists for when it is needed (e.g. a future group
 * that should grant several roles at once); it is not exercised yet.
 */
const GROUP_ROLE_MAPPING: Record<string, CcRole[]> = {
  'IZG Operations': ['IZG Operations'],
  'IZG Support': ['IZG Support'],
  'Jurisdiction Operations': ['Jurisdiction Operations'],
  'Jurisdiction Support': ['Jurisdiction Support'],
}

/**
 * Case- and punctuation-insensitive group key. `IZG Operations`,
 * `izg-operations` and `  IZG_OPERATIONS  ` all collapse to `izg operations`,
 * so an Okta admin's choice of separator or capitalization cannot silently
 * produce a user with no role.
 */
export const normalizeGroupName = (groupName: string): string =>
  groupName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const NORMALIZED_GROUP_ROLE_MAPPING: Record<string, CcRole[]> = Object.entries(
  GROUP_ROLE_MAPPING
).reduce(
  (acc, [groupName, roles]) => {
    acc[normalizeGroupName(groupName)] = roles
    return acc
  },
  {} as Record<string, CcRole[]>
)

/** Every group name CC recognizes, in their original (un-normalized) form. */
export const RECOGNIZED_GROUP_NAMES = Object.keys(GROUP_ROLE_MAPPING)

/**
 * Read a groups claim that may arrive in any of the shapes Okta emits depending
 * on how the claim is configured: an array of strings, an array of group objects,
 * a JSON-encoded array, or a comma-separated string. A permissive reader means a
 * claim-format change degrades to "same roles" rather than "no roles at all".
 */
export function getGroups(groups: unknown): string[] {
  if (typeof groups === 'string') {
    const value = groups.trim()
    if (!value) return []

    if (value.startsWith('[') && value.endsWith(']')) {
      try {
        return getGroups(JSON.parse(value))
      } catch {
        // Not JSON after all — fall through to CSV/single-value handling.
      }
    }

    if (value.includes(',')) {
      return value
        .split(',')
        .map((name) => name.trim())
        .filter((name) => name.length > 0)
    }

    return [value]
  }

  if (!Array.isArray(groups)) return []

  const names: string[] = []
  for (const group of groups) {
    if (typeof group === 'string') {
      names.push(group)
      continue
    }
    if (!group || typeof group !== 'object') continue

    const candidate = group as {
      name?: unknown
      label?: unknown
      value?: unknown
      profile?: { name?: unknown }
    }
    const name =
      candidate.name ??
      candidate.label ??
      candidate.value ??
      candidate.profile?.name

    if (typeof name === 'string') names.push(name)
  }
  return names
}

/**
 * Pull a groups claim out of a claims object, tolerating the casing variants
 * Okta can be configured to emit.
 */
export function getGroupsFromClaims(claims: unknown): string[] {
  if (!claims || typeof claims !== 'object') return []

  const claimMap = claims as Record<string, unknown>
  for (const candidate of [
    claimMap.groups,
    claimMap.Groups,
    claimMap.group,
    claimMap.Group,
  ]) {
    const groups = getGroups(candidate)
    if (groups.length > 0) return groups
  }
  return []
}

/**
 * Read the groups claim out of a raw JWT (ID token or access token) without
 * verifying it.
 *
 * Not verifying is safe here: these tokens come from the `account` object that
 * next-auth has already validated against Okta during the OIDC exchange, and
 * this only ever *adds* group names that must still match `GROUP_ROLE_MAPPING`.
 * Best-effort by design — a malformed token yields no groups rather than
 * breaking sign-in.
 */
export function getGroupsFromJwt(rawToken: unknown): string[] {
  if (typeof rawToken !== 'string' || !rawToken.includes('.')) return []

  const segments = rawToken.split('.')
  if (segments.length < 2) return []

  try {
    const payload = JSON.parse(
      Buffer.from(segments[1], 'base64url').toString('utf8')
    )
    return getGroupsFromClaims(payload)
  } catch {
    return []
  }
}

/**
 * Union of every source, de-duplicated. Union only: a source that omits a group
 * must never remove one another source supplied.
 */
export function mergeGroups(...groupLists: string[][]): string[] {
  const merged = new Set<string>()
  for (const list of groupLists) {
    for (const group of list) merged.add(group)
  }
  return Array.from(merged)
}

/**
 * Resolve raw group claims to the set of CC roles held, ordered by
 * ROLE_PRECEDENCE. Unrecognized groups contribute nothing and are not an error —
 * users legitimately belong to Okta groups CC knows nothing about.
 */
export function rolesFromGroups(groups: unknown): CcRole[] {
  const held = new Set<CcRole>()
  for (const group of getGroups(groups)) {
    const mapped = NORMALIZED_GROUP_ROLE_MAPPING[normalizeGroupName(group)]
    if (mapped) for (const role of mapped) held.add(role)
  }
  return ROLE_PRECEDENCE.filter((role) => held.has(role))
}
