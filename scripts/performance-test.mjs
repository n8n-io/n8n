#!/usr/bin/env node

/**
 * Enhanced Test Script with Performance Monitoring
 * 
 * This script provides comprehensive performance monitoring for test execution,
 * tracking test duration, coverage metrics, memory usage, and failure patterns.
 */

import { PerformanceMonitor } from './performance-monitor.mjs';
import { execSync, exec } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';
import { promisify } from 'util';

const execAsync = promisify(exec);
const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

/**
 * Enhanced test execution with performance monitoring
 */
async function performanceTest() {
  const monitor = new PerformanceMonitor('test');
  
  console.log('🧪 Starting test execution with performance monitoring...\n');

  try {
    // Record initial system info
    monitor.recordSystemInfo();
    
    // Start overall test timer
    monitor.startTimer('total_test');
    
    // Parse command line options
    const options = parseOptions();
    
    // Pre-test preparation
    if (options.coverage) {
      console.log('📊 Coverage mode enabled');
      process.env.COVERAGE_ENABLED = 'true';
    }

    // Monitor test build dependencies
    console.log('🔧 Ensuring test dependencies...');
    monitor.startTimer('test_prep');
    
    const prepResult = await monitor.executeWithMonitoring(
      'pnpm turbo run build --filter="./packages/*" --concurrency=3',
      'Test Dependencies Build'
    );
    
    monitor.endTimer('test_prep');
    
    if (!prepResult.success) {
      console.warn('⚠️ Test preparation had issues, continuing anyway...');
    }

    // Execute tests with monitoring
    await executeTestSuite(monitor, options);

    // Collect test metrics and coverage
    monitor.startTimer('collect_metrics');
    await collectTestMetrics(monitor, options);
    monitor.endTimer('collect_metrics');

    // End overall test timer
    monitor.endTimer('total_test');

    // Finalize and generate report
    const summary = await monitor.finalize();
    
    // Display performance summary
    console.log('\n' + '='.repeat(60));
    console.log('🧪 TEST PERFORMANCE SUMMARY');
    console.log('='.repeat(60));
    console.log(`Process: ${summary.process}`);
    console.log(`Total Duration: ${summary.duration}`);
    console.log(`Memory Usage: ${summary.memoryUsage}`);
    console.log(`Completed Timers: ${summary.completedTimers}/${summary.totalTimers}`);
    console.log(`Events Logged: ${summary.eventsCount}`);
    
    if (summary.topTimers.length > 0) {
      console.log('\n⏱️  Top Performance Timers:');
      summary.topTimers.forEach((timer, index) => {
        console.log(`   ${index + 1}. ${timer.name}: ${timer.duration}`);
      });
    }

    if (Object.keys(summary.qualityMetrics).length > 0) {
      console.log('\n📈 Test Quality Metrics:');
      Object.entries(summary.qualityMetrics).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
      });
    }

    console.log('='.repeat(60));
    console.log('✅ Tests completed successfully with performance monitoring');
    
  } catch (error) {
    console.error('\n❌ Test execution failed:', error.message);
    monitor.logEvent('test_failure', { stage: 'unknown', error: error.message });
    
    // Still save metrics even on failure
    await monitor.finalize();
    process.exit(1);
  }
}

/**
 * Execute the main test suite with detailed monitoring
 */
async function executeTestSuite(monitor, options) {
  const testCommands = [
    { name: 'utils', filter: '@n8n/utils', critical: true },
    { name: 'decorators', filter: '@n8n/decorators', critical: true },
    { name: 'core', filter: 'n8n-core', critical: false },
    { name: 'workflow', filter: 'n8n-workflow', critical: false }
  ];

  const results = [];

  for (const testCommand of testCommands) {
    if (options.filter && !testCommand.filter.includes(options.filter)) {
      continue;
    }

    console.log(`\n🔍 Testing ${testCommand.name} (${testCommand.filter})...`);
    
    monitor.startTimer(`test_${testCommand.name}`);
    
    const command = options.coverage 
      ? `COVERAGE_ENABLED=true pnpm test --filter=${testCommand.filter}`
      : `pnpm test --filter=${testCommand.filter}`;
    
    try {
      const result = await monitor.executeWithMonitoring(
        command,
        `Test ${testCommand.name}`
      );
      
      monitor.endTimer(`test_${testCommand.name}`);
      
      if (result.success) {
        console.log(`✅ ${testCommand.name} tests passed in ${monitor.formatDuration(result.duration)}`);
        
        // Parse test results from output if available
        const testStats = parseTestOutput(result.output);
        results.push({ 
          package: testCommand.name, 
          success: true, 
          duration: result.duration,
          ...testStats
        });
      } else {
        console.log(`❌ ${testCommand.name} tests failed in ${monitor.formatDuration(result.duration)}`);
        results.push({ 
          package: testCommand.name, 
          success: false, 
          duration: result.duration,
          error: result.error
        });

        if (testCommand.critical && !options.continueOnFailure) {
          throw new Error(`Critical test failure in ${testCommand.name}`);
        }
      }
    } catch (error) {
      monitor.endTimer(`test_${testCommand.name}`);
      console.log(`💥 ${testCommand.name} tests crashed: ${error.message}`);
      
      results.push({ 
        package: testCommand.name, 
        success: false, 
        duration: 0,
        error: error.message
      });

      if (testCommand.critical && !options.continueOnFailure) {
        throw error;
      }
    }
  }

  // Record overall test results
  monitor.recordQualityMetrics({
    totalPackagesTested: results.length,
    successfulPackages: results.filter(r => r.success).length,
    failedPackages: results.filter(r => !r.success).length,
    averageTestDuration: results.reduce((sum, r) => sum + r.duration, 0) / results.length,
    testResults: results
  });

  return results;
}

/**
 * Parse test output to extract useful statistics
 */
function parseTestOutput(output) {
  const stats = {};
  
  // Look for Jest test summary
  const testMatch = output.match(/Tests:\s+(\d+)\s+passed,\s+(\d+)\s+total/);
  if (testMatch) {
    stats.testsRun = parseInt(testMatch[2]);
    stats.testsPassed = parseInt(testMatch[1]);
  }

  // Look for coverage summary
  const coverageMatch = output.match(/Statements\s+:\s+([\d.]+)%/);
  if (coverageMatch) {
    stats.statementCoverage = parseFloat(coverageMatch[1]);
  }

  const branchMatch = output.match(/Branches\s+:\s+([\d.]+)%/);
  if (branchMatch) {
    stats.branchCoverage = parseFloat(branchMatch[1]);
  }

  const functionMatch = output.match(/Functions\s+:\s+([\d.]+)%/);
  if (functionMatch) {
    stats.functionCoverage = parseFloat(functionMatch[1]);
  }

  // Look for test suites
  const suiteMatch = output.match(/Test Suites:\s+(\d+)\s+passed,\s+(\d+)\s+total/);
  if (suiteMatch) {
    stats.testSuitesRun = parseInt(suiteMatch[2]);
    stats.testSuitesPassed = parseInt(suiteMatch[1]);
  }

  return stats;
}

/**
 * Collect comprehensive test metrics
 */
async function collectTestMetrics(monitor, options) {
  try {
    // Count total test files
    const testFileCount = await monitor.executeWithMonitoring(
      `find ${rootDir}/packages -name "*.test.*" -o -name "*.spec.*" | wc -l`,
      'Count Test Files'
    );

    // Count coverage reports if coverage was enabled
    let coverageMetrics = {};
    if (options.coverage) {
      const coverageReports = await monitor.executeWithMonitoring(
        `find ${rootDir}/packages -name "coverage" -type d | wc -l`,
        'Count Coverage Reports'
      );

      coverageMetrics = {
        coverageReportsGenerated: parseInt(coverageReports.output?.trim() || '0')
      };
    }

    // Get Jest cache size (performance indicator)
    const jestCacheSize = await monitor.executeWithMonitoring(
      `du -sh ${rootDir}/node_modules/.cache/jest 2>/dev/null | cut -f1 || echo "0"`,
      'Jest Cache Size'
    );

    // Record comprehensive test metrics
    monitor.recordQualityMetrics({
      totalTestFiles: parseInt(testFileCount.output?.trim() || '0'),
      jestCacheSize: jestCacheSize.output?.trim() || '0',
      coverageEnabled: options.coverage,
      ...coverageMetrics,
      testExecutionTimestamp: new Date().toISOString()
    });

    console.log(`📁 Total test files: ${testFileCount.output?.trim() || '0'}`);
    console.log(`💾 Jest cache size: ${jestCacheSize.output?.trim() || '0'}`);
    
    if (options.coverage) {
      console.log(`📊 Coverage reports generated: ${coverageMetrics.coverageReportsGenerated || 0}`);
    }

  } catch (error) {
    console.warn('Could not collect all test metrics:', error.message);
  }
}

/**
 * Parse command line options
 */
function parseOptions() {
  const options = {
    coverage: process.argv.includes('--coverage'),
    filter: null,
    continueOnFailure: process.argv.includes('--continue-on-failure')
  };

  // Look for filter option
  const filterIndex = process.argv.findIndex(arg => arg === '--filter');
  if (filterIndex !== -1 && process.argv[filterIndex + 1]) {
    options.filter = process.argv[filterIndex + 1];
  }

  return options;
}

/**
 * Display usage information
 */
function showUsage() {
  console.log('Usage: node performance-test.mjs [options]');
  console.log('');
  console.log('Options:');
  console.log('  --coverage             Enable coverage reporting');
  console.log('  --filter <package>     Run tests only for specific package');
  console.log('  --continue-on-failure  Continue testing other packages even if one fails');
  console.log('  --help                 Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  node performance-test.mjs');
  console.log('  node performance-test.mjs --coverage');
  console.log('  node performance-test.mjs --filter utils');
  console.log('  node performance-test.mjs --coverage --continue-on-failure');
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes('--help')) {
    showUsage();
    process.exit(0);
  }

  performanceTest().catch((error) => {
    console.error('Test monitoring failed:', error);
    process.exit(1);
  });
}