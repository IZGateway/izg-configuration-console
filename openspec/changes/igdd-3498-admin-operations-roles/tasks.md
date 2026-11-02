## 1. Preparation

- [x] 1.1 Confirm branch `IGDD-3498` is based on current `origin/develop` (contains #763, `d09ec17`); rebase if develop has moved
- [x] 1.2 Run the security suites as a baseline (`policy`, `roleMatrixSnapshot`, `rolemapping`, `accessregistry`, `api-middleware-helper`, `adminPageGates`) plus the jsdom component suites (`npm run test`), and note any pre-existing failures, including the known jsdom `ERR_REQUIRE_ESM` issue

## 2. Commit A — IZG Security role

- [x] 2.1 `rolemapping.ts`: add `'IZG Security'` to `CcRole`, first in `ROLE_PRECEDENCE`, and `'IZG Security': ['IZG Security']` in `GROUP_ROLE_MAPPING` (official name, no `[CONFIRM]` marker); update the precedence comment if it describes the list
- [x] 2.2 Create `accessdefinitions/_IZGSecurityAccess.ts`: `globalTenancy: true`; for each of the eleven page blocks spread the `default…PageAccessControl` and set every flag in its type to `true` by name; no `as` assertion on any block (as `_IZGProgramAccess.ts`); header comment citing matrix v13 and IGDD-3498
- [x] 2.3 Register the file in `accessdefinitions/index.ts` and add `'IZG Security'` to the `accesslevel.ts` map
- [x] 2.4 Check every flag in `PageAccessControls.ts` is set in `_IZGSecurityAccess.ts` (no flag left at its default)

## 3. Commit A — IZG Support grant

- [x] 3.1 `_IZGSupportAccess.ts`: set `adminoperations.canViewAdminOperations`, `canResetHubCircuitBreakers`, `canRefreshHubDatabase` to `true`, keeping the defaults spread so `canManagePasswordEncryption` stays `false`; `accesscontrol` unchanged
- [x] 3.2 Rewrite the PROVISIONAL comment above Support's `accesscontrol`/`adminoperations` blocks: Admin Operations follows matrix v13 (IGDD-3498); Access Control is not held per v13

## 4. Commit A — remove `checkAdmin`

- [x] 4.1 Confirm no route references `checkAdmin` (`grep -rn checkAdmin src`)
- [x] 4.2 Delete `checkAdmin` and its entry in the `withMiddleware` name map in `src/lib/api/api-middleware-helper.ts`
- [x] 4.3 Delete the `checkAdmin` denial test in `src/lib/api/api-middleware-helper.test.ts` (the "logs a structured AccessDenied event when checkAdmin rejects…" case)
- [x] 4.4 Reword the comments that name `checkAdmin`: `src/next-auth.d.ts` (`isAdmin`), `src/pages/api/deephealthcheck/index.ts`, and the "IGDD-3547: 'checkAdmin' dropped" notes in `status/reset/index.ts` and `status/refresh/index.ts` if they refer to the middleware as still existing

## 5. Commit A — stale comments

- [x] 5.1 `_IZGOperationsAccess.ts`: in the `accesscontrol`, `adminoperations`, `console` and `api-doc` comments, remove "IZG Security does not exist in this codebase yet" and "IZG Support grant deferred" wording; state that IZG Security now exists and that IZG Operations' narrowing is commit B of the same change (values unchanged in this commit)
- [x] 5.2 `_IZGProgramAccess.ts`: replace the reference to IZG Support's deferred Admin Operations grant
- [x] 5.3 `e2e/tests/circuitBreakerReset.spec.ts`: update the header comments that say IZG Operations is the only holder of `canResetHubCircuitBreakers`

## 6. Commit A — tests

- [x] 6.1 `policy.test.ts`: remove IZG Support from `NON_OPERATIONS_ROLES`; add an IZG Support block asserting it holds the three Admin Operations flags and not `canManagePasswordEncryption` or any `accesscontrol` flag
- [x] 6.2 `policy.test.ts`: add an IZG Security block asserting `globalTenancy` and every flag on every page block is granted
- [x] 6.3 `rolemapping.test.ts`: `IZG Security`, `izg-security`, `IZG_SECURITY` resolve to `['IZG Security']`; a user in IZG Security plus another group holds both
- [x] 6.4 `adminPageGates.test.ts`: change the Admin Operations "does not call getHubEnvironments for a denied user" case from IZG Support to Jurisdiction Support; `menuItems.test.tsx`: IZG Support now sees Admin Operations and Console (not Access Control), IZG Security sees every admin item
- [x] 6.5 Regenerate the role matrix snapshot (`npx jest roleMatrixSnapshot -u`); confirm the diff is exactly one new IZG Security column (all `YES`) and three IZG Support `adminoperations` cells `—` → `YES`
- [x] 6.6 Run the security suites from 1.2 and `npm run code-quality-check`; all pass
- [x] 6.7 Commit A: `feat(security): add IZG Security role and grant IZG Support hub-wide admin operations (IGDD-3498)`, including this OpenSpec change directory; body lists the snapshot cell changes and the `checkAdmin` removal

## 7. Commit B — narrow IZG Operations

- [x] 7.1 `_IZGOperationsAccess.ts`: set `accesscontrol.canManageAccessGroups`, `adminoperations.canManagePasswordEncryption` and `edit.canApproveChangeRequest` to `false`
- [x] 7.2 Replace the PROVISIONAL comments on the `accesscontrol`, `adminoperations` and `edit` blocks with the matrix v13 rows they implement; (the `apikeys`, `api-doc` and `console` comments were already finalized in commit A, naming IGDD-3549 and IGDD-3550); note on `edit` that `canApproveChangeRequest` has no reader until IGDD-3545

## 8. Commit B — gate `/passwordencryption` on `canManagePasswordEncryption`

- [x] 8.1 `pageAccessGate.ts`: add optional third parameter `options?: { entry?: keyof PageControls[P] }`; decide on `{ page, capability: options?.entry ?? PAGE_ENTRY[page] }` through `decideCapability`; use the same capability in the `AccessDenied` event's `permission`
- [x] 8.2 Reword the `withPageAccess` docblock: the override exists only for pages with no navigation link, because the nav predicate reads `PAGE_ENTRY`
- [x] 8.3 `pages/passwordencryption/index.tsx`: pass `{ entry: 'canManagePasswordEncryption' }`; update the comment above `getServerSideProps`
- [x] 8.4 `accesslevel.ts`: update the comment on the `adminoperations` key (the page shares the block, with a stricter entry capability)

## 9. Commit B — tests

- [x] 9.1 `policy.test.ts`: replace "IZG Operations holds $page.$capability" with an IZG Security table over all `ADMIN_CAPABILITIES`, and an IZG Operations table asserting `canManageAccessGroups` and `canManagePasswordEncryption` are denied and the other eight are granted; assert IZG Operations lacks `edit.canApproveChangeRequest`
- [x] 9.2 `api-middleware-helper.test.ts`: change the `rotatekey` "calls next() for an authorized caller" case from IZG Operations to IZG Security; add a case that IZG Operations is now refused with `403`
- [x] 9.3 `adminPageGates.test.ts`: add `/passwordencryption` cases — IZG Security allowed with `hasKeyName` in props; IZG Operations, IZG Support and IZG Program each denied in place with one `AccessDenied` event whose permission is `adminoperations.canManagePasswordEncryption` and the handler not run; unauthenticated redirects to sign-in with no event
- [x] 9.4 Add the entry-override guard test (in `accessregistry.test.ts` beside the page-coverage tests): every page file passing `entry` to `withPageAccess` is linked from nowhere in `src` outside the page and tests, comments excluded; verified it fails when a link is added under `src/components`, `src/pages` and `src/lib`; `entryCapabilityOf(page, entry?)` builds the entry capability for both the gate and `canEnterPage`
- [x] 9.5 Check the existing registry tests still pass unchanged ("gates exactly the seven pages", "gating a page and handling the denial are checked separately")
- [x] 9.6 Regenerate the role matrix snapshot; confirm the diff is exactly three IZG Operations cells `YES` → `—` (`accesscontrol.canManageAccessGroups`, `adminoperations.canManagePasswordEncryption`, `edit.canApproveChangeRequest`)
- [x] 9.7 Run the security suites, `npm run code-quality-check` and `npm run test` (record jsdom suites that fail for the pre-existing reason); all others pass
- [x] 9.8 Commit B: `feat(security): narrow IZG Operations and restrict Password Encryption page to IZG Security (IGDD-3498)`; body lists the snapshot cell changes

## 10. Pull request and verification

- [x] 10.1 Open one PR against `develop` with both commits; description has a section per commit (snapshot diff, user-visible effect), the IGDD-3552 limitation for IZG Security (multi-environment API keys, full deep health check), and the list of suites run. The IZG Security group membership work is rollout, coordinated outside the PR, and does not block merging
- [ ] 10.2 Identify current IZG Operations users of the removed features from `logApiRequest` logs (`/api/accessgroups` POST/PUT/DELETE, `/api/encrypt`, `/api/rotatekey`, `/api/encryptionStatus`) and hand the list to the Product Owner
- [ ] 10.3 After deploy to dev, verify manually with the dev test users: IZG Support resets circuit breakers and refreshes the DB; IZG Security opens `/passwordencryption` and edits Access Groups; IZG Operations views all Access Control tabs, changes Deny List and ADS File Types, cannot edit Access Groups, has no Password Encryption card and gets Access Denied at `/passwordencryption`; IZG Program gets Access Denied at `/passwordencryption`
- [x] 10.4 Run `openspec validate igdd-3498-admin-operations-roles --strict` before requesting review
