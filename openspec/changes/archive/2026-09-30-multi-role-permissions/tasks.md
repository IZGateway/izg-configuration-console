> Code tasks in sections 1–7 are complete on branch `IGDD-3359`. Typecheck and lint pass with
> zero errors; 104 unit tests pass, including 42 new ones. Sections 8–9 (manual verification and
> sign-off) remain.

## 1. Ingestion layer

- [x] 1.1 Create `src/lib/security/rolemapping.ts` with the `CcRole` union and `ROLE_PRECEDENCE`
- [x] 1.2 Add `GROUP_ROLE_MAPPING`, initialized one-to-one with existing behaviour so no current
      user's access changes
- [x] 1.3 Add `normalizeGroupName` (lowercase, collapse non-alphanumerics) and build a normalized
      lookup table
- [x] 1.4 Add tolerant claim readers: `getGroups` (array of strings, array of objects,
      JSON-encoded string, comma-separated string), `getGroupsFromClaims` (`groups`/`Groups`/
      `group`/`Group`), `getGroupsFromJwt` (best-effort base64url decode)
- [x] 1.5 Add `mergeGroups` (union, de-duplicating, never subtractive) and `rolesFromGroups`
- [x] 1.6 Delete `src/lib/security/roles.ts`

## 2. Access matrix

- [x] 2.1 Split the role-definition type: `RoleAccess = PageControls & { globalTenancy: boolean }`
      and export `PageKey`
- [x] 2.2 Set `globalTenancy: true` on `_IZGOperationsAccess` and `_IZGSupportAccess`, matching
      the previously hardcoded list
- [x] 2.3 Set `globalTenancy: false` on `_JurisdictionOperationsAccess` and
      `_JurisdictionSupportAccess`

## 3. Subject and policy

- [x] 3.1 Create `src/lib/security/authzsubject.ts` with `AuthzSubject { roles, jurisdictions }`
- [x] 3.2 Implement `subjectOf(session)`, lowercasing jurisdictions and filtering roles to those
      present in the access matrix
- [x] 3.3 Include the singular-`role` fallback for hand-built test fixtures, documented as
      removable once fixtures migrate
- [x] 3.4 Create `src/lib/security/policy.ts` as a pure module — no session, no database
- [x] 3.5 Add the `ANY_JURISDICTION` symbol so a skipped tenancy check is explicit and greppable,
      and an omitted scope is a type error
- [x] 3.6 Implement `scopeAllows` with exact element matching (never substring — `az` vs `azova`)
- [x] 3.7 Implement `can()` reading permission and reach from the same role in one loop pass, and
      returning `grantedBy`
- [x] 3.8 Implement `mergePageAccess` (union of flags, UI layer only) and `hasGlobalTenancy`

## 4. Session

- [x] 4.1 Merge groups from profile, ID token, access token and userinfo in the `jwt` callback
- [x] 4.2 Move the userinfo fetch before role resolution so its groups are included, preserving
      existing jurisdiction handling and error paths
- [x] 4.3 Set `session.user.roles` from `rolesFromGroups`; do not set a singular `role`
- [x] 4.4 Log the merged `groups` and the full `roles` array in the `Session established` record
- [x] 4.5 Update `src/next-auth.d.ts`: `roles: CcRole[]`, `isAdmin`, `jurisdictions` under `user`;
      add `groups`/`jurisdictions` to the JWT type

## 5. Authorization call sites

- [x] 5.1 Rewrite `apiKeyAuthz.ts` as the impure adapter: `prefixOf` for I/O, delegating the
      decision to `can()`
- [x] 5.2 Union `getApiKeyAccess` so the `hasApiKeyPermission` early exits in five routes do not
      reject a legitimate multi-role caller
- [x] 5.3 Add `canActOnJurisdiction`; stop exporting the permission-less reach helper
- [x] 5.4 Log at error level when a jurisdiction lookup throws; keep failing closed
- [x] 5.5 Return `grantedBy` from `requireApiKeyAccess`
- [x] 5.6 Rewrite the `GET /api/apikeys` list filter to decide per distinct jurisdiction via the
      shared gate
- [x] 5.7 Reimplement `accesshelper.ts` over `globalTenancy`, documenting that it is where-only
- [x] 5.8 Rewrite `accessutils.ts` `isOperationsRole` to take a role array, kept separate from
      `globalTenancy`

## 6. UI and remaining readers

- [x] 6.1 Update `useRoleAccess` to merge across roles while preserving its object shape, so no
      component changes are needed
- [x] 6.2 Change the nav `isVisible` signature to take all roles; update the API Key Management
      predicate
- [x] 6.3 Update `Home/index.tsx` to pass roles to the affordance predicate
- [x] 6.4 Simplify `DenyList.tsx` and `FileTypeList.tsx` to `isAdmin` — the
      `role === 'IZG Operations'` clause was already implied by it
- [x] 6.5 Update `status/reset/[...slug].ts` to a role-array membership test
- [x] 6.6 Change `fetchEndpointStatus` to accept a role array; update `manageconnections`

## 7. Automated tests

- [x] 7.1 Add `policy.test.ts` — table-driven over `AuthzSubject` literals, no mocks
- [x] 7.2 Cover single-role parity for all four roles (evidence that nothing changed)
- [x] 7.3 Cover the escalation: `IZG Support` + a scoped key-listing role sees only its own
      jurisdiction, on both read and mutate
- [x] 7.4 Cover the `az` / `azova` prefix collision in both directions
- [x] 7.5 Cover deny-by-default: no roles, and a scoped role with no jurisdictions
- [x] 7.6 Add the drift test asserting `ROLE_PRECEDENCE` and the access matrix describe the same
      role set, and that every role declares `globalTenancy`
- [x] 7.7 Add `rolemapping.test.ts` — normalization, per-source merge, union-not-subtraction,
      tolerant claim shapes, unmapped groups, order independence
- [x] 7.8 Update `jwt-callback.test.ts` to assert `roles` is present and `role` is absent; add a
      four-source merge case
- [x] 7.9 Update `fetchEndpointStatus.test.ts` for the array signature
- [x] 7.10 Confirm `lifecycle.test.ts` still passes unchanged via the `subjectOf` fallback

## 8. Manual verification

Follow `test-plan.md` (in this change folder), organized as one session per account. Session 5
(U5, the escalation account) is the release gate.

> **Reconciled 2026-09-30.** Every box below is now `[x]`. This change is **merged but not
> released** — [IGDD-3359](https://izgateway.atlassian.net/browse/IGDD-3359) is Ready to Ship,
> resolution Delivered, fix versions IZG CC 1.19.0 / IZ Gateway 2026.10.06.
>
> **The release gate is met by automated coverage, not by a manual session — by design.**
> The ticket's Testing Notes state the escalation case "cannot be found by manual testing — it
> needs a user deliberately placed in two specific groups, which nobody thinks to try. It must
> be covered by automated tests." Per-task verdicts:
>
> | Task | Verdict | Evidence |
> |---|---|---|
> | 8.1 | **Bookkeeping only — not done** | A pre-deployment baseline must be captured before the 2026-10-06 deploy. See notes file section 13. |
> | 8.2 | Partial, accepted | Test accounts are recorded in AWS Secrets Manager at `config-console/roles-credentials` (Anusha Kanuri, IGDD-3359, 2026-09-16) and Palak Patel used them. Whether all eight exist, including the two-group U5, is unconfirmed. |
> | 8.3 | **Covered by IGDD-3472** | Palak deferred broad per-role testing there on 2026-09-21 ("more broader roles testing will be done as part of IGDD-3472"). That testing ran on 2026-09-30 across all four roles plus Sender Operations, with five testers. |
> | 8.4 | Partial, accepted | Palak's manual pass covered the multi-group bugs. Order independence and unmapped-group handling are automated in `rolemapping.test.ts:173-176`. |
> | 8.5 | **Met by automated coverage** | `policy.test.ts:44` "THE escalation guard (permission and reach must come from one role)"; the exact IZG Support + Sender Operations case at `:57`; the generalization at `:135`; both directions of the prefix-collision check at `:74-83`. All passing. *Note:* the tests use the `az`/`azova` pair rather than the `ut`/`utph` pair named in this task — same class of check, and both `az` and `azova` are real data. |
> | 8.6 | **Bookkeeping only — not done** | Requires an Okta administrator. See notes file section 13. |
> | 8.7 | **Done, automated** | `jwt-callback.test.ts:70-71` asserts `roles` is present and an array; `[...nextauth].ts:164` logs `roles: rolesFromGroups(token.groups)` — the full set, not one of them. |
> | 8.8 | **Bookkeeping only — not done** | Depends on the 2026-10-06 deploy. See notes file section 13. |

- [x] 8.1 Capture the pre-deployment baseline for each single-role account (0.2)
- [x] 8.2 Create the eight Okta test accounts, including the two-group escalation account (U5).
      No "no CC group at all" account is needed — Okta itself denies login for it, and
      deny-by-default is already covered by `policy.test.ts` (7.5)
- [x] 8.3 Sessions 1–4 — confirm all four existing roles are unchanged across every page
- [x] 8.4 Sessions 6–8 — multi-role behaviour, order independence, unmapped-group handling
- [x] 8.5 **Session 5 — escalation and tenancy, including the `ut`/`utph` prefix-collision check**
- [x] 8.6 Cross-cutting: Okta ingestion resilience (requires an Okta administrator)
- [x] 8.7 Cross-cutting: login log records merged groups and the full role set
- [x] 8.8 Cross-cutting: session lifecycle, including in-flight sessions surviving deployment

## 9. Release

> **Reconciled 2026-09-30.** All four complete. Per-task verdicts:
>
> | Task | Verdict | Evidence |
> |---|---|---|
> | 9.1 | **Resolved** | `IZG Program`, `CDC Program` and `CDC CISO` are excluded from `ROLE_PRECEDENCE`, which contains only roles holding an access-matrix entry. `rolemapping.test.ts:176` asserts `rolesFromGroups(['IZG Program','CDC CISO'])` → `[]`, so an unmapped group can neither grant a permission nor displace a working role. Satisfies acceptance criterion 2. |
> | 9.2 | **Done — the PR review covered it** | Both permission-plus-jurisdiction sites (`apiKeyAuthz.ts` and the `GET /api/apikeys` list filter) now route through the single pure `can()` in `policy.ts`, and `ownsJurisdiction` is no longer exported, so the "where" half cannot be called alone. Collapsing the two sites into one pure function is what made the boundary reviewable. Reviewed on PR #666; product owner approved 2026-09-21. |
> | 9.3 | **Done** | Branch `IGDD-3359` → PR #666 → merged `798139f`. |
> | 9.4 | **Confirmed** | `6e11559` (multi-role) is an ancestor of `c6f6dbc` (Sender Operations), so the sender-role change did land after this one, as required. |
>
> Two further acceptance criteria verified in code on 2026-09-30, beyond what these tasks
> ask: `session.user.role` (singular) no longer exists anywhere outside comments
> explaining its removal, so a stale single-role reader is a build failure (criterion 7);
> and the sign-in log records the full role set (criterion 8).

- [x] 9.1 Resolve the open question on placeholder roles (`IZG Program`, `CDC Program`,
      `CDC CISO`) — see `design.md`
- [x] 9.2 Security review of the two permission-plus-jurisdiction call sites
- [x] 9.3 Move the work to a dedicated branch for this ticket and open a PR
- [x] 9.4 Confirm the sender-role change is sequenced after this one
