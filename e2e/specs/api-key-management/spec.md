# Playwright Acceptance Criteria: API Key Management

Plain-language behaviors that must hold true in the running app. Each bullet maps 1:1
to a Playwright assertion; the test file is noted per group. This file describes what
the tests check, not how they do it. The requirements themselves live in
`openspec/changes/api-key-management-ui/specs/api-key-management/spec.md` and
`openspec/changes/api-key-management/specs/credential-lifecycle/spec.md`.

**Selectors:** use the `data-testid` hooks on the Create Key dialog
(`create-key-organization`, `create-key-environment`, `create-key-description`,
`create-key-use-types`, `create-key-dns-name`), the token dialog (`api-key-token`), and the
stat cards (`stat-card-total-keys`, `stat-card-active`, `stat-card-revoked`, each with a
`stat-card-value`). Do not select by CSS class or by the Create Key form labels: those
labels are not linked to their inputs. Real `<label>`s (e.g. Revoke's "Reason (optional)")
and action tooltips (e.g. "Revoke key") can be selected with `getByLabel`.

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
  appears and **CREATE ANYWAY** still creates the key (warns, does not block). Covered by
  its own test, which seeds a same-scope key first so the warning is always exercised
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

---

## View / reveal token

**Test:** `e2e/tests/apiKeyViewToken.spec.ts`
**Source scenario:** credential-lifecycle, "Token is retrievable exactly once"

- An **Active** credential whose token has never been viewed shows the eye
  ("View key") action under ACTION
- Clicking it opens the "View API Key" dialog with the full JWT, a **COPY TOKEN**
  button, and the warning that the secret cannot be retrieved after closing
- **COPY TOKEN** acknowledges with "COPIED!" and then reverts to "COPY TOKEN"
- After closing, the eye action is gone and only Renew and Revoke remain — and it
  stays gone across a page reload, because the one-shot is persisted as `viewedAt`
  rather than held in client state

**Test data** (`.env.test`): same optional picker pins as above. The spec provisions its
own unviewed key by running the DNS challenge and closing the success dialog with CLOSE
instead of VIEW KEY, so it requires `DNS_VERIFY_BYPASS_AVAILABLE=true` and skips
otherwise. The key it creates is left in place.

---

## Revoke an active key

**Test:** `e2e/tests/apiKeyRevoke.spec.ts`
**Source scenario:** credential-lifecycle, "Revoke sets status and timestamp on an active
or grace_period credential"

**Precondition:** the test creates a fresh Active key on the already-authorized domain
`revokeKey.fastTrack.playwright.org` (same fast path as Create Key above), so it never
revokes a key someone else is using.

- Clicking the row's Revoke action (red circle-minus) opens the "Revoke API Key" dialog,
  which names the jurisdiction and key ID and says the action cannot be undone
- The dialog shows the red warning that any integration using the key stops working
  immediately, and an optional **Reason** field
- After entering a reason and clicking **CONFIRM REVOCATION**, a success snackbar reads
  "{Jurisdiction} API Key revoked" / "This key can no longer be used."
- The row's status changes to **Revoked** with a flag icon, and the Action column shows
  "Revoked {date}" with no action buttons left
- The **Revoked** stat card count goes up by exactly one

**Manual only (not in the Playwright test):** an `API_KEY_REVOKED` event appears in
Elasticsearch with the reason, actor, and timestamp, and contains no token material. The
browser can't see Elasticsearch, so this stays a manual check.

---

## RBAC scoping (Jurisdiction Ops vs. IZG Ops)

**Test:** `e2e/tests/apiKeyRbacScoping.spec.ts`
**Source scenario:** test plan §9.8, security regression (cross-reference IGDD-3184).
Keep permanently: a missing ownership check regresses silently, because the UI hides
other jurisdictions' keys whether or not the server enforces it.

**Precondition:** IZG Operations creates a throwaway Active key in another organization
("Jurisdiction B"), and every probe targets that key, never a real one. B is picked
automatically: the first sender organization other than A with a domain already
authorized in Development. If ownership is broken, the probes do mutate their target.
The key is revoked during cleanup.

- **IZG Operations:** the Create Key Organization dropdown lists every sender
  organization returned by `/api/jurisdictions` (the unscoped list)
- **IZG Operations:** sees every key that Jurisdiction A's user sees
- **Jurisdiction Operations (A):** `GET /api/apikeys` returns only Jurisdiction A's
  keys, and B's key is not in the table
- **Jurisdiction Operations (A):** calling the routes directly on B's key — view token
  (`POST /api/apikeys/token`), renew (`POST /api/apikeys/renew`), revoke
  (`PATCH /api/apikeys`) and cancel (`DELETE /api/apikeys`) — each returns 403
  "Forbidden - not authorized for this jurisdiction"
- Afterwards B's key is still **Active**: not revoked, renewed or cancelled
- **No API key role:** there is no API Key Management nav entry, `/apikeys` shows "You
  do not have access to this page." with no Create Key button, and the list route and
  every probe above return 403 "Forbidden - insufficient role"

Probes run as `fetch()` inside the signed-in page, because `/api/*` requires a DPoP
proof that only the app's fetch wrapper adds. A Playwright `request` call with copied
cookies is redirected to sign-in before the ownership check ever runs. A failure is a
security finding: log it per test plan §8.

**Test data** (`.env.test`; the spec skips with a reason if any are unset): IZG
Operations is `OKTA_USERNAME` / `OKTA_PASSWORD` / `OKTA_USER_FULLNAME`; Jurisdiction A is
`E2E_RBAC_JURIS_OPS_USERNAME`, `_PASSWORD`, `_FULLNAME` and `E2E_RBAC_JURIS_OPS_ORG`; the
no-role user is `E2E_RBAC_NO_ROLE_USERNAME`, `_PASSWORD`, `_FULLNAME`. At least one other
sender organization needs a domain authorized in Development.
