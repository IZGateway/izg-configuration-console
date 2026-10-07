# Playwright Acceptance Criteria: API Key Management

Plain-language behaviors that must hold true in the running app. Each bullet maps 1:1
to a Playwright assertion; the test file is noted per group. This file describes what
the tests check, not how they do it. The requirements themselves live in
`openspec/changes/api-key-management-ui/specs/api-key-management/spec.md` and
`openspec/changes/api-key-management/specs/credential-lifecycle/spec.md`.

**Selectors:** use the `data-testid` hooks on the Create Key dialog
(`create-key-organization`, `create-key-environment`, `create-key-description`,
`create-key-use-types`, `create-key-dns-name`) and the token dialog (`api-key-token`).
Do not select by CSS class or field label: the form labels are not linked to their inputs.

---

## Create Key: existing authorized domain

**Test:** `e2e/tests/apiKeyCreateExistingDomain.spec.ts`
**Source scenario:** credential-lifecycle, "Existing authorized domain creates credential
in active status immediately"

- Clicking **Create Key** in the Keys table footer opens the "Create API Key" dialog with
  Organization, Environment, Description (optional), Use Types, and DNS Name fields
- After an Organization and Environment are selected, the DNS Name dropdown lists the
  domains already authorized for that pair, plus "Other"
- Submitting with a previously authorized domain (not "Other") skips the DNS challenge:
  `POST /api/apikeys` returns 201 (not 202), and no "Verify Domain Ownership" step is shown
- If an active key with the exact same scope already exists, the duplicate-scope warning
  appears and **CREATE ANYWAY** still creates the key (warns, does not block)
- The "View API Key" dialog opens immediately with "Validation Completed. Copy this token
  now", a JWT in the token field, a **COPY TOKEN** button, and the warning that the secret
  cannot be retrieved after closing the dialog
- After the dialog is closed, the new key appears in the Keys table with status **Active**
  and no View (eye) action, because the token has already been revealed once

**Test data:** constants at the top of the test file (organization, environment,
pre-authorized domain, use type). The domain must already be authorized for that
organization and environment. The created key is left Active; each run adds one.

---

## Create Key: new domain (DNS challenge)

**Test:** `e2e/tests/apiKeyCreateNewDomain.spec.ts`
**Source scenario:** credential-lifecycle, "New domain requires DNS TXT challenge
before the credential becomes active"

- Choosing **Other** in DNS Name reveals a Custom DNS Name field that rejects malformed
  values inline ("Enter a valid domain name") and keeps **NEXT** disabled until the value
  is a real FQDN
- Submitting an unauthorized domain issues a challenge instead of a token: the dialog
  moves to **"Verify Domain Ownership"**, showing the TXT record host (the domain apex
  itself) and an `izg-challenge=<uuid>` value, plus the 48-hour propagation notice
- **VALIDATE** on a satisfied challenge shows **"Validation Completed!"** with a green
  check, repeats the same host/value pair for cleanup, and offers **VIEW KEY**, which
  reveals the one-time JWT; the row then appears **Active** with no View (eye) action
- **VALIDATE** on an unsatisfied challenge shows **"Validation Failed"** with a warning
  icon and repeats the TXT instructions; **TRY AGAIN** re-posts the identical lookup and
  mints no new challenge UUID (no second `POST /api/apikeys`)
- Closing the dialog at the challenge step leaves the row **Ready for Validation** with
  its own Validate domain action, which re-reads the same persisted challenge, reports
  success/failure as a snackbar rather than a dialog step, and moves the row to
  **Active** without reopening the create dialog

**Test data** (`.env.test`): optionally `E2E_APIKEY_ORG`, `E2E_APIKEY_ENV`,
`E2E_APIKEY_USE_TYPE` to pin the pickers; each test mints its own throwaway domain.
The three tests that drive a challenge to success require
`ALLOW_DNS_VERIFY_BYPASS=true` on the console under test and are opted in with
`DNS_VERIFY_BYPASS_AVAILABLE=true`; they skip with a reason otherwise. These tests do
not revoke the keys they create.
