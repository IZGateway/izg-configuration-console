# Security Updates Workflow - Override Updates Fix

## Problem Identified

The security-updates workflow was missing upgrades to packages in the `overrides` section:
- `minimatch`
- `js-yaml` 
- `fast-xml-parser`

### Root Cause

1. **`ncu --target minor` only updates `dependencies` and `devDependencies`** - It completely ignores the `overrides` section
2. **`add-security-overrides.js` is reactive** - It only adds/updates overrides when npm audit reports vulnerabilities
3. **Overrides can become stale** - Even if no vulnerabilities exist, newer minor versions may be available

## Solution Implemented

### New Script: `update-overrides.js`

Created a new script that proactively checks and updates all packages in the `overrides` section:

**Location:** `scripts/update-overrides.js`

**Functionality:**
- Iterates through all packages in `overrides`
- Queries npm registry for available versions
- Finds latest minor version within same major version
- Updates to latest compatible version
- Maintains alphabetical sorting

**Example Output:**
```
Updating packages in overrides section...

✓ dompurify: Already at latest (3.3.1)
⬆ fast-xml-parser: 5.3.6 → 5.4.1
⬆ minimatch: ^10.2.1 → 10.2.4

=== Updated Overrides ===
  fast-xml-parser: 5.3.6 → 5.4.1
  minimatch: ^10.2.1 → 10.2.4

✓ Updated package.json with latest override versions
```

### Workflow Changes

Updated `.github/workflows/security-updates.yml`:

**Before:**
- Only checked `ncu --target minor`
- Stopped early if no ncu changes
- Only ran `add-security-overrides.js` after branching

**After:**
- Checks `ncu --target minor` → `has_ncu_changes`
- Checks `update-overrides.js` → `has_override_changes`
- Checks `add-security-overrides.js` → `has_security_changes`
- Combines all three checks → `has_changes`
- Only stops if ALL three have no changes
- Runs all checks BEFORE creating branch

**Key Benefits:**
1. ✅ Catches override updates even when no dependency changes
2. ✅ Proactive updates instead of reactive (waiting for CVEs)
3. ✅ Consistent minor version updates across all package sources
4. ✅ Better PR descriptions with override update details

## Files Modified

### Created
- `izg-configuration-console/scripts/update-overrides.js`
- `izg-transformation-ui/scripts/update-overrides.js`

### Modified
- `izg-configuration-console/.github/workflows/security-updates.yml`

## Testing

Ran the script locally:
```bash
node scripts/update-overrides.js
```

Results: All overrides are now up-to-date (3.3.1, 5.4.1, 10.2.4)

## Next Steps

The next scheduled workflow run will:
1. Check for ncu updates
2. Check for override updates ← **NEW**
3. Check for security overrides
4. Create PR only if any of the three find updates

## Why This Matters

**Before:** Overrides could lag behind for months until a CVE was reported
**After:** Overrides update proactively with every workflow run

This ensures:
- Security fixes arrive faster
- Bug fixes in transitive dependencies are picked up
- Consistency with dependency update strategy (minor versions)
