#!/usr/bin/env node

/**
 * Quick Cache Analysis Script
 * 
 * Generates cache effectiveness metrics without running a full build
 */

import { PerformanceMonitor } from './performance-monitor.mjs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

async function analyzeCache() {
  const monitor = new PerformanceMonitor('build');
  
  console.log('🗄️ Analyzing Turbo cache effectiveness...\n');

  try {
    // Record initial system info
    monitor.recordSystemInfo();
    
    // Start overall analysis timer
    monitor.startTimer('cache_analysis');
    
    // Collect Turbo cache metrics
    await collectTurboCacheMetrics(monitor);

    // Collect build performance insights
    await collectBuildPerformanceInsights(monitor);

    // End overall analysis timer
    monitor.endTimer('cache_analysis');

    // Record comprehensive metrics
    monitor.recordQualityMetrics({
      analysisType: 'cache_analysis',
      analysisTimestamp: new Date().toISOString()
    });

    // Finalize and generate report
    const summary = await monitor.finalize();
    
    // Display cache analysis summary
    console.log('\n' + '='.repeat(60));
    console.log('🗄️ CACHE ANALYSIS SUMMARY');
    console.log('='.repeat(60));
    console.log(`Process: ${summary.process}`);
    console.log(`Analysis Duration: ${summary.duration}`);
    console.log(`Memory Usage: ${summary.memoryUsage}`);
    console.log(`Completed Timers: ${summary.completedTimers}/${summary.totalTimers}`);
    
    if (Object.keys(summary.qualityMetrics).length > 0) {
      console.log('\n📊 Cache Metrics:');
      Object.entries(summary.qualityMetrics).forEach(([key, value]) => {
        if (!key.includes('Timestamp') && !key.includes('Type')) {
          console.log(`   ${key}: ${value}`);
        }
      });
    }

    console.log('='.repeat(60));
    console.log('✅ Cache analysis completed successfully');
    
  } catch (error) {
    console.error('\n❌ Cache analysis failed with error:', error.message);
    monitor.logEvent('analysis_failure', { error: error.message });
    
    // Still save metrics even on failure
    await monitor.finalize();
    process.exit(1);
  }
}

/**
 * Collect Turbo cache effectiveness metrics
 */
async function collectTurboCacheMetrics(monitor) {
  try {
    monitor.startTimer('cache_metrics');
    
    // Get Turbo cache stats
    const cacheStats = await monitor.executeWithMonitoring(
      `find ${rootDir}/node_modules/.cache/turbo -name "*.tar.zst" 2>/dev/null | wc -l || echo "0"`,
      'Count Cache Entries'
    );

    const cacheSize = await monitor.executeWithMonitoring(
      `du -sh ${rootDir}/node_modules/.cache/turbo 2>/dev/null | awk '{print $1}' || echo "0K"`,
      'Calculate Cache Size'
    );

    // Check for recent cache activity (files modified in last day)
    const recentCacheActivity = await monitor.executeWithMonitoring(
      `find ${rootDir}/node_modules/.cache/turbo -name "*.tar.zst" -mtime -1 2>/dev/null | wc -l || echo "0"`,
      'Recent Cache Activity'
    );

    // Get cache directory info
    const cacheDirectories = await monitor.executeWithMonitoring(
      `find ${rootDir}/node_modules/.cache/turbo -type d | wc -l || echo "0"`,
      'Count Cache Directories'
    );

    monitor.recordQualityMetrics({
      turboCacheEntries: parseInt(cacheStats.output?.trim() || '0'),
      turboCacheSize: cacheSize.output?.trim() || '0K',
      recentCacheHits: parseInt(recentCacheActivity.output?.trim() || '0'),
      cacheDirectories: parseInt(cacheDirectories.output?.trim() || '0'),
      cacheEffectiveness: calculateCacheEffectiveness(cacheStats.output, recentCacheActivity.output)
    });

    monitor.endTimer('cache_metrics');
    
    console.log(`🗄️ Turbo cache: ${cacheStats.output?.trim() || '0'} entries (${cacheSize.output?.trim() || '0K'})`);
    console.log(`⚡ Recent cache hits: ${recentCacheActivity.output?.trim() || '0'}`);
    console.log(`📁 Cache directories: ${cacheDirectories.output?.trim() || '0'}`);

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

    // Check existing build artifacts
    const builtPackages = await monitor.executeWithMonitoring(
      `find ${rootDir}/packages -name "dist" -type d | wc -l`,
      'Count Built Packages'
    );

    monitor.recordQualityMetrics({
      typescriptConfigs: parseInt(tsConfigFiles.output?.trim() || '0'),
      largeTypescriptFiles: parseInt(largeFiles.output?.trim() || '0'),
      totalPackages: parseInt(packageCount.output?.trim() || '0'),
      builtPackages: parseInt(builtPackages.output?.trim() || '0'),
      buildComplexity: calculateBuildComplexity(tsConfigFiles.output, largeFiles.output, packageCount.output),
      buildCoverage: calculateBuildCoverage(builtPackages.output, packageCount.output)
    });

    monitor.endTimer('performance_insights');

    console.log(`📊 TypeScript configs: ${tsConfigFiles.output?.trim() || '0'}`);
    console.log(`📈 Large TS files: ${largeFiles.output?.trim() || '0'}`);
    console.log(`📦 Total packages: ${packageCount.output?.trim() || '0'}`);
    console.log(`✅ Built packages: ${builtPackages.output?.trim() || '0'}`);

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
 * Calculate build coverage percentage
 */
function calculateBuildCoverage(builtPackages, totalPackages) {
  const built = parseInt(builtPackages?.trim() || '0');
  const total = parseInt(totalPackages?.trim() || '0');
  
  if (total === 0) return '0%';
  
  const coverage = (built / total) * 100;
  return `${coverage.toFixed(1)}%`;
}

// Main execution
if (import.meta.url === `file://${process.argv[1]}`) {
  analyzeCache().catch((error) => {
    console.error('Cache analysis failed:', error);
    process.exit(1);
  });
}