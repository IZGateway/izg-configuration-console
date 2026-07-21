## 1. Access control

- [x] 1.1 Add `canResetCircuitBreaker: boolean` to `ManageConnectionsPageAccessControl` in `src/lib/type/PageAccessControls.ts`.
- [x] 1.2 Add `canResetCircuitBreaker: false` to `defaultManageConnectionsPageAccessControl` in `src/lib/security/accessdefinitions/defaultaccesslevels.ts`.
- [x] 1.3 Set `canResetCircuitBreaker: true` in `src/lib/security/accessdefinitions/_IZGOperationsAccess.ts` only (leave `_JurisdictionOperationsAccess.ts`, `_JurisdictionSupportAccess.ts`, and `_IZGSupportAccess.ts` at the default `false` — revised from an earlier draft that also granted `_JurisdictionOperationsAccess.ts`).
- [x] 1.4 Enforce the same restriction server-side in `src/pages/api/status/reset/[...slug].ts`: read the session role from `asyncRequestContext.getStore()` and reject with `401` when `session.user.role !== 'IZG Operations'`, layered on top of (not replacing) `checkAccessToDestIdSlug`, so a direct API call can't bypass the UI-only gate.

## 2. API route — proxy reset to the Hub

- [x] 2.1 Create `src/pages/api/status/reset/[...slug].ts`, modeled on `src/pages/api/statushistory/[...slug].ts`: parse `slug[0]` as `destTypeId` and `slug[1]` as `destId`, accept only `POST`.
- [x] 2.2 Resolve the Hub reset URL via `new IZGHubStatusHistoryEndpoint(process.env.IZG_STATUS_ENDPOINT_URL).getIZGHubURL(destTypeId)`, truncated to the `/rest/` prefix and appended with `reset/${destId}` (same derivation technique as `src/lib/utils/izghubrefresh.ts:27-28`).
- [x] 2.3 Build the mTLS `https.Agent` inline from `IZG_ENDPOINT_CRT_PATH`/`IZG_ENDPOINT_KEY_PATH`/`IZG_ENDPOINT_PASSCODE`, matching `statushistory/[...slug].ts` and `izghubrefresh.ts`.
- [x] 2.4 `axios.post` the resolved URL; on success, call `logger.info('Circuit breaker reset', { destId, destTypeId })` and return the Hub's response body/status to the caller unchanged (200 with updated status, or a 404 passthrough).
- [x] 2.5 On network/axios failure, return a real error status (502) with an error body — do not swallow the error into a fake 200 (this route's result must be trustworthy for the UI to decide whether to update the row).
- [x] 2.6 Export the handler as `withMiddleware('checkAccessToDestIdSlug')(handler)` so jurisdiction enforcement is inherited from the existing middleware.

## 3. Status visibility — Manage Connections table

- [x] 3.1 In `src/components/ConnectionTable/index.tsx`'s STATUS column `renderCell`, add `isCircuitBreakerTripped = params.row.status?.toLowerCase() === 'circuit breaker thrown'`.
- [x] 3.2 When `isCircuitBreakerTripped` is true, render a distinct "Circuit Breaker Tripped" label + warning icon in place of the generic "Not Connected" treatment, following the same `Box`/`Typography`/icon structure already used for the adjacent maintenance banners in that renderCell.

## 4. Reset action — action menu and confirmation dialog

- [x] 4.1 In `src/components/ConnectionTable/popOverActionButtons.tsx`, add the `isCircuitBreakerTripped` check (derived from `props.status`) and `openResetCircuitBreaker` dialog-open state, mirroring the existing `openMaintenance` pattern.
- [x] 4.2 Add a new `MenuItem` labeled "Reset Circuit Breaker", positioned after the Maintenance item, gated by `accessLevels.canResetCircuitBreaker && isCircuitBreakerTripped`; clicking it opens the new confirmation dialog (does not call `fetch` directly).
- [x] 4.3 Create `src/components/ConnectionTable/resetCircuitBreakerDialog.tsx`, structured like `maintenanceDialog.tsx` (props: `open`, `handleClose`, `destTypeId`, `destId`, `jurisdictionName`, `destType`, `row`, `updateRow`) with the minimal Yes/No body style of `resetDialog.tsx`. Title: "Reset Circuit Breaker". Body: "Are you sure you want to reset the circuit breaker for {jurisdictionName} — {destUri} ({destType})? This action will restore connectivity and log the reset." Buttons: "CONFIRM" (primary) / "CANCEL" (outlined, calls `handleClose`).
- [x] 4.4 On "CONFIRM", `POST /api/status/reset/${destTypeId}/${destId}`; on `response.ok`, merge the Hub's returned status fields into the row via `props.updateRow({...props.row, ...updatedStatusFields})`, close the dialog, and `setAlert({level: 'success', ...})` via `CombinedContext`; on failure, `setAlert({level: 'error', ...})` and leave the row/dialog state unchanged.

## 5. Tests

- [x] 5.1 Extend `src/components/ConnectionTable/popOverActionButtons.test.tsx` to cover: menu item shown only when tripped + capability present; hidden when not tripped; hidden for roles without `canResetCircuitBreaker`.
- [x] 5.2 Add `src/components/ConnectionTable/resetCircuitBreakerDialog.test.tsx`, modeled on `maintenanceDialog.test.tsx`: confirm triggers fetch + `updateRow`/success alert; cancel triggers no fetch; failed response triggers an error alert and no `updateRow` call.

## 6. Verification

- [x] 6.1 Run `npm run code-quality-check` (lint + `tsc --noEmit`) and resolve all findings. Done — 0 errors; remaining warnings are the pre-existing baseline documented in `.claude/CLAUDE.md`.
- [ ] 6.2 Run `npm run test` and confirm the new/updated suites pass. **Blocked**, not done: every jsdom-based suite in this repo fails with the pre-existing, unrelated jsdom/`jest-environment-jsdom` issue documented in `.claude/CLAUDE.md` (confirmed by running both the new test files and an untouched pre-existing test file — same failure in both). The new/updated suites (`popOverActionButtons.test.tsx`, `resetCircuitBreakerDialog.test.tsx`) are written and believed correct but have not actually executed successfully in this environment.
- [x] 6.3 Run `npm run build && npm start`; sign in as an `IZG Operations` user against an environment where a destination reports `status: "Circuit Breaker Thrown"`, and confirm: the STATUS column shows the tripped indicator; the "..." menu shows "Reset Circuit Breaker" only on that row and only for `IZG Operations`; confirming the dialog updates the row in place and shows a success alert; the `Circuit breaker reset` log line appears carrying `sessionUser` for the acting user. Also confirm the menu item is absent, and a direct `POST` to the route is rejected with `401`, for a `Jurisdiction Operations` user who owns that destination. Done — Hub PR #170 is merged and this end-to-end walkthrough against a real tripped destination was performed and confirmed by the user directly (2026-07-20); prior to that, the API route's request/response handling (200/404/401/502 paths, jurisdiction enforcement, `sessionUser` log attribution) had already been verified live against a throwaway mock Hub server.
- [x] 6.4 Run `/opsx:verify destination-circuit-breaker-reset` before archiving. This run — see verification report.
