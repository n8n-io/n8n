#!/usr/bin/env node

/**
 * Performance Dashboard Generator
 * 
 * Creates comprehensive HTML dashboards for visualizing performance metrics,
 * trends, and quality indicators across build, test, and lint processes.
 */

import { PerformanceAnalyzer } from './performance-monitor.mjs';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');
const dashboardDir = join(rootDir, '.performance-dashboard');

/**
 * Dashboard Generator Class
 */
class PerformanceDashboard {
  constructor() {
    this.analyzer = new PerformanceAnalyzer();
    this.ensureDashboardDirectory();
  }

  /**
   * Ensure dashboard directory exists
   */
  async ensureDashboardDirectory() {
    try {
      await fs.mkdir(dashboardDir, { recursive: true });
    } catch (error) {
      console.warn('Could not create dashboard directory:', error.message);
    }
  }

  /**
   * Generate comprehensive performance dashboard
   */
  async generateDashboard() {
    console.log('📊 Generating performance dashboard...\n');

    try {
      // Load historical data for all processes
      const [buildMetrics, testMetrics, lintMetrics] = await Promise.all([
        this.analyzer.loadHistoricalMetrics('build'),
        this.analyzer.loadHistoricalMetrics('test'), 
        this.analyzer.loadHistoricalMetrics('lint')
      ]);

      // Generate trend analyses
      const [buildTrends, testTrends, lintTrends] = await Promise.all([
        this.analyzer.analyzeTrends('build'),
        this.analyzer.analyzeTrends('test'),
        this.analyzer.analyzeTrends('lint')
      ]);

      // Create dashboard HTML
      const dashboardHtml = this.createDashboardHtml({
        buildMetrics,
        testMetrics,
        lintMetrics,
        buildTrends,
        testTrends,
        lintTrends
      });

      // Save dashboard
      const dashboardPath = join(dashboardDir, 'index.html');
      await fs.writeFile(dashboardPath, dashboardHtml);

      // Generate individual process reports
      await this.generateProcessReports({ buildMetrics, testMetrics, lintMetrics });

      console.log(`✅ Dashboard generated: ${dashboardPath}`);
      console.log(`📈 View your performance dashboard by opening: ${dashboardPath}`);

      return dashboardPath;
    } catch (error) {
      console.error('Failed to generate dashboard:', error.message);
      throw error;
    }
  }

  /**
   * Create the main dashboard HTML
   */
  createDashboardHtml(data) {
    const { buildMetrics, testMetrics, lintMetrics, buildTrends, testTrends, lintTrends } = data;

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>n8n Performance Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
        }
        .container { 
            max-width: 1400px; 
            margin: 0 auto; 
            background: white; 
            border-radius: 12px; 
            box-shadow: 0 20px 60px rgba(0,0,0,0.2);
            overflow: hidden;
        }
        .header { 
            background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
            color: white; 
            padding: 30px; 
            text-align: center; 
        }
        .header h1 { font-size: 2.5em; margin-bottom: 10px; }
        .header p { opacity: 0.9; font-size: 1.1em; }
        .metrics-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); 
            gap: 20px; 
            padding: 30px; 
        }
        .metric-card { 
            background: #f8f9fa; 
            border-radius: 8px; 
            padding: 25px; 
            box-shadow: 0 4px 15px rgba(0,0,0,0.08);
            transition: transform 0.2s ease;
        }
        .metric-card:hover { transform: translateY(-2px); }
        .metric-title { 
            font-size: 1.3em; 
            font-weight: bold; 
            color: #333; 
            margin-bottom: 15px;
            display: flex;
            align-items: center;
        }
        .metric-icon { font-size: 1.5em; margin-right: 10px; }
        .metric-value { 
            font-size: 2.2em; 
            font-weight: bold; 
            color: #007acc; 
            margin: 10px 0; 
        }
        .metric-trend { 
            display: flex; 
            align-items: center; 
            font-size: 0.9em; 
            margin-top: 10px;
        }
        .trend-up { color: #e74c3c; }
        .trend-down { color: #27ae60; }
        .trend-stable { color: #95a5a6; }
        .chart-container { 
            height: 300px; 
            margin-top: 20px; 
            position: relative;
        }
        .stats-row { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); 
            gap: 15px; 
            margin-top: 20px; 
        }
        .stat-item { 
            text-align: center; 
            padding: 15px; 
            background: white; 
            border-radius: 6px; 
            box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        .stat-number { 
            font-size: 1.5em; 
            font-weight: bold; 
            color: #007acc; 
        }
        .stat-label { 
            font-size: 0.8em; 
            color: #666; 
            margin-top: 5px; 
        }
        .recommendations { 
            background: #fff3cd; 
            border: 1px solid #ffeaa7; 
            border-radius: 6px; 
            padding: 15px; 
            margin-top: 20px; 
        }
        .recommendations h4 { 
            color: #856404; 
            margin-bottom: 10px; 
        }
        .recommendations ul { 
            list-style: none; 
        }
        .recommendations li { 
            color: #856404; 
            margin: 5px 0; 
            padding-left: 20px; 
            position: relative; 
        }
        .recommendations li::before { 
            content: "💡"; 
            position: absolute; 
            left: 0; 
        }
        .footer { 
            background: #f8f9fa; 
            padding: 20px; 
            text-align: center; 
            color: #666; 
            border-top: 1px solid #dee2e6; 
        }
        .nav-tabs {
            display: flex;
            background: #f8f9fa;
            border-bottom: 1px solid #dee2e6;
        }
        .nav-tab {
            flex: 1;
            padding: 15px;
            text-align: center;
            cursor: pointer;
            border: none;
            background: none;
            font-size: 1em;
            color: #666;
            transition: all 0.2s ease;
        }
        .nav-tab.active {
            background: white;
            color: #007acc;
            border-bottom: 3px solid #007acc;
        }
        .tab-content {
            display: none;
            padding: 30px;
        }
        .tab-content.active {
            display: block;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🚀 n8n Performance Dashboard</h1>
            <p>Comprehensive monitoring and analysis of build, test, and lint performance</p>
            <p style="opacity: 0.7; margin-top: 10px;">Generated ${new Date().toLocaleString()}</p>
        </div>

        <div class="nav-tabs">
            <button class="nav-tab active" onclick="showTab('overview')">📊 Overview</button>
            <button class="nav-tab" onclick="showTab('build')">🔨 Build</button>
            <button class="nav-tab" onclick="showTab('test')">🧪 Test</button>
            <button class="nav-tab" onclick="showTab('lint')">🔍 Lint</button>
        </div>

        <div id="overview" class="tab-content active">
            ${this.createOverviewContent({ buildMetrics, testMetrics, lintMetrics })}
        </div>

        <div id="build" class="tab-content">
            ${this.createProcessContent('Build', buildMetrics, buildTrends, '🔨')}
        </div>

        <div id="test" class="tab-content">
            ${this.createProcessContent('Test', testMetrics, testTrends, '🧪')}
        </div>

        <div id="lint" class="tab-content">
            ${this.createProcessContent('Lint', lintMetrics, lintTrends, '🔍')}
        </div>

        <div class="footer">
            <p>📈 Performance data is automatically collected and updated with each build, test, and lint execution.</p>
            <p>💡 Use the performance-monitor.mjs, performance-build.mjs, performance-test.mjs, and performance-lint.mjs scripts for detailed monitoring.</p>
        </div>
    </div>

    <script>
        function showTab(tabName) {
            // Hide all tab contents
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Remove active class from all tabs
            document.querySelectorAll('.nav-tab').forEach(tab => {
                tab.classList.remove('active');
            });
            
            // Show selected tab content
            document.getElementById(tabName).classList.add('active');
            
            // Add active class to selected tab button
            event.target.classList.add('active');
        }

        // Initialize charts
        document.addEventListener('DOMContentLoaded', function() {
            ${this.generateChartScripts({ buildMetrics, testMetrics, lintMetrics })}
        });
    </script>
</body>
</html>`;
  }

  /**
   * Create overview content
   */
  createOverviewContent({ buildMetrics, testMetrics, lintMetrics }) {
    const totalRuns = buildMetrics.length + testMetrics.length + lintMetrics.length;
    const latestRuns = [
      ...buildMetrics.slice(-1),
      ...testMetrics.slice(-1),
      ...lintMetrics.slice(-1)
    ].sort((a, b) => b.startTime - a.startTime);

    return `
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-title">
            <span class="metric-icon">📊</span>
            Total Performance Runs
          </div>
          <div class="metric-value">${totalRuns}</div>
          <div class="stats-row">
            <div class="stat-item">
              <div class="stat-number">${buildMetrics.length}</div>
              <div class="stat-label">Build Runs</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">${testMetrics.length}</div>
              <div class="stat-label">Test Runs</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">${lintMetrics.length}</div>
              <div class="stat-label">Lint Runs</div>
            </div>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-title">
            <span class="metric-icon">⏱️</span>
            Recent Activity
          </div>
          <div style="max-height: 200px; overflow-y: auto;">
            ${latestRuns.slice(0, 5).map(run => `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 0; border-bottom: 1px solid #eee;">
                <span>${run.processName}</span>
                <span style="font-size: 0.8em; color: #666;">${new Date(run.startTime).toLocaleDateString()}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-title">
            <span class="metric-icon">🎯</span>
            System Health
          </div>
          <div class="stats-row">
            <div class="stat-item">
              <div class="stat-number" style="color: #27ae60;">Good</div>
              <div class="stat-label">Overall Status</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">${this.calculateAveragePerformance(buildMetrics, testMetrics, lintMetrics)}</div>
              <div class="stat-label">Avg Duration</div>
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Create process-specific content
   */
  createProcessContent(processName, metrics, trends, icon) {
    if (metrics.length === 0) {
      return `
        <div class="metric-card">
          <div class="metric-title">
            <span class="metric-icon">${icon}</span>
            ${processName} Performance
          </div>
          <p style="color: #666; text-align: center; padding: 40px;">
            No ${processName.toLowerCase()} performance data available yet. 
            Run the performance-${processName.toLowerCase()}.mjs script to start collecting metrics.
          </p>
        </div>
      `;
    }

    const latest = metrics[metrics.length - 1];
    const chartId = `${processName.toLowerCase()}Chart`;

    return `
      <div class="metrics-grid">
        <div class="metric-card">
          <div class="metric-title">
            <span class="metric-icon">${icon}</span>
            ${processName} Performance Overview
          </div>
          <div class="stats-row">
            <div class="stat-item">
              <div class="stat-number">${metrics.length}</div>
              <div class="stat-label">Total Runs</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">${this.formatDuration(trends.averageDuration || 0)}</div>
              <div class="stat-label">Average Duration</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">${trends.durationTrend > 0 ? '+' : ''}${trends.durationTrend?.toFixed(1) || 0}%</div>
              <div class="stat-label">Duration Trend</div>
            </div>
          </div>
          <div class="chart-container">
            <canvas id="${chartId}"></canvas>
          </div>
        </div>

        <div class="metric-card">
          <div class="metric-title">
            <span class="metric-icon">📈</span>
            Latest ${processName} Run
          </div>
          <div class="metric-value">${this.formatDuration(latest.finalMetrics?.totalDuration || 0)}</div>
          <div class="stats-row">
            <div class="stat-item">
              <div class="stat-number">${new Date(latest.startTime).toLocaleDateString()}</div>
              <div class="stat-label">Date</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">${latest.finalMetrics?.timerSummary?.length || 0}</div>
              <div class="stat-label">Timers</div>
            </div>
            <div class="stat-item">
              <div class="stat-number">${latest.events?.length || 0}</div>
              <div class="stat-label">Events</div>
            </div>
          </div>
          ${this.createQualityMetricsDisplay(latest.qualityMetrics)}
        </div>

        ${trends.recommendations ? `
        <div class="metric-card">
          <div class="recommendations">
            <h4>💡 Performance Recommendations</h4>
            <ul>
              ${trends.recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
          </div>
        </div>
        ` : ''}
      </div>
    `;
  }

  /**
   * Create quality metrics display
   */
  createQualityMetricsDisplay(qualityMetrics) {
    if (!qualityMetrics || Object.keys(qualityMetrics).length === 0) {
      return '';
    }

    return `
      <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #eee;">
        <h4 style="margin-bottom: 10px; color: #333;">Quality Metrics</h4>
        <div class="stats-row">
          ${Object.entries(qualityMetrics)
            .filter(([key]) => !key.includes('Timestamp') && !key.includes('Results'))
            .slice(0, 4)
            .map(([key, value]) => `
              <div class="stat-item">
                <div class="stat-number">${typeof value === 'number' ? value.toLocaleString() : value}</div>
                <div class="stat-label">${key.replace(/([A-Z])/g, ' $1').toLowerCase()}</div>
              </div>
            `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Generate chart scripts for visualization
   */
  generateChartScripts({ buildMetrics, testMetrics, lintMetrics }) {
    const chartScripts = [];

    // Build chart
    if (buildMetrics.length > 0) {
      chartScripts.push(this.createChartScript('buildChart', buildMetrics, 'Build Duration'));
    }

    // Test chart
    if (testMetrics.length > 0) {
      chartScripts.push(this.createChartScript('testChart', testMetrics, 'Test Duration'));
    }

    // Lint chart
    if (lintMetrics.length > 0) {
      chartScripts.push(this.createChartScript('lintChart', lintMetrics, 'Lint Duration'));
    }

    return chartScripts.join('\n');
  }

  /**
   * Create individual chart script
   */
  createChartScript(chartId, metrics, label) {
    const data = metrics.slice(-10).map(m => ({
      x: new Date(m.startTime).toLocaleDateString(),
      y: Math.round((m.finalMetrics?.totalDuration || 0) / 1000)
    }));

    return `
      const ${chartId}Canvas = document.getElementById('${chartId}');
      if (${chartId}Canvas) {
        new Chart(${chartId}Canvas, {
          type: 'line',
          data: {
            datasets: [{
              label: '${label} (seconds)',
              data: ${JSON.stringify(data)},
              borderColor: '#007acc',
              backgroundColor: 'rgba(0, 122, 204, 0.1)',
              tension: 0.4,
              fill: true
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
              x: { 
                type: 'category',
                title: { display: true, text: 'Date' }
              },
              y: { 
                title: { display: true, text: 'Duration (seconds)' },
                beginAtZero: true
              }
            },
            plugins: {
              legend: { display: false }
            }
          }
        });
      }
    `;
  }

  /**
   * Generate individual process reports
   */
  async generateProcessReports({ buildMetrics, testMetrics, lintMetrics }) {
    // Save individual process data as JSON for API access
    const reports = {
      build: buildMetrics,
      test: testMetrics,
      lint: lintMetrics
    };

    for (const [process, data] of Object.entries(reports)) {
      const reportPath = join(dashboardDir, `${process}-report.json`);
      await fs.writeFile(reportPath, JSON.stringify({
        process,
        totalRuns: data.length,
        data: data.slice(-20), // Keep last 20 runs
        generatedAt: new Date().toISOString()
      }, null, 2));
    }
  }

  /**
   * Helper method to format duration
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
   * Calculate average performance across all processes
   */
  calculateAveragePerformance(buildMetrics, testMetrics, lintMetrics) {
    const allMetrics = [...buildMetrics, ...testMetrics, ...lintMetrics];
    if (allMetrics.length === 0) return '0s';
    
    const avgDuration = allMetrics.reduce((sum, m) => sum + (m.finalMetrics?.totalDuration || 0), 0) / allMetrics.length;
    return this.formatDuration(avgDuration);
  }
}

/**
 * Main execution
 */
async function main() {
  const dashboard = new PerformanceDashboard();
  
  try {
    const dashboardPath = await dashboard.generateDashboard();
    
    console.log('\n📊 Performance Dashboard Generated Successfully!');
    console.log('='.repeat(50));
    console.log(`Dashboard: ${dashboardPath}`);
    console.log(`Data Directory: ${dashboardDir}`);
    console.log('\n💡 To view the dashboard:');
    console.log(`   open ${dashboardPath}`);
    console.log('   # or');
    console.log(`   python -m http.server 8000 --directory ${dirname(dashboardPath)}`);
    console.log('   # then visit http://localhost:8000');
    
  } catch (error) {
    console.error('Failed to generate dashboard:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { PerformanceDashboard };