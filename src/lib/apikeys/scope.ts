import { canActOnJurisdiction } from '../security/apiKeyAuthz'
import { subjectOf } from '../security/authzsubject'
import type { ApiKeyManagementPageAccessControl } from '../type/PageAccessControls'

/**
 * Resolves which of `jurisdictionIds` the caller may exercise `capability` on.
 *
 * The permission and the jurisdiction MUST be evaluated together, per held
 * role — never as "does any role grant the permission?" plus "does any role
 * reach this jurisdiction?". Split that way, a globally-scoped role with no
 * API-key rights (IZG Support) supplies the reach while a jurisdiction-scoped
 * role supplies the permission, and the caller sees every organization's
 * credentials. `canActOnJurisdiction` is the gate that keeps them together.
 *
 * Resolved once per DISTINCT jurisdiction rather than once per row, so the
 * work stays proportional to jurisdictions rather than to credential count.
 */
export async function resolveJurisdictionAccess(
  session: unknown,
  capability: keyof ApiKeyManagementPageAccessControl,
  jurisdictionIds: Iterable<string>
): Promise<Map<string, boolean>> {
  const subject = subjectOf(session)
  const decisions = new Map<string, boolean>()
  for (const jurisdictionId of new Set(jurisdictionIds)) {
    const decision = await canActOnJurisdiction(subject, capability, jurisdictionId)
    decisions.set(jurisdictionId, decision.allowed)
  }
  return decisions
}

/**
 * Tenancy scoping for credential-bearing lists (fixes enumeration/IDOR): a
 * caller only sees rows for jurisdictions they own under `capability`.
 *
 * Shared by GET /api/apikeys and the audit-log list so the two can never
 * disagree about what a caller is allowed to see — an audit row names its
 * credential's domain, scope and actors, so it is exactly as sensitive as the
 * credential row itself.
 */
export async function scopeToOwnedJurisdictions<
  T extends { jurisdictionId: string },
>(
  session: unknown,
  capability: keyof ApiKeyManagementPageAccessControl,
  rows: T[]
): Promise<T[]> {
  const decisions = await resolveJurisdictionAccess(
    session,
    capability,
    rows.map((row) => String(row.jurisdictionId))
  )
  return rows.filter((row) => decisions.get(String(row.jurisdictionId)))
}
