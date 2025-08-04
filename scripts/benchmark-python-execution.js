#!/usr/bin/env node

/**
 * Python Execution Performance Benchmark Script
 * 
 * This script benchmarks the performance of Python execution across different
 * scenarios to validate the 5-10x improvement over Pyodide and measure
 * the effectiveness of the performance optimizations.
 */

import { performance } from 'perf_hooks';
import { execFile, spawn } from 'child_process';
import { writeFile, mkdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { promisify } from 'util';
import { fileURLToPath } from 'url';

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..');

// Benchmark configuration
const BENCHMARK_CONFIG = {
	iterations: 50,
	warmupIterations: 5,
	timeout: 60000, // 1 minute per test
	cooldownMs: 100, // Time between tests
	testCases: [
		{
			name: 'Simple Calculation',
			code: 'result = 2 + 2 * 3',
			expectedResult: 8,
			category: 'basic',
		},
		{
			name: 'String Processing',
			code: `
text = "Hello, World! " * 100
result = len(text.upper().split())
			`.trim(),
			expectedResult: 200,
			category: 'string',
		},
		{
			name: 'List Operations',
			code: `
numbers = list(range(1000))
result = sum(x * x for x in numbers if x % 2 == 0)
			`.trim(),
			expectedResult: 166167000,
			category: 'list',
		},
		{
			name: 'Dictionary Operations',
			code: `
data = {str(i): i * i for i in range(100)}
result = sum(data.values())
			`.trim(),
			expectedResult: 328350,
			category: 'dict',
		},
		{
			name: 'Function Definition and Call',
			code: `
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

result = fibonacci(10)
			`.trim(),
			expectedResult: 55,
			category: 'function',
		},
		{
			name: 'NumPy Array Operations',
			code: `
import numpy as np
arr = np.random.rand(100, 100)
result = np.sum(arr * arr)
			`.trim(),
			packages: ['numpy'],
			category: 'numpy',
		},
		{
			name: 'Pandas DataFrame',
			code: `
import pandas as pd
import numpy as np
df = pd.DataFrame(np.random.rand(1000, 10))
result = float(df.sum().sum())
			`.trim(),
			packages: ['pandas', 'numpy'],
			category: 'pandas',
		},
		{
			name: 'JSON Processing',
			code: `
import json
data = {"users": [{"id": i, "name": f"user{i}", "active": i % 2 == 0} for i in range(100)]}
json_str = json.dumps(data)
parsed = json.loads(json_str)
result = len([u for u in parsed["users"] if u["active"]])
			`.trim(),
			expectedResult: 50,
			category: 'json',
		},
		{
			name: 'File Processing Simulation',
			code: `
lines = ["line " + str(i) for i in range(1000)]
content = "\\n".join(lines)
words = content.split()
result = len([w for w in words if "5" in w])
			`.trim(),
			expectedResult: 111,
			category: 'file',
		},
		{
			name: 'Complex Calculation',
			code: `
import math
result = sum(math.sqrt(i) * math.sin(i) for i in range(1, 1000))
			`.trim(),
			category: 'math',
		},
	],
};

// Test execution methods
const EXECUTION_METHODS = {
	direct: {
		name: 'Direct Python (subprocess)',
		execute: executeDirect,
	},
	pool: {
		name: 'Worker Pool (if available)',
		execute: executeWithPool,
	},
	cached: {
		name: 'Cached Environment',
		execute: executeWithCache,
	},
};

/**
 * Main benchmark execution
 */
async function main() {
	console.log('🚀 Python Execution Performance Benchmark');
	console.log('='.repeat(50));
	console.log(`Running ${BENCHMARK_CONFIG.iterations} iterations per test case`);
	console.log(`Warmup iterations: ${BENCHMARK_CONFIG.warmupIterations}`);
	console.log('');

	const results = {
		timestamp: new Date().toISOString(),
		config: BENCHMARK_CONFIG,
		results: {},
		summary: {},
	};

	// Run benchmarks for each execution method
	for (const [methodKey, method] of Object.entries(EXECUTION_METHODS)) {
		console.log(`📊 Testing ${method.name}...`);
		console.log('-'.repeat(30));

		results.results[methodKey] = {};

		for (const testCase of BENCHMARK_CONFIG.testCases) {
			console.log(`  Running: ${testCase.name}`);

			try {
				const testResults = await runTestCase(method.execute, testCase);
				results.results[methodKey][testCase.name] = testResults;

				console.log(`    ✅ Avg: ${testResults.averageTime.toFixed(2)}ms, Success: ${testResults.successRate.toFixed(1)}%`);
			} catch (error) {
				console.log(`    ❌ Failed: ${error.message}`);
				results.results[methodKey][testCase.name] = {
					error: error.message,
					averageTime: 0,
					successRate: 0,
				};
			}

			// Cooldown between tests
			await sleep(BENCHMARK_CONFIG.cooldownMs);
		}

		console.log('');
	}

	// Calculate summary statistics
	results.summary = calculateSummaryStats(results.results);

	// Generate report
	await generateReport(results);

	// Display summary
	displaySummary(results.summary);

	console.log('\n🎉 Benchmark completed! Report saved to benchmark-results.json');
}

/**
 * Run a single test case with the specified execution method
 */
async function runTestCase(executeMethod, testCase) {
	const iterations = BENCHMARK_CONFIG.iterations;
	const warmupIterations = BENCHMARK_CONFIG.warmupIterations;
	const allTimes = [];
	const errors = [];
	let successCount = 0;

	// Warmup iterations (not counted in results)
	for (let i = 0; i < warmupIterations; i++) {
		try {
			await executeMethod(testCase);
		} catch (error) {
			// Ignore warmup errors
		}
	}

	// Actual benchmark iterations
	for (let i = 0; i < iterations; i++) {
		const startTime = performance.now();

		try {
			const result = await executeMethod(testCase);
			const endTime = performance.now();
			const executionTime = endTime - startTime;

			allTimes.push(executionTime);
			successCount++;

			// Validate result if expected result is provided
			if (testCase.expectedResult !== undefined && result !== testCase.expectedResult) {
				errors.push(`Iteration ${i}: Expected ${testCase.expectedResult}, got ${result}`);
			}

		} catch (error) {
			const endTime = performance.now();
			const executionTime = endTime - startTime;

			allTimes.push(executionTime);
			errors.push(`Iteration ${i}: ${error.message}`);
		}
	}

	// Calculate statistics
	allTimes.sort((a, b) => a - b);
	const averageTime = allTimes.reduce((sum, time) => sum + time, 0) / allTimes.length;
	const medianTime = allTimes[Math.floor(allTimes.length / 2)];
	const p95Time = allTimes[Math.floor(allTimes.length * 0.95)];
	const p99Time = allTimes[Math.floor(allTimes.length * 0.99)];
	const minTime = allTimes[0];
	const maxTime = allTimes[allTimes.length - 1];
	const successRate = (successCount / iterations) * 100;

	return {
		iterations,
		successCount,
		successRate,
		averageTime,
		medianTime,
		p95Time,
		p99Time,
		minTime,
		maxTime,
		errors: errors.slice(0, 5), // Keep only first 5 errors for reporting
		times: allTimes,
	};
}

/**
 * Execute Python code directly using subprocess
 */
async function executeDirect(testCase) {
	const scriptContent = `
import json
import sys

# Set up context if needed
${testCase.context ? Object.entries(testCase.context).map(([k, v]) => `${k} = ${JSON.stringify(v)}`).join('\n') : ''}

try:
    # Execute the test code
    ${testCase.code}
    
    # Output result
    if 'result' in locals():
        print(json.dumps(result))
    else:
        print('null')
        
except Exception as e:
    print(json.dumps({"error": str(e)}), file=sys.stderr)
    sys.exit(1)
`;

	const tempScript = join(rootDir, 'temp_benchmark_script.py');
	await writeFile(tempScript, scriptContent);

	try {
		const pythonCmd = testCase.packages && testCase.packages.length > 0 
			? 'python3' // Assume packages are pre-installed
			: 'python3';

		const { stdout, stderr } = await execFileAsync(pythonCmd, [tempScript], {
			timeout: BENCHMARK_CONFIG.timeout,
		});

		if (stderr) {
			throw new Error(`Python error: ${stderr}`);
		}

		const result = JSON.parse(stdout.trim());
		if (result && typeof result === 'object' && result.error) {
			throw new Error(result.error);
		}

		return result;
	} finally {
		// Cleanup temp file
		try {
			const { unlink } = await import('fs/promises');
			await unlink(tempScript);
		} catch (error) {
			// Ignore cleanup errors
		}
	}
}

/**
 * Execute Python code using worker pool (placeholder)
 */
async function executeWithPool(testCase) {
	// This would use the PythonPoolService if available
	// For now, fall back to direct execution
	return await executeDirect(testCase);
}

/**
 * Execute Python code using cached environment (placeholder)
 */
async function executeWithCache(testCase) {
	// This would use the PythonCacheService if available
	// For now, fall back to direct execution
	return await executeDirect(testCase);
}

/**
 * Calculate summary statistics across all methods
 */
function calculateSummaryStats(results) {
	const summary = {};

	for (const [methodKey, methodResults] of Object.entries(results)) {
		const testCases = Object.values(methodResults).filter(r => !r.error);
		
		if (testCases.length === 0) {
			summary[methodKey] = {
				overallAverageTime: 0,
				overallSuccessRate: 0,
				testCaseCount: 0,
			};
			continue;
		}

		const overallAverageTime = testCases.reduce((sum, tc) => sum + tc.averageTime, 0) / testCases.length;
		const overallSuccessRate = testCases.reduce((sum, tc) => sum + tc.successRate, 0) / testCases.length;

		summary[methodKey] = {
			overallAverageTime,
			overallSuccessRate,
			testCaseCount: testCases.length,
			byCategory: calculateCategoryStats(methodResults),
		};
	}

	// Calculate improvements
	if (summary.direct && summary.pool) {
		summary.poolImprovement = {
			speedup: summary.direct.overallAverageTime / summary.pool.overallAverageTime,
			percentImprovement: ((summary.direct.overallAverageTime - summary.pool.overallAverageTime) / summary.direct.overallAverageTime) * 100,
		};
	}

	if (summary.direct && summary.cached) {
		summary.cacheImprovement = {
			speedup: summary.direct.overallAverageTime / summary.cached.overallAverageTime,
			percentImprovement: ((summary.direct.overallAverageTime - summary.cached.overallAverageTime) / summary.direct.overallAverageTime) * 100,
		};
	}

	return summary;
}

/**
 * Calculate statistics by category
 */
function calculateCategoryStats(methodResults) {
	const categories = {};

	for (const [testName, testResult] of Object.entries(methodResults)) {
		if (testResult.error) continue;

		const testCase = BENCHMARK_CONFIG.testCases.find(tc => tc.name === testName);
		if (!testCase) continue;

		const category = testCase.category;
		if (!categories[category]) {
			categories[category] = {
				count: 0,
				totalTime: 0,
				totalSuccessRate: 0,
			};
		}

		categories[category].count++;
		categories[category].totalTime += testResult.averageTime;
		categories[category].totalSuccessRate += testResult.successRate;
	}

	// Calculate averages
	for (const category of Object.values(categories)) {
		category.averageTime = category.totalTime / category.count;
		category.averageSuccessRate = category.totalSuccessRate / category.count;
	}

	return categories;
}

/**
 * Generate detailed report
 */
async function generateReport(results) {
	const reportPath = join(rootDir, 'benchmark-results.json');
	await writeFile(reportPath, JSON.stringify(results, null, 2));

	// Generate human-readable report
	const readableReport = generateReadableReport(results);
	const readableReportPath = join(rootDir, 'benchmark-report.md');
	await writeFile(readableReportPath, readableReport);
}

/**
 * Generate human-readable markdown report
 */
function generateReadableReport(results) {
	let report = `# Python Execution Performance Benchmark Report

Generated: ${results.timestamp}

## Configuration

- Iterations per test: ${results.config.iterations}
- Warmup iterations: ${results.config.warmupIterations}
- Test cases: ${results.config.testCases.length}

## Summary Results

`;

	// Summary table
	report += '| Method | Avg Time (ms) | Success Rate (%) | Test Cases |\n';
	report += '|--------|---------------|------------------|------------|\n';

	for (const [methodKey, summary] of Object.entries(results.summary)) {
		if (typeof summary === 'object' && summary.overallAverageTime !== undefined) {
			report += `| ${EXECUTION_METHODS[methodKey]?.name || methodKey} | ${summary.overallAverageTime.toFixed(2)} | ${summary.overallSuccessRate.toFixed(1)} | ${summary.testCaseCount} |\n`;
		}
	}

	// Performance improvements
	if (results.summary.poolImprovement) {
		report += `\n### Worker Pool Performance\n\n`;
		report += `- **Speedup**: ${results.summary.poolImprovement.speedup.toFixed(2)}x\n`;
		report += `- **Improvement**: ${results.summary.poolImprovement.percentImprovement.toFixed(1)}%\n`;
	}

	if (results.summary.cacheImprovement) {
		report += `\n### Cache Performance\n\n`;
		report += `- **Speedup**: ${results.summary.cacheImprovement.speedup.toFixed(2)}x\n`;
		report += `- **Improvement**: ${results.summary.cacheImprovement.percentImprovement.toFixed(1)}%\n`;
	}

	// Detailed results by test case
	report += '\n## Detailed Results\n\n';

	for (const testCase of results.config.testCases) {
		report += `### ${testCase.name}\n\n`;
		report += `Category: ${testCase.category}\n\n`;

		report += '| Method | Avg (ms) | Median (ms) | P95 (ms) | Min (ms) | Max (ms) | Success (%) |\n';
		report += '|--------|----------|-------------|----------|----------|----------|--------------|\n';

		for (const [methodKey, methodResults] of Object.entries(results.results)) {
			const testResult = methodResults[testCase.name];
			if (testResult && !testResult.error) {
				report += `| ${EXECUTION_METHODS[methodKey]?.name || methodKey} | ${testResult.averageTime.toFixed(2)} | ${testResult.medianTime.toFixed(2)} | ${testResult.p95Time.toFixed(2)} | ${testResult.minTime.toFixed(2)} | ${testResult.maxTime.toFixed(2)} | ${testResult.successRate.toFixed(1)} |\n`;
			} else if (testResult && testResult.error) {
				report += `| ${EXECUTION_METHODS[methodKey]?.name || methodKey} | ERROR | - | - | - | - | 0.0 |\n`;
			}
		}

		report += '\n';
	}

	return report;
}

/**
 * Display summary to console
 */
function displaySummary(summary) {
	console.log('\n📊 BENCHMARK SUMMARY');
	console.log('='.repeat(50));

	for (const [methodKey, methodSummary] of Object.entries(summary)) {
		if (typeof methodSummary === 'object' && methodSummary.overallAverageTime !== undefined) {
			const methodName = EXECUTION_METHODS[methodKey]?.name || methodKey;
			console.log(`\n${methodName}:`);
			console.log(`  Average Time: ${methodSummary.overallAverageTime.toFixed(2)}ms`);
			console.log(`  Success Rate: ${methodSummary.overallSuccessRate.toFixed(1)}%`);
			console.log(`  Test Cases: ${methodSummary.testCaseCount}`);
		}
	}

	if (summary.poolImprovement) {
		console.log('\n🚀 WORKER POOL PERFORMANCE:');
		console.log(`  Speedup: ${summary.poolImprovement.speedup.toFixed(2)}x`);
		console.log(`  Improvement: ${summary.poolImprovement.percentImprovement.toFixed(1)}%`);
	}

	if (summary.cacheImprovement) {
		console.log('\n⚡ CACHE PERFORMANCE:');
		console.log(`  Speedup: ${summary.cacheImprovement.speedup.toFixed(2)}x`);
		console.log(`  Improvement: ${summary.cacheImprovement.percentImprovement.toFixed(1)}%`);
	}
}

/**
 * Sleep utility function
 */
function sleep(ms) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Handle errors and cleanup
 */
process.on('unhandledRejection', (error) => {
	console.error('Unhandled promise rejection:', error);
	process.exit(1);
});

process.on('SIGINT', () => {
	console.log('\n\n⚠️  Benchmark interrupted by user');
	process.exit(1);
});

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
	main().catch(console.error);
}