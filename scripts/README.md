# Scripts Directory

This directory contains utility scripts for maintaining the project.

## fix-all-vulnerabilities.js ⭐ NEW

**Comprehensive automated vulnerability fixer** - Updates direct dependencies and adds overrides for all vulnerabilities in a single run.

### How it works

1. Runs `npm audit --json` to detect all security vulnerabilities
2. For each vulnerability:
   - **Direct dependencies**: Updates to latest compatible version (non-breaking)
   - **Transitive dependencies**: Adds overrides, even when npm suggests parent updates
   - **Queries npm registry** for latest versions when audit data is unclear
3. Applies all changes to `package.json` in one operation
4. Provides clear summary of all changes made

### Usage

```bash
# Recommended: Use npm script
npm run fix-vulnerabilities

# Or run directly
node scripts/fix-all-vulnerabilities.js
npm install
npm audit
```

### Example Output

```
🔍 Comprehensive Vulnerability Fixer - Analyzing and fixing vulnerabilities...

Found 13 vulnerable packages

⬆ jest-environment-jsdom: Updating direct dependency (29.7.0 → 30.2.0)
💡 jsdom: npm suggests updating 'jest-environment-jsdom', trying direct override instead...
   → Found latest version: 28.1.0
➕ jsdom: Adding override 28.1.0 (low, currently: 20.0.3)
➕ dompurify: Adding override 3.3.2 (moderate)
➕ immutable: Adding override 5.1.5 (high)
✓ qs: All versions already meet fix requirement

=== Applying Fixes ===

📦 Direct Dependency Updates:
  jest-environment-jsdom@30.2.0 (devDependencies)

🔧 Override Updates:
  ajv@8.18.0
  dompurify@3.3.2
  immutable@5.1.5
  js-yaml@4.1.1
  qs@6.15.0
  underscore@1.13.8

✅ Updated package.json

📋 Next Steps:
  1. Run: npm install
  2. Run: npm audit
  3. Run: npm test
  4. Review and commit changes
```

### Key Features

✅ **Updates direct dependencies** - Detects and updates deps like jest-environment-jsdom  
✅ **Handles "parent update" cases** - Adds overrides when npm suggests updating parent  
✅ **Queries npm registry** - Automatically fetches latest versions  
✅ **Intelligent fallback** - Multiple strategies to determine fix versions  
✅ **Single-run complete fix** - All changes applied at once  
✅ **Safe updates only** - Skips major version updates (manual review required)

### When to use

- **Primary tool** for fixing security vulnerabilities
- After `npm install` shows audit warnings
- Weekly security maintenance
- In CI/CD pipelines for automated security updates
- When you want to fix all vulnerabilities quickly

### Comparison with Other Scripts

| Feature | fix-all-vulnerabilities.js | add-security-overrides.js |
|---------|---------------------------|--------------------------|
| Updates direct deps | ✅ Yes | ❌ No |
| Adds overrides | ✅ Yes | ✅ Yes |
| Handles parent updates | ✅ Yes (intelligent) | ❌ Skips |
| Queries npm | ✅ Yes | ❌ No |
| Severity filter | All levels | High/Critical only |
| Use case | Complete automation | Conservative approach |

**Recommendation:** Use `fix-all-vulnerabilities.js` as your primary tool. Use `add-security-overrides.js` only if you need conservative, high-severity-only fixes.

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
