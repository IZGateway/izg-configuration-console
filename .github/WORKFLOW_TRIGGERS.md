# Workflow Trigger Configuration - Quick Reference

## Problem Solved
Prevent automated dependency update PRs and unrelated workflow changes from triggering builds, while still allowing workflow files to be tested when modified.

## Solution
Use negated path patterns in `paths-ignore` to exclude all workflow files except the workflow itself:

```yaml
on:
  push:
    branches:
      - 'release/**'
    paths-ignore:
      - '.github/workflows/*'           # Ignore all workflow files
      - '!.github/workflows/deploy.yml' # EXCEPT this workflow itself
  pull_request:
    branches:
      - develop
    paths-ignore:
      - '.github/workflows/*'
      - '!.github/workflows/deploy.yml'
  workflow_dispatch:
```

## How It Works

### Pattern Explanation
- `.github/workflows/*` - Match all files in the workflows directory (single level, no subdirectories)
- `!.github/workflows/deploy.yml` - Negation pattern that creates an exception

### Trigger Behavior

| Change Made | deploy.yml Triggered? | Reason |
|-------------|----------------------|---------|
| Modify `deploy.yml` | ✅ YES | Exception pattern allows it |
| Modify `security-updates.yml` | ❌ NO | Ignored by first pattern |
| Modify `gitleaks.yml` | ❌ NO | Ignored by first pattern |
| Modify `src/app.js` | ✅ YES | Not in `.github/workflows/` |
| Security update PR touching only workflows | ❌ NO | All changes are ignored |

## Key GitHub Actions Behavior

**Important:** When a push or PR event occurs, GitHub Actions uses the workflow file **from the branch where the event occurred**, NOT the default branch.

This means:
- You can test workflow changes by pushing them to a branch
- The modified workflow will run with your changes
- You need to allow the workflow to trigger on changes to itself for testing

## Applied To

### izg-configuration-console
- ✅ `.github/workflows/deploy.yml`

### izg-transformation-ui  
- ✅ `.github/workflows/deploy.yml`

### v2tofhir
- ✅ `.github/workflows/develop.yml`

## Benefits

1. **Prevents Infinite Loops** - Automated workflows creating PRs don't trigger endless builds
2. **Testable Workflows** - Can test workflow changes by pushing to a branch
3. **Reduces CI Load** - Unrelated workflow changes don't trigger builds
4. **Clear Intent** - Only code changes (and the workflow itself) trigger deployments

## Testing Workflow Changes

### Option 1: Push to Branch (Recommended)
Push your workflow changes to a feature branch and verify the workflow runs with your changes.

### Option 2: Manual Trigger
Use `workflow_dispatch` from the GitHub Actions UI to manually trigger the workflow.

### Option 3: Create PR
Create a PR with your workflow changes to see if it triggers correctly on the PR event.

## Troubleshooting

### Workflow not triggering when expected
- Check if all changes are in `.github/workflows/` directory
- Verify the exception pattern matches your workflow filename exactly
- Check branch name matches the pattern in the workflow

### Workflow triggering when it shouldn't  
- Ensure you're using `.github/workflows/*` (single asterisk) not `/**` (double asterisk)
- Verify the exception pattern is for the workflow file itself only
- Check if there are other trigger conditions (schedule, workflow_dispatch, etc.)

## References
- [GitHub Actions: Workflow Syntax - on.<push|pull_request>.paths](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#onpushpull_requestpull_request_targetpathspaths-ignore)
- [GitHub Actions: Filter Pattern Cheat Sheet](https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions#filter-pattern-cheat-sheet)
