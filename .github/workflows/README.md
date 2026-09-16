# Automated Security and Dependency Update Workflow

This project uses an automated workflow to keep dependencies current and secure.

## Security Updates (`.github/workflows/security-updates.yml`)

**Purpose:** Automatically updates dependencies to their latest **minor versions** and addresses security vulnerabilities at all severity levels (critical, high, moderate, and low).

### When it runs:
- **Schedule:** Daily at 3 AM UTC
- **Manual:** Can be triggered via GitHub Actions UI

### What it does:
1. Checks out `develop` using a repository-scoped Dependency Bot App token, including on manual runs
2. Runs `ncu --target minor -u` to update dependencies
3. If no changes detected, exits with a summary
4. If changes detected:
   - Creates a new branch (`automated-security-updates-YYYYMMDD-HHMMSS`)
   - Installs updated dependencies (without `--legacy-peer-deps`)
   - Adds security overrides for vulnerable transitive dependencies (all severity levels)
   - Runs `scripts/test-overrides.js` to remove unnecessary overrides
   - Commits the changes, or stops without a PR if no tracked changes remain after cleanup
   - Runs linting, type-checking, and build as blocking gates; Jest remains non-blocking
   - Runs a non-blocking security audit with `--audit-level=low`
   - Creates a PR to `develop` as `izg-dependency-bot[bot]`
   - Waits for PR checks, then squash-merges through the GitHub API using the App's PR-only bypass
   - Requires an open, non-draft, same-repository PR with the expected branch and commit, changing only `package.json` and/or `package-lock.json`
   - Rechecks PR metadata after waiting and pins the merge to the checked commit SHA
   - Deletes the branch only after confirmed merge success, if it still points to that commit

The merge step waits up to 20 polling attempts (15 seconds apart) for checks to
register, then watches them with fail-fast behavior. Missing checks, failed checks,
API errors, unexpected PR changes, or the 20-minute step timeout stop the merge.
The existing non-blocking Jest and audit policy is unchanged; green PR checks do
not guarantee passing unit tests or a clean dependency audit.

### Required GitHub setup

- Install **IZG Dependency Bot** on this repository. Grant the App Contents and Pull requests read/write, and Checks and Commit statuses read access.
- Make `DEPENDENCY_BOT_APP_ID` and `DEPENDENCY_BOT_APP_KEY` available as Actions secrets. Existing npm credentials remain unchanged; this workflow no longer uses `IZGW_ALL_REPO_ACCESS_TOKEN`.
- Separate the shared `main*`/`develop*` ruleset so the bot has **PR-only bypass on `develop`**, not `main`. Preserve existing protections and other actors' access.
- Account for this repository's CodeQL rule explicitly: a ruleset bypass covers the ruleset, not just its approval requirement. The workflow waits for reported PR checks; it does not create a CodeQL scan or replace that policy.

These repository settings are not configured by the workflow. A manual run can
create and merge a real dependency PR once the App and rules are ready. Selecting
a feature branch chooses the workflow version to run, but dependency changes
always start from `develop`.

### Key Features:
- **Safe Updates:** Only minor version updates (no breaking changes)
- **Security-First:** Addresses all security vulnerabilities (critical, high, moderate, low)
- **Automatic Overrides:** Adds package overrides for vulnerable transitive dependencies
- **Override Cleanup:** Automatically removes unnecessary package overrides
- **Proper Peer Dependencies:** Uses npm's native peer dependency resolution (no `--legacy-peer-deps`)
- **Quality Gates:** Lint, type-check, build, and PR-check failures block merging; Jest and the dependency audit remain non-blocking
- **Transparent:** Detailed summary in PR description

### Labels applied:
- `dependencies`
- `automated`
- `security`

## Manual Triggers

The workflow can be manually triggered:

1. Go to **Actions** tab in GitHub
2. Select the "Security Updates" workflow
3. Click **Run workflow**
4. Select the branch (if applicable)
5. Click **Run workflow** button

---

## Understanding Security Overrides

The `scripts/add-security-overrides.js` script automatically adds package overrides for vulnerable transitive dependencies at all severity levels (critical, high, moderate, and low). This ensures that even indirect dependencies are updated to secure versions.

## Understanding the Override Removal

The `scripts/test-overrides.js` script checks if overrides are still needed by:

1. Reading all resolved versions from `package-lock.json`
2. Comparing them to the override version
3. If all resolved versions meet/exceed the override → Remove it
4. If some versions are still below → Keep it

**Example:**

```json
{
  "overrides": {
    "prismjs": "1.30.0"
  }
}
```

If `package-lock.json` shows all instances of `prismjs` are `>= 1.30.0`, the override is no longer needed.

---

## Preventing Workflow Triggering on Workflow File Changes

To avoid infinite loops and unnecessary workflow runs when workflow files are updated, workflows triggered by `push` or `pull_request` events use a refined `paths-ignore` pattern:

```yaml
on:
  pull_request:
    branches:
      - develop
    paths-ignore:
      - '.github/workflows/*'
      - '!.github/workflows/deploy.yml'
  workflow_dispatch:
```

### How This Works:

- **`.github/workflows/*`** - Ignores changes to all workflow files
- **`!.github/workflows/deploy.yml`** - Exception: DO NOT ignore changes to `deploy.yml` itself

This pattern means:
- ✅ Changes to `deploy.yml` **WILL** trigger the deploy workflow (allows testing workflow changes)
- ❌ Changes to `security-updates.yml`, `gitleaks.yml`, etc. **WILL NOT** trigger the deploy workflow
- ❌ Automated dependency PRs that only touch workflow files **WILL NOT** trigger builds

### Why This Matters:

**Important:** GitHub Actions uses the workflow file from the branch where the push/PR occurred, not the default branch. This means:

1. **Test Workflow Changes** - When you modify `deploy.yml`, you need it to run so you can verify your changes work
2. **Filters Workflow-Only Changes** - Changes only to ignored workflow files do not trigger deployment. Dependency PRs changing package files still trigger it, including those created by the Dependency Bot App.
3. **Reduces CI Load** - Changes to unrelated workflow files don't trigger unnecessary builds

### Testing Workflow Changes:

When you modify a workflow file:

1. **Changes to the workflow itself** (e.g., `deploy.yml`) → Workflow WILL run with your changes
2. **Changes to other workflows** (e.g., `security-updates.yml`) → Workflow will NOT run
3. **Manual trigger** - Always available via `workflow_dispatch` for testing
4. **Test in a PR** - Create a PR to see if the workflow triggers as expected

---

## Troubleshooting

### Workflow fails at build step
- Check the build logs in the workflow run
- May indicate breaking changes in updated packages
- Review the PR and potentially exclude problematic packages

### Override not removed when expected
- Check that all transitive dependencies have updated
- Some packages may still pull in older versions
- Run `npm list <package-name>` to see the dependency tree

### Tests fail after updates
- Review the specific test failures
- May need manual intervention for API changes
- Consider updating tests or pinning problematic packages

---

## Best Practices

1. **Review PRs promptly** - Security updates should be merged quickly
2. **Test locally** - For major changes, pull the branch and test
3. **Monitor security audit** - Check the audit results in PR descriptions
4. **Keep overrides minimal** - Only use when absolutely necessary
5. **Update regularly** - The more frequent, the smaller the changes
6. **Prioritize security** - Address all severity levels, not just critical/high

---

## Configuration

### Adjust Schedule

Edit the `cron` expression in the workflow file:

```yaml
on:
  schedule:
    - cron: '0 3 * * *'  # Daily at 3 AM UTC
```

### Branch Behavior

The workflow definition comes from the branch that triggered it, but checkout
always uses `develop`:
- **Scheduled runs** - Uses the workflow definition on the default branch
- **Manual triggers** - Uses the workflow definition on the selected branch
- **Dependency updates** - Always creates the update branch from `develop`, not the selected feature branch

To try workflow changes before merging, push them to a feature branch and trigger
that version manually. Source and package files on the feature branch are not
included in the dependency PR.

### Modify Update Strategy

Change the `ncu` flags in the workflow:

```yaml
# Patch only
ncu --target patch -u

# Minor and patch (current default)
ncu --target minor -u

# All updates (including major - not recommended)
ncu --target latest -u
```
