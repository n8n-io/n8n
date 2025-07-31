#!/usr/bin/env node

/**
 * Turbo Performance Monitor
 * 
 * Measures and tracks build performance improvements with the enhanced turbo configuration.
 * Provides analytics on cache hit rates, parallel utilization, and build times.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class TurboPerformanceMonitor {
    constructor() {
        this.metricsFile = path.join(process.cwd(), 'build-metrics.json');
        this.baselineFile = path.join(process.cwd(), 'build-baseline.json');
    }

    /**
     * Measure build performance with timing and cache analytics
     */
    measureBuildPerformance() {
        console.log('🔍 Starting turbo build performance measurement...');
        
        const start = Date.now();
        let output = '';
        
        try {
            // Run turbo build with profile information
            output = execSync('pnpm turbo build --profile --summarize', { 
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'pipe']
            });
        } catch (error) {
            console.error('❌ Build failed:', error.message);
            return null;
        }
        
        const duration = Date.now() - start;
        const metrics = this.analyzeOutput(output, duration);
        
        this.saveMetrics(metrics);
        this.displayResults(metrics);
        
        return metrics;
    }

    /**
     * Analyze turbo output for performance metrics
     */
    analyzeOutput(output, duration) {
        const lines = output.split('\n');
        
        // Extract cache information
        const cacheHits = lines.filter(line => line.includes('CACHE HIT')).length;
        const cacheMisses = lines.filter(line => line.includes('CACHE MISS')).length;
        const totalTasks = cacheHits + cacheMisses;
        
        // Calculate parallel utilization from task execution patterns
        const parallelTasks = this.estimateParallelUtilization(lines);
        
        return {
            timestamp: new Date().toISOString(),
            duration: Math.round(duration / 1000), // Convert to seconds
            totalTasks,
            cacheHits,
            cacheMisses,
            cacheHitRate: totalTasks > 0 ? Math.round((cacheHits / totalTasks) * 100) : 0,
            estimatedParallelUtilization: parallelTasks,
            configuration: 'enhanced-v1'
        };
    }

    /**
     * Estimate parallel utilization based on output patterns
     */
    estimateParallelUtilization(lines) {
        // Look for concurrent task execution indicators
        const runningLines = lines.filter(line => 
            line.includes('Running') || line.includes('BUILDING')
        );
        
        // Estimate based on the number of concurrent "Running" indicators
        // This is a heuristic - actual parallel utilization would need more detailed profiling
        return Math.min(Math.round(runningLines.length / 10 * 100), 100);
    }

    /**
     * Save metrics to file for trend analysis
     */
    saveMetrics(metrics) {
        let allMetrics = [];
        
        if (fs.existsSync(this.metricsFile)) {
            try {
                const existing = fs.readFileSync(this.metricsFile, 'utf8');
                allMetrics = JSON.parse(existing);
            } catch (error) {
                console.warn('⚠️ Could not read existing metrics file, starting fresh');
            }
        }
        
        allMetrics.push(metrics);
        
        // Keep only last 50 measurements to prevent file growth
        if (allMetrics.length > 50) {
            allMetrics = allMetrics.slice(-50);
        }
        
        fs.writeFileSync(this.metricsFile, JSON.stringify(allMetrics, null, 2));
    }

    /**
     * Display performance results
     */
    displayResults(metrics) {
        console.log('\n📊 Build Performance Results:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log(`⏱️  Build Time: ${metrics.duration}s`);
        console.log(`📋 Total Tasks: ${metrics.totalTasks}`);
        console.log(`✅ Cache Hits: ${metrics.cacheHits} (${metrics.cacheHitRate}%)`);
        console.log(`❌ Cache Misses: ${metrics.cacheMisses}`);
        console.log(`⚡ Est. Parallel Utilization: ${metrics.estimatedParallelUtilization}%`);
        
        this.showTrends();
    }

    /**
     * Show performance trends if baseline exists
     */
    showTrends() {
        if (!fs.existsSync(this.metricsFile)) return;
        
        try {
            const allMetrics = JSON.parse(fs.readFileSync(this.metricsFile, 'utf8'));
            
            if (allMetrics.length < 2) return;
            
            const current = allMetrics[allMetrics.length - 1];
            const previous = allMetrics[allMetrics.length - 2];
            
            const timeChange = ((current.duration - previous.duration) / previous.duration * 100);
            const cacheChange = current.cacheHitRate - previous.cacheHitRate;
            
            console.log('\n📈 Performance Trends:');
            console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
            
            if (timeChange < 0) {
                console.log(`🚀 Build time improved by ${Math.abs(timeChange).toFixed(1)}%`);
            } else if (timeChange > 0) {
                console.log(`⚠️  Build time increased by ${timeChange.toFixed(1)}%`);
            }
            
            if (cacheChange > 0) {
                console.log(`📈 Cache hit rate improved by ${cacheChange}%`);
            } else if (cacheChange < 0) {
                console.log(`📉 Cache hit rate decreased by ${Math.abs(cacheChange)}%`);
            }
            
        } catch (error) {
            console.warn('⚠️ Could not analyze trends:', error.message);
        }
    }

    /**
     * Create baseline measurement
     */
    createBaseline() {
        console.log('📊 Creating performance baseline...');
        const metrics = this.measureBuildPerformance();
        
        if (metrics) {
            fs.writeFileSync(this.baselineFile, JSON.stringify(metrics, null, 2));
            console.log('✅ Baseline created successfully');
        }
    }

    /**
     * Compare current performance to baseline
     */
    compareToBaseline() {
        if (!fs.existsSync(this.baselineFile)) {
            console.log('❌ No baseline found. Run with --baseline first.');
            return;
        }
        
        const baseline = JSON.parse(fs.readFileSync(this.baselineFile, 'utf8'));
        const current = this.measureBuildPerformance();
        
        if (!current) return;
        
        console.log('\n🔍 Baseline Comparison:');
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        
        const timeImprovement = ((baseline.duration - current.duration) / baseline.duration * 100);
        const cacheImprovement = current.cacheHitRate - baseline.cacheHitRate;
        
        console.log(`⏱️  Build Time: ${baseline.duration}s → ${current.duration}s`);
        
        if (timeImprovement > 0) {
            console.log(`🚀 Improvement: ${timeImprovement.toFixed(1)}% faster`);
        } else {
            console.log(`⚠️  Regression: ${Math.abs(timeImprovement).toFixed(1)}% slower`);
        }
        
        console.log(`📊 Cache Hit Rate: ${baseline.cacheHitRate}% → ${current.cacheHitRate}%`);
        
        if (cacheImprovement > 0) {
            console.log(`📈 Cache improvement: +${cacheImprovement}%`);
        } else if (cacheImprovement < 0) {
            console.log(`📉 Cache regression: ${cacheImprovement}%`);
        }
    }
}

// CLI interface
const monitor = new TurboPerformanceMonitor();

const command = process.argv[2];

switch (command) {
    case '--baseline':
        monitor.createBaseline();
        break;
    case '--compare':
        monitor.compareToBaseline();
        break;
    case '--analyze':
    default:
        monitor.measureBuildPerformance();
        break;
}