#!/usr/bin/env node

/**
 * Coverage Report Generator
 * 
 * This script generates comprehensive coverage reports across all packages
 * and creates an HTML overview of test coverage across the monorepo.
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

/**
 * Get all packages with Jest configurations
 */
async function getPackagesWithTests() {
  const packages = [];
  const packagesDir = join(rootDir, 'packages');
  
  try {
    const packageDirs = await fs.readdir(packagesDir);
    
    for (const packageDir of packageDirs) {
      const packagePath = join(packagesDir, packageDir);
      const stat = await fs.stat(packagePath);
      
      if (stat.isDirectory()) {
        // Check for Jest config
        const jestConfigs = [
          'jest.config.js',
          'jest.config.cjs',
          'jest.config.ts',
          'jest.config.json'
        ];
        
        for (const configFile of jestConfigs) {
          try {
            await fs.access(join(packagePath, configFile));
            packages.push({
              name: packageDir,
              path: packagePath,
              jestConfig: configFile
            });
            break;
          } catch {
            // Config file doesn't exist, continue
          }
        }
      }
    }
  } catch (error) {
    console.error('Error reading packages directory:', error.message);
  }
  
  return packages;
}

/**
 * Run coverage for a specific package
 */
async function runPackageCoverage(packageInfo) {
  console.log(`\n📦 Running coverage for ${packageInfo.name}...`);
  
  try {
    process.chdir(packageInfo.path);
    
    const { stdout, stderr } = await execAsync('COVERAGE_ENABLED=true npm test', {
      env: { ...process.env, COVERAGE_ENABLED: 'true' }
    });
    
    console.log(`✅ Coverage completed for ${packageInfo.name}`);
    return {
      package: packageInfo.name,
      success: true,
      output: stdout
    };
  } catch (error) {
    console.log(`⚠️  Coverage failed for ${packageInfo.name}: ${error.message}`);
    return {
      package: packageInfo.name,
      success: false,
      error: error.message
    };
  } finally {
    process.chdir(rootDir);
  }
}

/**
 * Generate HTML coverage overview
 */
async function generateCoverageOverview(results) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>n8n Monorepo Coverage Report</title>
    <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        h1 { color: #333; border-bottom: 3px solid #007acc; padding-bottom: 10px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
        .stat-card { background: #f8f9fa; padding: 20px; border-radius: 6px; text-align: center; border-left: 4px solid #007acc; }
        .stat-number { font-size: 2em; font-weight: bold; color: #007acc; }
        .stat-label { color: #666; margin-top: 5px; }
        .packages { margin-top: 30px; }
        .package { background: #f8f9fa; margin: 15px 0; padding: 20px; border-radius: 6px; border-left: 4px solid #28a745; }
        .package.failed { border-left-color: #dc3545; }
        .package-name { font-weight: bold; font-size: 1.2em; margin-bottom: 10px; }
        .package-status { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 0.9em; }
        .status-success { background: #d4edda; color: #155724; }
        .status-failed { background: #f8d7da; color: #721c24; }
        .coverage-link { display: inline-block; margin-top: 10px; padding: 8px 15px; background: #007acc; color: white; text-decoration: none; border-radius: 4px; }
        .coverage-link:hover { background: #005a9e; }
        .timestamp { color: #666; font-size: 0.9em; margin-top: 20px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔍 n8n Monorepo Coverage Report</h1>
        
        <div class="summary">
            <div class="stat-card">
                <div class="stat-number">${results.length}</div>
                <div class="stat-label">Total Packages</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${results.filter(r => r.success).length}</div>
                <div class="stat-label">Successful</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">${results.filter(r => !r.success).length}</div>
                <div class="stat-label">Failed</div>
            </div>
            <div class="stat-card">
                <div class="stat-number">80%</div>
                <div class="stat-label">Coverage Threshold</div>
            </div>
        </div>
        
        <div class="packages">
            <h2>📦 Package Coverage Reports</h2>
            ${results.map(result => `
                <div class="package ${result.success ? 'success' : 'failed'}">
                    <div class="package-name">${result.package}</div>
                    <span class="package-status ${result.success ? 'status-success' : 'status-failed'}">
                        ${result.success ? '✅ Coverage Generated' : '❌ Coverage Failed'}
                    </span>
                    ${result.success ? `
                        <a href="./packages/${result.package}/coverage/index.html" class="coverage-link" target="_blank">
                            📊 View Coverage Report
                        </a>
                    ` : `
                        <div style="margin-top: 10px; color: #721c24; font-size: 0.9em;">
                            Error: ${result.error || 'Unknown error'}
                        </div>
                    `}
                </div>
            `).join('')}
        </div>
        
        <div class="timestamp">
            Generated on ${new Date().toLocaleString()}
        </div>
    </div>
</body>
</html>
  `;
  
  await fs.writeFile(join(rootDir, 'coverage-overview.html'), html.trim());
  console.log('\n📊 Coverage overview generated: coverage-overview.html');
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting comprehensive coverage report generation...\n');
  
  const packages = await getPackagesWithTests();
  console.log(`Found ${packages.length} packages with test configurations`);
  
  if (packages.length === 0) {
    console.log('No packages with Jest configurations found.');
    return;
  }
  
  const results = [];
  
  // Run coverage for each package
  for (const packageInfo of packages) {
    const result = await runPackageCoverage(packageInfo);
    results.push(result);
  }
  
  // Generate overview
  await generateCoverageOverview(results);
  
  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('📋 COVERAGE REPORT SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total packages: ${results.length}`);
  console.log(`Successful: ${results.filter(r => r.success).length}`);
  console.log(`Failed: ${results.filter(r => !r.success).length}`);
  console.log('\n✨ Coverage reports available in coverage/ directories');
  console.log('🌐 Open coverage-overview.html for a complete overview');
  
  if (results.some(r => !r.success)) {
    console.log('\n⚠️  Some packages failed coverage generation. Check individual package test configurations.');
    process.exit(1);
  }
}

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
  process.exit(1);
});

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}