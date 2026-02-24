# Scripts Directory

This directory contains utility scripts for maintaining the project.

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
