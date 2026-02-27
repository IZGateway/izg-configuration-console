# Automated Security Override Management

## Overview

Enhanced the NCU (npm-check-updates) workflow to automatically detect and manage npm overrides for vulnerable transitive dependencies.

## What Changed

### New Scripts Created

#### 1. `scripts/add-security-overrides.js`
Automatically detects and adds npm overrides for security vulnerabilities:
- Uses `npm audit --json` to identify vulnerabilities
- Focuses on **high** and **critical** severity issues only
- Only handles **transitive dependencies** (leaves direct dependencies for manual update)
- Adds/updates overrides in `package.json` when fix versions are available
- Intelligently skips overrides that are already sufficient

#### 2. `scripts/test-overrides.js` (enhanced documentation)
Removes unnecessary overrides when all transitive dependencies have caught up:
- Checks if all resolved versions meet or exceed the override version
- Removes overrides that are no longer needed
- Cleans up obsolete overrides

### Workflow Updates

Updated `.github/workflows/ncu-minor-update.yml`:

**Before:**
```yaml
- Install dependencies
- Run ncu
- Install updated dependencies
- Test override removal  # Only removed overrides
- Run tests
```

**After:**
```yaml
- Install dependencies
- Run ncu
- Install updated dependencies
- Add security overrides     # ← NEW: Adds overrides for vulnerabilities
- Test override removal      # Then removes unnecessary ones
- Run tests
```

## How It Works

### Step-by-Step Process

1. **NCU updates direct dependencies** to latest minor versions
2. **npm install** regenerates package-lock.json with new transitive dependencies
3. **add-security-overrides.js** runs:
   - Scans for high/critical vulnerabilities in transitive dependencies
   - Adds overrides to force secure versions
   - Reinstalls if overrides were added
4. **test-overrides.js** runs:
   - Checks if existing overrides are still needed
   - Removes overrides where all dependencies have caught up
5. **Tests and build** run to validate changes
6. **Pull request created** with all changes

### Example Scenario

```
Before update:
- react@18.2.0 → depends on scheduler@0.23.0 (vulnerable, high severity)
- Override: scheduler@0.23.2 (manually added previously)

After NCU + script:
1. ncu updates react to 18.3.1
2. npm install pulls in scheduler@0.24.0 (transitive)
3. add-security-overrides.js: Checks scheduler - all versions >= 0.23.2 ✓
4. test-overrides.js: Removes scheduler override (no longer needed) ✓
5. Result: Clean package.json, no unnecessary overrides
```

### Another Scenario

```
Before update:
- Some package depends on prismjs@1.27.0 (vulnerable, high severity)
- No override exists yet

After NCU + script:
1. ncu updates dependencies
2. npm install still pulls prismjs@1.27.0 (no update in transitive chain)
3. add-security-overrides.js: Detects vulnerability, adds override prismjs@1.30.0 ✓
4. npm install applies override
5. test-overrides.js: Keeps override (still needed)
6. Result: Security vulnerability fixed automatically
```

## Benefits

### ✅ Automation
- No manual intervention needed for transitive dependency vulnerabilities
- Automatically detects and fixes high/critical issues

### ✅ Cleanliness
- Removes overrides as soon as they're no longer needed
- Keeps package.json minimal and maintainable

### ✅ Safety
- Only targets high/critical severity (not noise from low/moderate)
- Never modifies direct dependencies (those need human review)
- Sorts overrides alphabetically for git-friendly diffs

### ✅ Visibility
- Clear console output showing what was added/removed and why
- PR description includes all changes
- Easy to audit security posture

## Usage

### Automatic (CI/CD)
The workflow runs automatically:
- Daily at 3 AM UTC
- Via manual trigger in GitHub Actions

### Manual (Local Development)

```bash
# Update dependencies
ncu --target minor -u
npm install

# Add security overrides for vulnerabilities
node scripts/add-security-overrides.js

# If overrides were added, reinstall
npm install

# Remove unnecessary overrides
node scripts/test-overrides.js

# Verify fixes
npm audit
```

## Configuration

No configuration needed! The scripts work out of the box with:
- Standard npm/package.json structure
- npm audit JSON output
- semver version comparison

## Deployed To

- ✅ `izg-configuration-console`
- ✅ `izg-transformation-ui`

Both projects now have:
- `scripts/add-security-overrides.js`
- `scripts/test-overrides.js`
- `scripts/README.md` (documentation)
- Updated workflow (izg-configuration-console only - transformation-ui needs workflow creation)

## Next Steps (Optional)

1. **Create workflow for izg-transformation-ui**: Copy the ncu-minor-update.yml workflow
2. **Test the scripts**: Run manually to verify behavior on current dependencies
3. **Adjust severity threshold**: Modify to include "moderate" if needed (currently high/critical only)
4. **Add ignore list**: Add ability to skip certain packages if needed
