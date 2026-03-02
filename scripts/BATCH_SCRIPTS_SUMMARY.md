# Dependency Update Scripts - Summary

## Overview

Created convenience scripts to run dependency updates locally, replicating steps 6-9 of the `security-updates.yml` workflow.

## Files Created

### izg-configuration-console

1. **`scripts/update-dependencies.sh`** - Linux/Mac bash script
2. **`scripts/update-dependencies.cmd`** - Windows batch script
3. **`scripts/README.md`** - Updated with documentation

### izg-transformation-ui

1. **`scripts/update-dependencies.sh`** - Linux/Mac bash script
2. **`scripts/update-dependencies.cmd`** - Windows batch script
3. **`scripts/README.md`** - Updated with documentation

## What These Scripts Do

The scripts execute the following workflow steps in sequence:

### Step 1: Update Existing Overrides
```bash
node scripts/update-overrides.js
```
- Updates packages in the `overrides` section to latest minor versions
- Keeps major versions stable (e.g., 1.x → 1.y, not 1.x → 2.0)

### Step 2: Add Security Overrides
```bash
node scripts/add-security-overrides.js
```
- Scans for security vulnerabilities using `npm audit`
- Adds overrides for vulnerable transitive dependencies
- Filters for high/critical severity (all severity in some configs)

### Step 3: Test Override Removal
```bash
node scripts/test-overrides.js
```
- Checks if any overrides are no longer needed
- Removes overrides when all resolved versions satisfy requirements
- Cleans up obsolete overrides

### Step 4: Update Lock File
```bash
npm install
```
- Applies all override changes to `package-lock.json`
- Installs or updates dependencies as needed
- Validates the dependency tree

## Usage

### Linux/Mac
```bash
# From project root
./scripts/update-dependencies.sh

# Make executable if needed
chmod +x scripts/update-dependencies.sh
```

### Windows
```cmd
# From project root
scripts\update-dependencies.cmd
```

## Features

### ✅ Pre-flight Checks
- Verifies run from project root (checks for `package.json`)
- Confirms all required scripts exist
- Exits with clear error messages if requirements not met

### 📊 Progress Reporting
- Clear step-by-step output with headers
- Shows what each script is doing
- Indicates warnings vs errors

### 🔍 Change Detection
- Uses `git diff` to detect changes
- Shows summary of modified files
- Suggests next steps for review and commit

### ⚠️ Error Handling
- **Continues on warnings** - Individual script warnings don't stop the process
- **Exits on errors** - Critical failures (like `npm install`) stop execution
- **Exit codes** - Proper exit codes for scripting

### 🎨 Colored Output (Windows cmd)
- Green for success messages
- Yellow for warnings
- Red for errors
- Blue for informational messages
- Gray for no-change messages

## Example Output

```
============================================
Local Dependency Update Script
============================================

Step 1: Updating existing overrides to latest minor versions...
----------------------------------------------
⬆ prismjs: 1.29.0 → 1.30.0
✓ dompurify: Already at latest (3.2.5)

Step 2: Adding security overrides for vulnerabilities...
----------------------------------------------
➕ sha.js: Adding override 2.4.12 (high, currently: 2.4.9)

Step 3: Testing if overrides can be removed...
----------------------------------------------
✓ All overrides are still necessary

Step 4: Updating package-lock.json...
----------------------------------------------
added 0, removed 0, changed 2, audited 1234 packages in 3s

============================================
✅ Dependency update complete!
============================================

📝 Changes detected:

 package.json      | 2 +-
 package-lock.json | 15 +++++++--------
 2 files changed, 8 insertions(+), 9 deletions(-)

Next steps:
  1. Review the changes: git diff package.json
  2. Run tests: npm test
  3. Run code quality checks: npm run code-quality-check
  4. Build: npm run build
  5. Commit changes: git add package.json package-lock.json
  6. Create commit: git commit -m 'chore(deps): update dependencies'
```

## When to Use

### ✅ Use these scripts when:
- **Before creating a PR** - Ensure dependencies are current
- **Local development** - Test dependency updates locally
- **Troubleshooting** - Debug workflow issues
- **Manual updates** - Update outside of automated schedule
- **Testing changes** - Verify script modifications work

### ⚠️ Consider workflow instead when:
- **Regular updates** - Let automated workflow handle routine updates
- **CI/CD integration** - Workflow creates PRs automatically
- **Team consistency** - Workflow ensures consistent process

## Comparison: Scripts vs Workflow

| Aspect | Local Scripts | Workflow |
|--------|--------------|----------|
| **When** | On-demand | Scheduled (3:15 AM UTC) |
| **Where** | Developer machine | GitHub Actions |
| **Output** | Console | PR with summary |
| **Testing** | Manual | Automated (build, test, quality) |
| **Review** | Local git diff | GitHub PR review |
| **Commit** | Manual | Automated |
| **Best For** | Quick local updates | Consistent team updates |

## Integration with Workflow

These scripts replicate **only steps 6-9** of the workflow. The full workflow also includes:

- **Step 1-5:** Pre-checks (ncu, initial override checks, change detection)
- **Step 10-14:** Quality checks (code quality, tests, build, audit)
- **Step 15-17:** PR creation (summary, push, create PR)

Use the scripts for the **core dependency update logic**, but rely on the workflow for the **complete automated process**.

## Documentation Updates

Updated `scripts/README.md` in both projects to include:

1. **update-dependencies.sh/cmd** section at the top
   - Clear description of what they do
   - Usage examples for both platforms
   - When to use vs when to use workflow
   - Example output
   - Prerequisites and error handling

2. **update-overrides.js** section
   - Was missing from original README
   - Explains how it updates overrides to latest minor versions
   - Usage, logic, and when to use

## Benefits

✅ **Faster iteration** - Test changes locally before committing  
✅ **Better debugging** - See detailed output immediately  
✅ **More control** - Run steps individually if needed  
✅ **Cross-platform** - Works on Linux, Mac, and Windows  
✅ **Consistent behavior** - Mirrors workflow exactly  
✅ **Easy to use** - Single command runs entire process  

## Files Overview

### Linux/Mac Script (`.sh`)
- Uses bash syntax
- Set `-e` flag for exit on error
- POSIX-compliant color codes (via emoji)
- Executable permission may be needed (`chmod +x`)

### Windows Script (`.cmd`)
- Uses Windows batch syntax
- ANSI color codes for colored output
- Works in cmd.exe and PowerShell
- No permission changes needed

### Documentation (`README.md`)
- Comprehensive usage instructions
- Clear examples and output samples
- When to use guidance
- Integration with workflow explained

## Related Documentation

- **NPM_DEPENDENCY_STRATEGY.md** - Overall dependency management strategy
- **WORKFLOW_SCHEDULE.md** - When automated workflow runs
- **WORKFLOW_TRIGGERS.md** - How to trigger workflow manually
- **scripts/README.md** - Individual script documentation

---

**Created:** February 28, 2026  
**Projects:** izg-configuration-console, izg-transformation-ui  
**Status:** ✅ Complete and documented
