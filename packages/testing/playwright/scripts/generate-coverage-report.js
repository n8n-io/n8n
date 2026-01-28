#!/usr/bin/env node

/**
 * Simple script to merge coverage reports and generate HTML output
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const NYC_OUTPUT_DIR = path.join(__dirname, '..', '.nyc_output');
const COVERAGE_DIR = path.join(__dirname, '..', 'coverage');
const NYC_CONFIG = path.join(__dirname, '..', 'nyc.config.ts');

// Coverage directories to look for - Currents writes to .nyc_output/{projectName}/
// Project names come from playwright-projects.ts
const COVERAGE_PROJECT_PATTERNS = [
	'e2e', // Local mode project
	'sqlite:e2e', // Container mode projects
	'postgres:e2e',
	'queue:e2e',
	'multi-main:e2e',
];

/**
 * Find all coverage directories that exist and contain JSON files
 */
function findCoverageDirectories() {
	const foundDirs = [];

	for (const projectName of COVERAGE_PROJECT_PATTERNS) {
		const projectDir = path.join(NYC_OUTPUT_DIR, projectName);
		if (fs.existsSync(projectDir)) {
			const files = fs.readdirSync(projectDir);
			const jsonFiles = files.filter((f) => f.endsWith('.json'));
			if (jsonFiles.length > 0) {
				foundDirs.push({ dir: projectDir, projectName, fileCount: jsonFiles.length });
			}
		}
	}

	return foundDirs;
}

function main() {
	console.log('🔍 Generating Coverage Report');
	console.log('==============================\n');

	// Find all coverage directories
	const coverageDirs = findCoverageDirectories();

	if (coverageDirs.length === 0) {
		console.error('❌ No coverage data found in .nyc_output/');
		console.log('\nSearched for coverage in these project directories:');
		COVERAGE_PROJECT_PATTERNS.forEach((p) => console.log(`  - .nyc_output/${p}/`));
		console.log('\nTo generate coverage data:');
		console.log(
			'1. Build editor-ui with coverage: BUILD_WITH_COVERAGE=true pnpm --filter n8n-editor-ui build',
		);
		console.log(
			'2. Run Playwright tests with coverage: BUILD_WITH_COVERAGE=true pnpm test:container:sqlite',
		);
		process.exit(1);
	}

	console.log('Found coverage data in:');
	coverageDirs.forEach(({ projectName, fileCount }) =>
		console.log(`  - ${projectName}: ${fileCount} files`),
	);
	console.log('');

	try {
		// Merge coverage files from all found project directories
		// nyc merge only accepts one input directory, so we need to:
		// 1. Copy all JSON files to a single temp directory
		// 2. Run nyc merge on that directory
		console.log('Merging coverage files from all projects...');
		const mergedFile = path.join(NYC_OUTPUT_DIR, 'out.json');
		const tempMergeDir = path.join(NYC_OUTPUT_DIR, '_merge_temp');

		// Create temp directory for merging
		if (fs.existsSync(tempMergeDir)) {
			fs.rmSync(tempMergeDir, { recursive: true });
		}
		fs.mkdirSync(tempMergeDir, { recursive: true });

		// Copy all JSON files from all project directories to the temp directory
		let fileIndex = 0;
		for (const { dir, projectName } of coverageDirs) {
			const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
			for (const file of files) {
				const srcPath = path.join(dir, file);
				// Use unique names to avoid collisions between projects
				const destPath = path.join(
					tempMergeDir,
					`${projectName.replace(/:/g, '_')}_${fileIndex++}_${file}`,
				);
				fs.copyFileSync(srcPath, destPath);
			}
		}

		console.log(`Copied ${fileIndex} coverage files to temp directory`);

		// Now merge the single temp directory
		execSync(`npx nyc merge "${tempMergeDir}" "${mergedFile}"`, { stdio: 'inherit' });

		// Clean up temp directory
		fs.rmSync(tempMergeDir, { recursive: true });

		// Generate reports (HTML for viewing, LCOV for Codecov)
		console.log('Generating coverage reports...');
		execSync(
			`npx nyc report --reporter=html --reporter=lcov --report-dir=${COVERAGE_DIR} --temp-dir=${NYC_OUTPUT_DIR} --config=${NYC_CONFIG} --exclude-after-remap=false`,
			{ stdio: 'inherit' },
		);

		const htmlReportPath = path.join(COVERAGE_DIR, 'index.html');
		const lcovPath = path.join(COVERAGE_DIR, 'lcov.info');

		console.log(`\n✅ Coverage reports generated successfully!`);
		if (fs.existsSync(htmlReportPath)) {
			console.log(`📊 HTML Report: ${htmlReportPath}`);
		}
		if (fs.existsSync(lcovPath)) {
			console.log(`📄 LCOV Report: ${lcovPath} (for Codecov)`);
		}
	} catch (error) {
		console.error('❌ Failed to generate coverage report:', error.message);
		process.exit(1);
	}
}

if (require.main === module) {
	main();
}

module.exports = { main };
