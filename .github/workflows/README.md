# Automated Security and Dependency Update Workflow

This project uses an automated workflow to keep dependencies current and secure.

## Security Updates (`.github/workflows/security-updates.yml`)

**Purpose:** Automatically updates dependencies to their latest **minor versions** and addresses security vulnerabilities at all severity levels (critical, high, moderate, and low).

### When it runs:
- **Schedule:** Daily at 3 AM UTC
- **Manual:** Can be triggered via GitHub Actions UI

### What it does:
1. Checks out the `develop` branch
2. Runs `ncu --target minor -u` to update dependencies
3. If no changes detected, exits with a summary
4. If changes detected:
   - Creates a new branch (`automated-security-updates-YYYYMMDD-HHMMSS`)
   - Installs updated dependencies
   - Adds security overrides for vulnerable transitive dependencies (all severity levels)
   - Runs `scripts/test-overrides.js` to remove unnecessary overrides
   - Commits the changes
   - Runs linting, type-checking, tests, and build
   - Runs security audit with `--audit-level=low`
   - Creates a PR to `develop` branch

### Key Features:
- **Safe Updates:** Only minor version updates (no breaking changes)
- **Security-First:** Addresses all security vulnerabilities (critical, high, moderate, low)
- **Automatic Overrides:** Adds package overrides for vulnerable transitive dependencies
- **Override Cleanup:** Automatically removes unnecessary package overrides
- **Full Testing:** Runs all quality checks before creating PR
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
  push:
    branches:
      - 'release/**'
    paths-ignore:
      - '.github/workflows/*'
      - '!.github/workflows/deploy.yml'
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
2. **Prevents Infinite Loops** - Automated workflows (like security-updates.yml) that create PRs won't trigger other workflows
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

### Change Target Branch

Update the `ref` in the checkout step:

```yaml
- name: Checkout develop branch
  uses: actions/checkout@v4
  with:
    ref: develop  # Change to your preferred branch
```

### Modify Update Strategy

Change the `ncu` flags:

```yaml
# Patch only
ncu --target patch -u

# Minor and patch
ncu --target minor -u

# All updates (including major - not recommended)
ncu --target latest -u
```

