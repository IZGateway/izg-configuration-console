const { execSync } = require('child_process');
const fs = require('fs');
const semver = require('semver');

console.log('Updating packages in overrides section...\n');

const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));

if (!packageJson.overrides || Object.keys(packageJson.overrides).length === 0) {
  console.log('✓ No overrides to update');
  process.exit(0);
}

let changesDetected = false;
const updates = [];

// Check each override for available updates
for (const [pkgName, currentVersion] of Object.entries(packageJson.overrides)) {
  try {
    // Clean version string (remove ^, ~, etc.)
    const cleanCurrentVersion = currentVersion.replace(/^[\^~]/, '');
    
    // Get latest version info from npm
    const npmViewOutput = execSync(`npm view ${pkgName} versions --json`, { encoding: 'utf8' });
    const allVersions = JSON.parse(npmViewOutput);
    
    // Find the latest minor version within the same major version
    const currentMajor = semver.major(cleanCurrentVersion);
    const compatibleVersions = allVersions.filter(v => {
      try {
        return semver.major(v) === currentMajor && semver.gte(v, cleanCurrentVersion);
      } catch (e) {
        return false;
      }
    });
    
    if (compatibleVersions.length === 0) {
      console.log(`✓ ${pkgName}: Already at latest compatible version (${currentVersion})`);
      continue;
    }
    
    // Get the latest compatible version
    const latestCompatible = compatibleVersions[compatibleVersions.length - 1];
    
    if (semver.gt(latestCompatible, cleanCurrentVersion)) {
      console.log(`⬆ ${pkgName}: ${currentVersion} → ${latestCompatible}`);
      packageJson.overrides[pkgName] = latestCompatible;
      updates.push({ pkg: pkgName, from: currentVersion, to: latestCompatible });
      changesDetected = true;
    } else {
      console.log(`✓ ${pkgName}: Already at latest (${currentVersion})`);
    }
  } catch (error) {
    console.log(`⚠ ${pkgName}: Could not check for updates - ${error.message}`);
  }
}

if (changesDetected) {
  // Sort overrides alphabetically for consistency
  const sortedOverrides = {};
  Object.keys(packageJson.overrides).sort().forEach(key => {
    sortedOverrides[key] = packageJson.overrides[key];
  });
  packageJson.overrides = sortedOverrides;
  
  fs.writeFileSync('package.json', JSON.stringify(packageJson, null, 2) + '\n');
  
  console.log('\n=== Updated Overrides ===');
  updates.forEach(({ pkg, from, to }) => {
    console.log(`  ${pkg}: ${from} → ${to}`);
  });
  console.log('\n✓ Updated package.json with latest override versions');
  console.log('⚠ Run `npm install` to apply changes');
} else {
  console.log('\n✓ All overrides are up-to-date');
}

process.exit(0);
