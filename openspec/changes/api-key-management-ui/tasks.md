## 1. Revoke / Cancel Split

- [ ] 1.1 Add a distinct `cancel` code path (hard delete, no reason field, valid only
      from `Ready for Validation`/`Validation`) separate from `revoke` (sets `Revoked`
      status + `revokedAt`, valid from `Active`/`Grace Period`)
- [ ] 1.2 Update `RevokeDialog` / cancel confirmation dialog submit handlers in
      `ApiKeyManagement/index.tsx` to call the correct endpoint/action
- [ ] 1.3 Verify dashboard stat cards (Total/Active/Revoked) update correctly for both paths

## 2. Filters

- [ ] 2.1 Add a filter menu (Environment, Status, Organization) to `CustomToolbar`'s
      existing "FILTERS" button
- [ ] 2.2 Compose filter state with the existing search-by-key-ID-or-jurisdiction text filter

## 3. Pagination / Server-Side Query

- [ ] 3.1 Extend `GET /api/apikeys` to accept environment/status/organization/page/pageSize
      query params
- [ ] 3.2 Update the DataGrid to use server-side pagination instead of fetching the full table

## 4. DNS Verification Hardening

- [ ] 4.1 Gate the dev bypass in `verify-domain/index.ts` behind `NODE_ENV` +
      an explicit `ALLOW_DNS_VERIFY_BYPASS` flag, defaulting to disabled
- [ ] 4.2 Remove the inline "REVERT BEFORE COMMITTING" comment once resolved

## 5. Verification

- [ ] 5.1 Run `npm run code-quality-check` (lint + tsc --noEmit)
- [ ] 5.2 Run `npm run test`
- [ ] 5.3 Manually smoke-test: create → validate → view token → renew → revoke, and
      create → cancel while pending, confirming stats update correctly for each
