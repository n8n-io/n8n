# n8n Performance Monitoring System

A comprehensive performance monitoring and analysis system for tracking build, test, and lint processes in the n8n monorepo.

## 🚀 Quick Start

### Basic Usage

```bash
# Monitor build performance
pnpm perf:build

# Monitor test performance with coverage
pnpm perf:test:coverage

# Monitor lint performance with auto-fix
pnpm perf:lint:fix

# Generate performance dashboard
pnpm perf:dashboard
```

### View Performance Insights

```bash
# Analyze performance trends
pnpm perf:analyze build
pnpm perf:analyze test
pnpm perf:analyze lint

# Open interactive dashboard
pnpm perf:dashboard
# Then open .performance-dashboard/index.html
```

## 📊 Features

### Comprehensive Monitoring
- **Build Performance**: Track compilation time, artifact size, memory usage
- **Test Performance**: Monitor test execution, coverage metrics, failure patterns
- **Lint Performance**: Analyze linting speed, rule violations, code quality scores

### Historical Analysis
- **Trend Tracking**: Performance trends over time with statistical analysis
- **Bottleneck Identification**: Automatically identify slowest processes
- **Quality Metrics**: Track code coverage, lint scores, and test reliability

### Visual Reporting
- **Interactive Dashboard**: HTML dashboard with charts and metrics
- **Real-time Insights**: Live performance data during execution
- **Export Capabilities**: JSON exports for integration with CI/CD systems

## 🛠️ Available Scripts

### Core Monitoring Scripts

| Script | Description | Usage |
|--------|-------------|-------|
| `performance-monitor.mjs` | Core monitoring infrastructure | Used by other scripts |
| `performance-build.mjs` | Build process monitoring | `node scripts/performance-build.mjs` |
| `performance-test.mjs` | Test execution monitoring | `node scripts/performance-test.mjs` |
| `performance-lint.mjs` | Lint process monitoring | `node scripts/performance-lint.mjs` |
| `performance-dashboard.mjs` | Dashboard generation | `node scripts/performance-dashboard.mjs` |

### Package.json Integration

| Command | Description |
|---------|-------------|
| `pnpm perf:build` | Monitor build with performance tracking |
| `pnpm perf:build:typecheck` | Monitor build + typecheck |
| `pnpm perf:test` | Monitor test execution |
| `pnpm perf:test:coverage` | Monitor tests with coverage |
| `pnpm perf:lint` | Monitor linting process |
| `pnpm perf:lint:fix` | Monitor linting with auto-fix |
| `pnpm perf:dashboard` | Generate performance dashboard |
| `pnpm perf:analyze <process>` | Analyze performance trends |

## 📈 Performance Metrics Collected

### Build Metrics
- **Duration**: Total build time, per-package timings
- **Resources**: Memory usage, CPU utilization
- **Artifacts**: Build output size, file counts
- **Quality**: TypeScript compilation status

### Test Metrics
- **Execution**: Test duration, suite timings
- **Coverage**: Statement, branch, function coverage percentages
- **Quality**: Test pass rates, failure patterns
- **Performance**: Memory usage during testing

### Lint Metrics
- **Speed**: Linting duration per tool (ESLint, Biome, TypeScript)
- **Quality**: Error counts, warning counts, rule violations
- **Code Health**: Quality scores, trend analysis
- **Efficiency**: Files processed per second, cache usage

## 🔧 Configuration

### Environment Variables

```bash
# Enable detailed logging
PERF_DEBUG=true

# Set custom metrics directory
PERF_METRICS_DIR=./custom-metrics

# Configure dashboard output
PERF_DASHBOARD_DIR=./custom-dashboard
```

### Integration with CI/CD

```yaml
# GitHub Actions example
- name: Performance Build
  run: pnpm perf:build

- name: Performance Test with Coverage
  run: pnpm perf:test:coverage

- name: Upload Performance Dashboard
  uses: actions/upload-artifact@v3
  with:
    name: performance-dashboard
    path: .performance-dashboard/
```

## 📊 Dashboard Features

### Overview Tab
- **System Health**: Overall performance status
- **Recent Activity**: Latest monitoring runs
- **Aggregate Metrics**: Cross-process performance summary

### Process-Specific Tabs
Each process (Build, Test, Lint) has dedicated views with:
- **Performance Charts**: Duration trends over time
- **Quality Metrics**: Coverage, errors, warnings
- **Recommendations**: AI-generated performance suggestions
- **Historical Analysis**: Trend analysis and comparisons

### Interactive Features
- **Responsive Charts**: Built with Chart.js for interactivity
- **Drill-down Views**: Click through to detailed metrics
- **Export Options**: JSON data export for further analysis

## 🔍 Advanced Usage

### Custom Performance Analysis

```javascript
import { PerformanceMonitor, PerformanceAnalyzer } from './scripts/performance-monitor.mjs';

// Create custom monitoring
const monitor = new PerformanceMonitor('custom-process');
monitor.startTimer('my-operation');
// ... your code here
monitor.endTimer('my-operation');
await monitor.finalize();

// Analyze historical data
const analyzer = new PerformanceAnalyzer();
const trends = await analyzer.analyzeTrends('build');
console.log(trends.recommendations);
```

### Integration with Existing Scripts

```javascript
import { PerformanceMonitor } from './performance-monitor.mjs';

export async function enhancedBuildScript() {
  const monitor = new PerformanceMonitor('custom-build');
  
  monitor.startTimer('dependency-install');
  await installDependencies();
  monitor.endTimer('dependency-install');
  
  monitor.recordQualityMetrics({
    packagesBuilt: 42,
    buildSize: '125MB'
  });
  
  return await monitor.finalize();
}
```

## 📁 File Structure

```
scripts/
├── performance-monitor.mjs      # Core monitoring system
├── performance-build.mjs        # Build process monitoring
├── performance-test.mjs         # Test execution monitoring
├── performance-lint.mjs         # Lint process monitoring
├── performance-dashboard.mjs    # Dashboard generation
└── README-performance.md        # This documentation

.performance-metrics/            # Historical data storage
├── build-1234567890.json       # Build metrics
├── test-1234567891.json         # Test metrics
└── lint-1234567892.json         # Lint metrics

.performance-dashboard/          # Generated dashboards
├── index.html                   # Main dashboard
├── build-report.json           # Build data API
├── test-report.json            # Test data API
└── lint-report.json            # Lint data API
```

## 🎯 Performance Targets

### Build Performance
- **Target**: < 2 minutes for full build
- **Memory**: < 2GB peak usage
- **Cache Hit Rate**: > 80%

### Test Performance
- **Target**: < 5 minutes for full test suite
- **Coverage**: > 95% for all metrics
- **Parallel Efficiency**: > 70%

### Lint Performance
- **Target**: < 30 seconds for full codebase
- **Error Rate**: 0 errors, < 10 warnings
- **Quality Score**: > 90/100

## 🤝 Contributing

### Adding New Metrics

1. Extend the `PerformanceMonitor` class
2. Add new quality metrics via `recordQualityMetrics()`
3. Update dashboard templates as needed
4. Add documentation and examples

### Improving Analysis

1. Enhance the `PerformanceAnalyzer` class
2. Add new trend calculations
3. Improve recommendation algorithms
4. Create specialized analysis scripts

## 🐛 Troubleshooting

### Common Issues

**Metrics not saving**
- Check file permissions in `.performance-metrics/`
- Ensure sufficient disk space

**Dashboard not generating**
- Verify Chart.js CDN access
- Check browser JavaScript console for errors

**Performance scripts failing**
- Ensure Node.js version compatibility (>=16)
- Check for missing dependencies

### Debug Mode

```bash
# Enable debug logging
PERF_DEBUG=true pnpm perf:build

# Validate metrics files
node -e "
const { PerformanceAnalyzer } = require('./scripts/performance-monitor.mjs');
const analyzer = new PerformanceAnalyzer();
analyzer.loadHistoricalMetrics().then(console.log);
"
```

## 📚 API Reference

### PerformanceMonitor Class

```javascript
// Constructor
new PerformanceMonitor(processName)

// Timer methods
.startTimer(name)
.endTimer(name) 
.getElapsedTime(name)

// Quality tracking
.recordQualityMetrics(metrics)
.recordSystemInfo()

// Execution monitoring
.executeWithMonitoring(command, description)

// Finalization
.finalize() // Returns performance summary
```

### PerformanceAnalyzer Class

```javascript
// Constructor
new PerformanceAnalyzer()

// Data loading
.loadHistoricalMetrics(processName?)

// Analysis
.analyzeTrends(processName)
.calculateTrend(values)
.generateRecommendations(metrics)
```

---

**🚀 Ready to optimize your n8n development workflow with comprehensive performance monitoring!**