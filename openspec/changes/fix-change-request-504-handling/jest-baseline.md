# Jest baseline

Captured on 2026-10-19 with `npm run test`, before any edit for this change.

```
Test Suites: 34 failed, 61 passed, 95 total
Tests:       48 failed, 935 passed, 983 total
```

Full output: `logs/jest-baseline.txt` (the `logs` directory is in `.gitignore`).

CI does not catch these failures. The Jest step is commented out at `.github/workflows/deploy.yml:70-71`.

## Failing suites by cause

### Playwright specs collected by Jest (23 suites)

`jest.config.js` sets no `testPathIgnorePatterns`, so Jest collects the Playwright suites under `e2e/tests/`. Playwright supplies its own `test` runner, so every one of these fails to run.

```
e2e/tests/apiKeyCreateExistingDomain.spec.ts   e2e/tests/jiraTicket.spec.ts
e2e/tests/apiKeyCreateNewDomain.spec.ts        e2e/tests/loginLogout.spec.ts
e2e/tests/apiKeyDashboard.spec.ts              e2e/tests/manageConnection.spec.ts
e2e/tests/apiKeyRenew.spec.ts                  e2e/tests/navbar.spec.ts
e2e/tests/apiKeyRevoke.spec.ts                 e2e/tests/onboarding.spec.ts
e2e/tests/apiKeyViewToken.spec.ts              e2e/tests/overwriteDraft.spec.ts
e2e/tests/apikeys.spec.ts                      e2e/tests/password-visibility.spec.ts
e2e/tests/cancelRescheduleCR.spec.ts           e2e/tests/saveDraft.spec.ts
e2e/tests/closeEditConnection.spec.ts          e2e/tests/testcon.spec.ts
e2e/tests/connectionHistory.spec.ts            e2e/tests/verifyEdits.spec.ts
e2e/tests/deployChangeRequest.spec.ts
e2e/tests/editConnection.spec.ts
e2e/tests/home.spec.ts
```

### Removed Jest alias `toBeCalled` (2 suites)

Jest 30 removed `expect(...).toBeCalled`. The error reads `TypeError: expect(...).toBeCalled is not a function`.

```
src/components/EditConnection/alertDialog.test.tsx:36
src/components/EditConnection/serviceAgreement.test.tsx:18
```

### Query matched more than one element (3 suites)

```
src/components/ConnectionTable/popOverActionButtons.test.tsx    "Found multiple elements with the text: Reset Circuit Breaker"
src/components/ConnectionTable/resetCircuitBreakerDialog.test.tsx  "Found multiple elements" on the confirmation text
src/components/TestConnection/testConnection.test.tsx            "Found multiple elements with the text: PASS"
```

### Render or environment faults (2 suites)

```
src/components/Console/console.test.tsx              "NextRouter was not mounted"
src/components/Console/components/MetricCard.test.tsx  "Unable to find an element with the text: 100"
```

### Suites that fail to run (4 suites)

```
src/lib/security/crypto/cryptoSupport.test.js   "Your test suite must contain at least one test"
src/lib/security/crypto/cryptoSupport.test.ts   suite failed to run
src/lib/security/crypto/DbCrypto.test.ts        suite failed to run
src/lib/db/dynamo.integration.test.ts           suite failed to run (needs a live DynamoDB)
```

## Relevance to this change

The three files this change edits are in good shape for verification:

- `src/components/EditConnection/actionButtons.test.tsx` passes, 5 of 5 tests. Task 2.4 extends it.
- `src/contexts/app.tsx` has no test. Task 1.4 creates one.
- `src/components/EditConnection/index.tsx` has no test. Task 3.4 creates one.

Two failing suites sit in the same directory as the work: `alertDialog.test.tsx` and `serviceAgreement.test.tsx`. Neither imports the files this change edits. Both fail on the removed `toBeCalled` alias only.

None of the 34 failing suites covers the submit path, the application context, or the action buttons. So no pre-existing failure masks a regression from this change.

## Final comparison after implementation

```
Test Suites: 34 failed, 63 passed, 97 total
Tests:       48 failed, 952 passed, 1000 total
```

Failing suites: 34, unchanged. Failing tests: 48, unchanged. No failure is new.

Passing tests rose from 935 to 952. The 17 added tests are:

- `src/contexts/app.test.tsx` — 3 new
- `src/components/EditConnection/actionButtons.test.tsx` — 3 added to the existing 5
- `src/components/EditConnection/index.test.tsx` — 11 new

Lint reports 0 errors and 66 warnings, the same count as the baseline. `tsc --noEmit` is clean.

## After the persistent-message revision (tasks 4.11 to 4.13)

```
Test Suites: 34 failed, 63 passed, 97 total
Tests:       48 failed, 956 passed, 1004 total
```

Still 34 failing suites and 48 failing tests, none of them new. Passing tests rose to 956.
The added total is now 21: 3 in the context suite, 3 in the action buttons suite, and 15 in
the EditConnection suite.

## After the confirmation poll (group 6)

```
Test Suites: 34 failed, 63 passed, 97 total
Tests:       48 failed, 960 passed, 1008 total
```

Still 34 failing suites and 48 failing tests, none of them new. Passing tests reached 960.
The EditConnection suite now holds 19 tests, one per spec scenario plus the refusal cases.

## After the clean-failure reporting (group 7)

```
Test Suites: 34 failed, 63 passed, 97 total
Tests:       48 failed, 966 passed, 1014 total
```

Still 34 failing suites and 48 failing tests, none of them new. Passing tests reached 966.
The EditConnection suite holds 22 tests. The change request route suite holds 4.

## After the verification follow-ups (group 8)

```
Test Suites: 34 failed, 63 passed, 97 total
Tests:       48 failed, 967 passed, 1015 total
```

Still 34 failing suites and 48 failing tests, none of them new. Passing tests reached 967.
The EditConnection suite holds 23 tests.

## After the independent verification follow-ups (group 9)

```
Test Suites: 34 failed, 63 passed, 97 total
Tests:       48 failed, 968 passed, 1016 total
```

Still 34 failing suites and 48 failing tests, none of them new. Passing tests reached 968.
The EditConnection suite holds 24 tests. The double-activation test now fails when the
synchronous ref guard is removed, which the earlier version did not.

## After the targeted audit follow-ups (group 10)

```
Test Suites: 34 failed, 63 passed, 97 total
Tests:       48 failed, 968 passed, 1016 total
```

Still 34 failing suites and 48 failing tests, none of them new. The EditConnection suite
holds 24 tests. One test was replaced rather than added: the earlier version served a
500 with ticketCreated true and then produced a record carrying a new jiraId, which the
route cannot do.

## After proving only what the server can prove (group 11)

```
Test Suites: 34 failed, 65 passed, 99 total
Tests:       48 failed, 982 passed, 1030 total
```

Still 34 failing suites and 48 failing tests, none of them new. Two suites were added:
`src/lib/createchangerequestticket.test.ts` for the failure classification, and
`src/components/SnackBar/persistentAlert.test.tsx` for persistence on the screens
besides EditConnection. Lint warnings are back to the baseline 66.

## After collapsing to two failure messages (group 12)

```
Test Suites: 34 failed, 65 passed, 99 total
Tests:       48 failed, 982 passed, 1030 total
```

Still 34 failing suites and 48 failing tests, none of them new. Counts are unchanged
from group 11 because this round reworded tests rather than adding them.

Note on verification: earlier runs used `npm run code-quality-check | grep ... && echo
"tsc: clean"`, which chained on grep rather than on tsc, so it could print "clean" when
tsc had failed. From group 12 on, `npx tsc --noEmit` is run on its own and its exit code
is reported.
