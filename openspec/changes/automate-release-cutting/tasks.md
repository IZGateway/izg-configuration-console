## 1. Reusable release workflow core

- [ ] 1.1 Create `.github/workflows/_release_common.yml` as a `workflow_call` reusable
      workflow with inputs `release-version`, `app-version`, `release-type`,
      `develop-branch`, `main-branch`, `dry-run`, `skip-aphl`, adapted from
      `izg-transformation-ui`'s version. Verify with
      `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/_release_common.yml'))"`.
- [ ] 1.2 Add the GitHub App token step (`actions/create-github-app-token` using
      `RELEASE_AUTOMATION_APP_ID`/`RELEASE_AUTOMATION_APP_KEY`), checkout with
      `fetch-depth: 0`, Node 24 setup, npm registry auth for `@izgateway`, and Git identity
      configuration. Verify the job has no syntax errors via the same `yaml.safe_load`
      check.
- [ ] 1.3 Implement the validate step per `specs/release-automation/spec.md` — Requirements
      "Standard releases only run from the develop branch", "Hotfix releases only run from
      a hotfix branch", and "Release version must be well-formed and unused". Verify by
      reading the step logic against each spec scenario (branch mismatch, existing tag,
      existing release branch, malformed version each produce a failure before any other
      step runs).
- [ ] 1.4 Implement release-branch creation (standard) / reuse (hotfix) per design.md
      Decisions, pushing with the App token. Verify the step only runs
      `if: inputs.release-type == 'standard'`.
- [ ] 1.5 Implement release-notes generation into `RELEASE_NOTES.md` per spec Requirement
      "Release notes are generated from merged pull requests", including the
      no-merged-PRs fallback. Verify by tracing the script against both scenarios in that
      requirement.
- [ ] 1.6 Implement the `package.json`/lockfile version bump to `release-version` on the
      release branch. Verify the step commits only when the version actually changes
      (skips an empty commit otherwise).
- [ ] 1.7 Implement quality gates: `npm ci --force` (per design.md — keep `--force`, do
      not copy `izg-transformation-ui`'s plain `npm ci`), `npm run code-quality-check`,
      `npm test` with `continue-on-error: true`, and `npm audit --audit-level=high` as a
      hard gate. Verify against spec Requirements "A high or critical vulnerability blocks
      a release" and "Unit test failures do not block a release".
- [ ] 1.8 Implement app-version computation for standard releases (explicit `app-version`
      input, else auto minor-bump `MAJ.(MIN+1).0`). Verify against spec Requirement "A
      successful standard release advances develop to the next version".
- [ ] 1.9 Implement registry logins (GHCR always; AWS ECR dev and APHL ECR skipped when
      `dry-run` is true; APHL also skipped when `skip-aphl` is true) and image-tag
      computation, keeping this repo's image name `izg-configuration-console` and APHL tag
      prefix `izgw-cc-`. Verify against spec Requirements "A dry run performs no
      persistent side effect" and "A successful real release publishes to every configured
      registry" (including the APHL-skip scenario).
- [ ] 1.10 Implement the single Docker build/push step (`push: ${{ inputs.dry-run ==
      false }}`) using this repo's `Dockerfile` and build args (`BUILD_ID`, `NPM_TOKEN`).
      Verify the tags passed match the computed tag list from 1.9.
- [ ] 1.11 Implement merge-to-main, semver tag creation, and GitHub Release creation
      (`draft: ${{ inputs.dry-run == true }}`). Verify against spec Requirement "A dry run
      performs no persistent side effect" (draft release, no merge on dry-run).
- [ ] 1.12 Implement merge-back-to-develop with the version bump from 1.8 for standard
      releases only, leaving develop's version untouched for hotfixes. Verify against spec
      Requirement "A successful standard release advances develop to the next version"
      (both scenarios).
- [ ] 1.13 Implement the job summary step listing release type, version, branches,
      dry-run/skip-aphl flags, and published image tags.
- [ ] 1.14 Implement the failure-cleanup step using per-step output gates and `git revert`
      (not force-push) for tag deletion, main-branch revert, develop-branch revert, and
      release-branch deletion (hotfix branches kept, not deleted). Verify against spec
      Requirement "A failed release only reverts what that run created" (both scenarios:
      partial failure after tagging, and failure before any persistent state exists).

## 2. Entry-point workflows

- [ ] 2.1 Create `.github/workflows/release.yml`: `workflow_dispatch` with inputs
      `release-version`, `app-version`, `develop-branch`, `main-branch`, `dry-run`,
      `skip-aphl`; calls `_release_common.yml` with `release-type: standard` and
      `secrets: inherit`. Verify with the `yaml.safe_load` check and by confirming every
      input it declares is passed through to `_release_common.yml`.
- [ ] 2.2 Create `.github/workflows/hotfix.yml`: `workflow_dispatch` with inputs
      `release-version`, `develop-branch`, `main-branch`, `dry-run`, `skip-aphl`; calls
      `_release_common.yml` with `release-type: hotfix`. Include a header comment
      documenting the hotfix branch-creation steps (branch from `main`, PR fixes into it,
      then run this workflow), matching `izg-transformation-ui`'s convention. Verify with
      the `yaml.safe_load` check.

## 3. Vulnerability scan integration

- [ ] 3.1 Create `.github/workflows/scan-ecr-image.yml` with a `wait-for-inspector2-scan`
      job (continue-on-error) and a `scan-report` job that calls
      `IZGateway/izg-dependency-scripts/.github/workflows/ecr-scan-report.yml@v1`,
      targeting the `izg-configuration-console` ECR repository. Verify with the
      `yaml.safe_load` check.
- [ ] 3.2 Wire `scan-ecr-image.yml` into `_release_common.yml` as a sibling job
      (`needs: release`, `if: inputs.dry-run == false`), granting `id-token: write` /
      `contents: read`, and propagate `id-token: write` up through `release.yml` and
      `hotfix.yml`. Verify against spec Requirement "The vulnerability scan never blocks a
      release" (both scenarios: findings present, scan errors/times out) by confirming the
      `release` job's own success/failure does not depend on this job.

## 4. Retire the old release pipeline

- [ ] 4.1 Delete `.github/workflows/create-release-branch.yml`. Verify the file no longer
      exists and no other workflow references it (`grep -r create-release-branch
      .github/`).
- [ ] 4.2 Remove the `release/**` push trigger and the APHL-ECR push job from
      `.github/workflows/deploy.yml`, keeping the `pull_request`/`schedule`/
      `workflow_dispatch` triggers and the GHCR/AWS-ECR build and `deploy-dev` job intact.
      Verify with `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy.yml'))"`
      and by confirming a diff shows only the trigger and APHL-job removal.

## 5. Documentation

- [ ] 5.1 Update `.github/WORKFLOW_TRIGGERS.md` to document `release.yml`, `hotfix.yml`,
      `_release_common.yml`, and `scan-ecr-image.yml` (triggers, inputs, the OIDC/
      `AWS_ROLE_ARN` prerequisite), mirroring the equivalent section already written for
      `izg-transformation-ui`. Verify by reading the updated section against the actual
      workflow files from section 1-3.
- [ ] 5.2 Update `.github/WORKFLOW_SCHEDULE.md`'s "Integration with Other Workflows"
      section to replace the "Create Release Branch" entry with the new `release.yml`/
      `hotfix.yml` entry points. Verify the removed workflow name no longer appears
      anywhere in the file (`grep create-release-branch .github/WORKFLOW_SCHEDULE.md`
      returns nothing).

## 6. End-to-end verification

- [ ] 6.1 Trigger `release.yml` once with `dry-run: true` from `develop` using a throwaway
      version number, per design.md's Migration Plan. Verify the run: passes validation,
      generates the App token, builds (but does not push) the image, creates a draft
      GitHub Release, and performs no merge to `main`/`develop` and no branch/tag left
      behind.
- [ ] 6.2 Confirm `npm run code-quality-check` passes locally with the new/edited workflow
      files present (no application code changed, so this should be a no-op check that
      nothing else broke).
