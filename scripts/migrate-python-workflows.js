#!/usr/bin/env node

/**
 * Python Workflow Migration Script
 * 
 * Automated script to migrate Python workflows from Pyodide to local Python execution.
 * This script provides a simplified interface for common migration scenarios.
 */

const fs = require('fs').promises;
const path = require('path');
const { performance } = require('perf_hooks');

// Configuration
const CONFIG = {
	// File patterns to process
	workflowPatterns: ['*.json'],
	backupSuffix: '.backup',
	
	// Migration settings
	batchSize: 10,
	maxConcurrentMigrations: 3,
	
	// Output settings
	reportFileName: 'migration-report.json',
	logFileName: 'migration.log',
	
	// Timeout settings
	timeoutMs: 30000, // 30 seconds per workflow
};

class PythonWorkflowMigrator {
	constructor(options = {}) {
		this.options = { ...CONFIG, ...options };
		this.stats = {
			totalWorkflows: 0,
			processedWorkflows: 0,
			successfulMigrations: 0,
			skippedWorkflows: 0,
			failedMigrations: 0,
			totalChanges: 0,
			totalWarnings: 0,
			startTime: null,
			endTime: null,
		};
		this.migrationLog = [];
		this.errors = [];
	}

	/**
	 * Main migration entry point
	 */
	async migrate(workflowsPath, outputPath, options = {}) {
		this.stats.startTime = Date.now();
		
		this.log('🐍 Starting Python Workflow Migration', 'info');
		this.log(`Source: ${workflowsPath}`, 'info');
		this.log(`Output: ${outputPath}`, 'info');

		try {
			// Ensure output directory exists
			await fs.mkdir(outputPath, { recursive: true });

			// Discover workflows
			const workflows = await this.discoverWorkflows(workflowsPath);
			this.stats.totalWorkflows = workflows.length;
			
			this.log(`📊 Found ${workflows.length} workflow files`, 'info');

			if (workflows.length === 0) {
				this.log('⚠️  No workflow files found', 'warn');
				return this.generateReport(outputPath);
			}

			// Create backup directory if needed
			if (options.backup) {
				const backupDir = path.join(outputPath, 'backups');
				await fs.mkdir(backupDir, { recursive: true });
			}

			// Process workflows in batches
			const batches = this.createBatches(workflows, this.options.batchSize);
			
			for (let i = 0; i < batches.length; i++) {
				const batch = batches[i];
				this.log(`🔄 Processing batch ${i + 1}/${batches.length} (${batch.length} workflows)`, 'info');
				
				const batchPromises = batch.map(workflow => 
					this.processWorkflow(workflow, outputPath, options)
				);
				
				// Process batch with concurrency limit
				await this.processConcurrently(batchPromises, this.options.maxConcurrentMigrations);
				
				// Progress update
				const progress = Math.round((this.stats.processedWorkflows / this.stats.totalWorkflows) * 100);
				this.log(`📈 Progress: ${this.stats.processedWorkflows}/${this.stats.totalWorkflows} (${progress}%)`, 'info');
			}

			this.stats.endTime = Date.now();
			this.log('✅ Migration completed', 'success');

			// Generate and save report
			await this.generateReport(outputPath);
			
			return this.getStats();

		} catch (error) {
			this.stats.endTime = Date.now();
			this.log(`❌ Migration failed: ${error.message}`, 'error');
			this.errors.push({
				type: 'critical',
				message: error.message,
				stack: error.stack,
				timestamp: new Date().toISOString(),
			});
			
			await this.generateReport(outputPath);
			throw error;
		}
	}

	/**
	 * Discover workflow files in a directory or process single file
	 */
	async discoverWorkflows(workflowsPath) {
		const stat = await fs.stat(workflowsPath);
		
		if (stat.isFile()) {
			// Single file
			return [workflowsPath];
		}
		
		if (stat.isDirectory()) {
			// Directory - find all workflow files
			const files = await fs.readdir(workflowsPath);
			const workflowFiles = [];
			
			for (const file of files) {
				if (file.endsWith('.json')) {
					const filePath = path.join(workflowsPath, file);
					try {
						// Quick check if it's a workflow file
						const content = await fs.readFile(filePath, 'utf8');
						const parsed = JSON.parse(content);
						
						if (parsed.nodes || parsed.connections) {
							workflowFiles.push(filePath);
						}
					} catch (error) {
						this.log(`⚠️  Skipping invalid JSON file: ${file}`, 'warn');
					}
				}
			}
			
			return workflowFiles;
		}
		
		throw new Error(`Invalid path: ${workflowsPath}`);
	}

	/**
	 * Process a single workflow file
	 */
	async processWorkflow(workflowPath, outputPath, options) {
		const startTime = performance.now();
		const workflowName = path.basename(workflowPath);
		
		try {
			this.log(`🔍 Processing: ${workflowName}`, 'debug');

			// Read and parse workflow
			const workflowContent = await fs.readFile(workflowPath, 'utf8');
			const workflow = JSON.parse(workflowContent);

			// Find Python nodes
			const pythonNodes = this.findPythonNodes(workflow);
			
			if (pythonNodes.length === 0) {
				this.log(`⏭️  Skipping ${workflowName}: No Python nodes found`, 'debug');
				this.stats.skippedWorkflows++;
				this.stats.processedWorkflows++;
				return;
			}

			this.log(`🐍 Found ${pythonNodes.length} Python node(s) in ${workflowName}`, 'debug');

			// Create backup if requested
			if (options.backup) {
				const backupPath = path.join(outputPath, 'backups', workflowName + this.options.backupSuffix);
				await fs.copyFile(workflowPath, backupPath);
			}

			// Perform migration
			const migrationResult = await this.migrateWorkflowNodes(workflow, pythonNodes, options);

			// Save migrated workflow
			if (!options.dryRun && migrationResult.success) {
				const outputFilePath = path.join(outputPath, workflowName);
				await fs.writeFile(outputFilePath, JSON.stringify(workflow, null, 2));
			}

			// Update statistics
			this.updateStats(migrationResult);
			
			// Log result
			const executionTime = Math.round(performance.now() - startTime);
			const status = migrationResult.success ? '✅' : '❌';
			this.log(`${status} ${workflowName} (${executionTime}ms, ${migrationResult.changes} changes, ${migrationResult.warnings} warnings)`, 
				migrationResult.success ? 'success' : 'error');

			// Store detailed result
			this.migrationLog.push({
				workflow: workflowName,
				path: workflowPath,
				result: migrationResult,
				executionTime,
				timestamp: new Date().toISOString(),
			});

		} catch (error) {
			const executionTime = Math.round(performance.now() - startTime);
			this.log(`❌ Failed to process ${workflowName}: ${error.message}`, 'error');
			
			this.stats.failedMigrations++;
			this.stats.processedWorkflows++;
			
			this.errors.push({
				type: 'workflow',
				workflow: workflowName,
				path: workflowPath,
				message: error.message,
				executionTime,
				timestamp: new Date().toISOString(),
			});
		}
	}

	/**
	 * Find Python nodes in a workflow
	 */
	findPythonNodes(workflow) {
		const pythonNodes = [];
		
		if (workflow.nodes && Array.isArray(workflow.nodes)) {
			for (const node of workflow.nodes) {
				if (this.isPythonNode(node)) {
					pythonNodes.push(node);
				}
			}
		}
		
		return pythonNodes;
	}

	/**
	 * Check if a node is a Python node
	 */
	isPythonNode(node) {
		return (
			node.type === 'n8n-nodes-base.code' &&
			(node.parameters?.language === 'python' ||
			 node.parameters?.pythonCode ||
			 (node.parameters?.code && this.containsPythonSyntax(node.parameters.code)))
		);
	}

	/**
	 * Simple heuristic to detect Python syntax
	 */
	containsPythonSyntax(code) {
		const pythonIndicators = [
			/^import\s+\w+/m,
			/^from\s+\w+\s+import/m,
			/def\s+\w+\s*\(/,
			/class\s+\w+\s*[\(:]/,
			/print\s*\(/,
			/if\s+__name__\s*==\s*['"']__main__['"']/,
		];

		return pythonIndicators.some(pattern => pattern.test(code));
	}

	/**
	 * Migrate Python nodes in a workflow
	 */
	async migrateWorkflowNodes(workflow, pythonNodes, options) {
		const result = {
			success: true,
			changes: 0,
			warnings: 0,
			errors: [],
			details: [],
		};

		for (const node of pythonNodes) {
			try {
				const nodeResult = await this.migrateNode(node, options);
				
				result.changes += nodeResult.changes;
				result.warnings += nodeResult.warnings.length;
				result.details.push({
					nodeId: node.id,
					nodeName: node.name,
					result: nodeResult,
				});

				if (!nodeResult.success) {
					result.success = false;
					result.errors.push(...nodeResult.errors);
				}

			} catch (error) {
				result.success = false;
				result.errors.push(`Node ${node.id}: ${error.message}`);
			}
		}

		return result;
	}

	/**
	 * Migrate a single Python node
	 */
	async migrateNode(node, options) {
		const result = {
			success: true,
			changes: 0,
			warnings: [],
			errors: [],
			transformations: [],
		};

		const originalCode = node.parameters.code || node.parameters.pythonCode || '';
		
		if (!originalCode.trim()) {
			result.warnings.push('Node has no Python code');
			return result;
		}

		try {
			// Analyze the code
			const analysis = this.analyzeCode(originalCode);
			
			// Apply transformations
			let migratedCode = originalCode;
			
			// Remove Pyodide-specific imports and calls
			const pyodideTransforms = this.getPyodideTransformations();
			for (const transform of pyodideTransforms) {
				const newCode = migratedCode.replace(transform.pattern, transform.replacement);
				if (newCode !== migratedCode) {
					migratedCode = newCode;
					result.transformations.push(transform.description);
					result.changes++;
				}
			}

			// Update node parameters for local execution
			if (node.parameters.language === 'python') {
				node.parameters.executionMode = 'local';
			}

			// Update the code
			if (migratedCode !== originalCode) {
				if (node.parameters.pythonCode) {
					node.parameters.pythonCode = migratedCode;
				} else {
					node.parameters.code = migratedCode;
				}
				result.changes++;
			}

			// Add required packages if detected
			if (analysis.packages.length > 0) {
				node.parameters.packages = [
					...(node.parameters.packages || []),
					...analysis.packages.filter(pkg => !(node.parameters.packages || []).includes(pkg)),
				];
				
				if (node.parameters.packages.length > (node.parameters.packages || []).length) {
					result.changes++;
					result.transformations.push(`Added packages: ${analysis.packages.join(', ')}`);
				}
			}

			// Add warnings for complex patterns
			if (analysis.hasJsInterop) {
				result.warnings.push('JavaScript interoperability detected - manual review required');
			}

			if (analysis.hasAsyncPatterns) {
				result.warnings.push('Async/await patterns detected - may need adjustment');
			}

			if (analysis.securityIssues.length > 0) {
				result.warnings.push(`Security issues detected: ${analysis.securityIssues.join(', ')}`);
			}

		} catch (error) {
			result.success = false;
			result.errors.push(error.message);
		}

		return result;
	}

	/**
	 * Analyze Python code for migration requirements
	 */
	analyzeCode(code) {
		return {
			hasJsInterop: /\bjs\.\w+/.test(code) || /pyodide\./.test(code),
			hasAsyncPatterns: /\b(async|await)\b/.test(code),
			packages: this.extractPackages(code),
			securityIssues: this.findSecurityIssues(code),
			complexity: this.calculateComplexity(code),
		};
	}

	/**
	 * Extract required packages from import statements
	 */
	extractPackages(code) {
		const packages = new Set();
		const importRegex = /^(?:import\s+(\w+)|from\s+(\w+)\s+import)/gm;
		
		let match;
		while ((match = importRegex.exec(code)) !== null) {
			const packageName = match[1] || match[2];
			if (packageName && !this.isBuiltinModule(packageName)) {
				packages.add(packageName);
			}
		}
		
		return Array.from(packages);
	}

	/**
	 * Find potential security issues in code
	 */
	findSecurityIssues(code) {
		const issues = [];
		const patterns = [
			{ pattern: /os\.system\s*\(/, issue: 'os.system()' },
			{ pattern: /subprocess\./, issue: 'subprocess usage' },
			{ pattern: /eval\s*\(/, issue: 'eval()' },
			{ pattern: /exec\s*\(/, issue: 'exec()' },
		];

		for (const { pattern, issue } of patterns) {
			if (pattern.test(code)) {
				issues.push(issue);
			}
		}

		return issues;
	}

	/**
	 * Calculate code complexity score
	 */
	calculateComplexity(code) {
		let score = 0;
		score += (code.match(/def\s+/g) || []).length;
		score += (code.match(/class\s+/g) || []).length * 2;
		score += (code.match(/if\s+/g) || []).length * 0.5;
		score += (code.match(/for\s+|while\s+/g) || []).length * 0.5;
		score += code.split('\n').length * 0.1;
		return Math.round(score * 10) / 10;
	}

	/**
	 * Check if module is built-in to Python
	 */
	isBuiltinModule(moduleName) {
		const builtins = [
			'os', 'sys', 'json', 'datetime', 'time', 'math', 'random', 're',
			'collections', 'itertools', 'functools', 'operator', 'pathlib',
			'urllib', 'http', 'email', 'html', 'xml', 'sqlite3', 'csv',
		];
		return builtins.includes(moduleName);
	}

	/**
	 * Get Pyodide-specific transformation rules
	 */
	getPyodideTransformations() {
		return [
			{
				pattern: /import\s+pyodide.*/g,
				replacement: '# pyodide import removed for local execution',
				description: 'Removed Pyodide import',
			},
			{
				pattern: /from\s+pyodide\s+import\s+\w+.*/g,
				replacement: '# pyodide import removed for local execution',
				description: 'Removed Pyodide import',
			},
			{
				pattern: /pyodide\./g,
				replacement: '# pyodide. call removed - ',
				description: 'Removed Pyodide API calls',
			},
			{
				pattern: /\.to_py\(\)/g,
				replacement: '',
				description: 'Removed .to_py() conversion',
			},
			{
				pattern: /\.to_js\(\)/g,
				replacement: '',
				description: 'Removed .to_js() conversion',
			},
			{
				pattern: /js\./g,
				replacement: '# js. call removed - ',
				description: 'Removed JavaScript interop',
			},
		];
	}

	/**
	 * Create batches from array
	 */
	createBatches(items, batchSize) {
		const batches = [];
		for (let i = 0; i < items.length; i += batchSize) {
			batches.push(items.slice(i, i + batchSize));
		}
		return batches;
	}

	/**
	 * Process promises with concurrency limit
	 */
	async processConcurrently(promises, limit) {
		const results = [];
		for (let i = 0; i < promises.length; i += limit) {
			const batch = promises.slice(i, i + limit);
			const batchResults = await Promise.allSettled(batch);
			results.push(...batchResults);
		}
		return results;
	}

	/**
	 * Update migration statistics
	 */
	updateStats(migrationResult) {
		this.stats.processedWorkflows++;
		
		if (migrationResult.success) {
			this.stats.successfulMigrations++;
		} else {
			this.stats.failedMigrations++;
		}
		
		this.stats.totalChanges += migrationResult.changes;
		this.stats.totalWarnings += migrationResult.warnings;
	}

	/**
	 * Generate and save migration report
	 */
	async generateReport(outputPath) {
		const duration = this.stats.endTime - this.stats.startTime;
		const report = {
			summary: {
				...this.stats,
				duration,
				durationFormatted: this.formatDuration(duration),
				successRate: this.stats.totalWorkflows > 0 
					? Math.round((this.stats.successfulMigrations / this.stats.totalWorkflows) * 100) 
					: 0,
			},
			details: this.migrationLog,
			errors: this.errors,
			timestamp: new Date().toISOString(),
		};

		// Save JSON report
		const reportPath = path.join(outputPath, this.options.reportFileName);
		await fs.writeFile(reportPath, JSON.stringify(report, null, 2));

		// Save text log
		const logPath = path.join(outputPath, this.options.logFileName);
		const logContent = this.migrationLog.map(entry => 
			`[${entry.timestamp}] ${entry.workflow}: ${entry.result.success ? 'SUCCESS' : 'FAILED'} ` +
			`(${entry.result.changes} changes, ${entry.result.warnings} warnings)`
		).join('\n');
		await fs.writeFile(logPath, logContent);

		this.log(`📄 Report saved: ${reportPath}`, 'info');
		this.log(`📄 Log saved: ${logPath}`, 'info');

		return report;
	}

	/**
	 * Get current statistics
	 */
	getStats() {
		return { ...this.stats };
	}

	/**
	 * Format duration in human-readable format
	 */
	formatDuration(ms) {
		const seconds = Math.floor(ms / 1000);
		const minutes = Math.floor(seconds / 60);
		const hours = Math.floor(minutes / 60);

		if (hours > 0) {
			return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
		} else if (minutes > 0) {
			return `${minutes}m ${seconds % 60}s`;
		} else {
			return `${seconds}s`;
		}
	}

	/**
	 * Log message with timestamp and level
	 */
	log(message, level = 'info') {
		const timestamp = new Date().toISOString();
		const prefix = this.getLogPrefix(level);
		
		console.log(`[${timestamp}] ${prefix} ${message}`);
	}

	/**
	 * Get log prefix for level
	 */
	getLogPrefix(level) {
		const prefixes = {
			debug: '🔍',
			info: 'ℹ️',
			warn: '⚠️',
			error: '❌',
			success: '✅',
		};
		return prefixes[level] || 'ℹ️';
	}
}

// CLI interface
async function main() {
	const args = process.argv.slice(2);
	
	if (args.length < 2) {
		console.log(`
🐍 Python Workflow Migration Script

Usage: node migrate-python-workflows.js <input-path> <output-path> [options]

Arguments:
  input-path   Path to workflows directory or single workflow file
  output-path  Output directory for migrated workflows

Options:
  --dry-run    Perform migration without saving changes
  --backup     Create backup of original workflows
  --batch-size <size>    Number of workflows to process in parallel (default: 10)
  --timeout <ms>         Timeout for each workflow migration (default: 30000)

Examples:
  node migrate-python-workflows.js ./workflows ./migrated-workflows
  node migrate-python-workflows.js ./workflows ./migrated-workflows --dry-run --backup
  node migrate-python-workflows.js single-workflow.json ./output --backup
		`);
		process.exit(1);
	}

	const [inputPath, outputPath] = args;
	
	// Parse options
	const options = {
		dryRun: args.includes('--dry-run'),
		backup: args.includes('--backup'),
	};

	// Parse batch size
	const batchSizeIndex = args.indexOf('--batch-size');
	if (batchSizeIndex !== -1 && args[batchSizeIndex + 1]) {
		options.batchSize = parseInt(args[batchSizeIndex + 1], 10);
	}

	// Parse timeout
	const timeoutIndex = args.indexOf('--timeout');
	if (timeoutIndex !== -1 && args[timeoutIndex + 1]) {
		options.timeoutMs = parseInt(args[timeoutIndex + 1], 10);
	}

	try {
		const migrator = new PythonWorkflowMigrator(options);
		const stats = await migrator.migrate(inputPath, outputPath, options);

		console.log('\n📊 Migration Summary:');
		console.log(`  Total workflows: ${stats.totalWorkflows}`);
		console.log(`  Successful: ${stats.successfulMigrations}`);
		console.log(`  Failed: ${stats.failedMigrations}`);
		console.log(`  Skipped: ${stats.skippedWorkflows}`);
		console.log(`  Total changes: ${stats.totalChanges}`);
		console.log(`  Total warnings: ${stats.totalWarnings}`);
		console.log(`  Duration: ${migrator.formatDuration(stats.endTime - stats.startTime)}`);

		if (options.dryRun) {
			console.log('\n⚠️  This was a dry run - no changes were saved');
		}

		process.exit(stats.failedMigrations > 0 ? 1 : 0);

	} catch (error) {
		console.error('\n❌ Migration failed:', error.message);
		if (process.env.DEBUG) {
			console.error(error.stack);
		}
		process.exit(1);
	}
}

// Export for use as module
module.exports = PythonWorkflowMigrator;

// Run if called directly
if (require.main === module) {
	main();
}