## Why

Cutting a release today runs `create-release-branch.yml`, which depends on a third-party
action (`hoangvvo/gitflow-workflow-action`), has no rollback if a step fails partway, and
relies on `deploy.yml` reacting to the `release/**` branch push to build and push images —
so a release can trigger two separate, uncoordinated image builds. `izg-transformation-ui`
(IGDD-2397's reference implementation) already replaced this with a single, auditable,
self-contained pipeline. Porting the same model here removes the third-party dependency,
adds automatic rollback on failure, and generates release notes and version bumps without
manual bookkeeping.

## What Changes

- Add `release.yml` (standard release, triggered from `develop`) and `hotfix.yml`
  (triggered from a `hotfix/*` branch), both thin `workflow_dispatch` wrappers around a new
  reusable `_release_common.yml`.
- `_release_common.yml` implements the full release, in order: validate inputs and branch
  state before any side effects; create (or reuse, for hotfix) the release branch; generate
  a Keep-a-Changelog-style `RELEASE_NOTES.md` entry from merged PR titles since the last
  semver tag; bump `package.json`/lockfile to the release version; run quality gates (lint,
  type-check, `npm test` with `continue-on-error`, and a hard-failing
  `npm audit --audit-level=high`); build and push one Docker image to GHCR, AWS ECR (dev),
  and APHL ECR; merge the release branch to `main`; create the semver Git tag; publish a
  GitHub Release (draft on dry-run); merge back to `develop` with the next version bumped
  (standard releases only); and clean up (revert merges, delete tags/branches) anything the
  same run created if any step fails.
- **BREAKING**: `RELEASE_NOTES.md` moves from the current hand-written
  `## Release vX.Y.Z` + manual IGDD-ticket bullets to an auto-generated
  `## [X.Y.Z] - YYYY-MM-DD` entry listing merged PR titles. Entries for releases cut before
  this change keep their existing format.
- Add `scan-ecr-image.yml`, an advisory Inspector2 vulnerability scan dispatched as a
  separate workflow run after a real (non-dry-run) release, reusing
  `IZGateway/izg-dependency-scripts`'s `ecr-scan-report.yml`. Dispatch and scan failures
  cannot change the release workflow's result.
- **BREAKING**: Remove `create-release-branch.yml`. Cutting a release no longer has a manual
  gitflow-action entry point — use `release.yml` or `hotfix.yml`'s `workflow_dispatch`
  inputs instead.
- **BREAKING**: Trim `deploy.yml` — drop the push-to-`release/**` trigger and the APHL-ECR
  push job, since `_release_common.yml` now owns both. Pushing a `release/**` branch no
  longer builds or pushes an image from `deploy.yml`.
- Update `.github/WORKFLOW_TRIGGERS.md` and `.github/WORKFLOW_SCHEDULE.md` to document the
  new pipeline, mirroring the documentation already written for `izg-transformation-ui`.
- `release.yml` and `hotfix.yml` share a Git-level concurrency group (`cancel-in-progress:
  false`) so standard and hotfix releases always serialize rather than run concurrently.
- The validate step also rejects a release version that is not newer than the latest tag,
  an app-version not newer than the release version, a hotfix branch that doesn't exactly
  match `hotfix/<release-version>` or doesn't descend from `main`, and any release-type
  other than `standard`/`hotfix` — beyond `izg-transformation-ui`'s format/existence-only
  checks.
- Release inputs are passed to shell scripts through environment variables, and branch
  names are validated before Git commands use them. The validation logic has an automated
  test matrix covering all accepted and rejected paths.
- Only plain semver tags are published to each registry, plus `latest` on GHCR; the legacy
  `{version}-{run_number}` / `-release` / `-snapshot` tag formats from today's `deploy.yml`
  are not carried forward (confirmed nothing depends on them). The release pipeline leaves
  the dev ECR `latest` tag alone, because the dev ECS task definition pins that tag and
  `deploy.yml` owns it.

## Capabilities

### New Capabilities
- `release-automation`: The end-to-end behavior of cutting a standard or hotfix release —
  input validation, release-branch and tag management, release-notes generation, quality
  gates, multi-registry image publishing, failure rollback, and the advisory vulnerability
  scan.

### Modified Capabilities
(none — no existing spec covers CI/CD release behavior)

## Impact

- New: `.github/workflows/release.yml`, `.github/workflows/hotfix.yml`,
  `.github/workflows/_release_common.yml`, `.github/workflows/scan-ecr-image.yml`
- Removed: `.github/workflows/create-release-branch.yml`
- Modified: `.github/workflows/deploy.yml`, `.github/WORKFLOW_TRIGGERS.md`,
  `.github/WORKFLOW_SCHEDULE.md`, `RELEASE_NOTES.md` (format going forward)
- External prerequisites, owned outside this change:
  - `RELEASE_AUTOMATION_APP_ID` / `RELEASE_AUTOMATION_APP_KEY` secrets and the GitHub App
    installed on this repo, with `contents: write`, `pull-requests: read`, and `workflows:
    write` permissions (user confirmed they will handle this). The workflow's
    `GITHUB_TOKEN` receives `packages: write` for GHCR and `actions: write` to dispatch the
    advisory scan; the scan workflow receives `id-token: write` for AWS OIDC.
  - The release App listed as a bypass actor on ruleset `1072449` ("main"), which protects
    `main` and `develop` with `deletion`, `non_fast_forward`, `code_scanning`, and
    `pull_request` rules. The reference pipeline's direct pushes and merges cannot satisfy
    those rules, so the App must bypass them. Do **not** relax the ruleset. Run
    `34515176941` confirmed the bypass works.
  - `AWS_ROLE_ARN` repo variable and an OIDC IAM role (`inspector2:ListFindings`,
    `inspector2:ListCoverage`) for the Inspector2 scan.
  - APHL ECR credentials/registry secrets, expected to already exist since `deploy.yml`
    references them today.
