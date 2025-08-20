#!/usr/bin/env node

/**
 * Generate THIRD_PARTY_LICENSES.md file for n8n releases
 * From-scratch approach using pnpm list + direct file reading
 */

import { execSync } from 'child_process';
import { promises as fs } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = resolve(__dirname, '..');

/**
 * Get all production dependencies from all packages in the monorepo
 */
function getAllProductionDependencies() {
  try {
    console.log('📦 Getting production dependencies from entire monorepo...');
    
    const result = execSync('pnpm list --prod --recursive --json --depth=0', {
      cwd: rootDir,
      encoding: 'utf-8',
      maxBuffer: 1024 * 1024 * 50 // 50MB buffer for all packages
    });
    
    const data = JSON.parse(result);
    const allDependencies = {};
    
    // Merge dependencies from all packages
    data.forEach(pkg => {
      if (pkg.dependencies) {
        Object.entries(pkg.dependencies).forEach(([name, depInfo]) => {
          // Skip if we already have this dependency (avoid duplicates)
          // Keep the first occurrence we find
          if (!allDependencies[name]) {
            allDependencies[name] = depInfo;
          }
        });
      }
    });
    
    return allDependencies;
  } catch (error) {
    console.error('Failed to get dependencies:', error.message);
    throw error;
  }
}

/**
 * Read package.json from a dependency path
 */
async function readPackageJson(packagePath) {
  try {
    const packageJsonPath = join(packagePath, 'package.json');
    const content = await fs.readFile(packageJsonPath, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    console.warn(`Could not read package.json from ${packagePath}:`, error.message);
    return null;
  }
}

/**
 * Read license file from a dependency path
 */
async function readLicenseFile(packagePath) {
  const licenseFiles = ['LICENSE', 'LICENSE.md', 'LICENSE.txt', 'license', 'license.md', 'license.txt', 'LICENCE', 'LICENCE.md'];
  
  for (const filename of licenseFiles) {
    try {
      const licensePath = join(packagePath, filename);
      const content = await fs.readFile(licensePath, 'utf-8');
      return content.trim();
    } catch (error) {
      // Continue to next license file
    }
  }
  
  return 'License text not available';
}

/**
 * Get license information for a single package
 */
async function getPackageLicenseInfo(name, depInfo) {
  // Skip internal n8n packages and linked packages
  if (name.startsWith('@n8n/') || name.startsWith('n8n-') || depInfo.version?.startsWith('link:')) {
    return null;
  }
  
  try {
    const packagePath = depInfo.path;
    if (!packagePath) {
      console.warn(`No path found for package ${name}`);
      return null;
    }
    
    const packageJson = await readPackageJson(packagePath);
    if (!packageJson) {
      return null;
    }
    
    const licenseText = await readLicenseFile(packagePath);
    
    // Clean up homepage URL
    let homepage = packageJson.homepage || packageJson.repository?.url || `https://www.npmjs.com/package/${name}`;
    if (typeof packageJson.repository === 'string') {
      homepage = packageJson.repository;
    }
    
    // Clean git URLs
    if (homepage.startsWith('git+')) {
      homepage = homepage.replace('git+', '').replace('.git', '');
    }
    if (homepage.startsWith('git://')) {
      homepage = homepage.replace('git://', 'https://');
    }
    if (homepage.startsWith('ssh://git@')) {
      homepage = homepage.replace('ssh://git@', 'https://');
    }
    
    return {
      name,
      version: depInfo.version || 'Unknown',
      license: packageJson.license || 'Unknown',
      homepage,
      licenseText
    };
  } catch (error) {
    console.warn(`Error processing package ${name}:`, error.message);
    return null;
  }
}

/**
 * Format package info into markdown
 */
function formatPackageToMarkdown(pkg) {
  return `## Package: \`${pkg.name}\`

- Version: ${pkg.version}
- License: ${pkg.license}
- Homepage: <${pkg.homepage}>
- License Text:
${pkg.licenseText}

---

`;
}

/**
 * Main function
 */
async function main() {
  console.log('🔍 Generating third-party licenses (from-scratch approach)...');
  
  try {
    // Get all production dependencies from all packages
    const dependencies = getAllProductionDependencies();
    const dependencyNames = Object.keys(dependencies);
    console.log(`📊 Found ${dependencyNames.length} total dependencies across all packages`);
    
    // Process each dependency
    const packageInfoPromises = dependencyNames.map(name => 
      getPackageLicenseInfo(name, dependencies[name])
    );
    
    const packageInfos = await Promise.all(packageInfoPromises);
    const validPackages = packageInfos
      .filter(pkg => pkg !== null)
      .sort((a, b) => a.name.localeCompare(b.name));
    
    console.log(`✅ Successfully processed ${validPackages.length} third-party packages`);
    
    // Generate markdown content
    const packagesMarkdown = validPackages.map(formatPackageToMarkdown).join('');
    
    const markdownContent = `# Third-Party Licenses

This file lists third-party software components included in n8n and their respective license terms.

The n8n software includes open source packages, libraries, and modules, each of which is subject to its own license. The following sections list those dependencies and provide required attributions and license texts.

---

${packagesMarkdown}`;
    
    // Write the file
    await fs.writeFile(resolve(rootDir, 'THIRD_PARTY_LICENSES.md'), markdownContent, 'utf-8');
    
    // Copy to assets folder
    await fs.copyFile(
      resolve(rootDir, 'THIRD_PARTY_LICENSES.md'),
      resolve(rootDir, 'assets/THIRD_PARTY_LICENSES.md')
    );
    
    console.log(`🎉 Generated THIRD_PARTY_LICENSES.md with ${validPackages.length} third-party packages`);
    
  } catch (error) {
    console.error('❌ Error generating licenses:', error.message);
    process.exit(1);
  }
}

main();