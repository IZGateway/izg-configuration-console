---
schema_version: '1.0'
created:
  date: '2026-08-05T13:12:41.722Z'
  user: boonek
  agent:
    name: Claude Code
    version: '1.0'
  llm:
    name: claude-sonnet-5
    version: '5'
  prompt_uri: >-
    prompt:/claude-code/7bf3f37c-5a3a-4ed4-a6db-edd3fcf6e11c/~d73ffa14-78dd-4ce4-a715-aa03db9a072d
  source: >-
    izg-configuration-console (branches: IGDD-3140-api-key-management,
    IGDD-2707), izgw-hub (branches: develop,
    igdd-2705-api-key-principal-provider, igdd-2711-grace-period-revocation,
    jwt-upn-authorization), Jira IGDD-2702 epic tree, Confluence page 22184696
    (UAT Test Plan for Config Console 0.1)
  summary: >-
    End-to-end UAT/Playwright test plan for JWT API Key Management feature in
    the Configuration Console, covering
    create/DNS-validate/view/renew/revoke/cancel flows and RBAC scoping
updated:
  - date: '2026-08-05T17:01:05.176Z'
    user: boonek
    agent:
      name: Claude Code
      version: '1.0'
    llm:
      name: claude-sonnet-5
      version: '5'
    prompt_uri: >-
      prompt:/claude-code/7bf3f37c-5a3a-4ed4-a6db-edd3fcf6e11c/~eb0b0919-8811-4e1b-9d7b-f5ce5c339e05
    summary: >-
      Expand Implementation Status Snapshot from 7 to 25 tickets via full
      epic-children query (parent=IGDD-2702), a JWT/API-Key label sweep (none
      found), a broad keyword sweep across all IGDD, and one hop of issue-links
      off every ticket in the set
  - date: '2026-08-05T16:01:41.016Z'
    user: boonek
    agent:
      name: Claude Code
      version: '1.0'
    llm:
      name: claude-sonnet-5
      version: '5'
    prompt_uri: >-
      prompt:/claude-code/7bf3f37c-5a3a-4ed4-a6db-edd3fcf6e11c/~57ec467c-1521-4b38-be3e-299ab0ba8cff
    summary: >-
      Clarify jargon for a first-time reader: define the two create-key DNS
      paths on first mention, add an up-front terminology glossary, define RBAC
      on first use, and add the missing standalone table-row DNS-validate
      scenario referenced by the scope bullet
  - date: '2026-08-05T15:03:32.560Z'
    user: boonek
    agent:
      name: Claude Code
      version: '1.0'
    llm:
      name: claude-sonnet-5
      version: '5'
    prompt_uri: >-
      prompt:/claude-code/7bf3f37c-5a3a-4ed4-a6db-edd3fcf6e11c/~06ef122a-6c3d-4392-b1ab-30eff9385072
    summary: >-
      Reframe plan to test full target/spec behavior throughout;
      current-implementation deviations are recorded as normal defects via §8,
      not hedged as known-gap/skip/expected-to-fail
tags:
  - api-key-management
  - jwt
  - playwright
  - uat
  - config-console
change_request: api-key-management
ticket: IGDD-3068
document_type:
  - test-plan
---
## ⚠️ Living Document

This plan mirrors the structure of [UAT Test Plan for Config Console 0.1](https://izgateway.atlassian.net/wiki/spaces/IGDD/pages/22184696/UAT+Test+Plan+for+Config+Console+0.1) and is intended to become its sibling Confluence page, linked from the same space. It was assembled from the `api-key-management` OpenSpec change (`izg-configuration-console`), the `api-key-management-ui` OpenSpec change (branch `IGDD-2707`), the Hub-side `jwt-upn-authorization` / `igdd-2705-api-key-principal-provider` / `igdd-2711-grace-period-revocation` OpenSpec changes (`izgw-hub`), the `IGDD-2702` Jira epic and its child tickets, and the current `ApiKeyManagement/index.tsx` implementation.

**Feature status as of this writing (2026-08-05):** development is split across branches, not yet merged to `develop`. See [Implementation Status Snapshot](#implementation-status-snapshot) for ticket/branch context.

**This is a full test plan against the fully specified feature, not an "as implemented today" plan.** Every scenario below describes the target/spec behavior (per each capability's `spec.md`) regardless of whether the current build already meets it. Where the current implementation is known to deviate (§2), the scenario is still written and executed as specified — a failure is the correct, expected outcome of running that scenario today, and it gets logged as a defect through the normal process (§8), cross-referenced to the tracking ticket already covering that gap if one exists. Do not soften a scenario's expected result to match current behavior, and do not skip a scenario because it's known to fail.

### Terms Used in This Plan

New to this feature? These recur throughout the plan and its Playwright code samples:

- **Domain authorization / DNS ownership challenge** — before a sender can get a credential tied to a given internet domain, they must prove they control its DNS. Two ways to satisfy this drive the two "create key" flows referenced below: (1) the domain was already proven in a prior request and is still valid (§9.2, no challenge needed), or (2) it's a new domain, requiring the DNS TXT-record challenge/validate flow (§9.3).
- **UPN** — "Domain (upn)" is the literal field label used in the UI for the DNS domain string carried on the credential; functionally, it's just the fully-qualified domain name (FQDN) tied to that key.
- **`jti`** — the JWT's unique ID; this app also calls it the credential's "Key ID" in the UI. Used throughout the Playwright samples as the primary way to look up a specific credential.
- **`sortKey`** — the DynamoDB sort key for a credential record (`{envId}#{jti}`); appears in API payloads and Playwright samples as the identifier passed to renew/revoke/cancel calls.
- **Grace period** — after a renewal, the *old* credential keeps working for a fixed window (10 business days) so dependent systems can cut over to the new one before the old one is revoked.
- **RBAC** — Role-Based Access Control; see §6 for the two roles this feature defines and what each can see/do.

---

## 1. Scope

This plan covers **Configuration Console (CC) UI testing only** for the JWT API Key Management feature — the self-service replacement for mTLS certificate provisioning described in [IGDD-2702](https://izgateway.atlassian.net/browse/IGDD-2702) ("IZG Hub: API Key use").

**In scope:**
- All CC UI paths reachable from the API Key Management page (`/apikeys`): viewing the key list/dashboard; creating a key via either of its two supported domain-authorization flows — reusing an already-authorized domain (§9.2) or authorizing a brand-new domain via a DNS ownership challenge (§9.3); resuming/retrying that DNS challenge later from the table for a credential still awaiting validation (also §9.3); one-time token reveal (§9.4); renewing a key (§9.5); revoking a key (§9.6); cancelling a pending key (§9.7); and role-based (RBAC) visibility scoping (§6, §9.8).
- CC-side API routes that back those UI actions (`/api/apikeys/*`), to the extent needed to assert UI behavior (status codes surfaced as UI states/errors).

**Out of scope (covered by other test plans):**
- Hub-side JWT validation, credential caching, and `useTypes`/`environments` enforcement at message-routing time (`izgw-hub` — `jwt-upn-authorization`, `igdd-2705-api-key-principal-provider` OpenSpec changes). These are backend/integration concerns without a CC UI surface.
- The Hub's grace-period revocation scheduled job (`igdd-2711-grace-period-revocation`) — verified via Hub logs/CloudWatch, not CC UI.
- Jurisdiction `allowedUseTypes` policy UI — data model is settled but the UI is tracked in a separate CR (per `api-key-management/tasks.md`); see [§9.9](#99-jurisdiction-use-type-policy-not-yet-testable).
- General Config Console features already covered by the [existing UAT plan](https://izgateway.atlassian.net/wiki/spaces/IGDD/pages/22184696) (login/logout, navigation, app header, connections table, test connection, connection history, edit connection).

UAT testing runs in the internal dev environment (`https://dev.console.izgateway.org/`); smoke testing runs in the APHL Pre-Prod environment after UAT passes, per the standing IZ Gateway release process.

---

## 2. Implementation Status Snapshot

Development is spread across multiple unmerged branches. Confirm current status against Jira before running a scenario — a scenario marked **(planned)** may not yet be reachable in the environment under test.

**Audit method:** this table is the union of (1) every child of epic `IGDD-2702` (`parent = IGDD-2702`), (2) a label search for `JWT`/`API Key`-style labels (none exist — no ticket in this project carries one), (3) a keyword sweep of all IGDD ticket summaries/descriptions for `JWT`, `API Key`, and `ApiKeyCredential`, and (4) one hop of issue-links off every ticket already in the set (checked for all 21 core tickets; no further ticket surfaced). The keyword sweep also returned ~35 tickets excluded as off-thread after reading their descriptions: Xform Console/Service's own separate JWT/OAuth2 token mechanism (`IGDD-1417`, `1876`, `1952`, `2008`, `2015`, `2050`, `2536`, `2774`, and likely `1872`), a general CC/Core JWT-role authorization hardening ticket predating this epic (`IGDD-1711`), an unrelated Okta/NextAuth session-JWT logging bug (`IGDD-2770`), and a long tail of CVE/security-scan backlog items that matched only on incidental substrings like `elastic.api.key` (`IGDD-1384`, `2206`, `2581`, `2714`, `2793`, `2828`, `2836`, `2892`, `2893`, `2925`, `2974`, `2994`, `3028`, `3056`, `3197`, `3233`, and several pre-2025 connection-table/circuit-breaker tickets). None of these are included below.

| Ticket | Summary | Status | Track | Branch / Notes |
|---|---|---|---|---|
| [IGDD-2070](https://izgateway.atlassian.net/browse/IGDD-2070) | Enable alternative authorization approaches to simplify credential (certificate) management | Open | Origin | The originating proposal — explicitly names JWT tokens as the candidate alternative to mTLS certs |
| [IGDD-1745](https://izgateway.atlassian.net/browse/IGDD-1745) | CC: Estimate effort to deliver API keys through CC, and use of them in IZGW Hub | Resolved | Origin | Description states it directly spawned epic `IGDD-2702` |
| [IGDD-2703](https://izgateway.atlassian.net/browse/IGDD-2703) | Select API Key Authentication Pattern (ADR) | Resolved | Origin | The ADR referenced throughout the CC/Hub specs |
| [IGDD-1765](https://izgateway.atlassian.net/browse/IGDD-1765) | Modify IZ Gateway Core to support optional mTLS | Resolved | Origin | Precursor: added the optional mTLS-or-JWT auth pattern to `izgw-core` later reused by `IGDD-2704`–`2706`; not an epic member |
| [IGDD-2702](https://izgateway.atlassian.net/browse/IGDD-2702) | IZG Hub: API Key use (epic) | Open | Epic | Parent of all `Hub`/`CC`/`Enablement` rows below |
| [IGDD-2704](https://izgateway.atlassian.net/browse/IGDD-2704) | Modify HubPrincipalService to support API key auth | Resolved | Hub | — |
| [IGDD-2705](https://izgateway.atlassian.net/browse/IGDD-2705) | Implement ApiKeyPrincipalProvider in Hub | Resolved | Hub | `igdd-2705-api-key-principal-provider` |
| [IGDD-2706](https://izgateway.atlassian.net/browse/IGDD-2706) | Implement ApiKeyPrincipal in Hub | Resolved | Hub | — |
| [IGDD-2710](https://izgateway.atlassian.net/browse/IGDD-2710) | Provision HMAC server secret in AWS Secrets Manager | Resolved | Hub | — |
| [IGDD-2711](https://izgateway.atlassian.net/browse/IGDD-2711) | Implement Grace-Period Revocation Scheduled Job | Ready to Ship | Hub | `igdd-2711-grace-period-revocation` |
| [IGDD-3167](https://izgateway.atlassian.net/browse/IGDD-3167) | Update grace-period sweeper to set Expired vs. Revoked distinctly | To Do | Hub | — |
| [IGDD-3257](https://izgateway.atlassian.net/browse/IGDD-3257) | Hub: enhancement to API-key authentication with useTypes | To Do | Hub | Relates to `IGDD-3140` |
| [IGDD-3258](https://izgateway.atlassian.net/browse/IGDD-3258) | DynamoDB: API-key data migration & sender seeding | To Do | Hub | — |
| [IGDD-2707](https://izgateway.atlassian.net/browse/IGDD-2707) | Config Console API routes for key management | Resolved | CC | `IGDD-2707` |
| [IGDD-2708](https://izgateway.atlassian.net/browse/IGDD-2708) | Implement Config Console API Key Management UI | Resolved | CC | Superseded/split into `IGDD-3106` (create) + `IGDD-3107` (revoke/renew) |
| [IGDD-2709](https://izgateway.atlassian.net/browse/IGDD-2709) | Roles/access definitions for API key management | Ready for Test (**Blocked**) | CC | §6/§9.8 |
| [IGDD-2712](https://izgateway.atlassian.net/browse/IGDD-2712) | Implement Audit Logging for API Key Events | Resolved | CC | §7's audit-check steps |
| [IGDD-3106](https://izgateway.atlassian.net/browse/IGDD-3106) | Create-key feature + key management table UI | In Code Review | CC | `IGDD-2707`; assignee Evan Brock |
| [IGDD-3107](https://izgateway.atlassian.net/browse/IGDD-3107) | Revoke/renew key feature UI | Ready for Test (**Blocked**) | CC | `IGDD-2707` |
| [IGDD-3083](https://izgateway.atlassian.net/browse/IGDD-3083) | Add audit log tab on CC UI | Open | CC | The \"Audit Log\" tab referenced in §2 as not yet implemented |
| [IGDD-3140](https://izgateway.atlassian.net/browse/IGDD-3140) | Redesign DynamoDB entities for API key mgmt | In Progress | CC | `IGDD-3140-api-key-management` |
| [IGDD-3184](https://izgateway.atlassian.net/browse/IGDD-3184) | CC follow-up work (authz/IDOR fix, re-key to `{jti}`, apex DNS, filters) | In Progress | CC | Assignee Anusha Kanuri |
| [IGDD-3066](https://izgateway.atlassian.net/browse/IGDD-3066) | Prep materials to teach internal team about the feature | To Do | Enablement | — |
| [IGDD-3067](https://izgateway.atlassian.net/browse/IGDD-3067) | Prep materials to teach IISs about the feature | To Do | Enablement | — |
| [IGDD-3068](https://izgateway.atlassian.net/browse/IGDD-3068) | **This test plan's own tracking ticket** | In Progress | Enablement | Assignee Keith W. Boone |

**Current implementation state relative to this plan** (from `IGDD-3184` acceptance criteria and `api-key-management-ui/tasks.md`) — each of these is a point where executing the corresponding full-spec scenario below is expected to surface a failure until the referenced ticket lands. Log the failure per §8 and cross-reference the ticket; do not treat the scenario itself as optional:
- `/api/apikeys/*` routes currently check authentication only, not role or jurisdiction ownership. → §9.8.
- **Revoke vs. Cancel are not yet distinct code paths.** The UI's "Cancel key" button for `Ready for Validation`/`Validation` rows currently calls the same handler as "Revoke key" (`ApiKeyManagement/index.tsx`, `onRevoke`), which sets `revoked` status rather than hard-deleting the record. → §9.7, target behavior per `credential-lifecycle/spec.md`.
- The **Filters** button in the toolbar is a non-functional stub (`CustomToolbar` renders it but wires no click handler). → §9.11.
- The **Audit Log** tab renders "Audit log coming soon" — not yet implemented. No scenario in this plan yet covers it; add one once the feature has a spec.
- DNS TXT record placement is being changed from `_izg-verify.<domain>` to the domain apex (`<domain>`) — confirm which placement is live in the environment under test before running §9.3.
- The DNS-verification bypass (`verify-domain/index.ts`) is being hardened from an implicit `NODE_ENV === 'development'` check to an explicit `ALLOW_DNS_VERIFY_BYPASS` flag. → §9.10.

---

## 3. Features In Scope for This Release

1. **API Key Dashboard** — stat cards (Total/Active/Revoked), key list table, search
2. **Create API Key** — organization/environment/description/DNS-name form
3. **DNS Domain Verification** — TXT-record challenge, validate, success/failure/retry
4. **View / Reveal Token** — one-time JWT display and copy-to-clipboard
5. **Renew API Key** — grace-period issuance of a replacement credential
6. **Revoke API Key** — immediate termination of an active/grace-period credential
7. **Cancel Pending Key** — abandon a credential still in `Ready for Validation`
8. **RBAC Scoping** — IZG Operations (all jurisdictions) vs. Jurisdiction Operations (own jurisdiction only)

Not yet testable this release (see §9): Filters button, Audit Log tab, Jurisdiction use-type policy UI.

---

## 4. Environmental Requirements

- Testing is performed on the dev environment: `https://dev.console.izgateway.org/`
- Users authenticate via Okta (same accounts used for the existing CC UAT plan):
  - An **Ainq email account** provisioned with the **IZG Operations** role (admin-equivalent for this feature) — can manage keys for any jurisdiction.
  - A **PCC email account** provisioned with the **Jurisdiction Operations** role, scoped to a single jurisdiction — can only manage keys for that jurisdiction.
  - If you lack either account, request access the same way as the base CC UAT plan (talk to Zach or Brian).
- **DNS verification test domain:** use a domain you control and can add a TXT record to (e.g. a `*.testing.izgateway.org` subdomain — see the source-certificate list on [IGDD-3106](https://izgateway.atlassian.net/browse/IGDD-3106) comments for currently-provisioned test domains per environment), OR rely on the dev-only DNS bypass flag once `IGDD-3184` lands (§9.10 covers verifying the bypass is properly gated).
- Real DNS propagation can take up to 48 hours (per the in-app warning text) — plan DNS-dependent manual test sessions accordingly, or use the bypass flag in non-production environments.
- Browsers: Chrome, Microsoft Edge, Firefox on Windows 10/11 laptops, consistent with the base CC UAT plan. Playwright automation additionally runs against WebKit (`playwright.config.ts` defines `Chrome`, `Firefox`, `Edge`, `WebKit` projects).

---

## 5. Automated Testing Tooling

Automation uses the existing **Playwright** setup already present in this repository — no new framework is introduced.

| Component | Location | Notes |
|---|---|---|
| Config | `playwright.config.ts` | `testDir: ./e2e/tests`, 1 worker, 2 retries, `BASE_URL` env var, 4 browser projects |
| Global setup | `playwright.env.setup.ts` | Runs before the suite |
| Okta login helper | `e2e/helpers/oktaLogin.ts` | `loginToOkta(page, username, password, userFullName)` — reusable as-is; call with the IZG Operations or Jurisdiction Operations account depending on scenario |
| Logout helper | `e2e/helpers/logout.ts` | Reusable as-is |
| Existing spec pattern | `e2e/tests/manageConnection.spec.ts` | Reference for `test.beforeAll`/`afterAll` login/logout scaffolding and MUI DataGrid locator conventions (`div[data-field="X"][role="gridcell"]`, `getByRole('columnheader', {...})`) |

**New helpers needed** (do not exist yet — create under `e2e/helpers/`):
- `apiKeyHelpers.ts` — shared functions: `openApiKeyManagement(page)` (navigate to `/apikeys`, wait for grid), `createKey(page, {org, env, description, dns})`, `extractTxtChallenge(page)` (read the host/value pair off the challenge dialog for use with a DNS test double or manual TXT record), `revealAndCopyToken(page)`.
- Consider a lightweight **DNS stub/mock** for CI runs: the real TXT-lookup path (`dns.resolveTxt`) is not mockable from Playwright's browser context, so CI automation for the "new domain" create path should either (a) rely on the `ALLOW_DNS_VERIFY_BYPASS` flag in the test environment once it exists (§9.10), or (b) pre-seed an already-`authorized` `ApiKeyDomain` DynamoDB record (per the manual-insert shape documented in `IGDD-3106` comments) and only exercise the "existing domain" create path (§9.2) in CI, reserving the full DNS-challenge path (§9.3) for manual/scheduled runs against a real domain.

Each numbered scenario in §9 below lists: **Preconditions**, **Manual Steps** (in the voice of the existing UAT plan), and a **Playwright** subsection with a draft `test()` skeleton — file names follow the existing `e2e/tests/<feature>.spec.ts` convention.

---

## 6. Roles / RBAC Matrix

**RBAC** (Role-Based Access Control) here means two roles, each scoped as follows, per `IGDD-2709` acceptance criteria and `credential-lifecycle/spec.md`:

| Action | IZG Operations | Jurisdiction Operations | No API-key role |
|---|---|---|---|
| List keys | All jurisdictions | Own jurisdiction only | 403, no UI controls rendered |
| Create key | Any jurisdiction | Own jurisdiction only | 403 |
| Renew key | Any jurisdiction | Own jurisdiction only | 403 |
| Revoke key | Any jurisdiction | Own jurisdiction only | 403 |
| Multi-environment credential | Yes | Yes (own jurisdiction) | N/A |

**Note the gap called out in §2:** as of this writing, `/api/apikeys/*` routes verify authentication but not role/jurisdiction ownership. §9.8 is written to catch this as a **security-relevant regression test**, not an assumed-passing scenario — expect it to fail until `IGDD-3184`'s P1 work lands, then expect it to pass and stay passing.

---

## 7. Unit Testing / Static Analysis / Security Testing / Logging

Unchanged from the base CC UAT plan — Jest unit tests and ESLint gate the CI/CD pipeline; Dependabot and APHL scanning cover dependency CVEs; a third-party penetration test covers the application generally. No feature-specific deviation for API Key Management, with two additions specific to this feature:

- **Security-sensitive unit test coverage** should include: DNS bypass gating (`ALLOW_DNS_VERIFY_BYPASS` never active when `NODE_ENV === 'production'`), domain exclusivity (one domain → one sender), and the write-once/encrypted-at-rest handling of credential secrets (`EncryptedRepository` pattern).
- **Audit log verification** (manual, via Elasticsearch, same technique as the base plan): after each create/renew/revoke/cancel action, confirm an `API_KEY_CREATED`, `API_KEY_RENEWAL_SUPERSEDED`, or `API_KEY_REVOKED` event appears in the audit index, with no token or secret material present in the logged payload.

---

## 8. Defect Reporting

Unchanged from the base plan — file Bug Reports against the IGDD board with the same template (Browser / OS / Test Case / Preconditions / Expected Behavior / Repeatable / Screenshots / Console errors / Actual Behavior). Reference this document and the specific numbered scenario (e.g. "API Key Test Plan §9.3") in the bug description for traceability.

---

## 9. Features to Be Tested

### 9.1 API Key Dashboard (list, stat cards, search)

**Preconditions:** Logged in as either role; at least one existing credential in the environment.

**Manual Steps:**
1. Navigate to the API Key Management page (left nav or direct URL `/apikeys`).
2. Expect to see the page header "API key management" and three stat cards: **Total Keys**, **Active**, **Revoked**.
3. Expect the key table to show columns: DESCRIPTION, ENVIRONMENT, ORGANIZATION, STATUS, CREATED, EXPIRES, CREATED BY, ACTION.
4. Hover the DESCRIPTION cell — expect a tooltip showing the key's ID (`jti`).
5. Type into the "Search by key ID or jurisdiction" box — expect the table to filter client-side by key ID, description, jurisdiction, or environment.
6. Expect stat card counts to match the *unfiltered* full list (they are computed from all fetched rows, not the filtered view — confirm this is/isn't the intended behavior when testing).

**Playwright** (`e2e/tests/apiKeyDashboard.spec.ts`):
```ts
import { test, expect } from '@playwright/test'
import { loginToOkta } from '../helpers/oktaLogin'
import { openApiKeyManagement } from '../helpers/apiKeyHelpers'

test.beforeAll(async ({ browser }) => {
  // ... context/page setup, loginToOkta(page, IZG_OPS_USERNAME, IZG_OPS_PASSWORD)
  // await openApiKeyManagement(page)
})

test('API key dashboard shows stat cards and correct columns', async ({ page }) => {
  await expect(page.getByText('Total Keys')).toBeVisible()
  await expect(page.getByText('Active', { exact: true })).toBeVisible()
  await expect(page.getByText('Revoked', { exact: true })).toBeVisible()
  for (const column of ['DESCRIPTION', 'ENVIRONMENT', 'ORGANIZATION', 'STATUS', 'CREATED', 'EXPIRES', 'CREATED BY', 'ACTION']) {
    await expect(page.getByRole('columnheader', { name: column })).toBeVisible()
  }
})

test('Search filters the key table by description/jurisdiction/environment', async ({ page }) => {
  await page.getByPlaceholder('Search by key ID or jurisdiction').fill('Massachusetts')
  const rows = page.locator('div[data-field="jurisdiction"][role="gridcell"]')
  const count = await rows.count()
  expect(count).toBeGreaterThan(0)
  for (let i = 0; i < count; i++) {
    await expect(rows.nth(i)).toContainText(/massachusetts/i)
  }
})
```

---

### 9.2 Create Key — Existing Authorized Domain (fast path)

**Preconditions:** An `ApiKeyDomain` already exists with `status = authorized` and `authExpiresAt` in the future, for the test jurisdiction/environment.

**Manual Steps:**
1. Click **Create Key** (bottom-left of the table footer).
2. Expect the "Create API Key" dialog with fields: Organization, Environment, Description (required), DNS Name.
3. Select an Organization that has an existing authorized domain for the environment you select.
4. Select the previously-authorized domain from the DNS Name dropdown (not "Other").
5. Enter a Description and click **NEXT**.
6. Expect the request to skip the DNS challenge step entirely and go straight to token issuance — the "View API Key" dialog with the token appears immediately (per `credential-lifecycle/spec.md`: "Existing authorized domain creates credential in active status immediately").
7. Expect the token string to be shown once, with a **COPY TOKEN** button, and the warning that it cannot be retrieved again after closing.
8. Close the dialog. Expect the new row to appear in the table with status **Active**, and no eye/view icon (already viewed).

**Playwright** (`e2e/tests/apiKeyCreateExistingDomain.spec.ts`):
```ts
test('Create key with a pre-authorized domain issues token immediately, no DNS step', async ({ page }) => {
  await page.getByRole('button', { name: 'Create Key' }).click()
  await page.getByLabel('Organization').click()
  await page.getByRole('option', { name: TEST_ORG_NAME }).click()
  await page.getByLabel('Environment').click()
  await page.getByRole('option', { name: TEST_ENV_NAME }).click()
  await page.getByPlaceholder('e.g AAMBAE').fill('Automated test — existing domain')
  await page.getByLabel('DNS Name').click()
  await page.getByRole('option', { name: AUTHORIZED_TEST_DOMAIN }).click()
  await page.getByRole('button', { name: 'NEXT' }).click()
  // No "Verify Domain Ownership" step expected — assert directly on token dialog
  await expect(page.getByText('Validation Completed. Copy this token now')).toBeVisible({ timeout: 15000 })
  await expect(page.getByRole('textbox').filter({ hasText: /^ey/ })).toBeVisible() // JWT starts with "ey"
})
```

---

### 9.3 Create Key — New Domain (DNS challenge path)

**Preconditions:** No existing `ApiKeyDomain` authorization for the chosen (environment, jurisdiction, domain) triple. Access to add a DNS TXT record for the test domain, or the DNS bypass flag enabled in a non-production environment (§9.10).

**Manual Steps:**
1. Click **Create Key**, fill Organization, Environment, Description.
2. In DNS Name, select **Other**, then enter a valid FQDN in the "Custom DNS Name" field (e.g. `dev.iz.gateway.org`). Expect client-side validation to reject malformed values (e.g. missing a dot, leading hyphen) with inline error text before allowing NEXT.
3. Click **NEXT**. Expect the dialog to switch to **"Verify Domain Ownership"**, showing a TXT record host/value pair to add at your DNS provider, and an info banner noting DNS changes may take up to 48 hours.
4. Add the TXT record at the domain's DNS provider (or trigger the bypass, §9.10).
5. Click **VALIDATE**.
   - **On success:** expect "Validation Completed!" with a green check, the same host/value pair shown again for cleanup, and a **VIEW KEY** button that reveals the one-time token.
   - **On failure (record not yet propagated):** expect "Validation Failed" with a warning icon, the same TXT instructions repeated, and a **TRY AGAIN** button that re-attempts the same lookup without generating a new challenge UUID.
6. After success, close and confirm the new row appears with status **Active**.

**Playwright** (`e2e/tests/apiKeyCreateNewDomain.spec.ts`):
```ts
test('Create key for a new domain shows DNS challenge, then issues token on validation', async ({ page }) => {
  await page.getByRole('button', { name: 'Create Key' }).click()
  // ... select org/env, fill description ...
  await page.getByLabel('DNS Name').click()
  await page.getByRole('option', { name: 'Other' }).click()
  await page.getByPlaceholder('dev.iz.gateway.org').fill(TEST_NEW_DOMAIN)
  await page.getByRole('button', { name: 'NEXT' }).click()
  await expect(page.getByText('Verify Domain Ownership')).toBeVisible()
  const challengeText = await page.locator('div[style*="font-family: monospace"]').first().innerText()
  expect(challengeText).toMatch(/izg-challenge=/)
  // ... add TXT record via test-domain DNS API, or rely on bypass flag ...
  await page.getByRole('button', { name: 'VALIDATE' }).click()
  await expect(page.getByText('Validation Completed!')).toBeVisible({ timeout: 20000 })
  await page.getByRole('button', { name: 'VIEW KEY' }).click()
  await expect(page.getByText('Validation Completed. Copy this token now')).toBeVisible()
})

test('Custom domain name is validated client-side before allowing submission', async ({ page }) => {
  await page.getByRole('button', { name: 'Create Key' }).click()
  await page.getByLabel('DNS Name').click()
  await page.getByRole('option', { name: 'Other' }).click()
  await page.getByPlaceholder('dev.iz.gateway.org').fill('not-a-domain')
  await expect(page.getByText('Enter a valid domain name')).toBeVisible()
  await expect(page.getByRole('button', { name: 'NEXT' })).toBeDisabled()
})
```

**Resuming validation later from the table (a separate entry point from the dialog above):** if a tester closes the Create Key dialog after receiving the DNS challenge but before clicking VALIDATE (e.g., to wait out DNS propagation), the credential row appears with status **Ready for Validation** and its own **Validate domain** icon in the ACTION column. Clicking it re-runs the same TXT lookup as the in-dialog VALIDATE button, without reopening the create dialog.

1. From a `Ready for Validation` row, click the **Validate domain** icon (checkmark) under ACTION.
2. Expect the same success/failure outcomes as steps 5 above, surfaced as a snackbar instead of a dialog state (`'<Jurisdiction> API Key is active'` on success, `'DNS validation failed'` on failure).
3. On success, the row transitions to **Active**; the token is not shown automatically here — use §9.4 to view it.

```ts
test('Validate domain row action succeeds without reopening the create dialog', async ({ page }) => {
  const row = page.locator('div[role="row"]', { hasText: PENDING_KEY_DESCRIPTION })
  await row.getByRole('button', { name: 'Validate domain' }).click()
  await expect(page.getByText(/API Key is active/)).toBeVisible({ timeout: 20000 })
})
```

---

### 9.4 View / Reveal Token (already-active, not-yet-viewed key)

**Preconditions:** An `Active` credential exists whose token has not yet been viewed (`viewedAt` unset) — e.g. the create/validate dialog was closed before clicking VIEW KEY.

**Manual Steps:**
1. In the key table, locate the row and confirm the eye ("View key") icon is present under ACTION.
2. Click it. Expect the "View API Key" dialog with the full token, a copy button, and the "cannot be retrieved after closing" warning.
3. Click **COPY TOKEN**; expect button text to change to "COPIED!" briefly.
4. Close and re-open the row's actions — expect the eye icon to be **gone** (token already viewed) and only Renew/Revoke icons remain.

**Playwright** (`e2e/tests/apiKeyViewToken.spec.ts`):
```ts
test('Unviewed active key can be revealed once; view icon disappears after', async ({ page }) => {
  const row = page.locator('div[role="row"]', { hasText: UNVIEWED_KEY_DESCRIPTION })
  await row.getByRole('button', { name: 'View key' }).click()
  await expect(page.getByText('Validation Completed. Copy this token now')).toBeVisible()
  await page.getByRole('button', { name: /copy token/i }).click()
  await expect(page.getByRole('button', { name: 'COPIED!' })).toBeVisible()
  await page.getByRole('button', { name: 'CLOSE' }).click()
  await expect(row.getByRole('button', { name: 'View key' })).toHaveCount(0)
})
```

---

### 9.5 Renew API Key

**Preconditions:** An `Active` credential exists.

**Manual Steps:**
1. Click the Renew icon (circular-arrow) on an active row.
2. Expect the "Renew API Key" dialog stating a new key will be issued and the old key remains valid for **10 business days**.
3. Expect read-only Jurisdiction/Environment fields matching the row, an optional Description field, and a required "Domain (upn)" field.
4. Submit with a valid domain. Expect the one-time token dialog to appear for the **new** credential.
5. Close, and confirm in the table: the **old** row now shows status **Grace Period** with "Grace period expires on <date>" and only a Revoke action available (no Renew, no View). The **new** row shows **Active**.
6. Verify (per `credential-lifecycle/spec.md`) the new expiry: if renewed >30 days before the old expiry, new `expiresAt` = 1 year from renewal date; if within 30 days of (or past) old expiry, new `expiresAt` = 1 year from the **old** expiry date. Cross-check the EXPIRES column value against whichever rule applies to your test data.

**Playwright** (`e2e/tests/apiKeyRenew.spec.ts`):
```ts
test('Renewing an active key issues a new token and sets old key to Grace Period', async ({ page }) => {
  const activeRow = page.locator('div[role="row"]', { hasText: ACTIVE_KEY_DESCRIPTION })
  await activeRow.getByRole('button', { name: 'Renew key' }).click()
  await expect(page.getByText('10 business days')).toBeVisible()
  await page.getByLabel('Domain (upn)').fill(RENEWAL_TEST_DOMAIN)
  await page.getByRole('button', { name: 'RENEW KEY' }).click()
  await expect(page.getByText('Validation Completed. Copy this token now')).toBeVisible()
  await page.getByRole('button', { name: 'CLOSE' }).click()
  await expect(activeRow.getByText(/Grace period expires on/)).toBeVisible()
  await expect(activeRow.getByRole('button', { name: 'Renew key' })).toHaveCount(0)
  await expect(activeRow.getByRole('button', { name: 'Revoke key' })).toBeVisible()
})
```

---

### 9.6 Revoke API Key (Active or Grace Period)

**Preconditions:** An `Active` or `Grace Period` credential exists.

**Manual Steps:**
1. Click the Revoke icon (red circle-minus) on the row.
2. Expect the "Revoke API Key" dialog identifying the jurisdiction and key ID, a red warning that integrations using the key stop working **immediately**, and an optional Reason field.
3. Optionally enter a reason, click **CONFIRM REVOCATION**.
4. Expect a success snackbar ("`<Jurisdiction>` API Key revoked — This key can no longer be used.").
5. Confirm the row's status is now **Revoked** with a flag icon, ACTION column shows "Revoked `<date>`" with no further actions available.
6. Confirm the **Revoked** stat card count incremented by one.
7. **Audit check:** confirm an `API_KEY_REVOKED` event appears in Elasticsearch with the reason (if supplied), actor, and timestamp — no token material present.

**Playwright** (`e2e/tests/apiKeyRevoke.spec.ts`):
```ts
test('Revoking an active key sets status to Revoked and disables further actions', async ({ page }) => {
  const row = page.locator('div[role="row"]', { hasText: ACTIVE_KEY_DESCRIPTION })
  await row.getByRole('button', { name: 'Revoke key' }).click()
  await page.getByLabel('Reason (optional)').fill('Automated test revocation')
  await page.getByRole('button', { name: 'CONFIRM REVOCATION' }).click()
  await expect(page.getByText(/API Key revoked/)).toBeVisible()
  await expect(row.getByText(/Revoked/)).toBeVisible()
  await expect(row.getByRole('button')).toHaveCount(0)
})
```

---

### 9.7 Cancel Pending Key (Ready for Validation)

**Preconditions:** A credential in `Ready for Validation` status (created but DNS not yet validated, or "Other" domain chosen and challenge not completed).

**Manual Steps** (target behavior per `credential-lifecycle/spec.md`, "Cancel performs a hard delete"):
1. Click the Cancel icon (red circle-minus glyph, tooltip "Cancel key") on a `Ready for Validation` row.
2. Expect a distinct confirmation (no "reason" field, per spec — cancellation records no reason and no `revokedAt`).
3. Confirm. Expect the record to be **hard-deleted** — it disappears from the table entirely (not shown as "Revoked").
4. Confirm the **Total Keys** stat card count decremented; the **Revoked** count does **not** increment.

If the current build instead routes this through the revoke handler (shared code path — see §2), that is a failure of this scenario: log it per §8, cross-referenced to `IGDD-3184` (tasks 3.7–3.9).

**Playwright** (`e2e/tests/apiKeyCancel.spec.ts`):
```ts
test('Cancelling a pending key hard-deletes the record (no Revoked status)', async ({ page }) => {
  const row = page.locator('div[role="row"]', { hasText: PENDING_KEY_DESCRIPTION })
  await row.getByRole('button', { name: 'Cancel key' }).click()
  await page.getByRole('button', { name: /confirm cancel/i }).click()
  await expect(row).toHaveCount(0)
  // Total stat card decremented, Revoked stat card unchanged — assert both counts explicitly
})
```

---

### 9.8 RBAC Scoping (Jurisdiction Ops vs. IZG Ops) — security regression

This is a security-relevant scenario — keep it in the suite permanently, since a missing ownership check is exactly the class of bug that regresses silently. If the current build does not enforce ownership (§2), that is a failure: log it per §8, cross-referenced to `IGDD-3184`'s P1 authorization work.

**Manual Steps:**
1. As **Jurisdiction Operations** user for Jurisdiction A, open API Key Management. Confirm only Jurisdiction A's credentials appear in the table.
2. Attempt to view/renew/revoke a **known credential belonging to Jurisdiction B** by directly calling the underlying route with Jurisdiction B's `sortKey`/`jti` (e.g. via browser dev tools `fetch`, or a Playwright `request` context reusing the authenticated session) — not just by checking the UI doesn't list it.
3. Expect a 403/ownership-denied response — **not** a successful mutation.
4. As **IZG Operations**, confirm all jurisdictions' credentials are visible and manageable.
5. As a user with **no API key role at all**, confirm the API Key Management nav entry / page renders no key-management controls, and direct route calls return 403.

**Playwright** (`e2e/tests/apiKeyRbacScoping.spec.ts`):
```ts
test('Jurisdiction Ops cannot list or mutate another jurisdiction\'s credentials', async ({ page, request }) => {
  await loginToOkta(page, JURISDICTION_A_USERNAME, JURISDICTION_A_PASSWORD)
  await openApiKeyManagement(page)
  await expect(page.getByText(JURISDICTION_B_NAME)).toHaveCount(0)

  const cookies = await page.context().cookies()
  const resp = await request.patch('/api/apikeys', {
    data: { sortKey: JURISDICTION_B_KNOWN_SORT_KEY, reason: 'IDOR probe' },
    headers: { Cookie: cookies.map(c => `${c.name}=${c.value}`).join('; ') },
  })
  expect(resp.status()).toBe(403)
})
```

---

### 9.9 Jurisdiction Use-Type Policy

**Blocked — no UI exists in any branch yet** (data model and enforcement rules are settled per `jurisdiction-policy/spec.md`; the UI is tracked in a separate CR per `api-key-management/tasks.md`). This is the one scenario in this plan that cannot be executed today because there is literally no page to navigate to — that is a scheduling blocker, not a reason to weaken the expected result below. Write the Playwright spec now against the target behavior so it is ready the moment the UI CR merges.

**Preconditions:** Logged in as Jurisdiction Operations (own jurisdiction) or IZG Operations (any jurisdiction); jurisdiction policy UI is deployed.

**Manual Steps** (target behavior per `jurisdiction-policy/spec.md`):
1. Navigate to the jurisdiction's policy settings. Expect to see the current `allowedUseTypes` displayed with human-readable labels (`Patient`, `Provider`, `Public Health`).
2. As Jurisdiction Operations, change the selection and save. Expect `Jurisdiction.allowedUseTypes` to update, and the change to appear in the audit trail.
3. Attempt to save with no use types selected. Expect the save to be rejected with an error indicating at least one use type is required.
4. As IZG Operations, repeat steps 1–2 against a jurisdiction other than your own. Expect the same view/edit capability as Jurisdiction Operations has for their own jurisdiction.

**Playwright** (`e2e/tests/apiKeyJurisdictionPolicy.spec.ts`):
```ts
test('Jurisdiction Ops can view and update their own allowedUseTypes', async ({ page }) => {
  await page.goto('/jurisdictions/policy') // update once the real route exists
  for (const label of ['Patient', 'Provider', 'Public Health']) {
    await expect(page.getByLabel(label)).toBeVisible()
  }
  await page.getByLabel('Provider').check()
  await page.getByRole('button', { name: /save/i }).click()
  await expect(page.getByText(/saved|updated/i)).toBeVisible()
})

test('Saving with no use types selected is rejected', async ({ page }) => {
  await page.goto('/jurisdictions/policy')
  for (const label of ['Patient', 'Provider', 'Public Health']) {
    await page.getByLabel(label).uncheck()
  }
  await page.getByRole('button', { name: /save/i }).click()
  await expect(page.getByText(/at least one use type is required/i)).toBeVisible()
})
```

---

### 9.10 DNS Verification Bypass Gating (environment-configuration check, not end-user flow)

**Preconditions:** Access to the CC environment's configuration (ECS task def / `.env`) for the environment under test — this is closer to a configuration/security check than a UI functional test, but belongs here because it directly affects how §9.3 is exercised without real DNS.

**Manual Steps:**
1. In a non-production environment (dev/test), confirm real DNS lookups are performed by default (`NODE_ENV` alone must not enable bypass, per `domain-authorization/spec.md`).
2. With `ALLOW_DNS_VERIFY_BYPASS=true` set in a non-production environment, confirm the create-key DNS challenge in §9.3 can be completed without adding a real TXT record (simulated success).
3. Confirm that even with the bypass flag set, a production-configured environment (`NODE_ENV=production`) ignores it and performs a real lookup. (This should be verified via a unit/integration test in the CC repo's own test suite, not via UI Playwright against production — do not attempt to toggle this flag in APHL Pre-Prod.)

---

### 9.11 Filters

**Preconditions:** Logged in as either role; credentials exist spanning at least two distinct environments, statuses, and organizations.

**Manual Steps** (target behavior per `api-key-management-ui/tasks.md` §"Filters"):
1. Click the **Filters** button in the toolbar.
2. Expect a filter panel/menu to open with controls for Environment, Status, and Organization.
3. Select an Environment value. Expect the table to update to show only credentials in that environment.
4. Add a Status filter on top of the Environment filter. Expect both filters to compose (AND, not OR) with each other and with the existing search-by-key-ID-or-jurisdiction text filter.
5. Clear the filters. Expect the table to return to the full unfiltered list.

If the button currently opens nothing (per §2, it is wired with no click handler), that is a failure of this scenario: log it per §8, cross-referenced to `IGDD-3184` and the original `api-key-management-ui` tasks item 2.1.

**Playwright** (`e2e/tests/apiKeyFilters.spec.ts`), following the existing filter-dropdown pattern in `manageConnection.spec.ts`'s "Connections table updates based on filter dropdown" test:
```ts
test('Filters button opens a panel and filters by Environment, Status, and Organization', async ({ page }) => {
  await page.getByRole('button', { name: 'Filters' }).click()
  await expect(page.getByLabel('Environment')).toBeVisible()
  await expect(page.getByLabel('Status')).toBeVisible()
  await expect(page.getByLabel('Organization')).toBeVisible()

  await page.getByLabel('Environment').click()
  await page.getByRole('option', { name: TEST_ENV_NAME }).click()
  const envCells = page.locator('div[data-field="environment"][role="gridcell"]')
  const count = await envCells.count()
  expect(count).toBeGreaterThan(0)
  for (let i = 0; i < count; i++) {
    await expect(envCells.nth(i)).toHaveText(TEST_ENV_NAME)
  }

  await page.getByRole('button', { name: /clear filters/i }).click()
  await expect(page.locator('div[role="row"][data-rowindex]')).not.toHaveCount(count)
})
```

---

## 10. Post-Release / Smoke Testing

Post-deployment smoke testing (APHL Pre-Prod) uses a subset of §9: **9.1 (dashboard loads)**, **9.2 (create with existing domain)**, **9.4 (view token)**, **9.6 (revoke)** — the same "read-only or low-risk mutation" philosophy as the base CC UAT plan's Post Release Testing section. Do not run §9.3's live-DNS challenge or §9.8's IDOR probe against Pre-Prod without coordinating with the environment owner, since one creates real DNS-dependent state and the other is a security probe.
