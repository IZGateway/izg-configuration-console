## 1. Reusable release workflow core

- [x] 1.1 Create `.github/workflows/_release_common.yml` as a `workflow_call` reusable
      workflow with inputs `release-version`, `app-version`, `release-type`,
      `develop-branch`, `main-branch`, `dry-run`, `skip-aphl`, adapted from
      `izg-transformation-ui`'s version. Verify with
      `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/_release_common.yml'))"`.
- [x] 1.2 Add the GitHub App token step (`actions/create-github-app-token` using
      `RELEASE_AUTOMATION_APP_ID`/`RELEASE_AUTOMATION_APP_KEY`), checkout with
      `fetch-depth: 0`, Node 24 setup, npm registry auth for `@izgateway`, and Git identity
      configuration. Verify the job has no syntax errors via the same `yaml.safe_load`
      check.
- [x] 1.3 Implement the validate step per `specs/release-automation/spec.md` —
      Requirements "Standard releases only run from the develop branch", "Hotfix releases
      only run from a hotfix branch", "Release version must be well-formed and unused",
      "Release version must be newer than the latest release", "A hotfix release runs from
      a branch dedicated to that version" (exact `hotfix/<release-version>` name, checked
      via string comparison, and ancestry from `main`, checked via `git merge-base
      --is-ancestor`), and "An unrecognized release type is rejected". Verify by reading
      the step logic against each spec scenario (branch mismatch, existing tag, existing
      release branch, malformed version, non-newer version, non-newer app-version,
      mismatched/non-descending hotfix branch, and unknown release-type each produce a
      failure before any other step runs). Run `npm run test:release-validation`.
- [x] 1.4 Implement release-branch creation (standard) / reuse (hotfix) per design.md
      Decisions, pushing with the App token. Verify the step only runs
      `if: inputs.release-type == 'standard'`.
- [x] 1.5 Implement release-notes generation into `RELEASE_NOTES.md` per spec Requirement
      "Release notes are generated from merged pull requests", including the
      no-merged-PRs fallback. Verify by tracing the script against both scenarios in that
      requirement.
- [x] 1.6 Implement the `package.json`/lockfile version bump to `release-version` on the
      release branch. Verify the step commits only when the version actually changes
      (skips an empty commit otherwise).
- [x] 1.7 Implement quality gates: `npm ci --force` (per design.md — keep `--force`, do
      not copy `izg-transformation-ui`'s plain `npm ci`), `npm run code-quality-check`,
      `npm test` with `continue-on-error: true`, and `npm audit --audit-level=high` as a
      hard gate. Verify against spec Requirements "A high or critical vulnerability blocks
      a release" and "Unit test failures do not block a release".
- [x] 1.8 Implement app-version computation for standard releases (explicit `app-version`
      input, else auto minor-bump `MAJ.(MIN+1).0`). Verify against spec Requirement "A
      successful standard release advances develop to the next version".
- [x] 1.9 Implement registry logins (GHCR always; AWS ECR dev and APHL ECR skipped when
      `dry-run` is true; APHL also skipped when `skip-aphl` is true) and image-tag
      computation, publishing only plain semver tags and `latest` (no legacy
      `{version}-{run_number}` aliases), keeping this repo's image name
      `izg-configuration-console` and APHL tag prefix `izgw-cc-`. Verify against spec
      Requirements "A dry run skips registry publication and the vulnerability scan" and
      "A successful real release publishes to every configured registry" (including the
      APHL-skip scenario).
- [x] 1.10 Implement the single Docker build/push step (`push: ${{ inputs.dry-run ==
      false }}`) using this repo's `Dockerfile` and build args (`BUILD_ID`, `NPM_TOKEN`).
      Verify the tags passed match the computed tag list from 1.9.
- [x] 1.11 Implement merge-to-main, semver tag creation, and GitHub Release creation
      (`draft: ${{ inputs.dry-run == true }}`), all running unconditionally regardless of
      `dry-run` (only the `draft` flag depends on it). Verify against spec Requirement "A
      dry run skips registry publication and the vulnerability scan" — specifically the
      "Dry run still performs the branch, tag, and version changes" scenario.
- [x] 1.12 Implement merge-back-to-develop with the version bump from 1.8 for standard
      releases only, leaving develop's version untouched for hotfixes. Verify against spec
      Requirement "A successful standard release advances develop to the next version"
      (both scenarios).
- [x] 1.13 Implement the job summary step listing release type, version, branches,
      dry-run/skip-aphl flags, and published image tags.
- [x] 1.14 Implement the failure-cleanup step using per-step output gates and `git revert`
      (not force-push) for tag deletion, main-branch revert, develop-branch revert, and
      release-branch deletion (hotfix branches kept, not deleted). Verify against spec
      Requirement "A failed release only reverts what that run created" (both scenarios:
      partial failure after tagging, and failure before any persistent state exists).

## 2. Entry-point workflows

- [x] 2.1 Create `.github/workflows/release.yml`: `workflow_dispatch` with inputs
      `release-version`, `app-version`, `develop-branch`, `main-branch`, `dry-run`,
      `skip-aphl`; calls `_release_common.yml` with `release-type: standard` and
      `secrets: inherit`. Verify with the `yaml.safe_load` check and by confirming every
      input it declares is passed through to `_release_common.yml`.
- [x] 2.2 Create `.github/workflows/hotfix.yml`: `workflow_dispatch` with inputs
      `release-version`, `develop-branch`, `main-branch`, `dry-run`, `skip-aphl`; calls
      `_release_common.yml` with `release-type: hotfix`. Include a header comment
      documenting the hotfix branch-creation steps (branch from `main`, PR fixes into it,
      then run this workflow), matching `izg-transformation-ui`'s convention. Verify with
      the `yaml.safe_load` check.
- [x] 2.3 Add a shared `concurrency` block (e.g. group `release-${{ github.repository }}`,
      `cancel-in-progress: false`) to both `release.yml` and `hotfix.yml` so a standard and
      a hotfix release can never run at the same time. Verify both files use the identical
      group expression.

## 3. Vulnerability scan integration

- [x] 3.1 Create `.github/workflows/scan-ecr-image.yml` with a `wait-for-inspector2-scan`
      job and a `scan-report` job using the shared report implementation with repository
      `izg-configuration-console` and package name `izgw-cc` (matching the `izgw-cc-`
      APHL tag prefix). The initial advisory reusable-workflow call is replaced by local
      strict job steps in 7.12. Preserve image-tag and release-date inputs.
- [x] 3.2 Dispatch `scan-ecr-image.yml` as a separate workflow run after a successful,
      non-dry release. Grant `actions: write` through `release.yml`, `hotfix.yml`, and
      `_release_common.yml`, and make dispatch failure non-blocking. Verify against spec
      Requirement "The vulnerability scan never blocks a release" by confirming scan
      status cannot change the release workflow run's conclusion.

## 4. Retire the old release pipeline

- [x] 4.1 Delete `.github/workflows/create-release-branch.yml`. Verify the file no longer
      exists and no other workflow references it (`grep -r create-release-branch
      .github/`).
- [x] 4.2 Remove the `release/**` push trigger and the APHL-ECR push job from
      `.github/workflows/deploy.yml`, keeping the `pull_request`/`schedule`/
      `workflow_dispatch` triggers and the GHCR/AWS-ECR build and `deploy-dev` job intact.
      Verify with `python3 -c "import yaml; yaml.safe_load(open('.github/workflows/deploy.yml'))"`
      and by confirming a diff shows only the trigger and APHL-job removal.

## 5. Documentation

- [x] 5.1 Update `.github/WORKFLOW_TRIGGERS.md` to document `release.yml`, `hotfix.yml`,
      `_release_common.yml`, and `scan-ecr-image.yml` (triggers, inputs, the OIDC/
      `AWS_ROLE_ARN` prerequisite), mirroring the equivalent section already written for
      `izg-transformation-ui`. Verify by reading the updated section against the actual
      workflow files from section 1-3.
- [x] 5.2 Update `.github/WORKFLOW_SCHEDULE.md`'s "Integration with Other Workflows"
      section to replace the "Create Release Branch" entry with the new `release.yml`/
      `hotfix.yml` entry points. Verify the removed workflow name no longer appears
      anywhere in the file (`grep create-release-branch .github/WORKFLOW_SCHEDULE.md`
      returns nothing).

## 6. End-to-end verification

- [x] 6.1 Confirm the release App is installed with the permissions listed in design.md and
      is a bypass actor on ruleset `1072449` ("main"), before running anything in this
      section. That ruleset targets `refs/heads/main*`, `refs/heads/develop*`,
      `refs/heads/testmain`, and `refs/heads/testdevelop`, with the rules `deletion`,
      `non_fast_forward`, `code_scanning`, and `pull_request`. Do **not** relax the
      ruleset. Verify via
      `gh api repos/IZGateway/izg-configuration-console/rulesets/1072449`. Classic branch
      protection is not in use: the `branches/*/protection` endpoints return 404.
- [x] 6.2 Trigger `release.yml` once with `dry-run: true` from `develop`, using a version
      genuinely newer than the latest tag, per design.md's Migration Plan. Verify the run:
      passes validation, generates the App token, pushes the release branch, commits
      release notes and the version bump, merges to `main`, creates the semver tag, merges
      back to `develop`, builds but does not push the image, skips the vulnerability scan,
      and creates a **draft** GitHub Release. Then manually delete the test tag, revert the
      two merge commits, delete the release branch, and delete the draft release.
- [x] 6.3 Trigger `hotfix.yml` once with `dry-run: true` from a real `hotfix/<version>`
      branch created off `main`, using a version newer than the latest tag. Verify the run
      behaves like 6.2 except `develop`'s version is left unchanged and the hotfix branch
      is not deleted. Clean up the same way as 6.2 (except keep or delete the hotfix branch
      as appropriate).
- [x] 6.6 Confirm `npm run code-quality-check` passes locally with the new/edited workflow
      files present (no application code changed, so this should be a no-op check that
      nothing else broke).

## Optional follow-up verification

- Trigger `release.yml` twice in quick succession (or `release.yml` and `hotfix.yml`
  together) and confirm the second run queues behind the first via the shared concurrency
  group rather than running in parallel.
- Confirm the first real release publishes all expected registry tags and its separately
  dispatched Inspector2 workflow produces the expected report artifact.

## 7. Verification hardening

- [x] 7.1 Move release validation into `.github/scripts/validate-release.sh`, pass
      workflow inputs through environment variables, and validate configured branch names
      before using them in Git commands.
- [x] 7.2 Add `.github/scripts/validate-release.test.sh` covering every strict-validation
      success and failure path with a temporary local Git remote and no remote side
      effects.
- [x] 7.3 Dispatch the advisory scan as a separate non-blocking workflow run. Keep
      `actions/create-github-app-token@v3` on the `app-id` input. `client-id` is the
      non-deprecated input, but it needs the GitHub App Client ID, which is a different
      value from the numeric App ID that `RELEASE_AUTOMATION_APP_ID` holds and that
      `izg-transformation-ui` also passes to `app-id`. The migration is deferred to a
      follow-up that first adds a `RELEASE_AUTOMATION_CLIENT_ID` secret.
- [x] 7.4 Update proposal, design, and workflow documentation to distinguish GitHub App,
      `GITHUB_TOKEN`, and OIDC permissions and to describe the separate scan run.
- [x] 7.5 Run the cleanup step on cancellation as well as failure
      (`if: failure() || cancelled()`), so an operator who cancels a long release run still
      gets scoped rollback and a cleanup report.
- [x] 7.6 Stop publishing `latest` to the dev ECR from the release pipeline. The dev ECS
      task definition pins `container_image_tag = "latest"`
      (`iz-gateway-terraform/hub/console/terraform.tfvars`), so a release that moves that
      tag deploys release code into dev on the next task restart. `deploy.yml` keeps
      ownership of the dev `latest` tag. GHCR keeps `latest` as the release pointer.
- [x] 7.7 Run `npm run test:release-validation` in `deploy.yml`'s `code-quality-check` job
      and remove `.github/scripts/*` from the `paths-ignore` list, so a pull request that
      only edits the validator gets CI coverage.
- [x] 7.8 Re-run one `dry-run: true` release after the section 7 edits. Done at commit
      `eb9c031` on throwaway branches `testdevelop` / `testmain`: standard release 1.18.100
      (run `34507330728`) and hotfix release 1.18.101 (run `34509704178`). Both succeeded.
      Verified: the extracted `validate-release.sh`, the App-token step, `push: false` with
      the dry-run tag `izg-configuration-console:1.18.100`, `RELEASE_NOTES.md` on both
      branches, `testdevelop` advanced to 1.19.0 by the standard release, and the hotfix
      left `testdevelop` at 1.19.0.
- [x] 7.9 Delete the GitHub Release by release ID during failure cleanup, not by tag name.
      Runs `34507330728` and `34509704178` both logged
      `Release <id> is not yet discoverable by tag` and a final `untagged-<hash>` URL. A
      draft release holds no tag association, so a lookup by tag cannot find it. Cleanup
      also deletes the tag before the release, which makes any tag-name lookup fragile. The
      release ID was already captured and unused.
      **Verified** by run `34515176941`: a temporary `exit 1` at the top of the "Update
      develop branch" step on `testdevelop` failed release 1.18.102 after the tag, the main
      merge, and the GitHub Release existed. Cleanup ran and succeeded. It deleted tag
      `v1.18.102`, reverted the `testmain` merge and pushed the revert (`54dfcba` reverts
      `8917823`), deleted branch `release/1.18.102`, and deleted the GitHub Release with no
      error. Develop cleanup correctly did nothing, because the failing step never set
      `updated=true`. Confirmed against the remote afterward: the tag and the release
      branch are gone, and `testmain` points at the revert commit.
- [x] 7.10 Confirm the App bypasses the branch ruleset instead of needing it relaxed. Run
      `34515176941` logged `remote: Bypassed rule violations for refs/heads/testmain` for
      the `pull_request` and `code_scanning` rules, then pushed. Ruleset `1072449` covers
      `main` and `develop` with the same rules, so the same bypass applies. This reverses
      the earlier prerequisite to drop the required-review rule. A bypass actor is the
      better answer, because the rules stay in force for humans. See design.md Context.
- [ ] 7.11 Exercise the paths that the dry-runs could not reach. The dry-runs skipped
      the advisory scan dispatch (gated on `dry-run == false`), the APHL push, and every
      registry push. Failure cleanup is now covered by 7.9. No dry-run can reach the
      remaining three, because each one is gated on `dry-run == false`. The first real
      release is therefore the first exercise of all three. Before that release, dispatch
      `scan-ecr-image.yml` by hand with a tag that already exists in the dev ECR. That
      checks the two prerequisites most likely to be missing: the `AWS_ROLE_ARN` OIDC role
      and cross-repository access to `izg-dependency-scripts`.
      **Manual-scan prerequisite verified:** run `34530206067` scanned existing tag
      `1.18.0-1190`; both OIDC authentications, shared-script checkout, and report
      generation/upload succeeded. Artifact `izgw-cc_v1.18.0-1190_InspectorScan` contains
      JSON, CSV, and HTML reports with five findings. This predates 7.12; real registry
      publication and release-triggered scan dispatch remain unverified.
- [x] 7.12 Correct misleading successful scan status using console-only changes. Remove
      polling failure suppression and fail on API errors or timeout. Replace the advisory
      shared workflow call with local authentication, checkout, and unchanged shared-script
      execution steps; require complete reports and successful artifact upload. Keep
      findings informational and release dispatch non-blocking. Add mocked regression
      cases using the existing Jest runner, wire them into CI, update related artifacts,
      and run `npm run test:scan-workflow`, `npm run test:release-validation`, and
      `npm run code-quality-check`.
      **Local verification:** 29 scan-workflow regression cases and 18 release-validator
      cases passed; lint/type-check and strict OpenSpec validation passed. The corrected
      workflow still needs a new GitHub Actions run.
