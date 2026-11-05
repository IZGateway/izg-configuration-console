/**
 * The roles the RBAC matrix check runs as (IGDD-3621).
 *
 * The target roles come from the Confluence page "Role Based Access Control
 * for IZ Gateway" (IGDD space). Two of its columns have none here:
 *  - CDC Operations and CDC Support are not planned, so there is nothing to
 *    check. Add them back as `pending` if they are scheduled.
 *  - Sender Operations still exists in code but is being retired
 *    (IGDD-3500).
 *
 * `status` decides whether a column runs:
 *  - live:    the role exists in code. It runs, and a missing test account
 *             is reported as CONFIG.
 *  - pending: not in code yet. Every cell is PENDING with `tracking`.
 *
 * Turning a role on is a data change: set `status: 'live'` in the PR that
 * adds the role to src/lib/security/rolemapping.ts, and add its secrets.
 */

export const ROLE_NAMES = [
  'IZG Security',
  'Jurisdiction Security',
  'IZG Operations',
  'Jurisdiction Operations',
  'IZG Support',
  'Jurisdiction Support',
  'IZG Program',
] as const

export type RoleName = (typeof ROLE_NAMES)[number]

export type RoleStatus = 'live' | 'pending'

/** Which destinations a role reaches: every jurisdiction, or its own. */
export type Reach = 'all' | 'own'

export interface RoleDef {
  name: RoleName
  status: RoleStatus
  reach: Reach
  /** Prefix of the account env vars: `<prefix>_USERNAME` and `_PASSWORD`. */
  accountEnv: string
  /** Older env var names still read when the `accountEnv` ones are unset. */
  legacyAccountEnv?: { username: string; password: string }
  /** Ticket that creates or retires the role. */
  tracking?: string
}

export const ROLES: readonly RoleDef[] = [
  {
    name: 'IZG Security',
    status: 'pending',
    reach: 'all',
    accountEnv: 'E2E_RBAC_IZG_SECURITY',
    tracking: 'IGDD-3600',
  },
  {
    name: 'Jurisdiction Security',
    status: 'pending',
    reach: 'own',
    accountEnv: 'E2E_RBAC_JURIS_SECURITY',
    tracking: 'IGDD-3500',
  },
  {
    name: 'IZG Operations',
    status: 'live',
    reach: 'all',
    accountEnv: 'E2E_RBAC_IZG_OPS',
    legacyAccountEnv: {
      username: 'OKTA_USERNAME',
      password: 'OKTA_PASSWORD',
    },
  },
  {
    name: 'Jurisdiction Operations',
    status: 'live',
    reach: 'own',
    accountEnv: 'E2E_RBAC_JURIS_OPS',
    legacyAccountEnv: {
      username: 'OKTA_NONADMIN_USERNAME',
      password: 'OKTA_NONADMIN_PASSWORD',
    },
  },
  {
    name: 'IZG Support',
    status: 'live',
    reach: 'all',
    accountEnv: 'E2E_RBAC_IZG_SUPPORT',
  },
  {
    name: 'Jurisdiction Support',
    status: 'live',
    reach: 'own',
    accountEnv: 'E2E_RBAC_JURIS_SUPPORT',
  },
  {
    name: 'IZG Program',
    // In code since IGDD-3547 (_IZGProgramAccess.ts, global tenancy).
    status: 'live',
    reach: 'all',
    accountEnv: 'E2E_RBAC_IZG_PROGRAM',
  },
]

/**
 * A test account. No full name: the spec proves who signed in from the
 * session's roles, not from the name in the app header.
 */
export interface Account {
  username: string
  password: string
}

/** The configured test account for `role`, or undefined if none is set. */
export function accountFor(role: RoleDef): Account | undefined {
  const env = process.env
  const username = env[`${role.accountEnv}_USERNAME`]
  const password = env[`${role.accountEnv}_PASSWORD`]
  if (username && password) return { username, password }
  const legacy = role.legacyAccountEnv
  if (legacy && env[legacy.username] && env[legacy.password]) {
    return { username: env[legacy.username], password: env[legacy.password] }
  }
  return undefined
}

/** Whether this column can run at all, given its status and account. */
export function runnability(
  role: RoleDef
): { run: true; account: Account } | { run: false; status: 'PENDING' | 'CONFIG'; reason: string } {
  if (role.status === 'pending') {
    return {
      run: false,
      status: 'PENDING',
      reason: `${role.name} is ${role.status} in code${
        role.tracking ? ` (${role.tracking})` : ''
      }`,
    }
  }
  const account = accountFor(role)
  if (account) return { run: true, account }
  const missing = ['USERNAME', 'PASSWORD']
    .map((part) => `${role.accountEnv}_${part}`)
    .filter((name) => !process.env[name])
  return {
    run: false,
    status: 'CONFIG',
    reason: `no test account configured: set ${missing.join(', ')}`,
  }
}

/**
 * The roles a correctly set-up account for this column holds in its CC
 * session (session.user.roles): exactly its own.
 */
export function expectedSessionRoles(role: RoleDef): string[] {
  return [role.name]
}

/**
 * Execution order. Global-reach roles run first, because each run records
 * their destination list, and the jurisdiction roles' cross-tenant probes
 * take their "foreign" destination from it.
 */
export const EXECUTION_ORDER: readonly RoleDef[] = [
  ...ROLES.filter((r) => r.reach === 'all'),
  ...ROLES.filter((r) => r.reach !== 'all'),
]
