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
