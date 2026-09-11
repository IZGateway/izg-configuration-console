# Workflow Trigger Configuration

## Deployment workflow

`.github/workflows/deploy.yml` runs for pull requests to `develop` and by manual
dispatch. Its ordered `paths` filters exclude unrelated workflow changes but include
`deploy.yml` and `scan-ecr-image.yml`, so scan-only changes run the regression suite.

Pushing a `release/**` branch no longer triggers deployment. Release images are built
once by the release pipeline.

`deploy.yml` owns the `latest` tag in the dev ECR. The dev ECS task definition pins
`container_image_tag = "latest"`, so that tag is a deployment pointer. The release
pipeline does not write it.

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
`RELEASE_AUTOMATION_APP_KEY` secrets. `RELEASE_AUTOMATION_APP_ID` holds the numeric App
ID and goes to the `app-id` input of `actions/create-github-app-token`. Do not switch that
secret to the `client-id` input. `client-id` needs the App Client ID, which is a different
value, and `izg-transformation-ui` shares this secret. The installed GitHub App needs repository
permissions for contents, pull requests, and workflows. The release workflows grant the
`GITHUB_TOKEN` `packages: write` for GHCR and `actions: write` to dispatch the advisory
scan. The scan workflow grants `id-token: write` separately for AWS OIDC.

## Inspector2 vulnerability scan (`scan-ecr-image.yml`)

The advisory scan can run manually with an `image-tag`; `_release_common.yml` dispatches
it as a separate workflow run after a real release. It waits up to 20 minutes for
Inspector2 to scan `izg-configuration-console:<image-tag>`, then checks out
`IZGateway/izg-dependency-scripts@v1` and runs its unchanged
`.github/scripts/ecr-scan-report.sh` to produce the JSON, CSV, and HTML report artifact.
The console owns the job steps instead of calling the shared workflow, which tolerates
job failures for its other callers.

The scan requires:

- An `AWS_ROLE_ARN` repository variable for OIDC authentication.
- An IAM role with `inspector2:ListCoverage` and `inspector2:ListFindings`.
- Read access to check out the shared report scripts.

The release build continues to use the existing AWS access-key secrets. OIDC is used
only for the advisory scan. Scan dispatch and execution cannot change the release
workflow's result. However, authentication/API errors, scan timeout, checkout or report
generation failures, and missing/empty report files fail the **scan run**. Artifact
upload failures also fail that run. A completed report succeeds even if it contains HIGH
or CRITICAL findings, or zero findings. "Advisory" means the release is unaffected, not
that scan execution errors are hidden.

## Testing workflow changes

GitHub Actions reads a workflow from the branch that triggered it. Push changes to a
feature branch, then use `workflow_dispatch` from that branch to test manual workflows.
Run `npm run test:release-validation` locally to exercise every release validation path
against a temporary Git remote without changing repository refs. `deploy.yml`'s
`code-quality-check` job runs the same command, so a pull request that only edits
`.github/scripts/` still gets checked.
Run `npm run test:scan-workflow` for scan status regression cases. These execute the
workflow's shell steps with mocked AWS/time/report-script responses; no AWS credentials
or live scan are needed. The same suite runs in `deploy.yml`.

## References

- [GitHub Actions workflow syntax](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions)
- [Workflow schedule](./WORKFLOW_SCHEDULE.md)
