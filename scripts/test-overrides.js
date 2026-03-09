const fs = require('fs');
const semver = require('semver');

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const packageLock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
const overridesToRemove = [];

console.log('Analyzing overrides against resolved versions...\n');

if (!packageJson.overrides || Object.keys(packageJson.overrides).length === 0) {
  console.log('No overrides found in package.json');
  process.exit(0);
}

for (const [pkg, overrideVersion] of Object.entries(packageJson.overrides)) {
  console.log(`Checking override: ${pkg}@${overrideVersion}`);
  
  // Find all resolved versions of this package in package-lock.json
  const resolvedVersions = findAllResolvedVersions(packageLock, pkg);
  
  console.log(`  Found ${resolvedVersions.length} resolved version(s): ${resolvedVersions.join(', ')}`);
  
  if (resolvedVersions.length === 0) {
    console.log(`  ⚠ Package ${pkg} not found in package-lock.json - override may be obsolete`);
    overridesToRemove.push(pkg);
    continue;
  }
  
  // Check if all resolved versions satisfy or exceed the override version
  const allVersionsSatisfy = resolvedVersions.every(version => {
    try {
      return semver.satisfies(version, `>=${overrideVersion}`) || 
             semver.eq(version, overrideVersion);
    } catch (e) {
      console.log(`  ⚠ Invalid semver comparison for ${pkg}: ${version} vs ${overrideVersion}`);
      return false;
    }
  });
  
  if (allVersionsSatisfy) {
    const minResolved = semver.minSatisfying(resolvedVersions, '*');
    console.log(`  ✓ All resolved versions (min: ${minResolved}) meet or exceed override ${overrideVersion}`);
    overridesToRemove.push(pkg);
  } else {
    const problematicVersions = resolvedVersions.filter(v => {
      try {
        return !semver.satisfies(v, `>=${overrideVersion}`);
      } catch (e) {
        return true;
      }
    });
    console.log(`  ✗ Some versions still below override: ${problematicVersions.join(', ')}`);
  }
  console.log();
}

// Remove unnecessary overrides
if (overridesToRemove.length > 0) {
  console.log('=== Removing unnecessary overrides ===');
  overridesToRemove.forEach(pkg => {
    console.log(`  Removing: ${pkg}`);
    delete packageJson.overrides[pkg];
  });
  
  // Clean up empty overrides object
  if (Object.keys(packageJson.overrides).length === 0) {
    delete packageJson.overrides;
  }
  
  fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2) + '\n');
  console.log('\n✓ Updated package.json');
} else {
  console.log('=== No overrides can be removed ===');
  console.log('All overrides are still enforcing minimum versions');
}

/**
 * Recursively find all resolved versions of a package in package-lock.json
 */
function findAllResolvedVersions(lockData, packageName) {
  const versions = new Set();
  
  function traverse(obj, path = '') {
    if (!obj || typeof obj !== 'object') return;
    
    // Check if this is the package we're looking for
    if (obj.name === packageName && obj.version) {
      versions.add(obj.version);
    }
    
    // Check packages structure (lockfile v2+)
    if (path === '' && obj.packages) {
      for (const [pkgPath, pkgData] of Object.entries(obj.packages)) {
        // Extract package name from path (e.g., "node_modules/prismjs" -> "prismjs")
        const pathParts = pkgPath.split('node_modules/');
        const pkgName = pathParts[pathParts.length - 1];
        
        if (pkgName === packageName && pkgData.version) {
          versions.add(pkgData.version);
        }
      }
    }
    
    // Check dependencies structure (lockfile v1)
    if (obj.dependencies) {
      for (const [depName, depData] of Object.entries(obj.dependencies)) {
        if (depName === packageName && depData.version) {
          versions.add(depData.version);
        }
        // Recurse into nested dependencies
        if (depData.dependencies) {
          traverse(depData, path + '/' + depName);
        }
      }
    }
  }
  
  traverse(lockData);
  return Array.from(versions);
}
