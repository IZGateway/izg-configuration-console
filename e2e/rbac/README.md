# RBAC matrix verification

Checks the deployed Configuration Console against the target RBAC matrix on
the Confluence page "Role Based Access Control for IZ Gateway" (IGDD space),
and writes a role × capability report. Added by IGDD-3621.

It runs in the weekday Playwright run against dev
(`.github/workflows/playwright-nightly.yml`), after the main suite, and
uploads the report to a private S3 bucket (see "Where the report goes"). It
is **report only**: a finding never fails the workflow.

## Run it locally

```sh
npm run test:rbac
```

It drives the installed Google Chrome (`channel: 'chrome'`), so no Playwright
browser download is needed. `BASE_URL` and the test accounts come from
`.env.test`; a `BASE_URL` set on the command line wins, for example
`BASE_URL=https://localhost npm run test:rbac` against a local console. The report is written
to `rbac-report/` (`rbac-report.md`, `.html`, `.json`), and Playwright's own
report to `playwright-report-rbac/`.

## Where the report goes

This repo is public, so anything on GitHub (Actions logs, job summaries,
artifacts) is readable by anyone, and the report lists access the CC does not
enforce yet. So:

- **GitHub** gets counts only: the job summary has a count per status, and in
  CI a column's failure message gives a count, not the cells.
- **The full report** (`rbac-report/`) goes to a private S3 bucket in the dev
  AWS account, under `rbac-reports/<date>-<run id>-<attempt>/`. The job
  summary names the folder. Read it in the AWS console with your SSO access.
- **`playwright-report-rbac/` is never uploaded:** it embeds every column's
  results.

The upload is the workflow's last step. It signs in with a GitHub OIDC role
that can only create new objects under `rbac-reports/` (each upload sends
`If-None-Match: *`, so no run can replace an earlier report), and that trusts the
`develop` branch only, so runs of other branches skip it. The bucket, its
retention period and the role are in `iz-gateway-terraform`
(`hub/console/rbac-report-bucket.tf`). The workflow reads the
`RBAC_REPORT_ROLE_ARN` and `RBAC_REPORT_BUCKET` Actions variables; until both
are set, it skips the upload with a notice.

## Files

| File | What it holds |
| --- | --- |
| `roles.ts` | The role columns, their status (`live`, `pending`, ...), reach and account env vars |
| `matrix.ts` | One entry per Confluence CC row: allowed roles, probes, known gaps |
| `evaluate.ts` | Cell statuses and how checks fold into a cell |
| `probes.ts` | Sign-in identity check, destination discovery, nav/page/API observations |
| `rbacMatrix.spec.ts` | One test per role column |
| `matrixIntegrity.spec.ts` | Browser-free checks on `matrix.ts` and the cell rules |
| `rbacReporter.ts` | Builds the report from the columns' results |

## Test accounts

One Okta test account per role, each holding exactly that role's group. A
column whose account holds any other role is reported as ERROR, not run.
Each account needs `_USERNAME` and `_PASSWORD`; a column missing either is
reported as CONFIG. Locally its test is skipped, since few developers hold
every account; in CI it fails, since a missing secret there is a mistake.
No full name is needed: the sign-in skips the app header's name check,
because the role check proves who signed in.

| Role | Env var prefix (`_USERNAME`, `_PASSWORD`) |
| --- | --- |
| IZG Operations | `E2E_RBAC_IZG_OPS` (falls back to `OKTA_USERNAME` / `OKTA_PASSWORD`) |
| Jurisdiction Operations | `E2E_RBAC_JURIS_OPS` (falls back to `OKTA_NONADMIN_*`) |
| IZG Support | `E2E_RBAC_IZG_SUPPORT` |
| Jurisdiction Support | `E2E_RBAC_JURIS_SUPPORT` |
| IZG Security | `E2E_RBAC_IZG_SECURITY` |
| Jurisdiction Security | `E2E_RBAC_JURIS_SECURITY` |
| IZG Program | `E2E_RBAC_IZG_PROGRAM` |

The Confluence page also has CDC Operations and CDC Support columns. Those
roles are not planned, so they have no column here.

Each jurisdiction account needs jurisdictions in its Okta profile (the
`jurisdictions` userinfo claim): at least one with destinations in dev, and
not all of them, so a foreign destination exists. Giving every jurisdiction
account only `al`, the UI fixture, keeps their columns comparable. With no
foreign destination, the cross-tenant checks are ❗ ERROR in CI and SKIPPED
locally, where a single-column `--grep` run is normal.

Optional: `E2E_RBAC_FOREIGN_DEST=<typeId>/<destId>` pins the destination the
jurisdiction roles must be refused. Without it, the run uses a destination a
global-reach role saw that the jurisdiction role does not reach.

Optional: `E2E_RBAC_FIXTURE_DEST=<destId>` (default `al`) is the destination
the UI checks prefer. See "UI checks" below.

## Keeping it current

The matrix changes in the PR of the ticket that changes access, never on its
own:

- **A ticket grants or removes a capability:** update `allow` in `matrix.ts`
  to the Confluence target, and remove any `knownGaps` entry the ticket
  closes. A gap that is fixed but still listed shows as 🔁 GAP CLOSED.
- **A new role lands in code:** set its `status` to `live` in `roles.ts` and
  create its account secrets in GitHub. `playwright-nightly.yml` already maps
  them for IZG Security and Jurisdiction Security. Its column then runs, so
  record any cell where the new role's code differs from the target as a
  `knownGaps` entry in the same PR. A role with no column yet (the CDC roles, if they are ever
  scheduled) also needs adding to `roles.ts`, to `allow` in `matrix.ts` from
  the Confluence page, and to the workflow.
- **The Confluence page changes:** the ticket that made the change updates
  `matrix.ts` and bumps `MATRIX_SOURCE.version`.
- **A new feature or page:** add a row, with each API probe's `refusal` taken
  from its route (see below). If it cannot be probed safely yet, set
  `notAutomated` with the reason, so the gap in coverage is visible.

## Probes never change data

Every probe is a read, a method the handler does not implement (on a route
whose gate checks every method), a sentinel id or an empty body the handler
rejects before any write, or `denyOnly`: sent only to roles the matrix denies,
whose request the route middleware refuses before the handler runs. Keep it
that way when adding rows. See the header of `matrix.ts`.

Probes that are refused produce `AccessDenied` audit events in the target
environment's logs. That is expected.

Every API probe names its gate's `refusal` status: 403 for `capability` and
`byMethod` routes, 401 for the reach checks and for handlers
that refuse with 401 themselves. Only that status counts as a refusal, so a
handler's own 401 after the gate let the request through (no such record,
no destination) shows as a gate that let it through. Read the route before
setting it. Any 401 is first checked against the session: an ended session
is an ERROR, not a refusal.

## Known gaps in the report

A `knownGaps` entry explains a mismatch in one direction only: "not yet
granted" (the role should get it and is refused) or "still granted" (the
role should be refused and gets it), on the role's own destination. Any
other mismatch in that cell, above all a foreign destination let through,
is still a ❌ FAIL. Keep gap reasons short and put the detail in the ticket:
this repo is public.

## UI checks and UI-only protection

Some capabilities are a button or a link with no server check behind them
(the IGDD-3545 and IGDD-3472 flags). Those rows use `ui` checks: open a page
for a destination and see whether the control is shown. They never click an
action, only a menu that reveals one (the connection table's More options).

- **Destination state.** A control only appears on a destination in the
  right state: a submitted change request, a saved draft, or neither. Each
  check uses `E2E_RBAC_FIXTURE_DEST` (default `al`) when it is in that state
  for the role, and otherwise the first destination the role reaches that
  is. If none is, the check is SKIPPED and says what is missing.
- **Narrow viewport.** UI checks run at 900px wide, where the connection
  table lists every row instead of paginating.
- **`uiOnly`.** Hiding a control is not protection when the server would
  still let the request through. For a role the target denies, a correctly
  hidden control is reported as ⚠️ KNOWN GAP with the ticket, never ✅ PASS.
  The PR that adds the server check removes `uiOnly` and adds an `api` probe.
- **Real actions are out of scope.** Whether an allowed role can actually
  complete an action (deploy, create a key) is covered by the functional
  e2e specs, not here.
