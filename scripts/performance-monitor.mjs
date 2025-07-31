#!/usr/bin/env node

/**
 * Performance Monitoring System for n8n Monorepo
 * 
 * This module provides comprehensive performance monitoring for build, test, and lint processes.
 * It tracks timing, memory usage, quality metrics, and generates actionable insights.
 * 
 * Features:
 * - Centralized metrics collection
 * - Historical data storage
 * - Performance trend analysis
 * - Integration with existing scripts
 * - Actionable reporting
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';
import { performance } from 'perf_hooks';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const metricsDir = join(rootDir, '.performance-metrics');

/**
 * Performance Monitor Class
 * Handles all performance tracking and metrics collection
 */
export class PerformanceMonitor {
  constructor(processName) {
    this.processName = processName;
    this.sessionId = Date.now().toString();
    this.metrics = {
      processName,
      sessionId: this.sessionId,
      startTime: Date.now(),
      startMemory: process.memoryUsage(),
      timers: new Map(),
      events: [],
      finalMetrics: {}
    };
    
    this.ensureMetricsDirectory();
  }

  /**
   * Ensure metrics directory exists
   */
  async ensureMetricsDirectory() {
    try {
      await fs.mkdir(metricsDir, { recursive: true });
    } catch (error) {
      console.warn('Could not create metrics directory:', error.message);
    }
  }

  /**
   * Start a performance timer
   */
  startTimer(name) {
    const startTime = performance.now();
    this.metrics.timers.set(name, { startTime, endTime: null });
    this.logEvent('timer_start', { timerName: name, timestamp: Date.now() });
    return startTime;
  }

  /**
   * End a performance timer and return elapsed time
   */
  endTimer(name) {
    const endTime = performance.now();
    const timer = this.metrics.timers.get(name);
    
    if (!timer) {
      console.warn(`Timer '${name}' was not started`);
      return 0;
    }

    timer.endTime = endTime;
    const elapsed = endTime - timer.startTime;
    
    this.logEvent('timer_end', { 
      timerName: name, 
      duration: elapsed,
      timestamp: Date.now() 
    });

    return elapsed;
  }

  /**
   * Get elapsed time for a timer (without ending it)
   */
  getElapsedTime(name) {
    const timer = this.metrics.timers.get(name);
    if (!timer) return 0;
    
    const currentTime = timer.endTime || performance.now();
    return currentTime - timer.startTime;
  }

  /**
   * Log a performance event
   */
  logEvent(type, data = {}) {
    this.metrics.events.push({
      type,
      timestamp: Date.now(),
      memory: process.memoryUsage(),
      ...data
    });
  }

  /**
   * Record quality metrics (test coverage, lint warnings, etc.)
   */
  recordQualityMetrics(metrics) {
    this.metrics.qualityMetrics = {
      ...this.metrics.qualityMetrics,
      ...metrics,
      recordedAt: Date.now()
    };

    this.logEvent('quality_metrics', metrics);
  }

  /**
   * Record system information
   */
  recordSystemInfo() {
    const systemInfo = {
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      cpuUsage: process.cpuUsage(),
      memoryUsage: process.memoryUsage(),
      loadAverage: require('os').loadavg(),
      cpuCount: require('os').cpus().length
    };

    this.metrics.systemInfo = systemInfo;
    this.logEvent('system_info', systemInfo);
    return systemInfo;
  }

  /**
   * Execute a command with performance monitoring
   */
  async executeWithMonitoring(command, description) {
    const timerName = `exec_${description.replace(/\s+/g, '_').toLowerCase()}`;
    
    this.startTimer(timerName);
    this.logEvent('command_start', { command, description });

    try {
      const startMemory = process.memoryUsage();
      const result = execSync(command, { 
        encoding: 'utf8',
        cwd: rootDir,
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });
      
      const endMemory = process.memoryUsage();
      const duration = this.endTimer(timerName);

      this.logEvent('command_success', { 
        command, 
        description, 
        duration,
        memoryDelta: {
          rss: endMemory.rss - startMemory.rss,
          heapUsed: endMemory.heapUsed - startMemory.heapUsed
        }
      });

      return { success: true, output: result, duration };
    } catch (error) {
      const duration = this.endTimer(timerName);
      
      this.logEvent('command_error', { 
        command, 
        description, 
        duration,
        error: error.message 
      });

      return { success: false, error: error.message, duration };
    }
  }

  /**
   * Finalize metrics collection and save to disk
   */
  async finalize() {
    const endTime = Date.now();
    const endMemory = process.memoryUsage();

    // Calculate final metrics
    this.metrics.finalMetrics = {
      totalDuration: endTime - this.metrics.startTime,
      memoryDelta: {
        rss: endMemory.rss - this.metrics.startMemory.rss,
        heapUsed: endMemory.heapUsed - this.metrics.startMemory.heapUsed,
        heapTotal: endMemory.heapTotal - this.metrics.startMemory.heapTotal,
        external: endMemory.external - this.metrics.startMemory.external
      },
      timerSummary: Array.from(this.metrics.timers.entries()).map(([name, timer]) => ({
        name,
        duration: timer.endTime ? timer.endTime - timer.startTime : null,
        completed: timer.endTime !== null
      }))
    };

    // Save metrics to file
    await this.saveMetrics();

    // Generate summary
    return this.generateSummary();
  }

  /**
   * Save metrics to JSON file
   */
  async saveMetrics() {
    try {
      const filename = `${this.processName}-${this.sessionId}.json`;
      const filepath = join(metricsDir, filename);
      
      await fs.writeFile(filepath, JSON.stringify(this.metrics, null, 2));
      console.log(`📊 Performance metrics saved: ${filepath}`);
    } catch (error) {
      console.warn('Could not save performance metrics:', error.message);
    }
  }

  /**
   * Generate performance summary
   */
  generateSummary() {
    const { finalMetrics, qualityMetrics } = this.metrics;
    
    return {
      process: this.processName,
      sessionId: this.sessionId,
      duration: this.formatDuration(finalMetrics.totalDuration),
      memoryUsage: this.formatMemory(finalMetrics.memoryDelta.rss),
      completedTimers: finalMetrics.timerSummary.filter(t => t.completed).length,
      totalTimers: finalMetrics.timerSummary.length,
      qualityMetrics: qualityMetrics || {},
      eventsCount: this.metrics.events.length,
      topTimers: finalMetrics.timerSummary
        .filter(t => t.completed)
        .sort((a, b) => b.duration - a.duration)
        .slice(0, 5)
        .map(t => ({
          name: t.name,
          duration: this.formatDuration(t.duration)
        }))
    };
  }

  /**
   * Format duration in milliseconds to human readable
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
   * Format memory usage in bytes to human readable
   */
  formatMemory(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(Math.abs(bytes)) / Math.log(k));
    const value = bytes / Math.pow(k, i);
    return `${value >= 0 ? '+' : ''}${value.toFixed(1)} ${sizes[i]}`;
  }
}

/**
 * Historical Performance Analysis
 */
export class PerformanceAnalyzer {
  constructor() {
    this.metricsDir = metricsDir;
  }

  /**
   * Load all historical metrics
   */
  async loadHistoricalMetrics(processName = null) {
    try {
      const files = await fs.readdir(this.metricsDir);
      const metricsFiles = files.filter(f => f.endsWith('.json'));
      
      if (processName) {
        const filtered = metricsFiles.filter(f => f.startsWith(processName));
        return await Promise.all(
          filtered.map(async (file) => JSON.parse(await fs.readFile(join(this.metricsDir, file), 'utf8')))
        );
      }

      return await Promise.all(
        metricsFiles.map(async (file) => JSON.parse(await fs.readFile(join(this.metricsDir, file), 'utf8')))
      );
    } catch (error) {
      console.warn('Could not load historical metrics:', error.message);
      return [];
    }
  }

  /**
   * Analyze performance trends
   */
  async analyzeTrends(processName) {
    const metrics = await this.loadHistoricalMetrics(processName);
    
    if (metrics.length < 2) {
      return { message: 'Not enough historical data for trend analysis' };
    }

    const recent = metrics.slice(-10); // Last 10 runs
    const durations = recent.map(m => m.finalMetrics?.totalDuration || 0);
    const memoryUsage = recent.map(m => m.finalMetrics?.memoryDelta?.rss || 0);

    return {
      processName,
      runsAnalyzed: recent.length,
      averageDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
      durationTrend: this.calculateTrend(durations),
      averageMemoryDelta: memoryUsage.reduce((a, b) => a + b, 0) / memoryUsage.length,
      memoryTrend: this.calculateTrend(memoryUsage),
      recommendations: this.generateRecommendations(recent)
    };
  }

  /**
   * Calculate trend (positive = increasing, negative = decreasing)
   */
  calculateTrend(values) {
    if (values.length < 2) return 0;
    
    const firstHalf = values.slice(0, Math.floor(values.length / 2));
    const secondHalf = values.slice(Math.floor(values.length / 2));
    
    const firstAvg = firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length;
    const secondAvg = secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length;
    
    return ((secondAvg - firstAvg) / firstAvg) * 100;
  }

  /**
   * Generate performance recommendations
   */
  generateRecommendations(recentMetrics) {
    const recommendations = [];
    
    // Analyze duration trends
    const durations = recentMetrics.map(m => m.finalMetrics?.totalDuration || 0);
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    
    if (avgDuration > 5 * 60 * 1000) { // > 5 minutes
      recommendations.push('Consider parallel execution or build optimization for long-running processes');
    }

    // Analyze memory usage
    const memoryDeltas = recentMetrics.map(m => m.finalMetrics?.memoryDelta?.rss || 0);
    const avgMemoryDelta = memoryDeltas.reduce((a, b) => a + b, 0) / memoryDeltas.length;
    
    if (avgMemoryDelta > 500 * 1024 * 1024) { // > 500MB
      recommendations.push('High memory usage detected - consider memory optimization');
    }

    // Analyze timer efficiency
    const timerCounts = recentMetrics.map(m => m.finalMetrics?.timerSummary?.length || 0);
    const avgTimerCount = timerCounts.reduce((a, b) => a + b, 0) / timerCounts.length;
    
    if (avgTimerCount > 20) {
      recommendations.push('Consider consolidating or optimizing timing points');
    }

    return recommendations.length > 0 ? recommendations : ['Performance metrics are within normal ranges'];
  }
}

/**
 * CLI Interface for standalone usage
 */
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  const processName = process.argv[3];

  if (command === 'analyze' && processName) {
    const analyzer = new PerformanceAnalyzer();
    analyzer.analyzeTrends(processName).then((analysis) => {
      console.log('\n📈 Performance Trend Analysis');
      console.log('===============================');
      console.log(`Process: ${analysis.processName}`);
      console.log(`Runs analyzed: ${analysis.runsAnalyzed}`);
      console.log(`Average duration: ${Math.round(analysis.averageDuration / 1000)}s`);
      console.log(`Duration trend: ${analysis.durationTrend > 0 ? '+' : ''}${analysis.durationTrend.toFixed(1)}%`);
      console.log(`Memory trend: ${analysis.memoryTrend > 0 ? '+' : ''}${analysis.memoryTrend.toFixed(1)}%`);
      console.log('\n💡 Recommendations:');
      analysis.recommendations.forEach(rec => console.log(`   • ${rec}`));
    }).catch(console.error);
  } else {
    console.log('Usage:');
    console.log('  node performance-monitor.mjs analyze <process-name>');
    console.log('');
    console.log('Examples:');
    console.log('  node performance-monitor.mjs analyze build');
    console.log('  node performance-monitor.mjs analyze test');
    console.log('  node performance-monitor.mjs analyze lint');
  }
}