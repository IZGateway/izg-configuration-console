#!/bin/bash
#
# update-dependencies.sh
# Performs dependency updates locally (steps 6-9 of security-updates workflow)
#
# Usage: ./scripts/update-dependencies.sh
#

set -e  # Exit on error

echo "============================================"
echo "Local Dependency Update Script"
echo "============================================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: package.json not found. Run this script from the project root."
  exit 1
fi

# Check if scripts directory exists
if [ ! -d "scripts" ]; then
  echo "❌ Error: scripts directory not found."
  exit 1
fi

# Check if all required scripts exist
REQUIRED_SCRIPTS=("update-overrides.js" "add-security-overrides.js" "test-overrides.js")
for script in "${REQUIRED_SCRIPTS[@]}"; do
  if [ ! -f "scripts/$script" ]; then
    echo "❌ Error: scripts/$script not found."
    exit 1
  fi
done

echo "Step 1: Updating existing overrides to latest minor versions..."
echo "----------------------------------------------"
node scripts/update-overrides.js
if [ $? -ne 0 ]; then
  echo "⚠️  Warning: update-overrides.js completed with warnings"
fi
echo ""

echo "Step 2: Adding security overrides for vulnerabilities..."
echo "----------------------------------------------"
node scripts/add-security-overrides.js
if [ $? -ne 0 ]; then
  echo "⚠️  Warning: add-security-overrides.js completed with warnings"
fi
echo ""

echo "Step 3: Testing if overrides can be removed..."
echo "----------------------------------------------"
node scripts/test-overrides.js
if [ $? -ne 0 ]; then
  echo "⚠️  Warning: test-overrides.js completed with warnings"
fi
echo ""

echo "Step 4: Updating package-lock.json..."
echo "----------------------------------------------"
npm install
if [ $? -ne 0 ]; then
  echo "❌ Error: npm install failed"
  exit 1
fi
echo ""

echo "============================================"
echo "✅ Dependency update complete!"
echo "============================================"
echo ""

# Check if there are any changes
if git diff --quiet package.json package-lock.json; then
  echo "ℹ️  No changes were made to package.json or package-lock.json"
else
  echo "📝 Changes detected:"
  echo ""
  git diff --stat package.json package-lock.json
  echo ""
  echo "Next steps:"
  echo "  1. Review the changes: git diff package.json"
  echo "  2. Run tests: npm test"
  echo "  3. Run code quality checks: npm run code-quality-check"
  echo "  4. Build: npm run build"
  echo "  5. Commit changes: git add package.json package-lock.json"
  echo "  6. Create commit: git commit -m 'chore(deps): update dependencies'"
fi
