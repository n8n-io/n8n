#!/usr/bin/env node

/**
 * Turbo Performance Monitor
 * 
 * Monitors and analyzes turbo build performance to track cache effectiveness,
 * build times, and parallelization improvements over time.
 * 
 * Usage:
 *   node scripts/turbo-performance-monitor.js --baseline  # Create baseline
 *   node scripts/turbo-performance-monitor.js --compare   # Compare to baseline
 *   node scripts/turbo-performance-monitor.js --analyze   # Show trends
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { performance } from 'perf_hooks';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const metricsFile = join(rootDir, '.turbo-performance-metrics.json');

/**
 * Performance Monitor Class
 */
class TurboPerformanceMonitor {
  constructor() {
    this.metrics = {
      timestamp: new Date().toISOString(),
      buildMetrics: {},
      cacheMetrics: {},
      systemInfo: {}
    };
  }

  /**
   * Create performance baseline
   */
  async createBaseline() {
    console.log('🚀 Creating Turbo performance baseline...\n');
    
    // Clean build to get accurate timing
    console.log('1. Cleaning build cache...');
    execSync('pnpm clean', { stdio: 'inherit' });
    
    // Measure cold build
    console.log('2. Running cold build measurement...');
    const coldBuildTime = await this.measureBuildTime('pnpm build');
    
    // Measure incremental build (no changes)
    console.log('3. Running incremental build measurement...');
    const incrementalBuildTime = await this.measureBuildTime('pnpm build');
    
    // Collect cache metrics
    console.log('4. Analyzing cache metrics...');
    const cacheMetrics = await this.analyzeCacheMetrics();
    
    // Collect system information
    const systemInfo = this.collectSystemInfo();
    
    const baseline = {
      timestamp: new Date().toISOString(),
      type: 'baseline',
      buildMetrics: {
        coldBuild: coldBuildTime,
        incrementalBuild: incrementalBuildTime,
        cacheImprovement: Math.round(((coldBuildTime - incrementalBuildTime) / coldBuildTime) * 100)
      },
      cacheMetrics,
      systemInfo
    };
    
    // Save baseline
    await this.saveMetrics(baseline);
    
    console.log('\n✅ Baseline created successfully!');
    console.log('📊 Results:');
    console.log(`   Cold Build: ${this.formatDuration(coldBuildTime)}`);
    console.log(`   Incremental: ${this.formatDuration(incrementalBuildTime)}`);
    console.log(`   Cache Improvement: ${baseline.buildMetrics.cacheImprovement}%`);
    console.log(`   Cache Entries: ${cacheMetrics.entryCount}`);
    console.log(`   Cache Size: ${this.formatBytes(cacheMetrics.totalSize)}`);
  }

  /**
   * Compare current performance to baseline
   */
  async compareToBaseline() {
    console.log('📈 Comparing current performance to baseline...\n');
    
    const baseline = await this.loadBaseline();
    if (!baseline) {
      console.error('❌ No baseline found. Run with --baseline first.');
      process.exit(1);
    }
    
    // Clean and measure current performance
    console.log('1. Cleaning cache for accurate measurement...');
    execSync('turbo run clean', { stdio: 'pipe' });
    
    console.log('2. Measuring current cold build performance...');
    const currentColdBuild = await this.measureBuildTime('pnpm build');
    
    console.log('3. Measuring current incremental build performance...');
    const currentIncremental = await this.measureBuildTime('pnpm build');
    
    console.log('4. Analyzing current cache metrics...');
    const currentCache = await this.analyzeCacheMetrics();
    
    const comparison = {
      timestamp: new Date().toISOString(),
      type: 'comparison',
      baseline: baseline.timestamp,
      buildMetrics: {
        coldBuild: currentColdBuild,
        incrementalBuild: currentIncremental,
        cacheImprovement: Math.round(((currentColdBuild - currentIncremental) / currentColdBuild) * 100)
      },
      cacheMetrics: currentCache,
      improvements: {
        coldBuildImprovement: this.calculateImprovement(baseline.buildMetrics.coldBuild, currentColdBuild),
        incrementalImprovement: this.calculateImprovement(baseline.buildMetrics.incrementalBuild, currentIncremental),
        cacheEfficiencyImprovement: currentCache.hitRate - baseline.cacheMetrics.hitRate
      }
    };
    
    // Save comparison
    await this.saveMetrics(comparison);
    
    // Display results
    this.displayComparison(baseline, comparison);
  }

  /**
   * Analyze performance trends
   */
  async analyzeTrends() {
    console.log('📊 Analyzing performance trends...\n');
    
    const allMetrics = await this.loadAllMetrics();
    if (allMetrics.length < 2) {
      console.log('📈 Not enough data for trend analysis. Need at least 2 measurement points.');
      return;
    }
    
    const recent = allMetrics.slice(-10); // Last 10 measurements
    const buildTimes = recent.map(m => m.buildMetrics.coldBuild);
    const cacheSizes = recent.map(m => m.cacheMetrics.totalSize);
    
    console.log('🔍 Trend Analysis Results:');
    console.log(`   Measurements: ${recent.length}`);
    console.log(`   Time Range: ${recent[0].timestamp} to ${recent[recent.length - 1].timestamp}`);
    console.log(`   Average Build Time: ${this.formatDuration(this.average(buildTimes))}`);
    console.log(`   Build Time Trend: ${this.calculateTrend(buildTimes) > 0 ? '📈 Increasing' : '📉 Decreasing'}`);
    console.log(`   Average Cache Size: ${this.formatBytes(this.average(cacheSizes))}`);
    console.log(`   Cache Growth: ${this.formatBytes(cacheSizes[cacheSizes.length - 1] - cacheSizes[0])}`);
    
    // Performance recommendations
    this.generateRecommendations(recent);
  }

  /**
   * Measure build time for a command
   */
  async measureBuildTime(command) {
    const startTime = performance.now();
    
    try {
      execSync(command, { 
        stdio: 'pipe',
        timeout: 30 * 60 * 1000 // 30 minute timeout
      });
      
      const endTime = performance.now();
      return endTime - startTime;
      
    } catch (error) {
      console.error(`❌ Build command failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Analyze cache metrics
   */
  async analyzeCacheMetrics() {
    const turboCachePath = join(rootDir, '.turbo/cache');
    
    try {
      const cacheEntries = await fs.readdir(turboCachePath);
      let totalSize = 0;
      let recentHits = 0;
      
      // Sample cache entries to estimate total size and hit rate
      const sampleSize = Math.min(100, cacheEntries.length);
      const sample = cacheEntries.slice(0, sampleSize);
      
      for (const entry of sample) {
        try {
          const entryPath = join(turboCachePath, entry);
          const stat = await fs.stat(entryPath);
          totalSize += stat.size;
          
          // Consider entries modified in last hour as recent hits
          const hourAgo = Date.now() - (60 * 60 * 1000);
          if (stat.mtime.getTime() > hourAgo) {
            recentHits++;
          }
        } catch (error) {
          // Skip problematic entries
        }
      }
      
      // Estimate total cache size
      const estimatedTotalSize = cacheEntries.length > sampleSize 
        ? (totalSize / sampleSize) * cacheEntries.length 
        : totalSize;
      
      const hitRate = sampleSize > 0 ? (recentHits / sampleSize) * 100 : 0;
      
      return {
        entryCount: cacheEntries.length,
        totalSize: estimatedTotalSize,
        hitRate: Math.round(hitRate),
        efficiency: cacheEntries.length > 0 ? estimatedTotalSize / cacheEntries.length : 0
      };
      
    } catch (error) {
      return {
        entryCount: 0,
        totalSize: 0,
        hitRate: 0,
        efficiency: 0
      };
    }
  }

  /**
   * Collect system information
   */
  collectSystemInfo() {
    return {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      cpuCount: require('os').cpus().length,
      totalMemory: require('os').totalmem(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Save metrics to file
   */
  async saveMetrics(metrics) {
    let allMetrics = [];
    
    try {
      const existing = await fs.readFile(metricsFile, 'utf8');
      allMetrics = JSON.parse(existing);
    } catch (error) {
      // File doesn't exist or is invalid, start fresh
    }
    
    allMetrics.push(metrics);
    
    // Keep last 50 measurements
    if (allMetrics.length > 50) {
      allMetrics = allMetrics.slice(-50);
    }
    
    await fs.writeFile(metricsFile, JSON.stringify(allMetrics, null, 2));
  }

  /**
   * Load baseline metrics
   */
  async loadBaseline() {
    try {
      const allMetrics = await this.loadAllMetrics();
      return allMetrics.find(m => m.type === 'baseline') || allMetrics[0];
    } catch (error) {
      return null;
    }
  }

  /**
   * Load all metrics
   */
  async loadAllMetrics() {
    try {
      const data = await fs.readFile(metricsFile, 'utf8');
      return JSON.parse(data);
    } catch (error) {
      return [];
    }
  }

  /**
   * Calculate improvement percentage
   */
  calculateImprovement(baseline, current) {
    if (baseline === 0) return 0;
    return Math.round(((baseline - current) / baseline) * 100);
  }

  /**
   * Calculate trend (positive = getting worse, negative = improving)
   */
  calculateTrend(values) {
    if (values.length < 2) return 0;
    
    const first = values.slice(0, Math.floor(values.length / 2));
    const second = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = this.average(first);
    const secondAvg = this.average(second);
    
    return ((secondAvg - firstAvg) / firstAvg) * 100;
  }

  /**
   * Calculate average
   */
  average(numbers) {
    return numbers.reduce((a, b) => a + b, 0) / numbers.length;
  }

  /**
   * Display comparison results
   */
  displayComparison(baseline, comparison) {
    console.log('\n🎯 Performance Comparison Results:');
    console.log('='.repeat(50));
    
    console.log('\n📊 Build Performance:');
    console.log(`   Cold Build: ${this.formatDuration(comparison.buildMetrics.coldBuild)} (${this.formatImprovement(comparison.improvements.coldBuildImprovement)})`);
    console.log(`   Incremental: ${this.formatDuration(comparison.buildMetrics.incrementalBuild)} (${this.formatImprovement(comparison.improvements.incrementalImprovement)})`);
    console.log(`   Cache Efficiency: ${comparison.buildMetrics.cacheImprovement}%`);
    
    console.log('\n💾 Cache Performance:');
    console.log(`   Entries: ${comparison.cacheMetrics.entryCount} (vs ${baseline.cacheMetrics.entryCount})`);
    console.log(`   Size: ${this.formatBytes(comparison.cacheMetrics.totalSize)} (vs ${this.formatBytes(baseline.cacheMetrics.totalSize)})`);
    console.log(`   Hit Rate: ${comparison.cacheMetrics.hitRate}% (${this.formatImprovement(comparison.improvements.cacheEfficiencyImprovement, '%')})`);
    
    console.log('\n🎯 Overall Assessment:');
    const overallImprovement = (comparison.improvements.coldBuildImprovement + comparison.improvements.incrementalImprovement) / 2;
    if (overallImprovement > 10) {
      console.log('   🚀 Excellent performance improvement!');
    } else if (overallImprovement > 5) {
      console.log('   ✅ Good performance improvement.');
    } else if (overallImprovement > 0) {
      console.log('   📈 Minor performance improvement.');
    } else {
      console.log('   ⚠️ Performance has decreased. Review recent changes.');
    }
  }

  /**
   * Generate performance recommendations
   */
  generateRecommendations(recentMetrics) {
    console.log('\n💡 Performance Recommendations:');
    
    const latest = recentMetrics[recentMetrics.length - 1];
    const recommendations = [];
    
    if (latest.cacheMetrics.hitRate < 60) {
      recommendations.push('• Consider optimizing input specifications for better cache hits');
    }
    
    if (latest.buildMetrics.coldBuild > 10 * 60 * 1000) { // > 10 minutes
      recommendations.push('• Cold builds are slow - consider dependency graph optimization');
    }
    
    if (latest.cacheMetrics.totalSize > 1024 * 1024 * 1024) { // > 1GB
      recommendations.push('• Cache size is large - consider cleanup policies');
    }
    
    const buildTimes = recentMetrics.map(m => m.buildMetrics.coldBuild);
    if (this.calculateTrend(buildTimes) > 10) {
      recommendations.push('• Build times are trending upward - investigate recent changes');
    }
    
    if (recommendations.length === 0) {
      console.log('   🎯 Performance is optimal! No specific recommendations.');
    } else {
      recommendations.forEach(rec => console.log(`   ${rec}`));
    }
  }

  /**
   * Format duration in milliseconds
   */
  formatDuration(ms) {
    if (ms < 1000) return `${Math.round(ms)}ms`;
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  }

  /**
   * Format bytes to human readable
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Format improvement percentage
   */
  formatImprovement(improvement, suffix = '') {
    const sign = improvement > 0 ? '+' : '';
    const color = improvement > 0 ? '🟢' : improvement < 0 ? '🔴' : '⚪';
    return `${color} ${sign}${improvement}${suffix}`;
  }
}

/**
 * CLI Interface
 */
async function main() {
  const args = process.argv.slice(2);
  const monitor = new TurboPerformanceMonitor();
  
  try {
    if (args.includes('--baseline')) {
      await monitor.createBaseline();
    } else if (args.includes('--compare')) {
      await monitor.compareToBaseline();
    } else if (args.includes('--analyze')) {
      await monitor.analyzeTrends();
    } else {
      console.log('Turbo Performance Monitor');
      console.log('');
      console.log('Usage:');
      console.log('  --baseline  Create performance baseline');
      console.log('  --compare   Compare current performance to baseline');
      console.log('  --analyze   Analyze performance trends');
      console.log('');
      console.log('Examples:');
      console.log('  node scripts/turbo-performance-monitor.js --baseline');
      console.log('  node scripts/turbo-performance-monitor.js --compare');
      console.log('  node scripts/turbo-performance-monitor.js --analyze');
    }
  } catch (error) {
    console.error('💥 Performance monitoring failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { TurboPerformanceMonitor };