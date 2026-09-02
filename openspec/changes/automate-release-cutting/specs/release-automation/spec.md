## Purpose

Defines the observable behavior of cutting a standard or hotfix release for
izg-configuration-console: what a release run validates, publishes, records, and rolls
back, regardless of which workflow engine implements it.

## ADDED Requirements

### Requirement: Standard releases only run from the develop branch
A standard release run SHALL be rejected before any branch, tag, or file is changed if it
is not triggered from the `develop` branch (or the configured develop-branch name).

#### Scenario: Standard release triggered from a feature branch
- **WHEN** a standard release is triggered while the current branch is `feature/foo`
- **THEN** the run fails during validation
- **AND** no branch, tag, commit, or image is created

### Requirement: Hotfix releases only run from a hotfix branch
A hotfix release run SHALL be rejected before any branch, tag, or file is changed if it is
not triggered from a branch matching `hotfix/*`.

#### Scenario: Hotfix release triggered from develop
- **WHEN** a hotfix release is triggered while the current branch is `develop`
- **THEN** the run fails during validation
- **AND** no branch, tag, commit, or image is created

### Requirement: Release version must be well-formed and unused
A release run SHALL be rejected before any side effect if the requested release version is
not in `X.Y.Z` format, if a Git tag for that version already exists, or — for a standard
release — if a release branch for that version already exists.

#### Scenario: Version already tagged
- **WHEN** a standard release is triggered with a version whose Git tag already exists
- **THEN** the run fails during validation
- **AND** no new branch, commit, tag, or image is created

#### Scenario: Malformed version
- **WHEN** a release is triggered with a version string that is not `X.Y.Z` (for example
  `1.2` or `1.2.0-rc1`)
- **THEN** the run fails during validation before any side effect occurs

### Requirement: Release notes are generated from merged pull requests
On every release run, an entry SHALL be added to `RELEASE_NOTES.md` listing the titles of
pull requests merged since the previous semver tag, dated with the run date and headed by
the release version. If no merged pull requests are found, a minimal entry naming the
release version SHALL be used instead of leaving the section empty.

#### Scenario: Release notes entry reflects merged PRs
- **WHEN** three pull requests were merged to `develop` since the last release tag
- **THEN** the new `RELEASE_NOTES.md` entry lists all three PR titles under the new release
  version's heading

#### Scenario: No merged PRs since the last tag
- **WHEN** a release is cut with no pull requests merged since the previous tag
- **THEN** the new `RELEASE_NOTES.md` entry still contains a heading for the release
  version with a fallback line, rather than an empty changes section

### Requirement: A high or critical vulnerability blocks a release
A release run SHALL fail before any image is pushed or any branch is merged if
`npm audit` reports an unresolved high- or critical-severity finding. Moderate and low
findings SHALL NOT block the release.

#### Scenario: High-severity finding present
- **WHEN** the dependency tree at release time contains an unresolved high-severity
  vulnerability
- **THEN** the release run fails at the audit step
- **AND** no image is pushed and no branch is merged

#### Scenario: Only moderate findings present
- **WHEN** the dependency tree contains only moderate- or low-severity findings
- **THEN** the release run continues past the audit step

### Requirement: Unit test failures do not block a release
A failing `npm test` run SHALL be recorded in the release run's output but SHALL NOT
prevent the release from completing.

#### Scenario: Test suite fails
- **WHEN** `npm test` exits with a failure during a release run
- **THEN** the release run continues to the remaining steps
- **AND** the test failure is visible in the run's log or summary

### Requirement: A dry run performs no persistent side effect
When a release is run in dry-run mode, no Docker image SHALL be pushed to any registry, no
branch SHALL be merged, and any created GitHub Release SHALL be marked as a draft. All
validation and quality-gate steps SHALL still execute.

#### Scenario: Dry run does not publish
- **WHEN** a release is triggered with dry-run enabled
- **THEN** the Docker image is built but not pushed to any registry
- **AND** no merge to the main or develop branch occurs
- **AND** any GitHub Release created is a draft

### Requirement: A successful real release publishes to every configured registry
A successful, non-dry-run release SHALL push the built image to the GitHub Container
Registry, the AWS ECR dev registry, and the APHL ECR registry, unless the APHL push is
explicitly skipped for that run.

#### Scenario: Real release publishes to all registries
- **WHEN** a standard release completes successfully without the APHL-skip option set
- **THEN** the image is present in GHCR, AWS ECR, and APHL ECR tagged with the release
  version

#### Scenario: APHL push explicitly skipped
- **WHEN** a release is triggered with the APHL-skip option set
- **THEN** the image is pushed to GHCR and AWS ECR
- **AND** no push to APHL ECR occurs

### Requirement: A successful standard release advances develop to the next version
On a successful standard release, `develop` SHALL be updated with the release's notes and
merge history, and its `package.json` version SHALL be advanced beyond the released
version. A hotfix release SHALL NOT change the version already present on `develop`.

#### Scenario: Standard release bumps develop's version
- **WHEN** a standard release for version `1.18.0` completes successfully
- **THEN** `develop`'s `package.json` version is greater than `1.18.0`

#### Scenario: Hotfix release does not bump develop's version
- **WHEN** a hotfix release completes successfully
- **THEN** `develop`'s `package.json` version is unchanged by the hotfix run

### Requirement: A failed release only reverts what that run created
If a release run fails after creating persistent state (a branch, a merge commit, a tag, or
a GitHub Release), the run SHALL revert or delete only the specific state it created in
that run, and SHALL NOT alter branches, tags, or releases that existed before the run
started.

#### Scenario: Failure after tagging but before merging to develop
- **WHEN** a release run creates the semver tag and then fails before merging back to
  develop
- **THEN** the created tag is deleted
- **AND** develop is left unchanged

#### Scenario: Failure before any persistent state is created
- **WHEN** a release run fails during validation, before any branch, tag, or release is
  created
- **THEN** no cleanup action is taken because there is nothing to revert

### Requirement: The vulnerability scan never blocks a release
After a successful, non-dry-run release, an advisory scan of the published image SHALL run
and its result SHALL be reported, but a scan failure, timeout, or empty result SHALL NOT
cause the release run to be marked as failed.

#### Scenario: Scan finds vulnerabilities
- **WHEN** the post-release scan finds vulnerabilities in the published image
- **THEN** the release run is still reported as successful
- **AND** the scan findings are available in the run's report artifact

#### Scenario: Scan errors or times out
- **WHEN** the post-release scan cannot complete (error or timeout)
- **THEN** the release run is still reported as successful
