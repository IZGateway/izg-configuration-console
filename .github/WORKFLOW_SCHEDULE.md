# GitHub Actions Workflow Schedule Summary

This document provides an overview of all scheduled workflows to help avoid conflicts.

## Daily Schedule (UTC)

| Time | Workflow | Description | Days |
|------|----------|-------------|------|
| **03:00** | NCU Minor Dependency Updates | Updates dependencies to latest minor versions | Daily |
| **07:00** | Playwright E2E Tests (Dev) | Runs end-to-end tests on dev environment | Mon-Fri |

## Workflow Details

### 03:00 UTC - NCU Minor Dependency Updates
- **File:** `.github/workflows/ncu-minor-update.yml`
- **Branch:** `develop`
- **Purpose:** Keep dependencies current with minor version updates
- **Frequency:** Daily
- **Duration:** ~5-10 minutes (includes build and tests)

### 07:00 UTC - Playwright E2E Tests
- **File:** `.github/workflows/playwright-nightly.yml`
- **Purpose:** Automated end-to-end testing
- **Frequency:** Weekdays (Monday-Friday)
- **Duration:** ~10-15 minutes

## Conflict Avoidance

The schedules are designed to avoid conflicts:

1. **3 AM UTC** - Dependency updates run first (quietest time)
2. **7 AM UTC** - E2E tests run after dependency updates complete

**Time Gap:**
- 4 hours between dependency updates and E2E tests

This spacing ensures:
- No resource contention between workflows
- Each workflow completes before the next begins
- Failed workflows don't impact subsequent runs

## Manual Triggers

All workflows support manual triggering via `workflow_dispatch`, which can be initiated from the GitHub Actions UI regardless of schedule.

## Integration with Other Workflows

### Deploy Workflow
- **Triggered by:** Pull requests to `develop` and manual dispatch
- **No conflict:** Event-driven and no longer triggered by `release/**` pushes

### Standard and Hotfix Releases
- **Entry points:** `.github/workflows/release.yml` and `.github/workflows/hotfix.yml`
- **Triggered by:** Manual dispatch only
- **Serialization:** Both use the same concurrency group and never run in parallel
- **Best practice:** Complete security updates before cutting a release

### Advisory Image Scan
- **File:** `.github/workflows/scan-ecr-image.yml`
- **Triggered by:** Real releases or manual dispatch
- **No conflict:** Runs after image publication and does not block the release job

### Gitleaks
- **Triggered by:** Push and pull request events
- **No conflict:** Event-driven, not scheduled

## Recommendations

### If you need to add new scheduled workflows:

- **Avoid:** 03:00, 07:00 UTC
- **Safe times:** 00:00-02:00 UTC, 04:00-06:00 UTC, 08:00-23:00 UTC
- **Consider:** Weekend slots (Saturday/Sunday) for intensive tasks
- **Best practice:** Leave at least 1 hour gap between scheduled workflows

### If workflow durations increase:

Monitor the actual runtime of workflows. If a workflow takes longer than expected:

1. Check if it overlaps with the next scheduled job
2. Adjust timing to maintain gaps
3. Consider running less frequently if needed
4. Optimize the workflow itself (caching, parallelization)

---

**Last Updated:** February 24, 2026
