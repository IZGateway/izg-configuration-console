## Context

See `proposal.md` - Why for motivation. Relevant current state:

- Console's release entry point is `create-release-branch.yml`, using the third-party
  `hoangvvo/gitflow-workflow-action` to create the `release/**` branch, then relying on
  `deploy.yml`'s `push: release/**` trigger to build and push images (including to APHL
  ECR) — a second, uncoordinated workflow run.
- `izg-transformation-ui` already replaced this with `release.yml` / `hotfix.yml` →
  `_release_common.yml`, using a GitHub App token, PR-derived release notes, hard
  npm-audit gate, three-registry publish, and scoped failure rollback. This design ports
  that architecture, adapted to this repo's image name (`izg-configuration-console`), ECS
  cluster/service names, and existing APHL tag prefix (`izgw-cc-`).
- This repo's CI installs with `npm ci --force` everywhere (`deploy.yml`,
  `security-updates.yml`), unlike `izg-transformation-ui`'s plain `npm ci`.
- This repo does not yet have `scan-ecr-image.yml`, `RELEASE_AUTOMATION_APP_ID`/`KEY`
  secrets, or an `AWS_ROLE_ARN` OIDC role — these are new prerequisites for this change.
- Unlike `izg-transformation-ui` (no branch protection on either branch), this repo
  protects `main` and `develop` with ruleset `1072449` ("main"). That ruleset targets
  `refs/heads/main*`, `refs/heads/develop*`, `refs/heads/testmain`, and
  `refs/heads/testdevelop`, with the rules `deletion`, `non_fast_forward`, `code_scanning`,
  and `pull_request`. The reference pipeline pushes and merges directly, which those rules
  forbid.
  **The App bypasses the ruleset, so no protection change is needed.** Run
  `34515176941` pushed a cleanup revert to `testmain` and logged
  `remote: Bypassed rule violations for refs/heads/testmain` for both the `pull_request`
  and `code_scanning` rules. The same ruleset covers real `main` and `develop`, so the same
  bypass applies there. An earlier draft of this design planned to drop the
  required-review rule instead. That is unnecessary and weaker: a bypass actor keeps the
  rules in force for humans. Keep the App on the ruleset bypass list as the prerequisite,
  and no bypass logic is needed in the workflows themselves.
- A prior draft of this design incorrectly assumed dry-run in the reference pipeline is a
  no-op. Re-reading `_release_common.yml` shows only the registry logins/image push are
  gated on `dry-run == false`; the branch, notes/version commits, merge to main, tag, and
  merge back to develop all run unconditionally, and the GitHub Release is created as a
  draft rather than skipped. This design follows that behavior exactly — see Decisions.

## Goals / Non-Goals

**Goals:**
- Give this repo the same release architecture as `izg-transformation-ui`: reusable
  `_release_common.yml` called by thin `release.yml`/`hotfix.yml` wrappers.
- Make a release a single, coordinated build — remove the double-build path through
  `deploy.yml`.
- Keep this repo's install/CI quirks (`npm ci --force`, image/cluster names, APHL tag
  prefix) rather than copying `izg-transformation-ui`'s values verbatim.

**Non-Goals:**
- Changing `deploy.yml`'s non-release behavior (PR builds, scheduled dev snapshot builds,
  `deploy-dev` job) beyond removing the `release/**` trigger and the APHL-push job.
- Migrating historical `RELEASE_NOTES.md` entries to the new format — only new entries use
  it.
- Adding a manual approval gate before image push. Dry-run remains the only pre-flight
  check, matching `izg-transformation-ui`.
- Changing the semver scheme or the auto-minor-bump default.

## Decisions

**Reusable workflow via `workflow_call`, not a duplicated job list.**
`release.yml` and `hotfix.yml` are `workflow_dispatch` entry points that immediately call
`_release_common.yml` with `secrets: inherit`, passing a `release-type` input
(`standard`/`hotfix`). Alternative considered: two independent, fully-written workflows
(the original `izg-transformation-ui` approach before it was refactored) — rejected because
it duplicates ~15 steps and lets the two paths drift out of sync.

**GitHub App token for all git-mutating steps.**
A short-lived token from `actions/create-github-app-token`
(`RELEASE_AUTOMATION_APP_ID`/`RELEASE_AUTOMATION_APP_KEY`) is used for checkout and all
pushes, merges, tags, and reverts, with permissions `contents: write`, `pull-requests:
read`, and `workflows: write` (the last one is not present in
`izg-transformation-ui`'s App, but is added defensively here: a merge into `main`/`develop`
can include a prior PR's changes to `.github/workflows/*.yml`, and GitHub rejects such a
push without that permission). The workflow's `GITHUB_TOKEN`, not the App token, receives
`packages: write` for GHCR and `actions: write` for the advisory scan dispatch. The scan
workflow receives `id-token: write` for AWS OIDC. Alternative considered: using the
default `GITHUB_TOKEN` for Git mutations — rejected because it cannot push commits that
modify workflow files and its commits don't trigger other workflows. This design also
depends on the App staying on ruleset `1072449`'s bypass list (see Context) — the App
token alone does not solve pushing to a branch that requires a pull request. The user owns
installing the App and keeping it on the bypass list as prerequisites outside this change.

The token step keeps the `app-id` input, although
`actions/create-github-app-token@v3` marks it deprecated in favor of `client-id`. The two
inputs need different values: `app-id` takes the numeric App ID, and `client-id` takes the
App Client ID (`Iv23li…`). `RELEASE_AUTOMATION_APP_ID` holds the numeric App ID, and
`izg-transformation-ui` passes that same secret to `app-id`, so the secret value cannot
change without breaking that repo. A follow-up must add a separate
`RELEASE_AUTOMATION_CLIENT_ID` secret before the migration.

**Dry-run mirrors the reference pipeline exactly — it is a rehearsal, not a no-op.**
Per spec Requirement "A dry run skips registry publication and the vulnerability scan,"
dry-run only skips the registry push and the scan; every git mutation still happens.
Alternative considered: gating the branch/merge/tag/notes/version-bump steps on dry-run
too, so a dry run is fully side-effect-free — rejected as new scope beyond parity with
`izg-transformation-ui`, and because it would require re-deriving safe versions of steps
(like the merge-back-to-develop version bump) that the reference never designed to be
skippable. Consequence: exercising dry-run against real `main`/`develop` consumes a real
version number and leaves a real tag, merge commits, and a draft release that must be
manually cleaned up afterward — see Migration Plan.

**Reject expanding failure rollback to registry images or hotfix-branch history.**
Cleanup (Decisions below) reverts/deletes only Git branches, merge commits, tags, and the
GitHub Release — matching `izg-transformation-ui` exactly. Alternative considered:
also deleting pushed images/tags from GHCR/ECR/APHL on failure, and reverting commits
pushed onto a pre-existing hotfix branch — rejected. Deleting a published image is riskier
than leaving it (something may have already pulled it, and ECR tags are not guaranteed
mutable), and a hotfix branch is often shared with other engineers' fixes-in-progress;
rewriting its history out from under them on a failed release run is more disruptive than
leaving the failed attempt's commits for manual review. This is `izg-transformation-ui`'s
own documented, accepted limitation, not an oversight being ported forward unnoticed.

**Dispatch the vulnerability scan as an independent workflow run.**
After a successful real release, `_release_common.yml` dispatches `scan-ecr-image.yml`
with the released image tag. The dispatch step is `continue-on-error`, and the scan runs
independently, so a dispatch, authentication, timeout, or report failure cannot change the
release workflow's successful result. This differs from `izg-transformation-ui`'s sibling
job because a reusable-workflow call job cannot use `continue-on-error`; keeping that
structure could make the overall release run red and contradict the release-automation
spec. The trade-off is that the scan appears as a separate Actions run rather than a child
job in the release run.

**Strict validation beyond format/existence checks.**
The validate step also rejects: a release version that is not strictly newer than the
latest existing tag, an explicit app-version that is not strictly newer than the release
version, a hotfix branch whose name doesn't exactly match `hotfix/<release-version>` or
that doesn't descend from the main branch, and any release-type other than
`standard`/`hotfix`. This goes beyond `izg-transformation-ui`'s validation (format and
non-existence only) — accepted as low-risk, low-cost checks that catch real operator
mistakes (e.g., cutting a release with an accidentally-lower version, or hotfixing off the
wrong branch) before any side effect occurs.

**Validate shell inputs through a testable script.**
Workflow inputs are passed through environment variables rather than interpolated into
inline shell source. `.github/scripts/validate-release.sh` also validates configured
branch names before using them in Git commands. A local test script creates a temporary
Git remote and exercises every validation success and failure path while asserting that
failed validation does not change remote refs. This intentionally improves on the
`izg-transformation-ui` implementation, which still interpolates inputs directly.

**No legacy image-tag aliases.**
Only plain semver tags are published, plus `latest` on GHCR — the
`{version}-{run_number}` and `-release`/`-snapshot` suffix formats from today's `deploy.yml`
are not carried forward. Confirmed nothing outside this repo pins to those formats.

**The release pipeline does not move the dev ECR `latest` tag.**
The dev ECS task definition pins `container_image_tag = "latest"`
(`iz-gateway-terraform/hub/console/terraform.tfvars`), so dev ECR `latest` is a deployment
pointer, not a release pointer. `deploy.yml` owns it. A release that also wrote that tag
would put release code into the dev environment on the next ECS task restart. The release
pipeline therefore publishes only `izg-configuration-console:<version>` to the dev ECR, and
keeps `latest` on GHCR, where nothing deploys from it. Alternative considered: dropping
`latest=true` from `deploy.yml` instead — rejected, because that breaks dev deployment.

**Standalone `scan-ecr-image.yml`, dispatched after release.**
`_release_common.yml` dispatches `scan-ecr-image.yml` after a successful non-dry release.
The scan authenticates via OIDC (`AWS_ROLE_ARN` repo variable), checks out
`IZGateway/izg-dependency-scripts@v1`, and runs its unchanged
`.github/scripts/ecr-scan-report.sh`, scanning `izg-configuration-console:<version>`
instead of `izg-transformation-ui:<version>`.
Alternative considered: inlining the scan steps directly in `_release_common.yml` —
rejected because it would duplicate logic already centralized in the dependency-scripts
repository and couple advisory reporting to the release job.

**Strict scan status with shared report logic, scoped to this repository.**
Run `34518311102` exposed a misleading green workflow with two failed authentication
jobs: both the console's polling job and the shared report workflow used job-level
`continue-on-error`. The console already dispatches scans independently, so suppressing
scan execution failures is unnecessary. The polling job now fails on AWS errors or a
20-minute timeout, and the report job owns normal failing authentication, checkout,
script execution, completeness validation, and artifact-upload steps. It requires
nonempty JSON, CSV, and HTML files and a JSON findings array. Zero findings and findings
of any severity remain successful report outcomes, not execution errors.
The missing `AWS_ROLE_ARN` variable gets a clear preflight error; image tags are validated
before they are used in report paths and step outputs.
The report script stays centralized and unchanged. The small job wrapper is local so
neither `izg-dependency-scripts` nor transformation UI needs a behavior change.
Trade-off: the console owns the authentication and artifact-upload configuration.
Regression tests execute shell steps extracted from the workflow with mocked external
responses, and `deploy.yml` includes scan-only changes in its test triggers.

**Keep `npm ci --force` for this repo's install step.**
`_release_common.yml`'s dependency-install step uses `npm ci --force`, matching this
repo's existing `deploy.yml`/`security-updates.yml`, instead of `izg-transformation-ui`'s
plain `npm ci`. Rationale: this repo's dependency tree already requires `--force` for a
clean install; switching to plain `npm ci` would introduce a new, unrelated install failure
mode that has nothing to do with this change.

**Preserve the existing APHL tag prefix and registry/cluster names.**
APHL image tags stay `izgw-cc-<version>` (as in the current `deploy.yml`), GHCR/ECR image
name stays `izg-configuration-console`, and the ECS deploy target names
(`izgateway-configuration-console` cluster / `izgateway-config-console` service) are
untouched — this design only changes *when* and *from which workflow* images are built and
pushed, not the naming scheme downstream systems already depend on.

**Failure cleanup by scoped `git revert`, not force-push.**
Same approach as `izg-transformation-ui`: each mutating step records what it did in a
step output; the cleanup step only reverts/deletes state whose corresponding output is
`true` for *this run*, using `git revert` (a forward commit) rather than `git reset
--hard`/force-push, so it works under branch protection rules.

## Risks / Trade-offs

- **[Risk]** The GitHub App may not be installed, its secrets may not resolve on this repo,
  or the App may be missing from ruleset `1072449`'s bypass list, so the first real run
  fails at the App-token step or at the first protected push.
  → **Mitigation**: exercise `release.yml` in dry-run mode first — this still exercises the
  App-token step and the first protected push (the release-branch push), surfacing either
  failure early. Note this is not side-effect-free (see the dry-run Decision above): a
  dry-run failure partway through still needs the same cleanup as any failed run.
- **[Risk]** The scan runner may be unable to check out the shared report scripts from
  `izg-dependency-scripts`.
  → **Mitigation**: the scan runs as an independently dispatched workflow. Its failure
  cannot change the release workflow's conclusion, so the access gap can be resolved
  separately.
- **[Risk]** Changing `RELEASE_NOTES.md`'s format is a visible, permanent change for
  anyone or anything that parses that file (release announcements, changelogs).
  → **Mitigation**: none needed in the automation itself; call it out in the release PR
  description so reviewers aren't surprised.
- **[Risk]** The `git merge -X theirs`/`-X ours` conflict strategy used to merge into
  `main`/`develop` will silently prefer one side's version on a real conflict if someone
  pushes directly to `main` or `develop` while a release is running.
  → **Mitigation**: operational constraint, not a code fix — releases should not be run
  concurrently with direct pushes to `main`/`develop`. Same accepted risk as
  `izg-transformation-ui`.

## Migration Plan

1. Add `_release_common.yml`, `release.yml`, `hotfix.yml`, and `scan-ecr-image.yml` in the
   same PR as the `deploy.yml` trim and the `create-release-branch.yml` removal, so there
   is never a window with two competing release entry points.
2. Before relying on the new pipeline for a real release, run `release.yml` once in
   dry-run mode from `develop` with a version genuinely newer than the latest tag (required
   by the new strict version-ordering check), to confirm: the App token step succeeds,
   quality gates pass, the image builds, and `RELEASE_NOTES.md`/`PR_CHANGES.txt` generation
   behaves as expected. **Dry-run still creates real state** — a release branch, notes and
   version-bump commits, a merge to `main`, a semver tag, a merge back to `develop`, and a
   draft GitHub Release. Plan to manually delete the test tag, revert the two merge
   commits, delete the release branch, and delete the draft release afterward. Because the
   next real release must be newer than whatever tag currently exists, leaving a test tag
   in place would force the next real release past that placeholder version — clean up
   before cutting the next real release.
3. This is a CI/tooling-only change — no application runtime or data migration. Rollback
   of the workflow/documentation changes themselves is a plain revert of the PR.
4. Confirm the release App is a bypass actor on ruleset `1072449` before the first
   dry-run — the release pipeline cannot push or merge to `main`/`develop` otherwise. Do
   **not** relax the ruleset. Run `34515176941` proved the bypass works on `testmain`, and
   the same ruleset covers `main` and `develop`.
5. External prerequisites are owned outside this change. Confirm the GitHub App via the
   dry-run in step 2, and confirm `AWS_ROLE_ARN`, the OIDC IAM role, and shared-script
   checkout via a manual scan of an existing dev ECR tag before a production release.
   Run `34530206067` confirmed both scan jobs authenticated, checked out the shared
   scripts, and generated/uploaded all reports for `1.18.0-1190`. That run predates the
   strict-status correction and does not prove the new job wrapper or release publishing.
