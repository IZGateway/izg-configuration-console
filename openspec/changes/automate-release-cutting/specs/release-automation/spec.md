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

### Requirement: Release version must be newer than the latest release
A release run SHALL be rejected before any side effect if the requested release version is
not strictly greater (by semantic version ordering) than the highest existing semver tag.
When an explicit next-app-version is supplied for a standard release, it SHALL also be
rejected if it is not strictly greater than the release version.

#### Scenario: Release version not newer than the latest tag
- **WHEN** the latest existing tag is `v1.18.0` and a release is triggered with version
  `1.17.0` or `1.18.0`
- **THEN** the run fails during validation before any side effect occurs

#### Scenario: Supplied app version not newer than the release version
- **WHEN** a standard release for version `1.19.0` is triggered with an explicit next-app
  version of `1.19.0` or lower
- **THEN** the run fails during validation before any side effect occurs

### Requirement: A hotfix release runs from a branch dedicated to that version
A hotfix release run SHALL be rejected before any side effect unless the triggering branch
is named exactly `hotfix/<release-version>` and that branch's history descends from the
configured main branch.

#### Scenario: Hotfix branch name does not match the release version
- **WHEN** a hotfix release for version `1.15.1` is triggered from a branch named
  `hotfix/1.15.0` or `hotfix-1.15.1`
- **THEN** the run fails during validation before any side effect occurs

#### Scenario: Hotfix branch does not descend from main
- **WHEN** a hotfix release is triggered from a branch named `hotfix/1.15.1` that was not
  created from the main branch
- **THEN** the run fails during validation before any side effect occurs

### Requirement: An unrecognized release type is rejected
A release run SHALL be rejected before any side effect if its release-type is anything
other than the two recognized values (standard, hotfix), rather than being treated as one
of them by default.

#### Scenario: Unsupported release type supplied
- **WHEN** a release run is invoked with a release-type value that is neither "standard"
  nor "hotfix"
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

### Requirement: A dry run skips registry publication and the vulnerability scan
When a release is run in dry-run mode, no Docker image SHALL be pushed to any registry, and
the post-release vulnerability scan SHALL NOT run. Every other effect of a real release —
branch creation, the release-notes and version-bump commits, the merge to the main branch,
the semver tag, the merge back to the develop branch, and the GitHub Release — SHALL still
occur, except that the GitHub Release SHALL be marked as a draft instead of published. A
dry run is a rehearsal of the full release, not a no-op: running one against real `main`
and `develop` leaves real branches, commits, a tag, and a draft release behind that must be
cleaned up like any other completed release.

#### Scenario: Dry run builds but does not publish an image
- **WHEN** a release is triggered with dry-run enabled
- **THEN** the Docker image is built but not pushed to any registry
- **AND** the post-release vulnerability scan does not run

#### Scenario: Dry run still performs the branch, tag, and version changes
- **WHEN** a release is triggered with dry-run enabled
- **THEN** the release branch, notes commit, version-bump commit, merge to main, semver
  tag, and merge back to develop all occur exactly as in a real release
- **AND** the created GitHub Release is a draft rather than published

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

### Requirement: The standalone scan reports execution failures accurately
The standalone scan workflow SHALL fail on missing authentication configuration,
authentication or API errors, scan timeout, shared-script checkout or execution failure,
invalid or incomplete report files, or artifact upload failure. It SHALL NOT suppress
these errors with a successful workflow conclusion. A complete report SHALL include
nonempty JSON, CSV, and HTML files, with a JSON findings array. A successful report with
zero findings or findings of any severity SHALL NOT fail solely because of its findings.
This behavior SHALL apply to both manual and release-dispatched scans without changing
the release workflow's conclusion or other repositories' shared-workflow behavior.

#### Scenario: AWS authentication or API access fails
- **GIVEN** a scan was dispatched manually or by a completed release
- **WHEN** AWS authentication or an Inspector2 API call fails
- **THEN** the scan workflow is marked as failed with the error visible
- **AND** any separate release run remains unchanged

#### Scenario: Scan never completes
- **GIVEN** Inspector2 has not reported a completed scan for the requested image
- **WHEN** the polling deadline is reached
- **THEN** the scan workflow fails instead of reporting success after a timeout

#### Scenario: Report generation or publication fails
- **GIVEN** the image scan completed
- **WHEN** shared-script checkout, report generation, or artifact upload fails
- **THEN** the scan workflow is marked as failed

#### Scenario: Report files are incomplete
- **GIVEN** the report script returned successfully
- **WHEN** an expected JSON, CSV, or HTML file is missing or empty, or the JSON lacks a
  findings array
- **THEN** the scan workflow fails instead of claiming a report was produced

#### Scenario: Report contains vulnerabilities or no findings
- **GIVEN** the image scan and report generation completed
- **WHEN** valid reports containing zero findings or findings of any severity are uploaded
- **THEN** the scan workflow is successful
- **AND** vulnerability findings remain informational for the release
