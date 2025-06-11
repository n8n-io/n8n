#!/usr/bin/env node

/**
 * Reverse Component Lookup Tool for n8n Frontend
 * 
 * This script creates a reverse index showing for every component where it's used
 * throughout the codebase. Perfect for understanding the impact of changes to 
 * specific components or design system elements.
 * 
 * Usage: node reverse-component-lookup.js [options]
 * Options:
 *   --format=json|tree|table  Output format (default: tree)
 *   --filter=pattern          Filter components by name pattern
 *   --type=local|design|n8n|external|all  Filter by component type (default: all)
 *   --min-usage=N             Only show components used at least N times
 *   --output=file.json        Save results to file
 *   --verbose                 Show detailed analysis
 */

const fs = require('fs');
const path = require('path');

const BASE_DIR = path.join(__dirname, 'packages/frontend/editor-ui/src');
const VIEWS_DIR = path.join(BASE_DIR, 'views');
const COMPONENTS_DIR = path.join(BASE_DIR, 'components');

class ReverseComponentLookup {
	constructor(options = {}) {
		this.options = {
			format: 'tree',
			filter: null,
			type: 'all', // local, design, n8n, external, all
			minUsage: 1,
			output: null,
			verbose: false,
			...options,
		};

		this.componentUsage = new Map(); // component -> usage details
		this.fileComponents = new Map(); // file -> components used
		this.processedFiles = new Set();
	}

	/**
	 * Categorize import types - focusing only on Vue components
	 */
	categorizeImport(importPath) {
		// Only process local Vue components and views
		if (
			importPath.startsWith('./') ||
			importPath.startsWith('../') ||
			importPath.startsWith('@/components') ||
			importPath.startsWith('@/views') ||
			importPath.startsWith('~/components') ||
			importPath.startsWith('~/views')
		) {
			return 'local';
		}

		// Design system Vue components only
		if (importPath.startsWith('@n8n/design-system') && importPath.endsWith('.vue')) {
			return 'design-system';
		}

		// Ignore everything else (stores, composables, utilities, third-party, etc.)
		return 'ignored';
	}

	/**
	 * Extract Vue component imports from a Vue/JS/TS file
	 */
	extractImports(filePath) {
		try {
			const content = fs.readFileSync(filePath, 'utf8');
			const imports = [];

			// Match import statements with various patterns - focus on Vue components
			const importPatterns = [
				// import Component from 'path'
				/import\s+(\w+)\s+from\s+['"`]([^'"`]+\.vue)['"`]/g,
				// import Component from '@/components/...'
				/import\s+(\w+)\s+from\s+['"`](@\/(?:components|views)\/[^'"`]+)['"`]/g,
				// import { Component1, Component2 } from 'path' (less common for Vue components)
				/import\s+\{\s*([^}]+)\s*\}\s+from\s+['"`]([^'"`]+\.vue)['"`]/g,
				// const Component = defineAsyncComponent(() => import('path'))
				/const\s+(\w+)\s*=\s*defineAsyncComponent\([^)]*import\s*\(\s*['"`]([^'"`]+\.vue)['"`]/g,
			];

			importPatterns.forEach((pattern) => {
				let match;
				while ((match = pattern.exec(content)) !== null) {
					const importPath = match[2];
					const importType = this.categorizeImport(importPath);

					// Only process Vue component imports
					if (importType !== 'ignored') {
						if (match[1].includes(',') || match[1].includes('{')) {
							// Handle destructured imports (rare for Vue components)
							const components = match[1]
								.replace(/[{}]/g, '')
								.split(',')
								.map((c) => c.trim())
								.filter((c) => c);

							components.forEach((component) => {
								imports.push({
									name: component,
									path: this.normalizePath(importPath),
									type: importType,
									originalPath: importPath,
								});
							});
						} else {
							imports.push({
								name: match[1],
								path: this.normalizePath(importPath),
								type: importType,
								originalPath: importPath,
							});
						}
					}
				}
			});

			return imports;
		} catch (error) {
			if (this.options.verbose) {
				console.warn(`Warning: Could not read ${filePath}: ${error.message}`);
			}
			return [];
		}
	}

	/**
	 * Normalize import paths
	 */
	normalizePath(importPath) {
		// Convert @/ to relative path
		if (importPath.startsWith('@/')) {
			return importPath.replace('@/', '');
		}

		// Resolve relative paths
		if (importPath.startsWith('./') || importPath.startsWith('../')) {
			return path.normalize(importPath);
		}

		return importPath;
	}

	/**
	 * Get all relevant files recursively
	 */
	getAllFiles(dir, prefix = '', extensions = ['.vue', '.js', '.ts']) {
		const files = [];

		try {
			const entries = fs.readdirSync(dir, { withFileTypes: true });

			for (const entry of entries) {
				const fullPath = path.join(dir, entry.name);
				const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;

				if (entry.isDirectory()) {
					files.push(...this.getAllFiles(fullPath, relativePath, extensions));
				} else if (extensions.some(ext => entry.name.endsWith(ext))) {
					files.push({
						name: entry.name,
						path: relativePath,
						fullPath: fullPath,
						type: this.getFileType(relativePath),
					});
				}
			}
		} catch (error) {
			if (this.options.verbose) {
				console.warn(`Warning: Could not read directory ${dir}: ${error.message}`);
			}
		}

		return files;
	}

	/**
	 * Determine file type based on path
	 */
	getFileType(filePath) {
		if (filePath.startsWith('views/')) return 'view';
		if (filePath.startsWith('components/')) return 'component';
		if (filePath.includes('store')) return 'store';
		if (filePath.includes('composable')) return 'composable';
		if (filePath.includes('util')) return 'utility';
		return 'other';
	}

	/**
	 * Check if component should be included based on filters
	 */
	shouldIncludeComponent(componentName, componentType, usageCount) {
		// Filter by usage count
		if (usageCount < this.options.minUsage) {
			return false;
		}

		// Filter by type
		if (this.options.type !== 'all' && componentType !== this.options.type) {
			return false;
		}

		// Filter by name pattern
		if (this.options.filter) {
			const pattern = new RegExp(this.options.filter, 'i');
			if (!pattern.test(componentName)) {
				return false;
			}
		}

		return true;
	}

	/**
	 * Analyze all files for component usage
	 */
	analyzeComponentUsage() {
		console.log('🔍 Scanning all files for component usage...');

		// Get all Vue, JS, and TS files
		const allFiles = [
			...this.getAllFiles(VIEWS_DIR, 'views'),
			...this.getAllFiles(COMPONENTS_DIR, 'components'),
		];

		console.log(`📁 Found ${allFiles.length} files to analyze`);

		for (const file of allFiles) {
			if (this.processedFiles.has(file.path)) continue;
			this.processedFiles.add(file.path);

			const imports = this.extractImports(file.fullPath);
			this.fileComponents.set(file.path, {
				...file,
				imports: imports,
			});

			// Build reverse index
			imports.forEach((imp) => {
				const componentKey = this.getComponentKey(imp);
				
				if (!this.componentUsage.has(componentKey)) {
					this.componentUsage.set(componentKey, {
						name: imp.name,
						type: imp.type,
						path: imp.originalPath,
						normalizedPath: imp.path,
						usedBy: [],
						usageCount: 0,
						fileTypes: new Set(),
					});
				}

				const usage = this.componentUsage.get(componentKey);
				usage.usedBy.push({
					file: file.path,
					fileName: file.name,
					fileType: file.type,
					fullPath: file.fullPath,
				});
				usage.usageCount++;
				usage.fileTypes.add(file.type);
			});
		}

		console.log(`📊 Found ${this.componentUsage.size} unique components`);
	}

	/**
	 * Generate a unique key for each component
	 */
	getComponentKey(importData) {
		// For local components, use the normalized path
		if (importData.type === 'local') {
			return `${importData.type}:${importData.path}:${importData.name}`;
		}
		// For external libraries, use the original path and component name
		return `${importData.type}:${importData.originalPath}:${importData.name}`;
	}

	/**
	 * Generate the reverse lookup report
	 */
	generateReport() {
		const report = {
			summary: {
				totalComponents: this.componentUsage.size,
				totalFiles: this.processedFiles.size,
				componentsByType: {},
				highestUsage: 0,
				mostUsedComponent: null,
			},
			components: {},
		};

		// Filter and process components
		const filteredComponents = Array.from(this.componentUsage.entries())
			.filter(([_, data]) => 
				this.shouldIncludeComponent(data.name, data.type, data.usageCount)
			)
			.sort(([, a], [, b]) => b.usageCount - a.usageCount);

		// Build summary statistics
		const typeGroups = {};
		filteredComponents.forEach(([key, data]) => {
			if (!typeGroups[data.type]) {
				typeGroups[data.type] = 0;
			}
			typeGroups[data.type]++;

			if (data.usageCount > report.summary.highestUsage) {
				report.summary.highestUsage = data.usageCount;
				report.summary.mostUsedComponent = data.name;
			}
		});

		report.summary.componentsByType = typeGroups;
		report.summary.filteredComponents = filteredComponents.length;

		// Process components
		filteredComponents.forEach(([key, data]) => {
			report.components[key] = {
				name: data.name,
				type: data.type,
				path: data.path,
				usageCount: data.usageCount,
				fileTypes: Array.from(data.fileTypes),
				usedBy: data.usedBy.map(usage => ({
					file: usage.file,
					fileName: usage.fileName,
					fileType: usage.fileType,
				})),
			};
		});

		return report;
	}

	/**
	 * Format output as tree structure
	 */
	formatAsTree(report) {
		let output = '🔍 Vue Component Usage Analysis\n';
		output += '='.repeat(60) + '\n\n';

		output += `📈 Summary:\n`;
		output += `  • Vue Components Found: ${report.summary.totalComponents}\n`;
		output += `  • Components Shown: ${report.summary.filteredComponents}\n`;
		output += `  • Total Files Analyzed: ${report.summary.totalFiles}\n`;
		output += `  • Most Used Component: ${report.summary.mostUsedComponent} (${report.summary.highestUsage} usages)\n\n`;

		// Show breakdown by type
		output += `📊 Components by Type:\n`;
		Object.entries(report.summary.componentsByType).forEach(([type, count]) => {
			const emoji = this.getTypeEmoji(type);
			output += `  ${emoji} ${type}: ${count} components\n`;
		});
		output += '\n';

		// Group components by type
		const componentsByType = {};
		Object.entries(report.components).forEach(([key, component]) => {
			if (!componentsByType[component.type]) {
				componentsByType[component.type] = [];
			}
			componentsByType[component.type].push([key, component]);
		});

		// Show each type section
		const typeOrder = ['local', 'design-system'];
		
		typeOrder.forEach(type => {
			if (!componentsByType[type]) return;

			const emoji = this.getTypeEmoji(type);
			const typeName = this.getTypeName(type);
			
			output += `${emoji} ${typeName.toUpperCase()}:\n`;
			output += '─'.repeat(40) + '\n';

			// Sort by usage count
			componentsByType[type]
				.sort(([, a], [, b]) => b.usageCount - a.usageCount)
				.forEach(([key, component]) => {
					output += `\n🧩 ${component.name}`;
					if (component.path && component.type === 'local') {
						output += ` (${component.path})`;
					} else if (component.path && component.type !== 'local') {
						output += ` (${component.path})`;
					}
					output += `\n   📊 Used ${component.usageCount} time(s) across ${component.fileTypes.length} file type(s): ${component.fileTypes.join(', ')}\n`;
					
					// Show all usage locations (no truncation)
					component.usedBy.forEach((usage, index) => {
						const isLast = index === component.usedBy.length - 1;
						const prefix = isLast ? '     └──' : '     ├──';
						const typeIcon = this.getFileTypeIcon(usage.fileType);
						output += `${prefix} ${typeIcon} ${usage.fileName} (${usage.file})\n`;
					});
				});

			output += '\n';
		});

		return output;
	}

	/**
	 * Get emoji for component type
	 */
	getTypeEmoji(type) {
		const emojis = {
			'design-system': '🎨',
			'local': '🏠',
			'n8n-package': '📦',
			'external': '🌐',
		};
		return emojis[type] || '📄';
	}

	/**
	 * Get readable name for component type
	 */
	getTypeName(type) {
		const names = {
			'design-system': 'Design System Components',
			'local': 'Local Components',
			'n8n-package': 'n8n Package Components',
			'external': 'External Library Components',
		};
		return names[type] || type;
	}

	/**
	 * Get icon for file type
	 */
	getFileTypeIcon(fileType) {
		const icons = {
			'view': '📄',
			'component': '🧩',
			'store': '🗃️',
			'composable': '🔧',
			'utility': '⚙️',
			'other': '📁',
		};
		return icons[fileType] || '📁';
	}

	/**
	 * Format output as table (CSV)
	 */
	formatAsTable(report) {
		let output = 'Component Name,Type,Path,Usage Count,File Types,Used By Files\n';

		Object.entries(report.components).forEach(([key, component]) => {
			const usedByFiles = component.usedBy.map(u => u.file).join('; ');
			output += `"${component.name}","${component.type}","${component.path}",${component.usageCount},"${component.fileTypes.join('; ')}","${usedByFiles}"\n`;
		});

		return output;
	}

	/**
	 * Main analysis function
	 */
	async analyze() {
		console.log('🔍 Starting reverse component lookup analysis...\n');

		// Check if directories exist
		if (!fs.existsSync(VIEWS_DIR)) {
			throw new Error(`Views directory not found: ${VIEWS_DIR}`);
		}
		if (!fs.existsSync(COMPONENTS_DIR)) {
			throw new Error(`Components directory not found: ${COMPONENTS_DIR}`);
		}

		this.analyzeComponentUsage();

		console.log('🏗️  Generating reverse lookup report...');
		const report = this.generateReport();

		// Format output
		let output;
		switch (this.options.format) {
			case 'json':
				output = JSON.stringify(report, null, 2);
				break;
			case 'table':
				output = this.formatAsTable(report);
				break;
			case 'tree':
			default:
				output = this.formatAsTree(report);
				break;
		}

		// Save to file if specified
		if (this.options.output) {
			fs.writeFileSync(this.options.output, output);
			console.log(`\n💾 Results saved to: ${this.options.output}`);
		}

		return { report, output };
	}
}

// CLI interface
function parseArgs() {
	const args = process.argv.slice(2);
	const options = {};

	args.forEach((arg) => {
		if (arg.startsWith('--format=')) {
			options.format = arg.split('=')[1];
		} else if (arg.startsWith('--filter=')) {
			options.filter = arg.split('=')[1];
		} else if (arg.startsWith('--type=')) {
			options.type = arg.split('=')[1];
		} else if (arg.startsWith('--min-usage=')) {
			options.minUsage = parseInt(arg.split('=')[1], 10);
		} else if (arg.startsWith('--output=')) {
			options.output = arg.split('=')[1];
		} else if (arg === '--verbose') {
			options.verbose = true;
		} else if (arg === '--help' || arg === '-h') {
			console.log(`
Reverse Component Lookup Tool

Usage: node reverse-component-lookup.js [options]

Options:
  --format=json|tree|table     Output format (default: tree)
  --filter=pattern             Filter components by name pattern (regex)
  --type=local|design|n8n|external|all  Filter by component type (default: all)
  --min-usage=N                Only show components used at least N times (default: 1)
  --output=file                Save results to file
  --verbose                    Show detailed analysis
  --help, -h                   Show this help message

Examples:
  node reverse-component-lookup.js
  node reverse-component-lookup.js --type=design-system --min-usage=5
  node reverse-component-lookup.js --filter="N8n.*" --format=json
  node reverse-component-lookup.js --format=table --output=usage.csv
  node reverse-component-lookup.js --type=local --min-usage=3 --verbose
			`);
			process.exit(0);
		}
	});

	return options;
}

// Main execution
if (require.main === module) {
	(async () => {
		try {
			const options = parseArgs();
			const analyzer = new ReverseComponentLookup(options);
			const { output } = await analyzer.analyze();

			if (!options.output) {
				console.log('\n' + output);
			}

			console.log('\n✅ Reverse lookup analysis complete!');
		} catch (error) {
			console.error('❌ Error:', error.message);
			process.exit(1);
		}
	})();
}

module.exports = ReverseComponentLookup;