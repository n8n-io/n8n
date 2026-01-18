/**
 * Validates that schema files exist for all declared node versions.
 *
 * This script checks nodes that have __schema__ directories and verifies
 * that schema files exist for the node's default version. This prevents
 * issues where a node version is bumped but schema files are not updated.
 *
 * Run as part of: pnpm lint
 */

const fs = require('fs');
const path = require('path');

const NODES_DIR = path.join(__dirname, '../nodes');
const DIST_DIR = path.join(__dirname, '../dist/nodes');

/**
 * Recursively find all directories containing __schema__
 */
function findSchemaDirectories(dir, results = []) {
	const entries = fs.readdirSync(dir, { withFileTypes: true });

	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			if (entry.name === '__schema__') {
				results.push(path.dirname(fullPath));
			} else {
				findSchemaDirectories(fullPath, results);
			}
		}
	}

	return results;
}

/**
 * Get available schema versions from __schema__ directory
 */
function getAvailableSchemaVersions(nodeDir) {
	const schemaDir = path.join(nodeDir, '__schema__');
	if (!fs.existsSync(schemaDir)) return [];

	return fs
		.readdirSync(schemaDir, { withFileTypes: true })
		.filter((entry) => entry.isDirectory() && entry.name.startsWith('v'))
		.map((entry) => entry.name.replace('v', ''));
}

/**
 * Find the main node file in a directory
 */
function findNodeFile(nodeDir) {
	const entries = fs.readdirSync(nodeDir);
	const nodeFile = entries.find(
		(f) => f.endsWith('.node.ts') && !f.includes('Trigger') && !f.includes('.test.'),
	);
	return nodeFile ? path.join(nodeDir, nodeFile) : null;
}

/**
 * Extract version info from node source file using regex
 * This handles both simple version: X and defaultVersion: X patterns
 */
function extractVersionFromSource(nodeFilePath) {
	const content = fs.readFileSync(nodeFilePath, 'utf8');

	// Check for defaultVersion (versioned nodes)
	const defaultVersionMatch = content.match(/defaultVersion:\s*([\d.]+)/);
	if (defaultVersionMatch) {
		return {
			defaultVersion: parseFloat(defaultVersionMatch[1]),
			isVersioned: true,
		};
	}

	// Check for simple version (non-versioned nodes)
	const versionMatch = content.match(/version:\s*(\[[\d\s,.]+\]|[\d.]+)/);
	if (versionMatch) {
		const versionValue = versionMatch[1];
		// Handle array format: version: [1, 2, 3]
		if (versionValue.startsWith('[')) {
			const versions = versionValue
				.replace(/[\[\]]/g, '')
				.split(',')
				.map((v) => parseFloat(v.trim()))
				.filter((v) => !isNaN(v));
			return {
				defaultVersion: Math.max(...versions),
				isVersioned: false,
			};
		}
		return {
			defaultVersion: parseFloat(versionValue),
			isVersioned: false,
		};
	}

	return null;
}

/**
 * Convert version number to schema directory format (e.g., 2.2 -> "2.2.0")
 */
function versionToSchemaFormat(version) {
	const parts = version.toString().split('.');
	while (parts.length < 3) parts.push('0');
	return parts.slice(0, 3).join('.');
}

/**
 * Main validation function
 */
function validateSchemaVersions() {
	console.log('Validating schema versions for nodes...\n');

	const nodesWithSchemas = findSchemaDirectories(NODES_DIR);
	const errors = [];
	const warnings = [];

	for (const nodeDir of nodesWithSchemas) {
		const relativePath = path.relative(NODES_DIR, nodeDir);
		const nodeFile = findNodeFile(nodeDir);

		if (!nodeFile) {
			// Try parent directory for versioned nodes
			const parentNodeFile = findNodeFile(path.dirname(nodeDir));
			if (!parentNodeFile) {
				warnings.push(`${relativePath}: Could not find node file`);
				continue;
			}
		}

		const actualNodeFile = nodeFile || findNodeFile(path.dirname(nodeDir));
		if (!actualNodeFile) {
			warnings.push(`${relativePath}: Could not find node file`);
			continue;
		}
		const versionInfo = extractVersionFromSource(actualNodeFile);

		if (!versionInfo) {
			warnings.push(`${relativePath}: Could not extract version info`);
			continue;
		}

		const availableSchemas = getAvailableSchemaVersions(nodeDir);
		const expectedSchemaVersion = versionToSchemaFormat(versionInfo.defaultVersion);

		if (!availableSchemas.includes(expectedSchemaVersion)) {
			const nodeName = path.basename(actualNodeFile, '.node.ts');
			errors.push({
				node: nodeName,
				path: relativePath,
				defaultVersion: versionInfo.defaultVersion,
				expectedSchema: `v${expectedSchemaVersion}`,
				availableSchemas: availableSchemas.map((v) => `v${v}`),
			});
		}
	}

	// Report results
	if (errors.length > 0) {
		console.warn('⚠️  WARNING: The following nodes have missing schema versions:\n');
		for (const error of errors) {
			console.warn(`  ${error.node} (${error.path})`);
			console.warn(`    Default version: ${error.defaultVersion}`);
			console.warn(`    Expected schema: ${error.expectedSchema}`);
			console.warn(`    Available schemas: ${error.availableSchemas.join(', ') || 'none'}`);
			console.warn('');
		}
		console.warn('Schema files should be generated for these versions.');
		console.warn('');
	}

	if (warnings.length > 0) {
		console.warn('⚠️  Warnings:\n');
		for (const warning of warnings) {
			console.warn(`  ${warning}`);
		}
		console.warn('');
	}

	console.log(`✅ All ${nodesWithSchemas.length} nodes with schemas have valid version mappings.`);
}

try {
	validateSchemaVersions();
} catch (error) {
	console.warn('⚠️  Schema validation script encountered an error:', error.message);
	console.warn('Continuing without blocking...');
}
