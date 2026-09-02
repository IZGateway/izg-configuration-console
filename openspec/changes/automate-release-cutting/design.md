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
pushes, merges, tags, and reverts. Alternative considered: the default `GITHUB_TOKEN` —
rejected because it cannot push commits that modify workflow files and its commits don't
trigger other workflows, both of which the release path needs (the branch it pushes to may
later need its own CI to run). The user owns installing this App on the repo as a
prerequisite outside this change.

**Same reusable `scan-ecr-image.yml`, invoked as a sibling job.**
`_release_common.yml` calls `scan-ecr-image.yml` with `needs: release`, gated on
non-dry-run, exactly as `izg-transformation-ui` does. It authenticates via OIDC
(`AWS_ROLE_ARN` repo variable) and calls
`IZGateway/izg-dependency-scripts/.github/workflows/ecr-scan-report.yml@v1`, scanning
`izg-configuration-console:<version>` instead of `izg-transformation-ui:<version>`.
Alternative considered: inlining the scan steps directly in `_release_common.yml` —
rejected because it would duplicate logic already centralized in `izg-transformation-ui`
and require re-solving the same 4-level nesting GitHub allows.

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

- **[Risk]** The GitHub App may not be installed / secrets may not resolve on this repo
  yet, so the first real run fails at the "Generate Release Automation App Token" step.
  → **Mitigation**: exercise `release.yml` in dry-run mode first; dry-run still runs
  validation and the app-token step, surfacing this failure with no persistent side
  effects to clean up.
- **[Risk]** `izg-dependency-scripts` may not have granted this repo access to call its
  reusable `ecr-scan-report.yml` workflow yet.
  → **Mitigation**: the scan runs as a sibling job (`needs: release`) — its failure does
  not fail the `release` job itself, so a release can still succeed while this access gap
  is resolved separately. The overall workflow run may still show as failed/partial in the
  Actions UI; that is an accepted, pre-existing trade-off inherited from
  `izg-transformation-ui`.
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
   dry-run mode from `develop` with a throwaway version to confirm: the App token step
   succeeds, quality gates pass, the image builds, and `RELEASE_NOTES.md`/`PR_CHANGES.txt`
   generation behaves as expected. Dry-run performs no push or merge, so nothing needs to
   be undone afterward.
3. This is a CI/tooling-only change — no application runtime or data migration. Rollback
   is a plain revert of the PR, since all changes are workflow and documentation files.
4. External prerequisites (GitHub App installation, `AWS_ROLE_ARN` + OIDC IAM role,
   `izg-dependency-scripts` cross-repo workflow access) are owned outside this change and
   must be confirmed working via the dry-run in step 2 before this pipeline is used for an
   actual production release.
