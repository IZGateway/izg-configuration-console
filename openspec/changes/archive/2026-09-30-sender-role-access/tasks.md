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

> **Reconciled 2026-09-30.** All six complete. The Okta group and accounts referenced above do
> exist — Anusha Kanuri recorded sender accounts in AWS Secrets Manager at
> `config-console/roles-credentials` on 2026-09-18, and Evan Brock tested with them.
>
> Evan's record on [IGDD-3335](https://izgateway.atlassian.net/browse/IGDD-3335) covers three
> role combinations with direct API probes, and it caught a real problem: the sender account was
> missing its jurisdictions, Anusha fixed it, and Evan retested (2026-09-23). Per-task verdicts:
>
> | Task | Verdict | Evidence |
> |---|---|---|
> | 6.1 | Done | Sender-only sign-in resolved the role; the multi-role session printed `roles: ["IZG Support","Sender Operations"]` explicitly. |
> | 6.2 | Done | Evan: "nav/home shows only API Key Management". Corroborated by IGDD-3472 Test 5 — "The menu shows API Key Management only, and it works end to end." |
> | 6.3 | **Superseded — the outcome deliberately changed** | This task expects a redirect. [IGDD-3472](https://izgateway.atlassian.net/browse/IGDD-3472) replaced it with an in-place denial plus an audit event, and the code comment in `manageconnections/index.tsx` names this role as the reason: Sender Operations "was bounced to the landing page with no explanation and no audit event. The capability check is unchanged; only the outcome is." The task's intent — no data rendered — holds. Verified in IGDD-3472 Test 5. |
> | 6.4 | Done | Evan's nav/home confirmation. Structurally, `Home/index.tsx` and `Navigation/menuItems.tsx` both gate on `canEnterPage`, the same `PAGE_ENTRY` declaration the page gate reads, so the CTA and the gate cannot disagree. |
> | 6.5 | Done, thoroughly | Evan probed cancel, revoke, renew and token-reveal directly — all `403` for another organization's credential. A third jurisdiction (`ainq`) also `403`. |
> | 6.6 | Done | IGDD-3472 Tests 1–4 on 2026-09-30, five testers, plus `policy.test.ts` "single-role behaviour is unchanged". |
>
> **Also verified here, and it closes a gap elsewhere:** Evan tested Jurisdiction Operations
> scoped to `ut` together with Sender Operations scoped to `utph`, confirming each role stayed
> independently scoped. That is the exact prefix pair named by task 8.5 of
> `multi-role-permissions`, whose automated test uses `az`/`azova` instead.

- [x] 6.1 Confirm sign-in resolves `Sender Operations` and the sender's own jurisdiction prefix
- [x] 6.2 Confirm nav shows only API Key Management; Manage Connections and Onboarding Senders
      are absent
- [x] 6.3 Confirm direct navigation to `/manageconnections` redirects rather than rendering data
- [x] 6.4 Confirm the landing page CTA leads to API Key Management
- [x] 6.5 Confirm API Key Management shows only the sender's own credentials, and every mutating
      route rejects another organization's credential
- [x] 6.6 Regression: confirm each of the four existing roles is unchanged across nav, landing
      page, and Manage Connections

## 7. Release

> **Reconciled 2026-09-30.** All four complete. Per-task verdicts:
>
> | Task | Verdict | Evidence |
> |---|---|---|
> | 7.1 | **Answered** | [IGDD-3258](https://izgateway.atlassian.net/browse/IGDD-3258) is Ready to Ship — fix versions IZG CC 1.19.0 / IZG Hub 2.17.0 / IZ Gateway 2026.10.06, PO approved 2026-09-29. It shipped as a container image in the separate `IZGateway/izgw-db-migration` repo with an APHL runbook, not as an AWS CLI script. Keith Boone verified it against a local DynamoDB clone on 2026-09-29. |
> | 7.2 | **Confirmed empirically** | Sender accounts sign in and the role resolves, so the Okta group name matches what `GROUP_ROLE_MAPPING` declares. The formal check with the Okta administrator is not recorded anywhere, and the `[CONFIRM]` marker is still present in `src/lib/security/rolemapping.ts` — that marker is now stale and worth deleting. `normalizeGroupName` tolerates case and punctuation differences, so a later correction would not be breaking. |
> | 7.3 | **Bookkeeping only — cannot be done from here** | The document lives outside this repo. **Both** of its findings now look resolved, not just Finding 2: Finding 1 (`/api/changerequest`) was probed to `403` by Keith Boone on 2026-09-30 and `admin-page-access` carries a requirement for it. One caveat — that spec also records a known `AUTHZ_DEBT` limitation on those same routes, so Finding 1 may warrant closing with a note rather than cleanly. See `~/Downloads/izg-cc-openspec-archive.md`, section 14. |
> | 7.4 | **Done** | PR #687 from branch `IGDD-3335`, merged `398baf8`. Austin Moody approved the code on 2026-09-17. |

- [x] 7.1 Confirm IGDD-3258 (sender DynamoDB seeding) status before scheduling end-to-end manual
      verification — code and automated tests do not depend on it, manual verification does
- [x] 7.2 Confirm the exact Okta group string with the Okta administrator and record it in
      `GROUP_ROLE_MAPPING`
- [x] 7.3 `changerequest-and-manageconnections-reach-only-bug.md` is not tracked in this repo
      (external bug ticket/doc, per `design.md`) — once this change ships, update it to mark
      Finding 2 (the `manageconnections` reach-only gap) resolved, leaving Finding 1
      (`/api/changerequest`) as the remaining open item
- [x] 7.4 Open a PR against `develop`
