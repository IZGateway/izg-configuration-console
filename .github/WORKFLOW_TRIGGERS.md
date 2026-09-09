# Workflow Trigger Configuration

## Deployment workflow

`.github/workflows/deploy.yml` runs for pull requests to `develop` and by manual
dispatch. It ignores unrelated workflow and script changes while allowing edits to
`deploy.yml` itself to exercise the changed workflow.

Pushing a `release/**` branch no longer triggers deployment. Release images are built
once by the release pipeline.

## Release workflows

### Standard release (`release.yml`)

Run manually from `develop`.

| Input | Required | Default | Purpose |
|---|---|---|---|
| `release-version` | Yes | - | New `X.Y.Z` release version |
| `app-version` | No | Next minor | Version assigned to `develop` after release |
| `develop-branch` | No | `develop` | Develop branch |
| `main-branch` | No | `main` | Main branch |
| `dry-run` | No | `false` | Build without publishing images and create a draft release |
| `skip-aphl` | No | `false` | Skip APHL ECR publication |

### Hotfix release (`hotfix.yml`)

Run manually from a branch named exactly `hotfix/<release-version>`, created from
`main`. It accepts the standard release inputs except `app-version`; hotfixes merge back
to `develop` without changing its package version.

Both entry points use the same `release-${{ github.repository }}` concurrency group, so
only one standard or hotfix release runs at a time.

### Reusable release implementation (`_release_common.yml`)

The entry-point workflows call `_release_common.yml` with `secrets: inherit`. The
reusable workflow validates all inputs before persistent changes, creates or reuses the
release branch, generates release notes, applies package versions, runs quality gates,
builds one image, publishes it to configured registries, merges and tags the release,
creates the GitHub Release, and performs scoped cleanup after failures.

Dry runs still create branches, commits, a tag, branch merges, and a draft GitHub
Release. They only skip registry publication and the post-release vulnerability scan.

The workflow requires the `RELEASE_AUTOMATION_APP_ID` and
`RELEASE_AUTOMATION_APP_KEY` secrets. The installed GitHub App needs repository
permissions for contents, packages, pull requests, and workflows. The entry-point
workflows grant `id-token: write` separately for OIDC.

## Inspector2 vulnerability scan (`scan-ecr-image.yml`)

The advisory scan can run manually with an `image-tag` or from `_release_common.yml`
after a real release. It waits up to 20 minutes for Inspector2 to scan
`izg-configuration-console:<image-tag>`, then calls
`IZGateway/izg-dependency-scripts/.github/workflows/ecr-scan-report.yml@v1` to produce
the report artifact.

The scan requires:

- An `AWS_ROLE_ARN` repository variable for OIDC authentication.
- An IAM role with `inspector2:ListCoverage` and `inspector2:ListFindings`.
- Cross-repository permission to call the shared report workflow.

The release build continues to use the existing AWS access-key secrets. OIDC is used
only for the advisory scan.

## Testing workflow changes

GitHub Actions reads a workflow from the branch that triggered it. Push changes to a
feature branch, then use `workflow_dispatch` from that branch to test manual workflows.

## References

- [GitHub Actions workflow syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [Workflow schedule](./WORKFLOW_SCHEDULE.md)
