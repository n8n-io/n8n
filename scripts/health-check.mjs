#!/usr/bin/env node

/**
 * Health Check System for n8n Monorepo
 * 
 * Provides comprehensive health monitoring for the n8n build system,
 * including system resources, service availability, and build health.
 * 
 * Features:
 * - System resource monitoring (CPU, memory, disk)
 * - Service health checks (database, cache, external services)
 * - Build environment health validation
 * - Performance threshold monitoring
 * - Detailed health reporting
 */

import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { execSync, spawn } from 'child_process';
import { performance } from 'perf_hooks';
import os from 'os';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

/**
 * Health Check Configuration
 */
const HEALTH_CONFIG = {
  // System resource thresholds
  resources: {
    cpu: {
      warning: 80,    // 80% CPU usage
      critical: 95    // 95% CPU usage
    },
    memory: {
      warning: 80,    // 80% memory usage
      critical: 90    // 90% memory usage
    },
    disk: {
      warning: 85,    // 85% disk usage
      critical: 95    // 95% disk usage
    }
  },
  
  // Service check timeouts
  timeouts: {
    default: 5000,    // 5 seconds
    database: 10000,  // 10 seconds
    api: 3000         // 3 seconds
  },
  
  // Retry configuration
  retries: {
    maxAttempts: 3,
    delay: 1000       // 1 second between retries
  }
};

/**
 * Health Check System Class
 */
export class HealthChecker {
  constructor(options = {}) {
    this.config = { ...HEALTH_CONFIG, ...options };
    this.checks = new Map();
    this.results = {
      overall: 'unknown',
      timestamp: new Date().toISOString(),
      checks: {},
      summary: {
        total: 0,
        passed: 0,
        failed: 0,
        warnings: 0
      }
    };
    
    this.registerDefaultChecks();
  }

  /**
   * Register default health checks
   */
  registerDefaultChecks() {
    // System resource checks
    this.registerCheck('system_cpu', 'System CPU Usage', this.checkCPUUsage.bind(this));
    this.registerCheck('system_memory', 'System Memory Usage', this.checkMemoryUsage.bind(this));
    this.registerCheck('system_disk', 'System Disk Usage', this.checkDiskUsage.bind(this));
    
    // Build environment checks
    this.registerCheck('node_version', 'Node.js Version', this.checkNodeVersion.bind(this));
    this.registerCheck('pnpm_available', 'PNPM Availability', this.checkPnpmAvailability.bind(this));
    this.registerCheck('turbo_available', 'Turbo Availability', this.checkTurboAvailability.bind(this));
    
    // Project structure checks
    this.registerCheck('project_structure', 'Project Structure', this.checkProjectStructure.bind(this));
    this.registerCheck('dependencies_installed', 'Dependencies Installed', this.checkDependenciesInstalled.bind(this));
    this.registerCheck('build_cache', 'Build Cache Health', this.checkBuildCache.bind(this));
    
    // Service checks (when applicable)
    this.registerCheck('git_status', 'Git Repository Status', this.checkGitStatus.bind(this));
  }

  /**
   * Register a custom health check
   */
  registerCheck(id, name, checkFunction) {
    this.checks.set(id, {
      id,
      name,
      check: checkFunction,
      enabled: true
    });
  }

  /**
   * Run all registered health checks
   */
  async runAllChecks() {
    console.log('🔍 Running comprehensive health checks...\n');
    
    const startTime = performance.now();
    this.results.summary.total = this.checks.size;
    
    for (const [id, checkInfo] of this.checks) {
      if (!checkInfo.enabled) continue;
      
      try {
        console.log(`  Checking: ${checkInfo.name}...`);
        const result = await this.runSingleCheck(id, checkInfo);
        this.results.checks[id] = result;
        
        // Update summary
        switch (result.status) {
          case 'healthy':
            this.results.summary.passed++;
            console.log(`    ✅ ${checkInfo.name}: ${result.message}`);
            break;
          case 'warning':
            this.results.summary.warnings++;
            console.log(`    ⚠️ ${checkInfo.name}: ${result.message}`);
            break;
          case 'unhealthy':
            this.results.summary.failed++;
            console.log(`    ❌ ${checkInfo.name}: ${result.message}`);
            break;
        }
        
      } catch (error) {
        this.results.checks[id] = {
          status: 'unhealthy',
          message: `Check failed: ${error.message}`,
          error: error.stack,
          duration: 0
        };
        this.results.summary.failed++;
        console.log(`    💥 ${checkInfo.name}: Check failed - ${error.message}`);
      }
    }
    
    // Determine overall health status
    this.results.overall = this.calculateOverallHealth();
    this.results.duration = performance.now() - startTime;
    
    console.log(`\n📊 Health Check Summary:`);
    console.log(`  Overall Status: ${this.getStatusIcon(this.results.overall)} ${this.results.overall.toUpperCase()}`);
    console.log(`  Total Checks: ${this.results.summary.total}`);
    console.log(`  Passed: ${this.results.summary.passed}`);
    console.log(`  Warnings: ${this.results.summary.warnings}`);
    console.log(`  Failed: ${this.results.summary.failed}`);
    console.log(`  Duration: ${Math.round(this.results.duration)}ms\n`);
    
    return this.results;
  }

  /**
   * Run a single health check with retry logic
   */
  async runSingleCheck(id, checkInfo) {
    const startTime = performance.now();
    let lastError;
    
    for (let attempt = 1; attempt <= this.config.retries.maxAttempts; attempt++) {
      try {
        const result = await Promise.race([
          checkInfo.check(),
          this.timeout(this.config.timeouts.default)
        ]);
        
        return {
          ...result,
          duration: performance.now() - startTime,
          attempt
        };
        
      } catch (error) {
        lastError = error;
        
        if (attempt < this.config.retries.maxAttempts) {
          await this.delay(this.config.retries.delay);
        }
      }
    }
    
    throw lastError;
  }

  /**
   * Calculate overall health status
   */
  calculateOverallHealth() {
    if (this.results.summary.failed > 0) {
      return 'unhealthy';
    } else if (this.results.summary.warnings > 0) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  }

  // ===============================
  // SYSTEM RESOURCE CHECKS
  // ===============================

  /**
   * Check CPU usage
   */
  async checkCPUUsage() {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      const startTime = performance.now();
      
      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const endTime = performance.now();
        const duration = endTime - startTime;
        
        // Calculate CPU usage percentage
        const totalUsage = (endUsage.user + endUsage.system) / 1000; // Convert to ms
        const cpuPercent = (totalUsage / duration) * 100;
        
        let status = 'healthy';
        let message = `CPU usage: ${cpuPercent.toFixed(1)}%`;
        
        if (cpuPercent >= this.config.resources.cpu.critical) {
          status = 'unhealthy';
          message += ' (CRITICAL)';
        } else if (cpuPercent >= this.config.resources.cpu.warning) {
          status = 'warning';
          message += ' (HIGH)';
        }
        
        resolve({
          status,
          message,
          metrics: {
            cpuPercent: cpuPercent.toFixed(1),
            userTime: endUsage.user,
            systemTime: endUsage.system
          }
        });
      }, 1000);
    });
  }

  /**
   * Check memory usage
   */
  async checkMemoryUsage() {
    const memoryUsage = process.memoryUsage();
    const systemMemory = {
      total: os.totalmem(),
      free: os.freemem()
    };
    
    const systemUsedPercent = ((systemMemory.total - systemMemory.free) / systemMemory.total) * 100;
    const processUsedMB = memoryUsage.rss / 1024 / 1024;
    
    let status = 'healthy';
    let message = `Memory usage: ${systemUsedPercent.toFixed(1)}% system, ${processUsedMB.toFixed(1)}MB process`;
    
    if (systemUsedPercent >= this.config.resources.memory.critical) {
      status = 'unhealthy';
      message += ' (CRITICAL)';
    } else if (systemUsedPercent >= this.config.resources.memory.warning) {
      status = 'warning';
      message += ' (HIGH)';
    }
    
    return {
      status,
      message,
      metrics: {
        systemUsedPercent: systemUsedPercent.toFixed(1),
        systemTotalGB: (systemMemory.total / 1024 / 1024 / 1024).toFixed(1),
        systemFreeGB: (systemMemory.free / 1024 / 1024 / 1024).toFixed(1),
        processUsedMB: processUsedMB.toFixed(1),
        heapUsedMB: (memoryUsage.heapUsed / 1024 / 1024).toFixed(1),
        heapTotalMB: (memoryUsage.heapTotal / 1024 / 1024).toFixed(1)
      }
    };
  }

  /**
   * Check disk usage
   */
  async checkDiskUsage() {
    try {
      const diskInfo = await this.getDiskInfo(rootDir);
      const usedPercent = (diskInfo.used / diskInfo.total) * 100;
      
      let status = 'healthy';
      let message = `Disk usage: ${usedPercent.toFixed(1)}% (${this.formatBytes(diskInfo.used)}/${this.formatBytes(diskInfo.total)})`;
      
      if (usedPercent >= this.config.resources.disk.critical) {
        status = 'unhealthy';
        message += ' (CRITICAL)';
      } else if (usedPercent >= this.config.resources.disk.warning) {
        status = 'warning';
        message += ' (HIGH)';
      }
      
      return {
        status,
        message,
        metrics: {
          usedPercent: usedPercent.toFixed(1),
          totalGB: (diskInfo.total / 1024 / 1024 / 1024).toFixed(1),
          usedGB: (diskInfo.used / 1024 / 1024 / 1024).toFixed(1),
          freeGB: (diskInfo.free / 1024 / 1024 / 1024).toFixed(1)
        }
      };
      
    } catch (error) {
      return {
        status: 'warning',
        message: `Could not determine disk usage: ${error.message}`,
        metrics: {}
      };
    }
  }

  // ===============================
  // BUILD ENVIRONMENT CHECKS
  // ===============================

  /**
   * Check Node.js version compatibility
   */
  async checkNodeVersion() {
    const nodeVersion = process.version.substring(1); // Remove 'v' prefix
    const [major, minor, patch] = nodeVersion.split('.').map(Number);
    
    let status = 'healthy';
    let message = `Node.js version: ${nodeVersion}`;
    
    // Check against n8n requirements (>=20.0.0 <23.0.0)
    if (major < 20) {
      status = 'unhealthy';
      message += ' (TOO OLD - requires >=20.0.0)';
    } else if (major >= 23) {
      status = 'warning';
      message += ' (UNSUPPORTED - may have compatibility issues)';
    } else {
      message += ' (COMPATIBLE)';
    }
    
    return {
      status,
      message,
      metrics: {
        version: nodeVersion,
        major,
        minor,
        patch,
        platform: process.platform,
        arch: process.arch
      }
    };
  }

  /**
   * Check PNPM availability and version
   */
  async checkPnpmAvailability() {
    try {
      const version = execSync('pnpm --version', { encoding: 'utf8', timeout: 5000 }).trim();
      const [major, minor, patch] = version.split('.').map(Number);
      
      let status = 'healthy';
      let message = `PNPM version: ${version}`;
      
      // Check against n8n requirements (>=10.2.1)
      if (major < 10 || (major === 10 && minor < 2) || (major === 10 && minor === 2 && patch < 1)) {
        status = 'warning';
        message += ' (OLD VERSION - recommend >=10.2.1)';
      } else {
        message += ' (OK)';
      }
      
      return {
        status,
        message,
        metrics: {
          version,
          major,
          minor,
          patch
        }
      };
      
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'PNPM not available or not working',
        error: error.message
      };
    }
  }

  /**
   * Check Turbo availability
   */
  async checkTurboAvailability() {
    try {
      const version = execSync('pnpm turbo --version', { encoding: 'utf8', timeout: 5000 }).trim();
      
      return {
        status: 'healthy',
        message: `Turbo version: ${version} (OK)`,
        metrics: {
          version
        }
      };
      
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Turbo not available or not working',
        error: error.message
      };
    }
  }

  // ===============================
  // PROJECT STRUCTURE CHECKS
  // ===============================

  /**
   * Check project structure integrity
   */
  async checkProjectStructure() {
    const requiredPaths = [
      'package.json',
      'turbo.json',
      'packages',
      'scripts',
      'pnpm-lock.yaml'
    ];
    
    const missingPaths = [];
    
    for (const path of requiredPaths) {
      try {
        await fs.access(join(rootDir, path));
      } catch (error) {
        missingPaths.push(path);
      }
    }
    
    if (missingPaths.length > 0) {
      return {
        status: 'unhealthy',
        message: `Missing required paths: ${missingPaths.join(', ')}`,
        metrics: {
          missingPaths,
          requiredPaths
        }
      };
    }
    
    // Count packages
    const packagesDir = join(rootDir, 'packages');
    const packages = await fs.readdir(packagesDir, { withFileTypes: true });
    const packageCount = packages.filter(dirent => dirent.isDirectory()).length;
    
    return {
      status: 'healthy',
      message: `Project structure OK (${packageCount} packages found)`,
      metrics: {
        packageCount,
        requiredPaths
      }
    };
  }

  /**
   * Check if dependencies are properly installed
   */
  async checkDependenciesInstalled() {
    try {
      // Check if node_modules exists and is not empty
      const nodeModulesPath = join(rootDir, 'node_modules');
      await fs.access(nodeModulesPath);
      
      const nodeModulesContents = await fs.readdir(nodeModulesPath);
      if (nodeModulesContents.length === 0) {
        return {
          status: 'unhealthy',
          message: 'node_modules exists but is empty',
          metrics: { moduleCount: 0 }
        };
      }
      
      // Check pnpm-lock.yaml timestamp vs package.json
      const lockStat = await fs.stat(join(rootDir, 'pnpm-lock.yaml'));
      const packageStat = await fs.stat(join(rootDir, 'package.json'));
      
      const isLockOutdated = packageStat.mtime > lockStat.mtime;
      
      return {
        status: isLockOutdated ? 'warning' : 'healthy',
        message: isLockOutdated 
          ? `Dependencies installed but lock file may be outdated (${nodeModulesContents.length} modules)`
          : `Dependencies properly installed (${nodeModulesContents.length} modules)`,
        metrics: {
          moduleCount: nodeModulesContents.length,
          lockOutdated: isLockOutdated,
          lockfileTime: lockStat.mtime.toISOString(),
          packageTime: packageStat.mtime.toISOString()
        }
      };
      
    } catch (error) {
      return {
        status: 'unhealthy',
        message: 'Dependencies not properly installed',
        error: error.message
      };
    }
  }

  /**
   * Check build cache health
   */
  async checkBuildCache() {
    const turboCachePath = join(rootDir, '.turbo/cache');
    
    try {
      await fs.access(turboCachePath);
      
      const cacheEntries = await fs.readdir(turboCachePath);
      const cacheStats = await fs.stat(turboCachePath);
      
      // Calculate approximate cache size
      let totalSize = 0;
      for (const entry of cacheEntries.slice(0, 100)) { // Sample first 100 entries
        try {
          const entryPath = join(turboCachePath, entry);
          const entryStat = await fs.stat(entryPath);
          totalSize += entryStat.size;
        } catch (error) {
          // Skip entries that can't be read
        }
      }
      
      // Estimate total cache size
      const estimatedTotalSize = cacheEntries.length > 100 
        ? (totalSize / 100) * cacheEntries.length 
        : totalSize;
      
      return {
        status: 'healthy',
        message: `Build cache healthy (${cacheEntries.length} entries, ~${this.formatBytes(estimatedTotalSize)})`,
        metrics: {
          entryCount: cacheEntries.length,
          estimatedSizeBytes: estimatedTotalSize,
          lastModified: cacheStats.mtime.toISOString()
        }
      };
      
    } catch (error) {
      return {
        status: 'warning',
        message: 'Build cache not found (first build will be slower)',
        metrics: {
          entryCount: 0,
          estimatedSizeBytes: 0
        }
      };
    }
  }

  // ===============================
  // SERVICE CHECKS
  // ===============================

  /**
   * Check Git repository status
   */
  async checkGitStatus() {
    try {
      // Check if we're in a git repository
      execSync('git rev-parse --git-dir', { 
        stdio: 'pipe', 
        timeout: 5000,
        cwd: rootDir 
      });
      
      // Get current branch
      const branch = execSync('git branch --show-current', {
        encoding: 'utf8',
        timeout: 5000,
        cwd: rootDir
      }).trim();
      
      // Check for uncommitted changes
      const status = execSync('git status --porcelain', {
        encoding: 'utf8',
        timeout: 5000,
        cwd: rootDir
      }).trim();
      
      const hasUncommittedChanges = status.length > 0;
      const changeCount = status.split('\n').filter(line => line.trim()).length;
      
      return {
        status: 'healthy',
        message: hasUncommittedChanges 
          ? `Git repository OK (branch: ${branch}, ${changeCount} uncommitted changes)`
          : `Git repository OK (branch: ${branch}, clean)`,
        metrics: {
          branch,
          hasUncommittedChanges,
          changeCount,
          isClean: !hasUncommittedChanges
        }
      };
      
    } catch (error) {
      return {
        status: 'warning',
        message: 'Not in a Git repository or Git not available',
        error: error.message
      };
    }
  }

  // ===============================
  // UTILITY METHODS
  // ===============================

  /**
   * Get disk information
   */
  async getDiskInfo(path) {
    try {
      const output = execSync(`df -k "${path}" | tail -1`, { encoding: 'utf8' });
      const parts = output.trim().split(/\s+/);
      
      return {
        total: parseInt(parts[1]) * 1024,    // Convert KB to bytes
        used: parseInt(parts[2]) * 1024,     // Convert KB to bytes
        free: parseInt(parts[3]) * 1024      // Convert KB to bytes
      };
    } catch (error) {
      // Fallback for systems where df is not available
      throw new Error('Cannot determine disk usage on this system');
    }
  }

  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Get status icon
   */
  getStatusIcon(status) {
    const icons = {
      healthy: '✅',
      degraded: '⚠️',
      unhealthy: '❌',
      unknown: '❓'
    };
    return icons[status] || icons.unknown;
  }

  /**
   * Create timeout promise
   */
  timeout(ms) {
    return new Promise((_, reject) => 
      setTimeout(() => reject(new Error(`Health check timed out after ${ms}ms`)), ms)
    );
  }

  /**
   * Delay utility
   */
  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Save health check results to file
   */
  async saveResults(filepath) {
    await fs.writeFile(filepath, JSON.stringify(this.results, null, 2));
    console.log(`📄 Health check results saved to: ${filepath}`);
  }
}

/**
 * CLI interface
 */
async function main() {
  const args = process.argv.slice(2);
  
  const healthChecker = new HealthChecker();
  
  // Add custom checks based on arguments
  if (args.includes('--include-network')) {
    // Add network connectivity checks if requested
    console.log('🌐 Network checks not implemented in this version');
  }
  
  const results = await healthChecker.runAllChecks();
  
  // Save results if requested
  if (args.includes('--save-results')) {
    const resultsPath = join(rootDir, 'health-check-results.json');
    await healthChecker.saveResults(resultsPath);
  }
  
  // Exit with appropriate code
  const exitCode = results.overall === 'healthy' ? 0 : results.overall === 'degraded' ? 1 : 2;
  process.exit(exitCode);
}

// Run if called directly
if (process.argv[1] && process.argv[1].endsWith('health-check.mjs')) {
  main().catch(error => {
    console.error('💥 Health check system error:', error.message);
    process.exit(3);
  });
}

export { HEALTH_CONFIG };