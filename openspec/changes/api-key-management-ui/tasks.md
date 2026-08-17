> Status legend: `[x]` implemented on this branch · `[ ]` not yet implemented ·
> `[~]` deliberately deferred/decided against (see design.md for rationale).
> The scope grew well beyond the original four items (Filters, Revoke/Cancel, DNS
> hardening, pagination) to include Use Types, credential-lifecycle expiry/issuance,
> an Expired status, RBAC UI gating **and server-side enforcement**, full IGDD-3140
> credential/JWT model reconciliation, global domain exclusivity, a duplicate-scope
> guardrail, an expired-key re-issue flow, and a round of code-review hardening. See
> design.md for the decisions (D1–D17).

## 1. Revoke / Cancel Split

- [x] 1.1 Distinct `cancel` path separate from `revoke`. **Revised per design D1:
      `cancel` is a SOFT cancel — sets `status: 'cancelled'` + `cancelledBy`/`cancelledAt`
      and RETAINS the record for audit (not a hard delete). Valid only from
      `ready_for_validation`, guarded by a DynamoDB ConditionExpression
      (`cancelApiKeyCredential`). `revoke` sets `status: 'revoked'` + `revokedAt`,
      valid from `active`/`grace_period` (+ legacy `grace`/`superseded`).**
- [x] 1.2 `CancelDialog` (neutral copy) → `DELETE /api/apikeys`; `RevokeDialog`
      (destructive copy, optional reason) → `PATCH /api/apikeys`; ActionCell buttons rewired.
- [x] 1.3 Dashboard accounting: revoked keys increment Revoked; cancelled keys are
      hidden from the default view (retained, surfaced only via the Status filter),
      so they don't add noise or inflate Active.
- [x] 1.4 Cancel dialog and success-toast wording corrected to accurately describe
      soft-cancel ("cancelled ... record retained for audit") — the original copy said
      "removed," implying a hard delete that never matched D1.
- [x] 1.5 `revokeApiKeyCredential` and `supersedeApiKeyCredential` (see §7.3 for the
      rename) now use atomic, status-conditioned writes, matching cancel/activate
      (design D15) — closes a race where a concurrent status change could let a write
      land on a credential that no longer qualified.

## 2. Filters

- [x] 2.1 Filter control (Environment, Status, Organization) on the toolbar
      (Popover + active-count badge + Clear all). Environment = deploy-scoped
      (`getAllowedEnvironmentValues`); Status = fixed enum (Active / Ready for
      Validation / Grace Period / Expired / Revoked / Cancelled); Organization =
      `/api/jurisdictions` matched by `jurisdictionId` (full list — intentionally NOT
      filtered to senders-only; see §11.6 for where that filter does apply).
- [x] 2.2 Filters compose with the search text input. **Client-side** (see §3 —
      decided against server-side pagination for current scale).
- [x] 2.3 Keys grid defaults to sorting by created-time descending, so a just-created
      key is immediately visible on page 1 rather than wherever it lands in natural
      order. Sorts on the raw ISO timestamp, not the locale-formatted display string
      (which has no time component and would sort lexically, not chronologically).
      Still just the default — clicking any column header re-sorts as normal.
- [x] 2.4 Search filter no longer crashes on a malformed/legacy row missing
      `jurisdictionId` — falls back to a displayable `'—'` instead of `undefined`.

## 3. Pagination / Server-Side Query — DECIDED AGAINST (design D8)

- [~] 3.1 Extend `GET /api/apikeys` to accept `environment`/`status`/`organization`/`page`/`pageSize`.
      **Evaluated and decided against for current scale** — organization/sender count
      is bounded and the list is already ownership-scoped (§8). Building generic
      pagination now would be effort against a scale not yet reached.
- [~] 3.2 Switch the DataGrid to server-side pagination. Same rationale as 3.1.
- [x] 3.3 Fixed the two things that actually mattered instead:
      `fetchApiKeyCredentials` now follows `LastEvaluatedKey` in a loop (previously
      silently truncated past DynamoDB's 1MB page limit — relevant because
      soft-cancelled/revoked/expired rows are retained for audit and accumulate);
      and jurisdiction lookups are resolved once per distinct jurisdiction rather than
      once per credential (closes an N+1 read pattern).

## 4. DNS Verification Hardening

- [x] 4.1 Bypass gated behind `NODE_ENV !== 'production'` **AND** `ALLOW_DNS_VERIFY_BYPASS === 'true'`
      (`DNS_VERIFY_BYPASS_ENABLED`), default disabled; emits a `logger.warn` when active.
- [x] 4.2 Removed the "REVERT BEFORE COMMITTING" comment; flag documented in `src/.env.template`.
- [x] 4.3 DNS TXT challenge moved to the **domain apex** (`<domain>`), not a
      `_izg-verify.` subdomain, matching DigiCert's validation convention. Both the
      lookup (`verify-domain`) and the challenge instructions shown to the user
      (`POST /api/apikeys` 202 response) updated.
- [x] 4.4 `verify-domain`'s already-authorized fast path now also checks
      `authExpiresAt > now` (design D14) — a stale authorization can no longer
      activate a credential without re-proving DNS ownership.

## 5. Use Types (added scope — IGDD-3106 / 3140)

- [x] 5.1 New `src/lib/type/AllowedUseType.ts` — `PATIENT | PROVIDER | PUBLIC_HEALTH`,
      `isValidUseType` guard, `USE_TYPE_LABELS`.
- [x] 5.2 `ApiKeyCredential.useTypes?: AllowedUseType[]`; persisted as a deduped
      DynamoDB **String Set** (`SS`, via a native JS `Set` — SDK v3 has no
      `docClient.createSet`), read back defensively via `filter(isValidUseType)`.
      *(Canonical per IGDD-3140 — see design D3. The deny-all/empty-set concern applies to
      `Jurisdiction.allowedUseTypes`, not to this attribute, which §5.3 requires to be
      non-empty.)*
- [x] 5.3 `POST /api/apikeys` requires a non-empty, enum-valid `useTypes` (400 otherwise);
      renew and re-issue carry it forward.
- [x] 5.4 Create dialog uses the shared `SearchableMultiSelect` (chips) — matches the
      Access Group "Members" pattern.
- [x] 5.5 Per-jurisdiction constraint via the selected organization's own `useTypes` —
      **done client-side**: the Create-form picker narrows to the selected org's
      registered `useTypes`, falling back to the full enum when unseeded so creation
      isn't blocked. (Server-side enforcement that `credential.useTypes ⊆ sender.useTypes`
      is deliberately deferred — see §8.5 — and the Hub's own
      `credential.useTypes ∩ destination.allowedUseTypes` intersection check is a
      separate izgw-hub ticket, not this repo.)
- [x] 5.6 Create dialog's Organization dropdown filtered to **senders only** (rows
      with non-empty `useTypes`, including dual-role rows) — a submitter credential
      cannot be issued to a destination-only jurisdiction. Scoped to the Create dialog
      only; the dashboard's Organization *filter* intentionally still lists everything.
- [ ] 5.7 `useTypes` as a keys-grid column — not built (explicitly deferred, not a
      priority currently).

## 6. Credential lifecycle: issuance, expiry, Expired status, re-issue

- [x] 6.1 Expiry computed at **issuance**: `ready_for_validation` rows carry no expiry;
      `verify-domain` stamps `issuedAt` + `expiresAt = now + 1yr` at activation;
      token `iat` = `issuedAt ?? createdOn` (existing-authorized / renew issue at create).
- [x] 6.2 `Expired` status **derived in the UI** from `exp` / `graceExpiresAt`
      (effective grace end = `min(graceExpiresAt, exp)`); grace-ended-before-expiry
      derives `Revoked`. Honors a stored `revoked` once the Hub persists it (`expired`
      is derived-only, never stored).
- [x] 6.3 Renewal expiry formula confirmed: within 30 days of old expiry → `oldExpiry + 1yr`; else `now + 1yr`.
- [x] 6.4 Renewal domain (`upn`), jurisdiction, and `environments` are prepopulated +
      read-only in the dialog and **server-authoritative** in `/renew` (inherited from
      the old credential; client values ignored).
- [x] 6.5 **Expired-key re-issue** (design D13): a Renew-styled dialog (prefilled,
      read-only) issues a brand-new credential — fresh `jti`, `now + 1yr` expiry (no
      continuity with the old key), no grace overlap — leaving the old expired key
      untouched. Routes through the DNS challenge first if the domain's own
      authorization has also lapsed; otherwise reuses the `dnsChoice: 'existing'`
      create path for immediate issuance. Revoked/cancelled credentials remain fully
      terminal — no re-issue action offered.
- [x] 6.6 **Duplicate-scope guardrail** (design D12): creating a key whose
      (environment + use types) exactly matches an existing active credential for the
      same org/domain shows a warning and steers to Renew, but does not block
      ("Create Anyway" on a second click). Client-side only, by design.

## 7. Credential/JWT model reconciliation (IGDD-3140)

- [x] 7.1 Credential re-keyed from `{env}#{jti}` to bare **`{jti}`** across all create
      paths (new-domain, existing-domain) and renewal/re-issue — the Hub reads a
      credential directly by `jti`, with no environment prefix. Existing rows are read
      via the sort key exactly as stored (no reconstruction), so pre-existing
      `{env}#{jti}` rows still resolve; a Hub-side migration is a separate,
      not-yet-scoped concern if the Hub starts reading exclusively by bare `jti`.
- [x] 7.2 `env` (string) replaced by **`environments`** (DynamoDB String Set, `SS` —
      matching `useTypes`, see design D3); admin-only (IZG Operations) multi-environment
      credential creation, **server-enforced** (a non-admin request for >1 environment is
      403'd even with create permission). `POST /api/apikeys` already rejected empty
      `environments`; `/renew` now 409s rather than passing an existing credential's
      `environments` through empty (an empty `SS` is not a legal DynamoDB value). Reads
      fall back to the legacy singular `env` attribute for un-migrated rows.
- [x] 7.3 Renamed `supersedApiKeyCredential` → `supersedeApiKeyCredential` (was a
      misspelling) across the interface, implementation, factory delegate, both test
      files, and the renew route's call site.
- [x] 7.4 JWT payload's numeric `env` claim removed entirely (environment
      authorization is now a server-side property the Hub reads by `jti`).
- [ ] 7.5 JWT `roles` claim removal — **not done**, pending confirmation that nothing
      in izgw-hub/izgw-core reads the token's `roles` claim (the Hub's own OpenSpec
      reconciliation currently still maps it into the principal).

## 8. Access control (RBAC) — server-side authorization now DONE

- [x] 8.1 Fixed the page-access-matrix key `apikeymanagement` → `apikeys` so it resolves for the `/apikeys` route.
- [x] 8.2 Added `canCancelApiKey`; component calls `useRoleAccess()` and gates Create + Revoke/Renew/Cancel (deny-by-default).
- [x] 8.3 **Server-side authorization on all `/api/apikeys*` routes** — new
      `src/lib/security/apiKeyAuthz.ts` (`hasApiKeyPermission` role gate +
      `ownsJurisdiction`/`requireApiKeyAccess` tenancy gate), applied to list, create,
      revoke, cancel, renew, token reveal (gated on `canCreateApiKey` — a mint
      operation), verify-domain, and domain lookup. Previously these routes only
      checked that a session existed.
- [x] 8.4 **Jurisdiction-ownership scoping (IDOR fix)** — `GET /api/apikeys` filters
      results to jurisdictions the caller owns (closes an enumeration gap); mutation
      routes check ownership on the target credential's jurisdiction *before* any
      status check, so a non-owner learns nothing about the credential's state.
      Explicit access mapping for the 3 unmapped roles (IZG Program, CDC Program, CDC
      CISO) remains **not done** — deny-by-default already applies to them, which is
      secure; adding positive access is a separate product decision.
- [x] 8.5 Nav visibility for `/apikeys` switched from the coarse `isAdmin` flag to the
      actual `canListApiKeys` permission — Jurisdiction Operations has full
      server-side access but previously couldn't find the page in the nav.
- [~] 8.6 Server-side enforcement that `credential.useTypes ⊆ sender.useTypes` —
      **deliberately deferred** so the real break-point (unseeded sender data) stays
      visible rather than being silently masked by a tolerant check.

## 9. Global domain exclusivity (design D10, D11)

- [x] 9.1 A domain belongs to exactly one jurisdiction across **all** environments,
      enforced via a race-safe conditional claim on a separate `ApiKeyDomainOwner`
      lock entity (keyed by normalized domain), attempted in `verify-domain`
      immediately after a DNS TXT match succeeds and before any authorization/activation.
- [x] 9.2 Early, non-authoritative check at `POST /api/apikeys` create time
      (`dnsChoice: 'other'`): a read-only lookup refuses the request (409) up front if
      the domain is already owned by a different jurisdiction, so a caller isn't sent
      through the full DNS-challenge flow only to lose the race later. Does not
      replace the authoritative verify-time claim (race-safety still requires the
      atomic conditional write there).
- [~] 9.3 Backfilling `ApiKeyDomainOwner` locks for domains authorized *before* this
      feature shipped — **not done**, same migration-adjacent caveat as the `{jti}`
      re-key (see design Risks).

## 10. UI polish

- [x] 10.1 Added a **UPN** column (the JWT `upn`/domain) to the Keys table (an org can
      have multiple credentials); searchable.
- [x] 10.2 Removed the local Organizations mock (`mockData.ts`,
      `NEXT_PUBLIC_MOCK_ORGANIZATIONS`) once real DynamoDB data was seeded —
      `useOrganizations()` now always calls `/api/jurisdictions`.

## 11. Code-review hardening (this round)

- [x] 11.1 Type-only imports (`import type`) for interface/type-only symbols
      (`ApiKeyCredential`, `AllowedUseType`, `Jurisdiction`, `ApiKeyDomain`) across
      `DbClientFactory.ts`, `ConfigConsoleMutateRepository.ts`,
      `ConfigConsoleFetchRepository.ts`, `dynamo.ts` — avoids unnecessary runtime
      imports; `isValidUseType` kept as a value import.
- [x] 11.2 Create dialog's Description field relabeled "Description (optional)" — it
      was marked required (asterisk) but never enforced client- or server-side.
- [x] 11.3 Token "view exactly once" made atomic (design D16):
      `markApiKeyCredentialViewed` now conditions on `attribute_not_exists(viewedAt)`;
      `token.ts` catches the resulting race and returns the same 410 as the
      synchronous already-viewed case.

## 12. Verification

- [x] 12.1 `tsc --noEmit` + eslint clean on changed files (pre-existing unrelated
      unused-`eslint-disable` warnings remain in `dynamo.ts` and elsewhere, unchanged
      by this work).
- [x] 12.2 Node-env tests pass — `pages/api/apikeys/lifecycle.test.ts` +
      `lib/db/dynamo.apikeyLifecycle.test.ts`, **61 tests** (up from the original 23;
      covers authz role/tenancy gating, multi-env, global domain exclusivity, the
      re-issue and duplicate-scope flows, and this round's atomicity/status-guard
      fixes). Full-project jest run shows no collateral damage in any node-env suite;
      the jsdom/component suites remain blocked by the pre-existing, already-documented
      `ERR_REQUIRE_ESM` issue (see CLAUDE.md), unrelated to this work.
- [ ] 12.3 Manual smoke-test in a real browser (create → validate → view token →
      renew → revoke; create → cancel while pending; expired → re-issue; duplicate-scope
      warning; global domain exclusivity rejection) — not yet performed; no browser
      automation available in this environment and the app authenticates via real Okta.
