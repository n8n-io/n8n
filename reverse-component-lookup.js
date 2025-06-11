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

		// Design system components - all patterns
		if (importPath.startsWith('@n8n/design-system')) {
			return 'design-system';
		}

		// Ignore everything else (stores, composables, utilities, third-party, etc.)
		return 'ignored';
	}

	/**
	 * Extract Vue component imports and template usage from a Vue file
	 */
	extractImports(filePath) {
		try {
			const content = fs.readFileSync(filePath, 'utf8');
			const imports = [];

			// First, get explicit imports
			const explicitImports = this.extractExplicitImports(content);
			imports.push(...explicitImports);

			// Then, scan template for component usage (including implicit design system components)
			const templateComponents = this.extractTemplateComponents(content, explicitImports);
			imports.push(...templateComponents);

			return imports;
		} catch (error) {
			if (this.options.verbose) {
				console.warn(`Warning: Could not read ${filePath}: ${error.message}`);
			}
			return [];
		}
	}

	/**
	 * Extract explicit component imports from a Vue file
	 */
	extractExplicitImports(content) {
		const imports = [];

		// Match import statements with various patterns - focus on Vue components
		const importPatterns = [
			// import Component from 'path'
			/import\s+(\w+)\s+from\s+['`"]([^'`"]+\.vue)['`"]/g,
			// import Component from '@/components/...'
			/import\s+(\w+)\s+from\s+['`"](@\/(?:components|views)\/[^'`"]+)['`"]/g,
			// import { Component1, Component2 } from 'path' (less common for Vue components)
			/import\s+\{\s*([^}]+)\s*\}\s+from\s+['`"]([^'`"]+\.vue)['`"]/g,
			// const Component = defineAsyncComponent(() => import('path'))
			/const\s+(\w+)\s*=\s*defineAsyncComponent\([^)]*import\s*\(\s*['`"]([^'`"]+\.vue)['`"]/g,
			// Design system destructured imports: import { N8nButton, N8nText } from '@n8n/design-system'
			/import\s+\{([^}]+)\}\s+from\s+['`"]@n8n\/design-system['`"]/g,
			// Design system default imports: import N8nButton from '@n8n/design-system/components/N8nButton'
			/import\s+(\w+)\s+from\s+['`"]@n8n\/design-system\/(?:components\/)?([^'`"]+?)(?:\/index)?['`"]/g,
			// Design system .vue file imports: import Component from '@n8n/design-system/components/Component/Component.vue'
			/import\s+(\w+)\s+from\s+['`"](@n8n\/design-system\/[^'`"]+\.vue)['`"]/g,
		];

		importPatterns.forEach((pattern, patternIndex) => {
			let match;
			while ((match = pattern.exec(content)) !== null) {
				let importPath, componentNames, importType;
				
				// Handle different pattern types
				if (patternIndex === 4) {
					// Design system destructured imports: { N8nButton, N8nText }
					importPath = '@n8n/design-system';
					componentNames = match[1]
						.split(',')
						.map(c => c.trim())
						.filter(c => c && !c.includes('type ') && /^[A-Z]/.test(c)); // Only components starting with capital letter, exclude types
				} else if (patternIndex === 5) {
					// Design system default imports from component paths
					importPath = `@n8n/design-system/components/${match[2]}`;
					componentNames = [match[1]];
				} else if (patternIndex === 6) {
					// Design system .vue file imports
					importPath = match[2];
					componentNames = [match[1]];
				} else {
					// Regular patterns
					importPath = match[2];
					if (match[1].includes(',') || match[1].includes('{')) {
						// Handle destructured imports
						componentNames = match[1]
							.replace(/[{}]/g, '')
							.split(',')
							.map((c) => c.trim())
							.filter((c) => c);
					} else {
						componentNames = [match[1]];
					}
				}

				importType = this.categorizeImport(importPath);

				// Only process Vue component imports
				if (importType !== 'ignored') {
					componentNames.forEach((componentName) => {
						imports.push({
							name: componentName,
							path: this.normalizePath(importPath),
							type: importType,
							originalPath: importPath,
							source: 'import'
						});
					});
				}
			}
		});

		return imports;
	}

	/**
	 * Extract component usage from template section
	 */
	extractTemplateComponents(content, explicitImports) {
		const templateComponents = [];
		const explicitComponentNames = new Set(explicitImports.map(imp => imp.name));

		// Extract template section
		const templateMatch = content.match(/<template[^>]*>([\s\S]*?)<\/template>/);
		if (!templateMatch) return templateComponents;

		const templateContent = templateMatch[1];

		// Common n8n design system components (check both PascalCase and hyphenated)
		const designSystemComponents = [
			'N8nActionBox', 'N8nActionDropdown', 'N8nActionToggle', 'N8nAlert', 'N8nAvatar',
			'N8nBadge', 'N8nButton', 'N8nButtonGroup', 'N8nCallout', 'N8nCard', 'N8nCheckbox',
			'N8nColorPicker', 'N8nDatatable', 'N8nDatePicker', 'N8nFormBox', 'N8nFormInput',
			'N8nFormInputs', 'N8nHeading', 'N8nIcon', 'N8nIconButton', 'N8nInfoAccordion',
			'N8nInfoTip', 'N8nInput', 'N8nInputLabel', 'N8nInputNumber', 'N8nInlineTextEdit',
			'N8nKeyboardShortcut', 'N8nLink', 'N8nLoading', 'N8nMarkdown', 'N8nMenu', 'N8nMenuItem',
			'N8nNotice', 'N8nOption', 'N8nPagination', 'N8nPopover', 'N8nPulse', 'N8nRadioButtons',
			'N8nRecycleScroller', 'N8nSelect', 'N8nSpinner', 'N8nSticky', 'N8nTabs', 'N8nTag',
			'N8nTags', 'N8nText', 'N8nTextarea', 'N8nTooltip', 'N8nTree', 'N8nUserInfo',
			'N8nUserSelect', 'N8nUsersList'
		];

		// Create mapping of hyphenated to PascalCase
		const hyphenatedToPascalCase = {};
		designSystemComponents.forEach(component => {
			const hyphenated = component.replace(/([A-Z])/g, (match, letter, index) => {
				return index === 0 ? letter.toLowerCase() : '-' + letter.toLowerCase();
			});
			hyphenatedToPascalCase[hyphenated] = component;
		});

		// Check for PascalCase components (self-closing and with content)
		designSystemComponents.forEach(componentName => {
			if (explicitComponentNames.has(componentName)) return; // Skip if explicitly imported

			const patterns = [
				new RegExp(`<${componentName}(?:\\s[^>]*)?\\/?>`, 'g'),
				new RegExp(`<\\/${componentName}>`, 'g')
			];

			patterns.forEach(pattern => {
				if (pattern.test(templateContent)) {
					templateComponents.push({
						name: componentName,
						path: '@n8n/design-system',
						type: 'design-system',
						originalPath: '@n8n/design-system',
						source: 'template'
					});
				}
			});
		});

		// Check for hyphenated components
		Object.entries(hyphenatedToPascalCase).forEach(([hyphenated, pascalCase]) => {
			if (explicitComponentNames.has(pascalCase)) return; // Skip if explicitly imported
			if (templateComponents.some(tc => tc.name === pascalCase)) return; // Skip if already found

			const patterns = [
				new RegExp(`<${hyphenated}(?:\\s[^>]*)?\\/?>`, 'g'),
				new RegExp(`<\\/${hyphenated}>`, 'g')
			];

			patterns.forEach(pattern => {
				if (pattern.test(templateContent)) {
					templateComponents.push({
						name: pascalCase,
						path: '@n8n/design-system',
						type: 'design-system',
						originalPath: '@n8n/design-system',
						source: 'template'
					});
				}
			});
		});

		// Remove duplicates
		const uniqueComponents = [];
		const seen = new Set();
		
		templateComponents.forEach(comp => {
			const key = `${comp.name}|${comp.originalPath}`;
			if (!seen.has(key)) {
				seen.add(key);
				uniqueComponents.push(comp);
			}
		});

		return uniqueComponents;
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
	 * Get all Vue files in a directory recursively
	 */
	getVueFiles(dir, prefix = '') {
		const files = [];

		try {
			const entries = fs.readdirSync(dir, { withFileTypes: true });

			for (const entry of entries) {
				const fullPath = path.join(dir, entry.name);
				const relativePath = prefix ? `${prefix}/${entry.name}` : entry.name;

				if (entry.isDirectory()) {
					files.push(...this.getVueFiles(fullPath, relativePath));
				} else if (entry.name.endsWith('.vue')) {
					files.push({
						name: entry.name,
						path: relativePath,
						fullPath: fullPath,
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
	 * Process a single file and track component usage
	 */
	processFile(file) {
		if (this.processedFiles.has(file.fullPath)) return;
		this.processedFiles.add(file.fullPath);

		const imports = this.extractImports(file.fullPath);
		const fileComponents = [];

		imports.forEach((imp) => {
			// Track component usage
			const componentKey = `${imp.name}|${imp.originalPath}`;
			
			if (!this.componentUsage.has(componentKey)) {
				this.componentUsage.set(componentKey, {
					name: imp.name,
					type: imp.type,
					originalPath: imp.originalPath,
					normalizedPath: imp.path,
					usages: [],
					totalUsage: 0,
				});
			}

			const componentData = this.componentUsage.get(componentKey);
			componentData.usages.push({
				file: file.path,
				fileName: file.name,
				fileType: file.path.startsWith('views/') ? 'view' : 'component',
				fullPath: file.fullPath,
			});
			componentData.totalUsage++;

			fileComponents.push(imp);
		});

		this.fileComponents.set(file.path, fileComponents);
	}

	/**
	 * Analyze all Vue files for component usage
	 */
	analyzeComponents() {
		// Get all views and components
		const viewFiles = this.getVueFiles(VIEWS_DIR, 'views');
		const componentFiles = this.getVueFiles(COMPONENTS_DIR, 'components');
		const allFiles = [...viewFiles, ...componentFiles];

		console.log(`📁 Processing ${allFiles.length} Vue files...`);
		
		// Process each file
		allFiles.forEach((file) => {
			this.processFile(file);
		});

		console.log(`✅ Found ${this.componentUsage.size} unique components`);
	}

	/**
	 * Filter components based on options
	 */
	filterComponents() {
		let filteredComponents = Array.from(this.componentUsage.values());

		// Filter by type
		if (this.options.type !== 'all') {
			const typeMap = {
				'local': 'local',
				'design': 'design-system',
				'n8n': 'n8n-package',
				'external': 'external',
			};
			const targetType = typeMap[this.options.type];
			if (targetType) {
				filteredComponents = filteredComponents.filter(comp => comp.type === targetType);
			}
		}

		// Filter by minimum usage
		if (this.options.minUsage > 1) {
			filteredComponents = filteredComponents.filter(comp => comp.totalUsage >= this.options.minUsage);
		}

		// Filter by name pattern
		if (this.options.filter) {
			const filterRegex = new RegExp(this.options.filter, 'i');
			filteredComponents = filteredComponents.filter(comp => filterRegex.test(comp.name));
		}

		return filteredComponents;
	}

	/**
	 * Generate usage report
	 */
	generateReport() {
		const filteredComponents = this.filterComponents();
		
		// Sort by usage count (descending)
		filteredComponents.sort((a, b) => b.totalUsage - a.totalUsage);

		const report = {
			summary: {
				totalComponents: this.componentUsage.size,
				filteredComponents: filteredComponents.length,
				totalFiles: this.fileComponents.size,
				filters: {
					type: this.options.type,
					minUsage: this.options.minUsage,
					nameFilter: this.options.filter,
				},
				componentsByType: {
					local: Array.from(this.componentUsage.values()).filter(c => c.type === 'local').length,
					designSystem: Array.from(this.componentUsage.values()).filter(c => c.type === 'design-system').length,
					n8nPackage: Array.from(this.componentUsage.values()).filter(c => c.type === 'n8n-package').length,
					external: Array.from(this.componentUsage.values()).filter(c => c.type === 'external').length,
				},
			},
			components: filteredComponents.map(comp => ({
				name: comp.name,
				type: comp.type,
				path: comp.originalPath,
				totalUsage: comp.totalUsage,
				usages: comp.usages,
			})),
		};

		return report;
	}

	/**
	 * Format output as tree structure
	 */
	formatAsTree(report) {
		let output = '🔍 Reverse Component Lookup\n';
		output += '='.repeat(60) + '\n\n';

		output += `📈 Summary:\n`;
		output += `  • Total Components Found: ${report.summary.totalComponents}\n`;
		output += `  • Filtered Components: ${report.summary.filteredComponents}\n`;
		output += `  • Total Files Processed: ${report.summary.totalFiles}\n`;
		output += `  • Local Components: ${report.summary.componentsByType.local}\n`;
		output += `  • Design System Components: ${report.summary.componentsByType.designSystem}\n`;
		
		if (report.summary.filters.type !== 'all') {
			output += `  • Type Filter: ${report.summary.filters.type}\n`;
		}
		if (report.summary.filters.minUsage > 1) {
			output += `  • Min Usage Filter: ${report.summary.filters.minUsage}\n`;
		}
		if (report.summary.filters.nameFilter) {
			output += `  • Name Filter: ${report.summary.filters.nameFilter}\n`;
		}
		output += '\n';

		output += '🧩 COMPONENT USAGE:\n';
		output += '─'.repeat(40) + '\n';

		for (const component of report.components) {
			const typeIcon = component.type === 'local' ? '🏠' : component.type === 'design-system' ? '🎨' : '📦';
			output += `\n${typeIcon} ${component.name} (${component.type})\n`;
			output += `   📊 Used ${component.totalUsage} times\n`;
			
			if (component.type === 'design-system') {
				output += `   📍 Source: ${component.path}\n`;
			}

			// Show all usages
			component.usages.forEach((usage, index) => {
				const isLast = index === component.usages.length - 1;
				const prefix = isLast ? '     └──' : '     ├──';
				const fileIcon = usage.fileType === 'view' ? '📄' : '🧩';
				output += `${prefix} ${fileIcon} ${usage.fileName} (${usage.file})\n`;
			});
		}

		return output;
	}

	/**
	 * Format output as table (CSV)
	 */
	formatAsTable(report) {
		let output = 'Component,Type,Path,Total Usage,Used In Files\n';

		for (const component of report.components) {
			const usedInFiles = component.usages.map(u => u.file).join('; ');
			output += `"${component.name}","${component.type}","${component.path}",${component.totalUsage},"${usedInFiles}"\n`;
		}

		return output;
	}

	/**
	 * Format output as JSON
	 */
	formatAsJson(report) {
		return JSON.stringify(report, null, 2);
	}

	/**
	 * Main analysis function
	 */
	async analyze() {
		console.log('🔍 Starting reverse component lookup...\n');

		// Check if directories exist
		if (!fs.existsSync(VIEWS_DIR)) {
			throw new Error(`Views directory not found: ${VIEWS_DIR}`);
		}
		if (!fs.existsSync(COMPONENTS_DIR)) {
			throw new Error(`Components directory not found: ${COMPONENTS_DIR}`);
		}

		console.log('📁 Analyzing component usage...');
		this.analyzeComponents();

		console.log('📊 Generating report...');
		const report = this.generateReport();

		// Format output
		let output;
		switch (this.options.format) {
			case 'json':
				output = this.formatAsJson(report);
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
  --format=json|tree|table      Output format (default: tree)
  --filter=pattern              Filter components by name pattern
  --type=local|design|all       Filter by component type (default: all)
  --min-usage=N                 Only show components used at least N times
  --output=file                 Save results to file
  --verbose                     Show detailed analysis
  --help, -h                    Show this help message

Examples:
  node reverse-component-lookup.js
  node reverse-component-lookup.js --type=design --min-usage=5
  node reverse-component-lookup.js --filter=Modal --format=json
  node reverse-component-lookup.js --format=table --output=component-usage.csv
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
			const lookup = new ReverseComponentLookup(options);
			const { output } = await lookup.analyze();

			if (!options.output) {
				console.log('\n' + output);
			}

			console.log('\n✅ Analysis complete!');
		} catch (error) {
			console.error('❌ Error:', error.message);
			process.exit(1);
		}
	})();
}

module.exports = ReverseComponentLookup;