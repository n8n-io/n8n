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
const COVERAGE_INPUT_DIR = path.join(NYC_OUTPUT_DIR, 'coverage');

function main() {
	console.log('🔍 Generating Coverage Report');
	console.log('==============================\n');

	const jsonFiles = fs.existsSync(COVERAGE_INPUT_DIR)
		? fs.readdirSync(COVERAGE_INPUT_DIR).filter((f) => f.endsWith('.json'))
		: [];

	if (jsonFiles.length === 0) {
		console.error('❌ No coverage data found in .nyc_output/coverage/');
		console.log('\nTo generate coverage data:');
		console.log(
			'1. Build editor-ui with coverage: BUILD_WITH_COVERAGE=true pnpm --filter n8n-editor-ui build',
		);
		console.log('2. Run Playwright tests with coverage: pnpm test:container:coverage');
		process.exit(1);
	}

	console.log(`Found ${jsonFiles.length} coverage files in .nyc_output/coverage/\n`);

	try {
		const mergedFile = path.join(NYC_OUTPUT_DIR, 'out.json');
		console.log('Merging coverage files...');
		execSync(`npx nyc merge "${COVERAGE_INPUT_DIR}" "${mergedFile}"`, { stdio: 'inherit' });

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
