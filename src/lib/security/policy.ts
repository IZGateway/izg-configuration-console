import accessLevel from './accesslevel'
import type { PageControls, PageKey } from './accesslevel'
import type { AuthzSubject } from './authzsubject'
import type { CcRole } from './rolemapping'

/**
 * The authorization decision function. Pure: no I/O, no session, no database.
 *
 * ## The rule this file exists to enforce
 *
 * A role grants a capability *over a scope* — "what" you may do and "where" you
 * may do it. Those two halves belong to the same role and are not independently
 * combinable across roles.
 *
 * Users can hold several roles, and permissions are a union. The tempting way to
 * write that union is to collect every capability from every role, collect every
 * scope from every role, and allow any capability in any scope:
 *
 *     allowed = (∃r : permission(r)) ∧ (∃r : scope(r))     // WRONG
 *
 * That mixes halves from different roles and invents access nobody granted. A
 * concrete case that exists in this codebase today: a user in both `IZG Support`
 * and a jurisdiction-scoped role that can list API keys. `IZG Support` has
 * `globalTenancy: true` but zero apikeys permissions; the scoped role has the
 * permission but only for its own prefix. Combine the halves and the user can
 * list *every* organization's credentials — which neither role allows alone.
 *
 * The correct formulation evaluates a whole role at a time, then ORs:
 *
 *     allowed = ∃r : (permission(r) ∧ scope(r))            // RIGHT
 *
 * `can()` below is the only implementation of that rule. Both halves are read
 * from the same `role` inside one loop iteration, so there is no point at which
 * one role's capability can meet another role's reach.
 *
 * (`izg-transformation-ui` solves the same multi-role problem with a flat
 * capability set and `hasAnyRole`. That is safe there only because its single
 * globally-scoped group also grants every capability — a property of its data,
 * not its design. It is not safe here, which is why that model is not copied.)
 */

/**
 * Scope argument meaning "permission check only — tenancy deliberately skipped".
 *
 * A symbol rather than a string or `undefined` so it can never be confused with
 * a jurisdiction prefix, and so an omitted scope is a type error rather than an
 * accidental tenancy bypass. Grep for it to audit every place tenancy is skipped;
 * it should only appear at cheap prefilters that are followed by a real check.
 */
export const ANY_JURISDICTION = Symbol('ANY_JURISDICTION')

export type JurisdictionScope = string | typeof ANY_JURISDICTION

export type Decision = {
  allowed: boolean
  /**
   * Which role authorized this, when allowed. Recorded on mutating routes so the
   * incident-response question "which of this user's roles permitted that?" is
   * answerable — a union model makes it otherwise unanswerable after the fact.
   */
  grantedBy?: CcRole
}

const DENIED: Decision = { allowed: false }

/**
 * Does this single role's reach cover `scope`?
 *
 * Prefix comparison is an EXACT element match, never a substring or
 * joined-string test. The real data contains both `az` (Arizona) and `azova`
 * (a sender organization), so `'azova'.includes('az')` would hand an Arizona
 * user another organization's credentials.
 */
function scopeAllows(
  subject: AuthzSubject,
  role: CcRole,
  scope: JurisdictionScope
): boolean {
  if (accessLevel[role]?.globalTenancy) return true
  if (scope === ANY_JURISDICTION) return true
  return subject.jurisdictions.includes(String(scope).toLowerCase())
}

/**
 * True only if a *single* held role grants both the capability and the scope.
 */
export function can<P extends PageKey>(
  subject: AuthzSubject,
  page: P,
  capability: keyof PageControls[P],
  scope: JurisdictionScope
): Decision {
  for (const role of subject.roles) {
    const block = accessLevel[role]?.[page]
    // This role's "what" ...
    if (!block?.[capability as keyof typeof block]) continue
    // ... and the SAME role's "where".
    if (scopeAllows(subject, role, scope)) return { allowed: true, grantedBy: role }
  }
  return DENIED
}

/**
 * OR every held role's flags for one page.
 *
 * For the UI layer only, which is not a security boundary — controls are hidden
 * for convenience while the API routes remain authoritative. Safe to merge here
 * because no tenancy decision is involved: the list a user sees is scoped
 * separately, per credential, by `can()`.
 *
 * Starts from `{}` rather than a defaults object: every role definition spreads
 * the all-false `default*` block, so any held role contributes the full key set,
 * and zero held roles yields `{}` — which reads as deny for every flag. `{}` is
 * already what `useRoleAccess` returns while a session is loading, so callers
 * need no new handling.
 */
export function mergePageAccess<P extends PageKey>(
  subject: AuthzSubject,
  page: P
): PageControls[P] {
  return subject.roles.reduce(
    (acc, role) => {
      const block = accessLevel[role]?.[page]
      if (block) {
        for (const key of Object.keys(block) as Array<keyof PageControls[P]>) {
          acc[key] = (acc[key] || block[key as keyof typeof block]) as never
        }
      }
      return acc
    },
    // Typed as the complete block rather than Partial so callers can keep
    // destructuring named flags. The invariant that makes this honest: every
    // role definition spreads the all-false `default*` object, and PageControls
    // is a required-key type, so any held role contributes the full key set.
    //
    // A subject with zero roles yields an object with no keys, so every flag
    // reads falsy — the same deny-by-default the previous
    // `accessLevel[role]?.[page]` lookup gave by returning undefined.
    {} as PageControls[P]
  )
}

/** True if any held role has global tenancy (used by where-only checks). */
export function hasGlobalTenancy(subject: AuthzSubject): boolean {
  return subject.roles.some((role) => accessLevel[role]?.globalTenancy)
}
