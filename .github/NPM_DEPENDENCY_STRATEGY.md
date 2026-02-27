# NPM Dependency Management - Best Practices

## Why `--legacy-peer-deps` Was Removed

### Background
The `--legacy-peer-deps` flag was previously used in `security-updates.yml` but has been removed as of February 2026.

### Reasons for Removal

1. **Modern npm Handles Peer Dependencies Better**
   - npm 11+ (currently using 11.10.0) has mature peer dependency resolution
   - The strict behavior helps catch real compatibility issues early

2. **Package Overrides Are the Proper Solution**
   - The project already uses `overrides` in `package.json` for dependency conflicts
   - This is more explicit and maintainable than `--legacy-peer-deps`

3. **Security and Reliability**
   - `--legacy-peer-deps` can mask incompatible versions that cause runtime errors
   - Security updates might not work correctly when peer dependencies are ignored
   - npm won't auto-install missing peer dependencies

4. **Hides Real Problems**
   - Peer dependency warnings often indicate real compatibility issues
   - Better to fix the root cause than suppress the warnings

## Current Dependency Strategy

### In `security-updates.yml`
```yaml
npm ci                    # Clean install from lock file
npm install              # Install updated dependencies
```

### In `deploy.yml`
```yaml
npm ci --force           # Still uses --force (see below)
```

## About `--force` in deploy.yml

The `deploy.yml` workflow still uses `npm ci --force`. This is different from `--legacy-peer-deps`:

- `--force` - Forces npm to fetch remote resources even if a local copy exists on disk
- Useful for CI environments to ensure fresh installs
- Less problematic than `--legacy-peer-deps` for peer dependency resolution

**Recommendation:** Consider removing `--force` from `deploy.yml` as well, unless there's a specific reason for it. Modern CI runners start with clean environments, so it's typically unnecessary.

## When to Use Special Flags

### ✅ Use `overrides` in package.json
```json
{
  "overrides": {
    "vulnerable-package": "^2.0.0"
  }
}
```
- Explicit and version-controlled
- Applies consistently across all environments
- Easy to audit and remove when no longer needed

### ⚠️ Use `--force` only when necessary
- CI environments that need to bypass cache issues
- Known safe situations where you need to override checks
- Document why it's needed

### ❌ Avoid `--legacy-peer-deps`
- Masks real compatibility problems
- Makes dependency tree unpredictable
- Use `overrides` or fix the actual peer dependency issue instead

## Handling Peer Dependency Conflicts

### Strategy 1: Update the Conflicting Package (Preferred)
```bash
npm install package-with-conflict@latest
```

### Strategy 2: Use Overrides
```json
{
  "overrides": {
    "problematic-peer-dep": "^3.0.0"
  }
}
```

### Strategy 3: Use Resolutions (for specific package managers)
Only if using Yarn:
```json
{
  "resolutions": {
    "problematic-peer-dep": "^3.0.0"
  }
}
```

### Strategy 4: Contact Package Maintainers
If a package has incorrect peer dependency ranges, open an issue with the package maintainer.

## Testing Dependency Changes

Before committing dependency changes:

1. **Clean Install**
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Check for Warnings**
   ```bash
   npm install 2>&1 | grep -i "warn\|error"
   ```

3. **Run All Tests**
   ```bash
   npm run test
   npm run build
   npm run lint
   ```

4. **Check Security**
   ```bash
   npm audit
   ```

## Monitoring

The `security-updates.yml` workflow will now:
- ✅ Show peer dependency warnings if they exist
- ✅ Fail if peer dependencies are actually incompatible
- ✅ Allow you to address issues properly with overrides
- ✅ Provide clear error messages about what needs fixing

## Migration Notes

### What Changed (February 2026)
- Removed `--legacy-peer-deps` from all `npm install` commands in `security-updates.yml`
- Workflow will now respect peer dependency constraints
- Any peer dependency issues will surface as errors in the workflow

### If the Workflow Fails After This Change
1. Review the peer dependency error message
2. Add an appropriate override to `package.json` if needed
3. Test locally with `npm install` (without flags)
4. Commit both `package.json` and `package-lock.json`

### Expected Behavior
Most likely, the workflow will continue to work without any issues because:
- The project already uses overrides for known conflicts
- Modern npm is good at resolving peer dependencies
- React 18 and Next.js 16 are mature and well-supported
