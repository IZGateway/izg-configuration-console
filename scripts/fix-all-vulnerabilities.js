const { execSync } = require('child_process');
const fs = require('fs');
const semver = require('semver');

console.log('🔍 Comprehensive Vulnerability Fixer - Analyzing and fixing vulnerabilities...\n');

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
const directUpdates = {};
let changesDetected = false;

// Packages that should NOT be automatically overridden due to breaking changes
// These require manual review
const OVERRIDE_BLOCKLIST = [
  'immutable', // immutable@3 -> immutable@5 breaks swagger-ui-react which expects v3 API
];

/**
 * Get the latest version of a package from npm registry
 */
function getLatestVersion(packageName) {
  try {
    const output = execSync(`npm view ${packageName} version`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    return output.trim();
  } catch (e) {
    console.log(`⚠ Could not fetch latest version for ${packageName}`);
    return null;
  }
}

/**
 * Get the latest version within the same major version
 */
function getLatestCompatibleVersion(packageName, currentVersion) {
  try {
    const allVersionsOutput = execSync(`npm view ${packageName} versions --json`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    const allVersions = JSON.parse(allVersionsOutput);
    
    const currentMajor = semver.major(currentVersion);
    const compatibleVersions = allVersions.filter(v => {
      try {
        return semver.major(v) === currentMajor && semver.gte(v, currentVersion);
      } catch (e) {
        return false;
      }
    });
    
    if (compatibleVersions.length === 0) {
      return null;
    }
    
    return compatibleVersions[compatibleVersions.length - 1];
  } catch (e) {
    return null;
  }
}

// Analyze vulnerabilities
for (const [pkgName, vulnData] of Object.entries(auditData.vulnerabilities)) {
  // Consider all severity levels: critical, high, moderate, and low
  if (!['critical', 'high', 'moderate', 'low'].includes(vulnData.severity)) {
    console.log(`⏭ Skipping ${pkgName} (severity: ${vulnData.severity})`);
    continue;
  }

  // Check if this package is on the blocklist
  if (OVERRIDE_BLOCKLIST.includes(pkgName)) {
    console.log(`🚫 ${pkgName}: Blocked from automatic override due to breaking changes - requires manual review`);
    continue;
  }

  // Check if this is a direct dependency
  const isDirect = packageJson.dependencies?.[pkgName] || packageJson.devDependencies?.[pkgName];
  const isDirectDep = !!packageJson.dependencies?.[pkgName];
  const isDirectDevDep = !!packageJson.devDependencies?.[pkgName];
  
  if (isDirect) {
    // Handle direct dependencies
    const currentVersion = (packageJson.dependencies?.[pkgName] || packageJson.devDependencies?.[pkgName]).replace(/^[\^~]/, '');
    
    // Check if fixAvailable suggests a same-package update
    const fixPackageName = vulnData.fixAvailable?.name;
    const fixVersion = vulnData.fixAvailable?.version;
    
    if (fixPackageName === pkgName && fixVersion) {
      // Direct update available
      const isSemVerMajor = vulnData.fixAvailable?.isSemVerMajor;
      
      if (isSemVerMajor) {
        console.log(`⚠ ${pkgName}: Major version update available (${currentVersion} → ${fixVersion}) - requires manual review`);
        continue;
      } else {
        console.log(`⬆ ${pkgName}: Updating direct dependency (${currentVersion} → ${fixVersion})`);
        directUpdates[pkgName] = {
          isDev: isDirectDevDep,
          version: fixVersion
        };
        changesDetected = true;
        continue;
      }
    } else {
      // Try to get latest compatible version
      const latestCompatible = getLatestCompatibleVersion(pkgName, currentVersion);
      if (latestCompatible && semver.gt(latestCompatible, currentVersion)) {
        console.log(`⬆ ${pkgName}: Updating to latest compatible (${currentVersion} → ${latestCompatible})`);
        directUpdates[pkgName] = {
          isDev: isDirectDevDep,
          version: latestCompatible
        };
        changesDetected = true;
        continue;
      } else {
        console.log(`⚠ ${pkgName}: Direct dependency with ${vulnData.severity} vulnerability - no safe update found`);
        continue;
      }
    }
  }

  // Handle transitive dependencies
  let fixVersion;
  let viaWithRange; // Define at top level for later use
  
  // Check if fixAvailable refers to a different package (parent dependency)
  const fixPackageName = vulnData.fixAvailable?.name || vulnData.via?.[0]?.fixAvailable?.name;
  
  if (fixPackageName && fixPackageName !== pkgName) {
    // npm audit suggests updating a parent package to fix this transitive dependency
    // Check if the parent package can be updated
    const isParentDirect = packageJson.dependencies?.[fixPackageName] || packageJson.devDependencies?.[fixPackageName];
    
    if (isParentDirect) {
      // The parent is a direct dependency - check if we can update it
      const parentCurrentVersion = (packageJson.dependencies?.[fixPackageName] || packageJson.devDependencies?.[fixPackageName]).replace(/^[\^~]/, '');
      const parentFixVersion = vulnData.fixAvailable?.version;
      const isParentMajorUpdate = vulnData.fixAvailable?.isSemVerMajor;
      
      if (parentFixVersion && !isParentMajorUpdate) {
        // We can update the parent package (non-breaking) - do that instead of overriding
        console.log(`💡 ${pkgName}: Will be fixed by updating parent '${fixPackageName}' (${parentCurrentVersion} → ${parentFixVersion})`);
        
        // Queue the parent for update
        const isParentDevDep = !!packageJson.devDependencies?.[fixPackageName];
        directUpdates[fixPackageName] = {
          isDev: isParentDevDep,
          version: parentFixVersion
        };
        changesDetected = true;
        continue; // Skip adding override for this transitive dep
      } else if (isParentMajorUpdate) {
        // Parent requires major version update - can't auto-update
        // Fall through to try overriding the transitive dependency instead
        console.log(`💡 ${pkgName}: Parent '${fixPackageName}' needs major update (${parentCurrentVersion} → ${parentFixVersion})`);
        console.log(`   → Trying direct override of ${pkgName} instead...`);
      }
    } else {
      // Parent is also transitive - can't update it directly
      console.log(`💡 ${pkgName}: npm suggests updating '${fixPackageName}' (also transitive), trying direct override instead...`);
    }
    
    // Get the latest version of the transitive dependency as fallback
    const latestVersion = getLatestVersion(pkgName);
    if (latestVersion) {
      fixVersion = latestVersion;
      console.log(`   → Found latest version: ${latestVersion}`);
    } else {
      console.log(`   → Could not determine version, skipping`);
      continue;
    }
  } else {
    // Try to get the version from the vulnerability's "via" range
    viaWithRange = vulnData.via?.find(v => v.range);
    if (viaWithRange?.range) {
      const range = viaWithRange.range;
      
      // For ranges like ">=10.2.0 <10.5.0", extract the upper bound (10.5.0)
      // For ranges like "<3.14.2", extract 3.14.2
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
    
    // Fallback to fixAvailable version (only if it's for the same package)
    if (!fixVersion && fixPackageName === pkgName) {
      fixVersion = vulnData.fixAvailable?.version || 
                   vulnData.via?.[0]?.fixAvailable?.version;
    }
    
    // If still no version, try to get latest from npm
    if (!fixVersion) {
      const latestVersion = getLatestVersion(pkgName);
      if (latestVersion) {
        fixVersion = latestVersion;
        console.log(`   → Using latest version from npm: ${latestVersion}`);
      }
    }
  }
  
  if (!fixVersion) {
    console.log(`⚠ ${pkgName}: No fix available for ${vulnData.severity} vulnerability`);
    continue;
  }

  // Check current resolved versions
  const resolvedVersions = findAllResolvedVersions(packageLock, pkgName);
  
  // For packages with vulnerable ranges, always use latest version to be safe
  // especially for ranges like "<=1.13.7" or "6.7.0-6.14.1"
  if (viaWithRange?.range && (viaWithRange.range.includes('<=') || viaWithRange.range.includes(' - '))) {
    const latestFromNpm = getLatestVersion(pkgName);
    if (latestFromNpm && semver.gt(latestFromNpm, fixVersion)) {
      console.log(`   → Using latest npm version ${latestFromNpm} instead of ${fixVersion} for safety`);
      fixVersion = latestFromNpm;
    }
  }
  
  const needsOverride = resolvedVersions.length === 0 || resolvedVersions.some(v => {
    try {
      return semver.lt(v, fixVersion);
    } catch (e) {
      return true;
    }
  });

  if (needsOverride) {
    const currentOverride = packageJson.overrides[pkgName];
    
    if (currentOverride) {
      try {
        const currentVersion = currentOverride.replace(/^[\^~>=]/, '');
        if (semver.gte(currentVersion, fixVersion)) {
          console.log(`✓ ${pkgName}: Existing override ${currentOverride} is sufficient (>= ${fixVersion})`);
          continue;
        } else {
          console.log(`⬆ ${pkgName}: Upgrading override from ${currentOverride} to ^${fixVersion} (${vulnData.severity})`);
          overridesToAdd[pkgName] = fixVersion;
          changesDetected = true;
        }
      } catch (e) {
        console.log(`⬆ ${pkgName}: Replacing override ${currentOverride} with ^${fixVersion} (${vulnData.severity})`);
        overridesToAdd[pkgName] = fixVersion;
        changesDetected = true;
      }
    } else {
      console.log(`➕ ${pkgName}: Adding override ^${fixVersion} (${vulnData.severity}${resolvedVersions.length > 0 ? ', currently: ' + resolvedVersions.join(', ') : ''})`);
      overridesToAdd[pkgName] = fixVersion;
      changesDetected = true;
    }
  } else {
    console.log(`✓ ${pkgName}: All versions already meet fix requirement (${fixVersion})`);
  }
}

// Apply changes
if (Object.keys(overridesToAdd).length > 0 || Object.keys(directUpdates).length > 0) {
  console.log('\n=== Applying Fixes ===');
  
  // Update direct dependencies
  if (Object.keys(directUpdates).length > 0) {
    console.log('\n📦 Direct Dependency Updates:');
    for (const [pkg, info] of Object.entries(directUpdates)) {
      const section = info.isDev ? 'devDependencies' : 'dependencies';
      packageJson[section][pkg] = `^${info.version}`;
      console.log(`  ${pkg}@${info.version} (${section})`);
    }
  }
  
  // Add/update overrides
  if (Object.keys(overridesToAdd).length > 0) {
    console.log('\n🔧 Override Updates:');
    for (const [pkg, version] of Object.entries(overridesToAdd)) {
      packageJson.overrides[pkg] = `^${version}`;
      console.log(`  ${pkg}@^${version}`);
    }
    
    // Sort overrides alphabetically for consistency
    const sortedOverrides = {};
    Object.keys(packageJson.overrides).sort().forEach(key => {
      sortedOverrides[key] = packageJson.overrides[key];
    });
    packageJson.overrides = sortedOverrides;
  }
  
  // Write package.json
  fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2) + '\n');
  
  console.log('\n✅ Updated package.json');
  console.log('\n📋 Next Steps:');
  console.log('  1. Run: npm install');
  console.log('  2. Run: npm audit');
  console.log('  3. Run: npm test');
  console.log('  4. Review and commit changes');
  
  process.exit(0);
} else if (changesDetected) {
  console.log('\n=== No New Changes Needed ===');
  console.log('Existing configuration is sufficient');
  process.exit(0);
} else {
  console.log('\n=== No Fixes Needed ===');
  console.log('All dependencies are secure or require manual review');
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
        if (depData.dependencies) {
          traverse(depData, path + '/' + depName);
        }
      }
    }
  }
  
  traverse(lockData);
  return Array.from(versions);
}
