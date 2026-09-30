## 1. Role ingestion and access matrix

- [x] 1.1 Add `'Sender Operations'` to `CcRole`, `ROLE_PRECEDENCE`, and `GROUP_ROLE_MAPPING` in
      `src/lib/security/rolemapping.ts`
- [x] 1.2 Create `src/lib/security/accessdefinitions/_SenderOperationsAccess.ts`:
      `globalTenancy: false`; `manageconnections`, `test`, `edit`, `changerequest`, `history`
      spread from `default*` (all false), plus `canViewConnections: false` and
      `onboarding: { canViewOnboarding: false }`; `apikeys` with all five flags `true`
- [x] 1.3 Export it from `src/lib/security/accessdefinitions/index.ts` and map it in
      `src/lib/security/accesslevel.ts`

## 2. New page-access-control flags (matrix-wide)

- [x] 2.1 Add `canViewConnections: boolean` to `ManageConnectionsPageAccessControl`
      (`src/lib/type/PageAccessControls.ts`) and its `default*` entry
      (`defaultaccesslevels.ts`)
- [x] 2.2 Add a new `OnboardingPageAccessControl = { canViewOnboarding: boolean }` type, its
      `default*` entry, and add `onboarding` to `PageControls` in `accesslevel.ts`
- [x] 2.3 Set `canViewConnections: true` and `onboarding: { canViewOnboarding: true }` on all
      four existing role files (`_IZGOperationsAccess.ts`, `_IZGSupportAccess.ts`,
      `_JurisdictionOperationsAccess.ts`, `_JurisdictionSupportAccess.ts`) — additive only, no
      other change
- [x] 2.4 Confirm `tsc --noEmit` catches any role file missing the new required keys before
      running anything else (proves the required-key type is doing its job)

## 3. Navigation and page gating

- [x] 3.1 Add `isVisible` to the "Manage Connections" nav item in `menuItems.tsx`, checking
      `canViewConnections` across held roles (same pattern as the existing "API Key Management"
      entry)
- [x] 3.2 Add `isVisible` to the "Onboarding Senders" nav item, checking `canViewOnboarding`
- [x] 3.3 Add a `canViewConnections` check to `manageconnections/index.tsx`'s
      `getServerSideProps`, redirecting (e.g. to `/apikeys` or `/`) when it is not held by any
      role, before calling `fetchEndpointStatus`

## 4. Landing page

- [x] 4.1 Gate the existing "Manage Connections" CTA in `Home/index.tsx` on `canViewConnections`
- [x] 4.2 Add an "API Key Management" CTA gated on `canListApiKeys`

## 5. Automated tests

- [x] 5.1 `policy.test.ts`: add the `IZG Support` + `Sender Operations` escalation case (mirrors
      the existing named regression test, new role)
- [x] 5.2 `policy.test.ts`: add a union case — `Jurisdiction Operations` + `Sender Operations` —
      confirming each role's own jurisdiction is respected independently
- [x] 5.3 Confirm the registry drift test (`ROLE_PRECEDENCE` vs `accessLevel` keys) passes
      unchanged with the new role added — no edit expected, this is a check not a task
- [x] 5.4 `rolemapping.test.ts`: new sender group normalizes to `Sender Operations`
- [x] 5.5 Extend `src/pages/api/apikeys/lifecycle.test.ts` with a `Sender Operations` session:
      list/create/revoke/renew/cancel succeed within its own jurisdiction and `403` outside it
- [x] 5.6 Add a nav-visibility test (or extend the existing menu test) asserting `Sender
      Operations` hides Manage Connections and Onboarding Senders and shows API Key Management
- [x] 5.7 Add a test for `manageconnections`'s `getServerSideProps` redirect when no held role
      grants `canViewConnections`

## 6. Manual verification

Follow `test-plan.md` (in this change folder) once the `Sender Operations` Okta group exists and
the test accounts are assigned (see Open Questions in `design.md`). Session 2 is the release gate.

- [ ] 6.1 Confirm sign-in resolves `Sender Operations` and the sender's own jurisdiction prefix
- [ ] 6.2 Confirm nav shows only API Key Management; Manage Connections and Onboarding Senders
      are absent
- [ ] 6.3 Confirm direct navigation to `/manageconnections` redirects rather than rendering data
- [ ] 6.4 Confirm the landing page CTA leads to API Key Management
- [ ] 6.5 Confirm API Key Management shows only the sender's own credentials, and every mutating
      route rejects another organization's credential
- [ ] 6.6 Regression: confirm each of the four existing roles is unchanged across nav, landing
      page, and Manage Connections

## 7. Release

- [ ] 7.1 Confirm IGDD-3258 (sender DynamoDB seeding) status before scheduling end-to-end manual
      verification — code and automated tests do not depend on it, manual verification does
- [ ] 7.2 Confirm the exact Okta group string with the Okta administrator and record it in
      `GROUP_ROLE_MAPPING`
- [ ] 7.3 `changerequest-and-manageconnections-reach-only-bug.md` is not tracked in this repo
      (external bug ticket/doc, per `design.md`) — once this change ships, update it to mark
      Finding 2 (the `manageconnections` reach-only gap) resolved, leaving Finding 1
      (`/api/changerequest`) as the remaining open item
- [ ] 7.4 Open a PR against `develop`
