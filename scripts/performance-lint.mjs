#!/usr/bin/env node

/**
 * Enhanced Lint Script with Performance Monitoring
 * 
 * This script provides comprehensive performance monitoring for linting processes,
 * tracking lint duration, rule violations, file processing speed, and quality trends.
 */

import { PerformanceMonitor } from './performance-monitor.mjs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { promises as fs } from 'fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

/**
 * Enhanced lint execution with performance monitoring
 */
async function performanceLint() {
  const monitor = new PerformanceMonitor('lint');
  
  console.log('🔍 Starting lint execution with performance monitoring...\n');

  try {
    // Record initial system info
    monitor.recordSystemInfo();
    
    // Start overall lint timer
    monitor.startTimer('total_lint');
    
    // Parse command line options
    const options = parseLintOptions();
    
    // Pre-lint analysis
    console.log('📁 Analyzing codebase for linting...');
    monitor.startTimer('codebase_analysis');
    await analyzeCodebase(monitor);
    monitor.endTimer('codebase_analysis');

    // Execute different linting tools
    const results = await executeLintSuite(monitor, options);

    // Collect lint metrics and quality data
    monitor.startTimer('collect_metrics');
    await collectLintMetrics(monitor, results);
    monitor.endTimer('collect_metrics');

    // End overall lint timer
    monitor.endTimer('total_lint');

    // Finalize and generate report
    const summary = await monitor.finalize();
    
    // Display performance summary
    console.log('\n' + '='.repeat(60));
    console.log('🔍 LINT PERFORMANCE SUMMARY');
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
      console.log('\n📈 Lint Quality Metrics:');
      Object.entries(summary.qualityMetrics).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
      });
    }

    console.log('='.repeat(60));
    
    // Determine exit code based on results
    const hasErrors = results.some(r => r.errors > 0);
    const hasWarnings = results.some(r => r.warnings > 0);
    
    if (hasErrors) {
      console.log('❌ Linting completed with errors');
      process.exit(1);
    } else if (hasWarnings && options.warningsAsErrors) {
      console.log('⚠️ Linting completed with warnings (treated as errors)');
      process.exit(1);
    } else {
      console.log('✅ Linting completed successfully with performance monitoring');
    }
    
  } catch (error) {
    console.error('\n❌ Lint execution failed:', error.message);
    monitor.logEvent('lint_failure', { stage: 'unknown', error: error.message });
    
    // Still save metrics even on failure
    await monitor.finalize();
    process.exit(1);
  }
}

/**
 * Analyze codebase for linting metrics
 */
async function analyzeCodebase(monitor) {
  try {
    // Count different file types
    const jsFiles = await monitor.executeWithMonitoring(
      `find ${rootDir} -name "*.js" -o -name "*.mjs" -o -name "*.cjs" | grep -v node_modules | grep -v dist | wc -l`,
      'Count JavaScript Files'
    );

    const tsFiles = await monitor.executeWithMonitoring(
      `find ${rootDir} -name "*.ts" | grep -v node_modules | grep -v dist | wc -l`,
      'Count TypeScript Files'
    );

    const vueFiles = await monitor.executeWithMonitoring(
      `find ${rootDir} -name "*.vue" | grep -v node_modules | wc -l`,
      'Count Vue Files'
    );

    // Calculate total lines of code
    const totalLOC = await monitor.executeWithMonitoring(
      `find ${rootDir} \\( -name "*.js" -o -name "*.ts" -o -name "*.vue" -o -name "*.mjs" -o -name "*.cjs" \\) ! -path "*/node_modules/*" ! -path "*/dist/*" ! -path "*/.turbo/*" | xargs wc -l | tail -1 | awk '{print $1}'`,
      'Count Total Lines of Code'
    );

    const metrics = {
      javascriptFiles: parseInt(jsFiles.output?.trim() || '0'),
      typescriptFiles: parseInt(tsFiles.output?.trim() || '0'),
      vueFiles: parseInt(vueFiles.output?.trim() || '0'),
      totalLinesOfCode: parseInt(totalLOC.output?.trim() || '0')
    };

    monitor.recordQualityMetrics(metrics);

    console.log(`📊 Codebase analysis:`);
    console.log(`   JavaScript files: ${metrics.javascriptFiles}`);
    console.log(`   TypeScript files: ${metrics.typescriptFiles}`);
    console.log(`   Vue files: ${metrics.vueFiles}`);
    console.log(`   Total lines of code: ${metrics.totalLinesOfCode.toLocaleString()}`);

    return metrics;
  } catch (error) {
    console.warn('Could not complete codebase analysis:', error.message);
    return {};
  }
}

/**
 * Execute comprehensive linting suite
 */
async function executeLintSuite(monitor, options) {
  const lintTasks = [
    {
      name: 'eslint',
      command: options.fix ? 'pnpm lint:fix' : 'pnpm lint',
      description: 'ESLint Analysis',
      critical: true
    },
    {
      name: 'biome',
      command: 'pnpm format:check',
      description: 'Biome Format Check',
      critical: false
    },
    {
      name: 'typecheck',
      command: 'pnpm typecheck',
      description: 'TypeScript Check',
      critical: !options.skipTypecheck
    }
  ];

  const results = [];

  for (const task of lintTasks) {
    if (options.toolFilter && !task.name.includes(options.toolFilter)) {
      continue;
    }

    console.log(`\n🔍 Running ${task.name} (${task.description})...`);
    
    monitor.startTimer(`lint_${task.name}`);
    
    try {
      const result = await monitor.executeWithMonitoring(
        task.command,
        task.description
      );
      
      monitor.endTimer(`lint_${task.name}`);
      
      // Parse lint output for violations
      const violations = parseLintOutput(task.name, result.output, result.success);
      
      if (result.success) {
        console.log(`✅ ${task.name} completed in ${monitor.formatDuration(result.duration)}`);
        if (violations.warnings > 0) {
          console.log(`   ⚠️ Found ${violations.warnings} warnings`);
        }
      } else {
        console.log(`❌ ${task.name} failed in ${monitor.formatDuration(result.duration)}`);
        if (violations.errors > 0) {
          console.log(`   🚨 Found ${violations.errors} errors`);
        }
      }
      
      results.push({
        tool: task.name,
        success: result.success,
        duration: result.duration,
        ...violations
      });

      if (!result.success && task.critical && !options.continueOnFailure) {
        throw new Error(`Critical lint failure in ${task.name}`);
      }
      
    } catch (error) {
      monitor.endTimer(`lint_${task.name}`);
      console.log(`💥 ${task.name} crashed: ${error.message}`);
      
      results.push({
        tool: task.name,
        success: false,
        duration: 0,
        errors: 1,
        warnings: 0,
        error: error.message
      });

      if (task.critical && !options.continueOnFailure) {
        throw error;
      }
    }
  }

  return results;
}

/**
 * Parse lint output to extract violation counts and metrics
 */
function parseLintOutput(tool, output, success) {
  const violations = { errors: 0, warnings: 0, files: 0 };

  if (!output) return violations;

  switch (tool) {
    case 'eslint':
      // ESLint format: "✖ X problems (Y errors, Z warnings)"
      const eslintMatch = output.match(/✖ (\d+) problems? \((\d+) errors?, (\d+) warnings?\)/);
      if (eslintMatch) {
        violations.errors = parseInt(eslintMatch[2]);
        violations.warnings = parseInt(eslintMatch[3]);
      }
      
      // Alternative format: "X errors, Y warnings"
      const eslintAltMatch = output.match(/(\d+) errors?, (\d+) warnings?/);
      if (eslintAltMatch && !eslintMatch) {
        violations.errors = parseInt(eslintAltMatch[1]);
        violations.warnings = parseInt(eslintAltMatch[2]);
      }

      // Count files processed
      const eslintFilesMatch = output.match(/(\d+) files? linted/);
      if (eslintFilesMatch) {
        violations.files = parseInt(eslintFilesMatch[1]);
      }
      break;

    case 'biome':
      // Biome typically shows file counts and format issues
      if (!success) {
        violations.errors = 1; // Format issues count as errors
      }
      break;

    case 'typecheck':
      // TypeScript compiler errors
      const tsErrorMatches = output.match(/error TS\d+:/g);
      if (tsErrorMatches) {
        violations.errors = tsErrorMatches.length;
      }
      break;
  }

  return violations;
}

/**
 * Collect comprehensive lint metrics
 */
async function collectLintMetrics(monitor, results) {
  try {
    // Calculate aggregate metrics
    const totalErrors = results.reduce((sum, r) => sum + (r.errors || 0), 0);
    const totalWarnings = results.reduce((sum, r) => sum + (r.warnings || 0), 0);
    const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
    const successfulTools = results.filter(r => r.success).length;

    // Get ESLint cache information if available
    const eslintCacheSize = await monitor.executeWithMonitoring(
      `du -sh ${rootDir}/.eslintcache 2>/dev/null | cut -f1 || echo "0"`,
      'ESLint Cache Size'
    );

    // Calculate code quality score (0-100)
    const codebaseMetrics = monitor.metrics.qualityMetrics || {};
    const totalFiles = (codebaseMetrics.javascriptFiles || 0) + (codebaseMetrics.typescriptFiles || 0) + (codebaseMetrics.vueFiles || 0);
    
    let qualityScore = 100;
    if (totalFiles > 0) {
      const errorRate = (totalErrors / totalFiles) * 100;
      const warningRate = (totalWarnings / totalFiles) * 100;
      qualityScore = Math.max(0, 100 - (errorRate * 10) - (warningRate * 2));
    }

    // Record comprehensive lint metrics
    monitor.recordQualityMetrics({
      totalErrors,
      totalWarnings,
      totalLintDuration: totalDuration,
      successfulLintTools: successfulTools,
      totalLintTools: results.length,
      eslintCacheSize: eslintCacheSize.output?.trim() || '0',
      codeQualityScore: Math.round(qualityScore),
      lintResults: results,
      lintTimestamp: new Date().toISOString()
    });

    console.log(`\n📊 Lint Summary:`);
    console.log(`   Total errors: ${totalErrors}`);
    console.log(`   Total warnings: ${totalWarnings}`);
    console.log(`   Successful tools: ${successfulTools}/${results.length}`);
    console.log(`   Code quality score: ${Math.round(qualityScore)}/100`);
    console.log(`   ESLint cache size: ${eslintCacheSize.output?.trim() || '0'}`);

  } catch (error) {
    console.warn('Could not collect all lint metrics:', error.message);
  }
}

/**
 * Parse command line options
 */
function parseLintOptions() {
  const options = {
    fix: process.argv.includes('--fix'),
    skipTypecheck: process.argv.includes('--skip-typecheck'),
    warningsAsErrors: process.argv.includes('--warnings-as-errors'),
    continueOnFailure: process.argv.includes('--continue-on-failure'),
    toolFilter: null
  };

  // Look for tool filter option
  const toolIndex = process.argv.findIndex(arg => arg === '--tool');
  if (toolIndex !== -1 && process.argv[toolIndex + 1]) {
    options.toolFilter = process.argv[toolIndex + 1];
  }

  return options;
}

/**
 * Display usage information
 */
function showUsage() {
  console.log('Usage: node performance-lint.mjs [options]');
  console.log('');
  console.log('Options:');
  console.log('  --fix                  Enable auto-fixing where possible');
  console.log('  --skip-typecheck       Skip TypeScript type checking');
  console.log('  --warnings-as-errors   Treat warnings as errors');
  console.log('  --continue-on-failure  Continue with other tools even if one fails');
  console.log('  --tool <name>          Run only specific linting tool (eslint, biome, typecheck)');
  console.log('  --help                 Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  node performance-lint.mjs');
  console.log('  node performance-lint.mjs --fix');
  console.log('  node performance-lint.mjs --tool eslint');
  console.log('  node performance-lint.mjs --fix --continue-on-failure');
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes('--help')) {
    showUsage();
    process.exit(0);
  }

  performanceLint().catch((error) => {
    console.error('Lint monitoring failed:', error);
    process.exit(1);
  });
}