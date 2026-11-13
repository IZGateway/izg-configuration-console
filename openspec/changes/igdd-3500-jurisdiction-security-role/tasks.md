## 1. Jurisdiction Security role

- [x] 1.1 `rolemapping.ts`: add `'Jurisdiction Security'` to `CcRole`, to `ROLE_PRECEDENCE` after `IZG Program`, and `'Jurisdiction Security': ['Jurisdiction Security']` to `GROUP_ROLE_MAPPING`
- [x] 1.2 Create `accessdefinitions/_JurisdictionSecurityAccess.ts` from the matrix v14 column: `globalTenancy: false`, every flag by name, no `as` assertion on any block
- [x] 1.3 Register it in `accessdefinitions/index.ts` and the `accesslevel.ts` map

## 2. Narrow Jurisdiction Operations

- [x] 2.1 `_JurisdictionOperationsAccess.ts`: remove the five `apikeys` flags
- [x] 2.2 `_JurisdictionOperationsAccess.ts`: remove `edit.canApproveChangeRequest`

## 3. Text that names the API key holder

- [x] 3.1 `Faqs.tsx`: "Users with Jurisdiction Security access can open API Key Management"
- [x] 3.2 Comments in `menuItems.tsx`, `apiKeyAuthz.ts` and `_SenderOperationsAccess.ts`

## 4. Tests

- [x] 4.1 Regenerate the role matrix snapshot; the diff is one new Jurisdiction Security column, and Jurisdiction Operations' five `apikeys` cells and `edit.canApproveChangeRequest` going to `—`
- [x] 4.2 `policy.test.ts`: API key reach and escalation tests use Jurisdiction Security; add blocks for the new role (exact differences from Jurisdiction Operations) and the narrowing; API key and approve holders
- [x] 4.3 `rolemapping.test.ts`: group-name variants resolve to `Jurisdiction Security`; precedence with Jurisdiction Operations
- [x] 4.4 `menuItems.test.tsx`: Jurisdiction Security sees API Key Management and no admin item; Jurisdiction Operations no longer sees API Key Management
- [x] 4.5 API key route tests (`apikeys/authorization`, `apikeys/lifecycle`, `apikeysaudit/authorization`) use Jurisdiction Security as the jurisdiction role holding API keys; add Jurisdiction Operations 403 cases for list and create
- [x] 4.6 Security, API, navigation and page suites pass; the remaining Jest failures are the same suites that fail on `develop`
- [x] 4.7 `npm run build` passes

## 5. Release

- [ ] 5.1 Add the Jurisdiction Operations users who use API key management to the `Jurisdiction Security` Okta group before release
- [ ] 5.2 After deploying to dev, sign in with the Jurisdiction Security test account and confirm `/api/auth/session` lists the role
- [ ] 5.3 IGDD-3621: mark Jurisdiction Security live in `e2e/rbac/roles.ts`, remove the Jurisdiction Operations API key gaps from `e2e/rbac/matrix.ts`, and move `apiKeyRbacScoping.spec.ts`'s Jurisdiction A account to Jurisdiction Security
