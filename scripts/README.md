# Scripts Directory

This directory contains utility scripts for maintaining the project.

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
