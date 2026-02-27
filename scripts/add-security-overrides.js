const { execSync } = require('child_process');
const fs = require('fs');
const semver = require('semver');

console.log('Analyzing npm audit for vulnerable transitive dependencies...\n');

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
let packageLock;
try {
  packageLock = JSON.parse(fs.readFileSync('package-lock.json', 'utf8'));
} catch (e) {
  console.error('⚠ Could not read package-lock.json');
  process.exit(1);
}

// Run npm audit and get JSON output
let auditData;
try {
  const auditOutput = execSync('npm audit --json', { encoding: 'utf8' });
  auditData = JSON.parse(auditOutput);
} catch (error) {
  // npm audit exits with non-zero if vulnerabilities found
  if (error.stdout) {
    auditData = JSON.parse(error.stdout);
  } else {
    console.error('⚠ Could not run npm audit');
    process.exit(1);
  }
}

if (!auditData.vulnerabilities || Object.keys(auditData.vulnerabilities).length === 0) {
  console.log('✓ No vulnerabilities found');
  process.exit(0);
}

console.log(`Found ${Object.keys(auditData.vulnerabilities).length} vulnerable packages\n`);

// Initialize overrides if not present
if (!packageJson.overrides) {
  packageJson.overrides = {};
}

const overridesToAdd = {};
const existingOverrides = { ...packageJson.overrides };
let changesDetected = false;

// Packages that should NOT be automatically overridden due to breaking changes
// These require manual updates to direct dependencies instead
const OVERRIDE_BLOCKLIST = [
  'ajv', // ajv@6 -> ajv@8 breaks @eslint/eslintrc and other tools expecting v6 API
];

// Analyze vulnerabilities
for (const [pkgName, vulnData] of Object.entries(auditData.vulnerabilities)) {
  // Consider all severity levels: critical, high, moderate, and low
  if (!['critical', 'high', 'moderate', 'low'].includes(vulnData.severity)) {
    console.log(`⏭ Skipping ${pkgName} (severity: ${vulnData.severity})`);
    continue;
  }

  // Check if this package is on the blocklist
  if (OVERRIDE_BLOCKLIST.includes(pkgName)) {
    console.log(`🚫 ${pkgName}: Blocked from automatic override due to breaking changes - requires manual update`);
    continue;
  }

  // Check if this is a transitive dependency (not in direct dependencies or devDependencies)
  const isDirect = packageJson.dependencies?.[pkgName] || packageJson.devDependencies?.[pkgName];
  
  if (isDirect) {
    console.log(`⚠ ${pkgName}: Direct dependency with ${vulnData.severity} vulnerability - update in dependencies section`);
    continue;
  }

  // Get the fix version
  // For transitive dependencies, extract fix version from the vulnerability range
  let fixVersion;
  
  // First, try to get the version from the vulnerability's "via" range
  const viaWithRange = vulnData.via?.find(v => v.range);
  if (viaWithRange?.range) {
    const range = viaWithRange.range;
    
    // For ranges like ">=10.2.0 <10.5.0", extract the upper bound (10.5.0)
    // For ranges like "<3.14.2", extract 3.14.2
    // For ranges like "10.0.0 - 10.2.2", extract the upper bound
    
    // Try to find version after < or <= (upper bound)
    let upperBoundMatch = range.match(/<=?\s*(\d+\.\d+\.\d+)/);
    if (upperBoundMatch) {
      fixVersion = upperBoundMatch[1];
    } else {
      // If no upper bound, try to find any version number
      const anyVersionMatch = range.match(/(\d+\.\d+\.\d+)/);
      if (anyVersionMatch) {
        fixVersion = anyVersionMatch[1];
      }
    }
  }
  
  // Fallback to fixAvailable version (for direct dependencies)
  if (!fixVersion) {
    fixVersion = vulnData.fixAvailable?.version || 
                 vulnData.via?.[0]?.fixAvailable?.version;
  }
  
  if (!fixVersion) {
    console.log(`⚠ ${pkgName}: No fix available for ${vulnData.severity} vulnerability`);
    continue;
  }

  // Check current resolved versions
  const resolvedVersions = findAllResolvedVersions(packageLock, pkgName);
  const needsOverride = resolvedVersions.some(v => {
    try {
      return semver.lt(v, fixVersion);
    } catch (e) {
      return true; // If version comparison fails, be conservative
    }
  });

  if (needsOverride) {
    const currentOverride = packageJson.overrides[pkgName];
    
    if (currentOverride) {
      // Check if existing override is sufficient
      try {
        if (semver.gte(currentOverride, fixVersion)) {
          console.log(`✓ ${pkgName}: Existing override ${currentOverride} is sufficient (>= ${fixVersion})`);
          continue;
        } else {
          console.log(`⬆ ${pkgName}: Upgrading override from ${currentOverride} to ${fixVersion} (${vulnData.severity})`);
          overridesToAdd[pkgName] = fixVersion;
          changesDetected = true;
        }
      } catch (e) {
        console.log(`⬆ ${pkgName}: Replacing override ${currentOverride} with ${fixVersion} (${vulnData.severity})`);
        overridesToAdd[pkgName] = fixVersion;
        changesDetected = true;
      }
    } else {
      console.log(`➕ ${pkgName}: Adding override ${fixVersion} (${vulnData.severity}, currently: ${resolvedVersions.join(', ')})`);
      overridesToAdd[pkgName] = fixVersion;
      changesDetected = true;
    }
  } else {
    console.log(`✓ ${pkgName}: All versions already meet fix requirement (${fixVersion})`);
  }
}

// Apply overrides
if (Object.keys(overridesToAdd).length > 0) {
  console.log('\n=== Adding/Updating Security Overrides ===');
  
  for (const [pkg, version] of Object.entries(overridesToAdd)) {
    packageJson.overrides[pkg] = version;
    console.log(`  ${pkg}@${version}`);
  }
  
  // Sort overrides alphabetically for consistency
  const sortedOverrides = {};
  Object.keys(packageJson.overrides).sort().forEach(key => {
    sortedOverrides[key] = packageJson.overrides[key];
  });
  packageJson.overrides = sortedOverrides;
  
  fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2) + '\n');
  console.log('\n✓ Updated package.json with security overrides');
  console.log('\n⚠ Run `npm install` to apply overrides and re-run `npm audit` to verify fixes');
  process.exit(0);
} else if (changesDetected) {
  console.log('\n=== No New Overrides Needed ===');
  console.log('Existing overrides are sufficient');
  process.exit(0);
} else {
  console.log('\n=== No Security Overrides Needed ===');
  console.log('All transitive dependencies are secure or need direct dependency updates');
  process.exit(0);
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
