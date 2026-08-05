> Status legend: `[x]` implemented on this branch · `[ ]` not yet implemented.
> The scope grew beyond the original four items (Filters, Revoke/Cancel, DNS
> hardening, pagination) to include Use Types, credential-lifecycle expiry/issuance,
> an Expired status, RBAC UI gating, and Hub-contract alignment. See design.md for
> the decisions (note D1 was **revised**: cancel is a soft-cancel, not a hard delete).

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

## 2. Filters

- [x] 2.1 Filter control (Environment, Status, Organization) on the toolbar
      (Popover + active-count badge + Clear all). Environment = deploy-scoped
      (`getAllowedEnvironmentValues`); Status = fixed enum (Active / Ready for
      Validation / Grace Period / Expired / Revoked / Cancelled); Organization =
      `/api/jurisdictions` matched by `jurisdictionId`.
- [x] 2.2 Filters compose with the search text input. **Interim: client-side** (see §3).

## 3. Pagination / Server-Side Query — NOT YET IMPLEMENTED

- [ ] 3.1 Extend `GET /api/apikeys` to accept `environment`/`status`/`organization`/`page`/`pageSize`
      (today it returns the full table; filtering + paging are client-side).
- [ ] 3.2 Switch the DataGrid to server-side pagination.

## 4. DNS Verification Hardening

- [x] 4.1 Bypass gated behind `NODE_ENV !== 'production'` **AND** `ALLOW_DNS_VERIFY_BYPASS === 'true'`
      (`DNS_VERIFY_BYPASS_ENABLED`), default disabled; emits a `logger.warn` when active.
- [x] 4.2 Removed the "REVERT BEFORE COMMITTING" comment; flag documented in `src/.env.template`.

## 5. Use Types (added scope — IGDD-3106 / 3140)

- [x] 5.1 New `src/lib/type/AllowedUseType.ts` — `PATIENT | PROVIDER | PUBLIC_HEALTH`,
      `isValidUseType` guard, `USE_TYPE_LABELS`.
- [ ] 5.2 `ApiKeyCredential.useTypes?: AllowedUseType[]`; persisted as a deduped
      DynamoDB **String Set** (`SS`) via `docClient.createSet`, read back defensively via
      `filter(isValidUseType)`. *(Canonical per IGDD-3140; the shipped code currently writes
      a List and must be migrated to `SS`.)*
- [x] 5.3 `POST /api/apikeys` requires a non-empty, enum-valid `useTypes` (400 otherwise); renew carries it forward.
- [x] 5.4 Create dialog uses the shared `SearchableMultiSelect` (chips) — matches the Access Group "Members" pattern.
- [ ] 5.5 Per-jurisdiction constraint via `Jurisdiction.allowedUseTypes` (NOT done — validated against the fixed enum only; Hub does the intersection enforcement separately).

## 6. Credential lifecycle: issuance, expiry, Expired status

- [x] 6.1 Expiry computed at **issuance**: `ready_for_validation` rows carry no expiry;
      `verify-domain` stamps `issuedAt` + `expiresAt = now + 1yr` at activation;
      token `iat` = `issuedAt ?? createdOn` (existing-authorized / renew issue at create).
- [x] 6.2 `Expired` status **derived in the UI** from `exp` / `graceExpiresAt`
      (effective grace end = `min(graceExpiresAt, exp)`); grace-ended-before-expiry
      derives `Revoked`. Honors a stored `revoked` once the Hub persists it (`expired`
      is derived-only, never stored).
- [x] 6.3 Renewal expiry formula confirmed: within 30 days of old expiry → `oldExpiry + 1yr`; else `now + 1yr`.
- [x] 6.4 Renewal domain (`upn`) is prepopulated + read-only in the dialog and
      **server-authoritative** in `/renew` (inherited from the old credential; client value ignored).

## 7. Hub contract alignment (shared DynamoDB table)

- [x] 7.1 Grace status value `grace` → **`grace_period`** — matches Hub `isUsableStatus`
      (auth) and `GracePeriodRevocationScheduler` (grace-revocation sweep).
- [x] 7.2 Successor attribute `supersededByJti` → **`supersededBy`** — matches the Hub `ApiKeyCredential` model field.

## 8. Access control (RBAC)

- [x] 8.1 Fixed the page-access-matrix key `apikeymanagement` → `apikeys` so it resolves for the `/apikeys` route.
- [x] 8.2 Added `canCancelApiKey`; component calls `useRoleAccess()` and gates Create + Revoke/Renew/Cancel (deny-by-default).
- [ ] 8.3 Server-side authorization on all `/api/apikeys*` routes (currently auth-only).
- [ ] 8.4 Jurisdiction-ownership scoping (IDOR) on list + mutations; access for the 3 unmapped roles.

## 9. UI polish

- [x] 9.1 Added a **DNS** column (the JWT `upn`) to the Keys table (an org can have multiple credentials); searchable.

## 10. Verification

- [x] 10.1 `tsc --noEmit` + eslint clean on changed files (pre-existing `dynamo.ts` eslint-disable warnings are unrelated).
- [x] 10.2 Node-env tests pass — `pages/api/apikeys/lifecycle.test.ts` + `lib/db/dynamo.apikeyLifecycle.test.ts` (23 tests).
      Component/jsdom suite remains blocked by the known `ERR_REQUIRE_ESM` issue (per CLAUDE.md).
- [ ] 10.3 Manual smoke-test: create → validate → view token → renew → revoke; and create → cancel while pending.
