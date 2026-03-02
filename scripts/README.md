# Scripts Directory

This directory contains utility scripts for maintaining the project.

## update-dependencies.sh / update-dependencies.cmd

Convenient wrapper scripts that run the complete dependency update process locally.

### What it does

Executes steps 6-9 of the `security-updates.yml` workflow:
1. Updates existing overrides to latest minor versions (`update-overrides.js`)
2. Adds security overrides for vulnerabilities (`add-security-overrides.js`)
3. Tests if overrides can be removed (`test-overrides.js`)
4. Updates `package-lock.json` with `npm install`

### Usage

**Linux/Mac:**
```bash
./scripts/update-dependencies.sh
```

**Windows:**
```cmd
scripts\update-dependencies.cmd
```

### When to use

- **Before creating a PR:** Ensure dependencies are up-to-date
- **Local testing:** Test override changes before committing
- **Manual updates:** Update dependencies outside of automated workflow
- **Troubleshooting:** Debug issues with the automated workflow

### Example Output

```
============================================
Local Dependency Update Script
============================================

Step 1: Updating existing overrides to latest minor versions...
----------------------------------------------
✓ All overrides are up-to-date

Step 2: Adding security overrides for vulnerabilities...
----------------------------------------------
➕ prismjs: Adding override 1.30.0 (high, currently: 1.27.0)

Step 3: Testing if overrides can be removed...
----------------------------------------------
✓ All overrides are still necessary

Step 4: Updating package-lock.json...
----------------------------------------------
added 0, removed 0, changed 1, audited 1234 packages in 3s

============================================
✅ Dependency update complete!
============================================

📝 Changes detected:

 package.json      | 2 +-
 package-lock.json | 8 ++++----
 2 files changed, 5 insertions(+), 5 deletions(-)

Next steps:
  1. Review the changes: git diff package.json
  2. Run tests: npm test
  3. Run code quality checks: npm run code-quality-check
  4. Build: npm run build
  5. Commit changes: git add package.json package-lock.json
  6. Create commit: git commit -m 'chore(deps): update dependencies'
```

### Prerequisites

- Node.js and npm installed
- Git installed (for change detection)
- Run from project root directory

### Error Handling

The scripts will:
- ✅ Exit with error if not run from project root
- ✅ Check for required script files
- ⚠️ Show warnings but continue if individual scripts have issues
- ❌ Exit with error if `npm install` fails

---

## add-security-overrides.js

Automatically detects and adds npm overrides for vulnerable transitive dependencies.

### How it works

1. Runs `npm audit --json` to detect security vulnerabilities
2. Filters for **high** and **critical** severity issues only
3. Identifies vulnerable **transitive dependencies** (not direct dependencies)
4. For each vulnerable transitive dependency:
   - Checks if a fix version is available
   - Compares current resolved versions against the fix version
   - Adds or updates an override in `package.json` if needed
5. Skips overrides that are already sufficient
6. Sorts overrides alphabetically for consistency

### Usage

```bash
node scripts/add-security-overrides.js
```

### Example Output

```
Analyzing npm audit for vulnerable transitive dependencies...

Found 3 vulnerable packages

⏭ Skipping lodash (severity: moderate)
➕ prismjs: Adding override 1.30.0 (high, currently: 1.27.0, 1.28.0)
✓ dompurify: All versions already meet fix requirement (3.2.5)

=== Adding/Updating Security Overrides ===
  prismjs@1.30.0

✓ Updated package.json with security overrides

⚠ Run `npm install` to apply overrides and re-run `npm audit` to verify fixes
```

### When to use

- After running `npm install` or `ncu -u` to update dependencies
- When `npm audit` reports high/critical vulnerabilities in transitive dependencies
- Before running `test-overrides.js` to clean up unnecessary overrides
- Automatically via CI/CD (see `.github/workflows/ncu-minor-update.yml`)

### Logic

An override is **added** when:
- The package has a high or critical severity vulnerability
- The package is a transitive dependency (not in dependencies or devDependencies)
- A fix version is available
- Some resolved versions are below the fix version
- No existing override exists, OR existing override is below the fix version

An override is **skipped** when:
- Severity is low or moderate (update manually if needed)
- The package is a direct dependency (update in dependencies section instead)
- No fix is available yet
- All resolved versions already meet the fix requirement
- Existing override is already sufficient

## test-overrides.js

Analyzes `package.json` overrides and determines which ones can be safely removed.

### How it works

1. Reads `package.json` and `package-lock.json`
2. For each override in `package.json`:
   - Finds all resolved versions of that package in `package-lock.json`
   - Checks if all resolved versions meet or exceed the override version
   - If yes, the override is no longer necessary and can be removed
3. Updates `package.json` by removing unnecessary overrides
4. Cleans up empty `overrides` section if all overrides are removed

### Usage

```bash
node scripts/test-overrides.js
```

### Example Output

```
Analyzing overrides against resolved versions...

Checking override: prismjs@1.30.0
  ✓ All resolved versions (min: 1.30.0) meet or exceed override 1.30.0

Checking override: dompurify@3.2.5
  ✗ Some versions still below override: 3.1.2

=== Removing unnecessary overrides ===
  Removing: prismjs

✓ Updated package.json
```

### When to use

- After running `npm update` or `ncu -u`
- Before creating a dependency update PR
- When cleaning up old security overrides
- Automatically via CI/CD (see `.github/workflows/ncu-minor-update.yml`)

### Logic

An override is considered **removable** when:
- The package is not found in `package-lock.json` (obsolete override)
- All resolved versions of the package are `>=` the override version

An override is **kept** when:
- Some resolved versions are still below the override version
- This means transitive dependencies still pull in older versions

## update-overrides.js

Updates existing packages in the `overrides` section to their latest minor versions.

### How it works

1. Reads the `overrides` section from `package.json`
2. For each overridden package:
   - Queries npm registry for all available versions
   - Finds the latest compatible minor version (same major version)
   - Updates the override if a newer version is available
3. Sorts overrides alphabetically for consistency
4. Updates `package.json` with new versions

### Usage

```bash
node scripts/update-overrides.js
```

### Example Output

```
Updating packages in overrides section...

⬆ prismjs: 1.29.0 → 1.30.0
✓ dompurify: Already at latest (3.2.5)

=== Updated Overrides ===
  prismjs: 1.29.0 → 1.30.0

✓ Updated package.json with latest override versions
⚠ Run `npm install` to apply changes
```

### When to use

- After adding new overrides to ensure they're at the latest version
- Periodically to keep overrides current
- Before creating dependency update PRs
- Automatically via CI/CD (see `.github/workflows/security-updates.yml`)

### Logic

An override is **updated** when:
- A newer minor or patch version exists in the same major version
- The newer version is greater than the current override version

An override is **kept** when:
- Already at the latest compatible version
- npm registry returns no newer versions
- Version query fails (preserves current version)

### Notes

- Only updates within the same major version (e.g., 1.x.x → 1.y.z, not 1.x.x → 2.0.0)
- Does not remove overrides (use `test-overrides.js` for that)
- Queries npm registry, so requires internet connection
