#!/usr/bin/env node

/**
 * Enhanced Build Script with Performance Monitoring
 * 
 * This script wraps the existing build-n8n.mjs with comprehensive performance monitoring,
 * providing detailed insights into build performance, memory usage, and bottlenecks.
 */

import { PerformanceMonitor } from './performance-monitor.mjs';
import { execSync } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

/**
 * Enhanced build with performance monitoring
 */
async function performanceBuild() {
  const monitor = new PerformanceMonitor('build');
  
  console.log('🚀 Starting n8n build with performance monitoring...\n');

  try {
    // Record initial system info
    monitor.recordSystemInfo();
    
    // Start overall build timer
    monitor.startTimer('total_build');
    
    // Monitor dependency installation
    console.log('📦 Installing dependencies with monitoring...');
    monitor.startTimer('pnpm_install');
    
    const installResult = await monitor.executeWithMonitoring(
      'pnpm install --frozen-lockfile',
      'PNPM Install'
    );
    
    monitor.endTimer('pnpm_install');
    
    if (!installResult.success) {
      console.error('❌ Dependency installation failed');
      monitor.logEvent('build_failure', { stage: 'install', error: installResult.error });
      process.exit(1);
    }

    console.log(`✅ Dependencies installed in ${monitor.formatDuration(installResult.duration)}`);

    // Monitor main build process
    console.log('\n🔨 Running main build with monitoring...');
    monitor.startTimer('turbo_build');
    
    const buildResult = await monitor.executeWithMonitoring(
      'pnpm build',
      'Turbo Build'
    );
    
    monitor.endTimer('turbo_build');
    
    if (!buildResult.success) {
      console.error('❌ Build process failed');
      monitor.logEvent('build_failure', { stage: 'build', error: buildResult.error });
      process.exit(1);
    }

    console.log(`✅ Build completed in ${monitor.formatDuration(buildResult.duration)}`);

    // Monitor typecheck if requested
    if (process.argv.includes('--typecheck')) {
      console.log('\n🔍 Running typecheck with monitoring...');
      monitor.startTimer('typecheck');
      
      const typecheckResult = await monitor.executeWithMonitoring(
        'pnpm typecheck',
        'TypeScript Check'
      );
      
      monitor.endTimer('typecheck');
      
      if (!typecheckResult.success) {
        console.warn('⚠️ Typecheck completed with issues');
        monitor.recordQualityMetrics({
          typecheckPassed: false,
          typecheckDuration: typecheckResult.duration
        });
      } else {
        console.log(`✅ Typecheck completed in ${monitor.formatDuration(typecheckResult.duration)}`);
        monitor.recordQualityMetrics({
          typecheckPassed: true,
          typecheckDuration: typecheckResult.duration
        });
      }
    }

    // Collect build artifacts metrics
    monitor.startTimer('collect_metrics');
    await collectBuildMetrics(monitor);
    monitor.endTimer('collect_metrics');

    // End overall build timer
    monitor.endTimer('total_build');

    // Finalize and generate report
    const summary = await monitor.finalize();
    
    // Display performance summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 BUILD PERFORMANCE SUMMARY');
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
      console.log('\n📈 Quality Metrics:');
      Object.entries(summary.qualityMetrics).forEach(([key, value]) => {
        console.log(`   ${key}: ${value}`);
      });
    }

    console.log('='.repeat(60));
    console.log('✅ Build completed successfully with performance monitoring');
    
  } catch (error) {
    console.error('\n❌ Build failed with error:', error.message);
    monitor.logEvent('build_failure', { stage: 'unknown', error: error.message });
    
    // Still save metrics even on failure
    await monitor.finalize();
    process.exit(1);
  }
}

/**
 * Collect build artifacts and quality metrics
 */
async function collectBuildMetrics(monitor) {
  try {
    // Count build artifacts
    const distDirs = await monitor.executeWithMonitoring(
      `find ${rootDir}/packages -name "dist" -type d | wc -l`,
      'Count Build Artifacts'
    );

    // Get total size of built assets
    const buildSize = await monitor.executeWithMonitoring(
      `du -sh ${rootDir}/packages/*/dist 2>/dev/null | awk '{total+=$1} END {print total "K"}' || echo "0K"`,
      'Calculate Build Size'
    );

    // Collect Turbo cache metrics
    await collectTurboCacheMetrics(monitor);

    // Collect build performance insights
    await collectBuildPerformanceInsights(monitor);

    // Record build quality metrics
    monitor.recordQualityMetrics({
      buildArtifacts: parseInt(distDirs.output?.trim() || '0'),
      buildSize: buildSize.output?.trim() || '0K',
      buildTimestamp: new Date().toISOString()
    });

    console.log(`📦 Build artifacts: ${distDirs.output?.trim() || '0'} dist directories`);
    console.log(`📏 Build size: ${buildSize.output?.trim() || '0K'}`);

  } catch (error) {
    console.warn('Could not collect build metrics:', error.message);
  }
}

/**
 * Collect Turbo cache effectiveness metrics
 */
async function collectTurboCacheMetrics(monitor) {
  try {
    monitor.startTimer('cache_analysis');
    
    // Get Turbo cache stats
    const cacheStats = await monitor.executeWithMonitoring(
      `find ${rootDir}/node_modules/.cache/turbo -name "*.tar.zst" | wc -l`,
      'Count Cache Entries'
    );

    const cacheSize = await monitor.executeWithMonitoring(
      `du -sh ${rootDir}/node_modules/.cache/turbo 2>/dev/null | awk '{print $1}' || echo "0K"`,
      'Calculate Cache Size'
    );

    // Check for recent cache activity (files modified in last hour)
    const recentCacheActivity = await monitor.executeWithMonitoring(
      `find ${rootDir}/node_modules/.cache/turbo -name "*.tar.zst" -mtime -1 | wc -l`,
      'Recent Cache Activity'
    );

    monitor.recordQualityMetrics({
      turboCacheEntries: parseInt(cacheStats.output?.trim() || '0'),
      turboCacheSize: cacheSize.output?.trim() || '0K',
      recentCacheHits: parseInt(recentCacheActivity.output?.trim() || '0'),
      cacheEffectiveness: calculateCacheEffectiveness(cacheStats.output, recentCacheActivity.output)
    });

    monitor.endTimer('cache_analysis');
    
    console.log(`🗄️ Turbo cache: ${cacheStats.output?.trim() || '0'} entries (${cacheSize.output?.trim() || '0K'})`);
    console.log(`⚡ Recent cache hits: ${recentCacheActivity.output?.trim() || '0'}`);

  } catch (error) {
    console.warn('Could not collect Turbo cache metrics:', error.message);
  }
}

/**
 * Collect build performance insights based on build analysis
 */
async function collectBuildPerformanceInsights(monitor) {
  try {
    monitor.startTimer('performance_insights');

    // Check TypeScript project references complexity
    const tsConfigFiles = await monitor.executeWithMonitoring(
      `find ${rootDir}/packages -name "tsconfig*.json" | wc -l`,
      'Count TypeScript Configs'
    );

    // Check for large TypeScript files (potential bottlenecks)
    const largeFiles = await monitor.executeWithMonitoring(
      `find ${rootDir}/packages -name "*.ts" -size +50k | wc -l`,
      'Count Large TypeScript Files'
    );

    // Check parallel build utilization
    const packageCount = await monitor.executeWithMonitoring(
      `find ${rootDir}/packages -name "package.json" | wc -l`,
      'Count Packages'
    );

    monitor.recordQualityMetrics({
      typescriptConfigs: parseInt(tsConfigFiles.output?.trim() || '0'),
      largeTypescriptFiles: parseInt(largeFiles.output?.trim() || '0'),
      totalPackages: parseInt(packageCount.output?.trim() || '0'),
      buildComplexity: calculateBuildComplexity(tsConfigFiles.output, largeFiles.output, packageCount.output)
    });

    monitor.endTimer('performance_insights');

    console.log(`📊 TypeScript configs: ${tsConfigFiles.output?.trim() || '0'}`);
    console.log(`📈 Large TS files: ${largeFiles.output?.trim() || '0'}`);
    console.log(`📦 Total packages: ${packageCount.output?.trim() || '0'}`);

  } catch (error) {
    console.warn('Could not collect build performance insights:', error.message);
  }
}

/**
 * Calculate cache effectiveness percentage
 */
function calculateCacheEffectiveness(totalEntries, recentHits) {
  const total = parseInt(totalEntries?.trim() || '0');
  const recent = parseInt(recentHits?.trim() || '0');
  
  if (total === 0) return 'No cache data';
  
  const effectiveness = Math.min(100, (recent / Math.max(1, total * 0.1)) * 100);
  return `${effectiveness.toFixed(1)}%`;
}

/**
 * Calculate build complexity score
 */
function calculateBuildComplexity(tsConfigs, largeFiles, packages) {
  const configs = parseInt(tsConfigs?.trim() || '0');
  const large = parseInt(largeFiles?.trim() || '0');
  const pkgs = parseInt(packages?.trim() || '0');
  
  const complexity = (configs * 2) + (large * 5) + pkgs;
  
  if (complexity < 50) return 'Low';
  if (complexity < 150) return 'Medium';
  if (complexity < 300) return 'High';
  return 'Very High';
}

/**
 * Display usage information
 */
function showUsage() {
  console.log('Usage: node performance-build.mjs [options]');
  console.log('');
  console.log('Options:');
  console.log('  --typecheck    Include TypeScript checking in monitoring');
  console.log('  --help         Show this help message');
  console.log('');
  console.log('Examples:');
  console.log('  node performance-build.mjs');
  console.log('  node performance-build.mjs --typecheck');
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes('--help')) {
    showUsage();
    process.exit(0);
  }

  performanceBuild().catch((error) => {
    console.error('Build monitoring failed:', error);
    process.exit(1);
  });
}