#!/usr/bin/env node

/**
 * Simple script to merge coverage reports and generate HTML output
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const NYC_OUTPUT_DIR = path.join(__dirname, '..', '.nyc_output');
const UI_DIR = path.join(NYC_OUTPUT_DIR, 'ui');
const COVERAGE_DIR = path.join(__dirname, '..', 'coverage');
const NYC_CONFIG = path.join(__dirname, '..', 'nyc.config.ts');

function main() {
	console.log('🔍 Generating Coverage Report');
	console.log('==============================\n');

	// Check if ui directory exists and has JSON files
	if (!fs.existsSync(UI_DIR)) {
		console.error('❌ No coverage data found in .nyc_output/ui');
		console.log('\nTo generate coverage data:');
		console.log(
			'1. Build editor-ui with coverage: COVERAGE_ENABLED=true pnpm --filter n8n-editor-ui build',
		);
		console.log('2. Run Playwright tests: COVERAGE_ENABLED=true pnpm test:local');
		process.exit(1);
	}

	try {
		// Merge coverage files from ui directory
		console.log('Merging coverage files...');
		const mergedFile = path.join(NYC_OUTPUT_DIR, 'out.json');
		execSync(`npx nyc merge ${UI_DIR} ${mergedFile}`, { stdio: 'inherit' });

		// Generate HTML report
		console.log('Generating HTML report...');
		execSync(
			`npx nyc report --reporter=html --report-dir=${COVERAGE_DIR} --temp-dir=${NYC_OUTPUT_DIR} --config=${NYC_CONFIG} --exclude-after-remap=false`,
			{ stdio: 'inherit' },
		);

		const htmlReportPath = path.join(COVERAGE_DIR, 'index.html');
		if (fs.existsSync(htmlReportPath)) {
			console.log(`\n✅ Coverage report generated successfully!`);
			console.log(`📊 Report: ${htmlReportPath}`);
			console.log(`🌐 Open: file://${htmlReportPath}`);
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
