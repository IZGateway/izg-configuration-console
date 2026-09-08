## Context

Authorization in the Console is the product of four mechanisms configured in different places
that do not reference each other:

| Mechanism | Source | Shape |
|---|---|---|
| Role | Okta `groups` claim intersected with a role-name list | single string |
| Tenancy | Okta `jurisdictions` claim via userinfo | array of prefixes |
| Admin flag | membership of `OPERATIONS_GROUP` | boolean |
| Global exemption | hardcoded role-name list, duplicated in two files | boolean |

The structural problem: **tenancy is multi-valued and additive, while role is single-valued and
exclusive.** A user can hold ten jurisdictions but exactly one role, chosen by
`_.intersection(token.groups, roles)[0]`. Because `_.intersection` preserves the order of its
first argument — the group list Okta sent — the surviving role depends on an ordering Okta does
not guarantee.

Three of the seven declared roles (`IZG Program`, `CDC Program`, `CDC CISO`) had no access-matrix
entry, so selecting one produced no permissions *and* suppressed a role that would have worked.

A sibling console, `izg-transformation-ui`, already runs a multi-role model against the same Okta
tenant (`src/lib/rbac.ts`). Its ingestion approach is adopted here; its evaluation model
deliberately is not — see Decisions.

## Goals / Non-Goals

**Goals:**

- A user holds every role their Okta groups grant, resolved deterministically.
- Permissions combine additively, without allowing a capability from one role to be exercised
  over a jurisdiction only another role can reach.
- Group ingestion tolerates the Okta claim configurations that would otherwise silently produce
  a role-less user.
- No effective change for any existing single-role user.
- The migration is enforced by the compiler rather than by an exhaustive search for call sites.

**Non-Goals:**

- Adding a sender role. That is a separate change that depends on this one.
- A login gate rejecting users who hold no role. Related and worth doing, but it risks locking
  out working users if the mapping is incomplete, and it belongs with the sender work.
- Deriving `isAdmin` from roles. It remains a separate group-membership flag; folding it in
  touches the destructive-operation admin gate and is orthogonal.
- Route-level middleware gating. The Console has none; adding it is out of scope.
- Re-vocabularizing roles into fine-grained verbs (as `izg-transformation-ui` does). That would
  change every role definition and every matrix key, and would destroy the ability to prove
  no behaviour changed.

## Decisions

### Union of held roles, not precedence

**Chosen:** resolve all recognized roles and combine their permissions.

**Alternative considered:** keep one role but make the choice deterministic by ordering on a
list we control — a one-line change. Rejected because it still silently discards a role's
permissions whenever a user holds two. `Jurisdiction Support` + `Jurisdiction Operations` is a
realistic pairing where precedence loses real access.

Role precedence is retained, but only as *presentation* order — it makes the role array stable
for logs and makes the reported granting role deterministic. It no longer arbitrates authority.

### Evaluate a whole role at a time for permission-plus-jurisdiction decisions

This is the security-critical decision.

The natural way to write a union is to pool capabilities and pool reach, then check both:

```
allowed = (∃r : permission(r)) ∧ (∃r : reach(r))     // WRONG
allowed = ∃r : (permission(r) ∧ reach(r))            // adopted
```

The first form mixes halves from different roles. A live example exists in the current matrix:
`IZG Support` has global reach and zero API-key permissions, while a jurisdiction-scoped role has
the permission but only for its own prefix. Pooling the halves lets that user list every
organization's credentials — access neither role grants.

**Alternative considered:** the flat capability set used by `izg-transformation-ui`
(`hasAnyRole(roles, REQUIRED)`). Rejected: it discards which role contributed each capability.
It is safe in that repo only because its single globally-scoped group also grants every
capability — a property of its data, not its design. The Console has a role with reach and no
keys, which is exactly the shape that model breaks on.

**Consequence:** the rule is implemented in exactly one function, and the permission-only reach
helper (`ownsJurisdiction`) is no longer exported, so the unsafe half cannot be called alone.

### Narrow subject type instead of `session: any`

Authorization functions accept `AuthzSubject { roles, jurisdictions }` rather than a session.
This makes the shape checkable, lets policy tests construct literals instead of session mocks,
and — combined with removing `session.user.role` — makes every stale reader a compile error.

Removing the singular field rather than retaining it as `roles[0]` was deliberate. Verification
showed nothing displays it and the audit context never captured it; only two log lines used it.
Retaining it would leave a field that looks authoritative, so the next permission check written
would reach for it and quietly reintroduce single-role logic. The compiler found six stale
readers on the first run, two of which turned out to be dead code.

### Pure policy, I/O in the caller

The decision function performs no database reads. The adapter resolves a jurisdiction id to its
prefix and then asks the policy. Every policy case — including the escalation — is a
table-driven test with no mocks.

### Global reach as access-matrix data

`globalTenancy` moves onto each role definition, replacing a hardcoded role-name list duplicated
in `accesshelper.ts` and `accessutils.ts`. Adding a globally scoped role becomes a data change,
and there is one list rather than two that can drift. Safe specifically because it is read inside
the per-role loop and never pooled.

The affordance predicate `isOperationsRole` is kept separate even though it currently selects the
same roles: "is this IZG staff?" and "does this role bypass jurisdiction scoping?" are different
questions, and conflating them means a future role that needs one silently gets both.

### Group ingestion adopted from `izg-transformation-ui`

Reading groups from four sources, normalizing names, and tolerating claim shapes. These sit
before the decision function and touch no authorization logic, so they add no risk to the
security-sensitive part while removing the most likely cause of a silently role-less user.

`GROUP_ROLE_MAPPING` is initialized one-to-one with existing behaviour rather than restructured.
That is what makes "no existing user's access changes" provable instead of argued.

## Risks / Trade-offs

- **A naive union reintroduces the escalation** → the rule lives in one function; the reach-only
  helper is unexported; a named regression test asserts the `IZG Support` + scoped-role case.
- **Substring prefix matching would conflate `az` (Arizona) and `azova` (a sender)** → comparison
  is exact array-element matching, with a test named for this pair.
- **Hand-built single-role test fixtures do not pass through the session callback and would not
  self-heal** → `subjectOf` accepts a singular `role` on loosely-typed objects. Production
  readers still fail to compile, so the guarantee holds; the affordance can be deleted once
  fixtures are migrated.
- **A missed call site silently applies single-role logic** → removing the field converts this
  from a silent bug into a build failure.
- **An infrastructure failure looks like a legitimate denial** → still fails closed, but now logs
  at error level.
- **Group membership is captured in the JWT at sign-in, so Okta revocation lags by up to the
  30-minute session lifetime** → pre-existing; not made worse; noted for operators.
- **`useRoleAccess()` remains untyped (`any`)** → its page key is derived from the router at
  runtime, so it cannot be typed per call site without passing the page in, which touches every
  consumer. It is a UI convenience, not a boundary; the typed API is used by the server.

## Migration Plan

1. Deploy. No Okta change, no data migration, no API contract change.
2. Sessions issued before deployment continue to work — roles are recomputed from token groups on
   every session read, so no forced re-login.
3. Verify against the manual test plan, whose Section D (the escalation case) is the release gate.
4. **Rollback** is a straight revert: no persisted state changes shape, and the JWT still carries
   `groups`, which the previous code reads.

## Open Questions

- Should `IZG Program`, `CDC Program` and `CDC CISO` be re-added as placeholder roles with empty
  permissions? Now harmless under the union model, but they would pass a future
  "holds any role" login gate while granting nothing. Current recommendation is to leave them
  out and record them as known-unmapped groups in a comment.
- Should the ingestion helpers eventually be shared with `izg-transformation-ui` as a package?
  Both consoles now use the same concepts, but they diverge sharply below the ingestion layer.
  Not worth the coordination cost while this change is in flight.
