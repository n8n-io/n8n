#!/usr/bin/env node

/**
 * Simple script to merge coverage reports and generate HTML output
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const NYC_OUTPUT_DIR = path.join(__dirname, '..', '.nyc_output');
const UI_DIR = path.join(NYC_OUTPUT_DIR, 'ui');
const BACKEND_DIR = path.join(NYC_OUTPUT_DIR, 'backend');
const COVERAGE_DIR = path.join(__dirname, '..', 'coverage');
const NYC_CONFIG = path.join(__dirname, '..', 'nyc.config.ts');
const REPO_ROOT = path.join(__dirname, '..', '..', '..', '..');

function findAllCoverageDirectories() {
	console.log('🔍 Scanning for coverage directories...');
	const coverageDirs = [];

	// Simple approach: use execSync to find all lcov.info files
	try {
		const result = execSync(`find ${REPO_ROOT}/packages -name "lcov.info" -type f 2>/dev/null`, {
			encoding: 'utf8',
			stdio: 'pipe',
		});

		const lcovFiles = result
			.trim()
			.split('\n')
			.filter((line) => line.length > 0);

		for (const lcovPath of lcovFiles) {
			const coverageDir = path.dirname(lcovPath);
			const relativePath = path.relative(REPO_ROOT, coverageDir);

			// Skip playwright's own coverage directory to avoid duplication
			if (!relativePath.includes('packages/testing/playwright')) {
				// Extract package name from path for better display
				const packageMatch = relativePath.match(/packages\/(.+?)\/coverage$/);
				const displayName = packageMatch ? packageMatch[1] : relativePath;

				coverageDirs.push({
					name: displayName,
					path: coverageDir,
					lcovPath: lcovPath,
				});
				console.log(`  📄 Found: ${displayName}`);
			}
		}
	} catch (error) {
		console.log('  ⚠️  Could not scan for coverage files:', error.message);
	}

	return coverageDirs;
}

function main() {
	console.log('🔍 Generating Coverage Report');
	console.log('==============================\n');

	// Find all coverage directories from unit tests
	const unitTestCoverage = findAllCoverageDirectories();

	// Check playwright-specific coverage
	const hasUiCoverage = fs.existsSync(UI_DIR);
	const hasBackendCoverage = fs.existsSync(BACKEND_DIR);

	console.log('\n📊 Coverage Summary:');
	console.log(`Playwright frontend coverage: ${hasUiCoverage ? '✅' : '❌'}`);
	console.log(`Playwright backend coverage: ${hasBackendCoverage ? '✅' : '❌'}`);
	console.log(`Unit test coverage packages: ${unitTestCoverage.length} found\n`);

	if (!hasUiCoverage && !hasBackendCoverage && unitTestCoverage.length === 0) {
		console.error('❌ No coverage data found');
		console.log('\nTo generate coverage data:');
		console.log(
			'1. Build frontend with coverage: COVERAGE_ENABLED=true pnpm --filter n8n-editor-ui build',
		);
		console.log('2. Run unit tests with coverage: COVERAGE_ENABLED=true pnpm test');
		console.log('3. Run Playwright tests: N8N_BASE_URL=http://localhost:5678 pnpm test:local');
		console.log('4. Generate this report: node scripts/generate-coverage-report.js');
		process.exit(1);
	}

	try {
		// Merge coverage files using lcov-result-merger for better compatibility
		console.log('Merging coverage files...');

		// Collect all lcov.info files
		const lcovFiles = [];

		// Add Playwright coverage if available
		if (hasUiCoverage || hasBackendCoverage) {
			// Generate lcov from Playwright coverage first
			const tempLcov = path.join(COVERAGE_DIR, 'playwright-temp.lcov');
			const dirsToMerge = [];
			if (hasUiCoverage) dirsToMerge.push(UI_DIR);
			if (hasBackendCoverage) dirsToMerge.push(BACKEND_DIR);

			if (dirsToMerge.length > 0) {
				// Create temp merge for playwright coverage
				const mergeDir = path.join(NYC_OUTPUT_DIR, 'temp_merge');
				if (fs.existsSync(mergeDir)) fs.rmSync(mergeDir, { recursive: true });
				fs.mkdirSync(mergeDir, { recursive: true });

				for (const dir of dirsToMerge) {
					if (fs.existsSync(dir)) {
						const files = fs.readdirSync(dir).filter((f) => f.endsWith('.json'));
						for (const file of files) {
							const srcFile = path.join(dir, file);
							const destFile = path.join(mergeDir, `${path.basename(dir)}_${file}`);
							fs.copyFileSync(srcFile, destFile);
						}
					}
				}

				const mergedFile = path.join(NYC_OUTPUT_DIR, 'out.json');
				execSync(`npx nyc merge ${mergeDir} ${mergedFile}`, { stdio: 'inherit' });
				execSync(
					`npx nyc report --reporter=lcov --report-dir=${COVERAGE_DIR} --temp-dir=${NYC_OUTPUT_DIR} --config=${NYC_CONFIG}`,
					{ stdio: 'inherit' },
				);

				const playwrightLcov = path.join(COVERAGE_DIR, 'lcov.info');
				if (fs.existsSync(playwrightLcov)) {
					lcovFiles.push(playwrightLcov);
					console.log(`📄 Added Playwright coverage`);
				}

				fs.rmSync(mergeDir, { recursive: true });
			}
		}

		// Add unit test coverage files
		for (const coverage of unitTestCoverage) {
			lcovFiles.push(coverage.lcovPath);
			console.log(`📄 Added ${coverage.name}`);
		}

		if (lcovFiles.length === 0) {
			throw new Error('No coverage files to merge');
		}

		// Merge all lcov files
		console.log(`\n📊 Merging ${lcovFiles.length} coverage reports...`);
		const finalLcov = path.join(COVERAGE_DIR, 'merged-lcov.info');

		// Process each lcov file to fix paths relative to repo root
		const lcovContent = lcovFiles
			.map((file, index) => {
				if (!fs.existsSync(file)) return '';

				let content = fs.readFileSync(file, 'utf8');

				// For unit test coverage files, we need to adjust the paths
				if (index > 0) {
					// Skip the first file (Playwright coverage)
					const coverageInfo = unitTestCoverage[index - 1];
					const packagePath = coverageInfo.name;

					// Replace relative paths with absolute paths from repo root
					content = content.replace(/^SF:(.+)$/gm, (match, filePath) => {
						// If path is already absolute or starts with packages/, keep it
						if (filePath.startsWith('/') || filePath.startsWith('packages/')) {
							return match;
						}
						// Otherwise, prepend the package path
						const normalizedPath = `packages/${packagePath}/${filePath}`;
						return `SF:${normalizedPath}`;
					});

					console.log(`  🔧 Normalized paths for ${packagePath}`);
				}

				// Filter out test files and unwanted directories
				const lines = content.split('\n');
				const filteredLines = [];
				let currentFileIncluded = true;

				for (const line of lines) {
					if (line.startsWith('SF:')) {
						const filePath = line.substring(3);

						// Exclude test files and directories
						const excludePatterns = [
							'/__tests__/',
							'/tests?/',
							'/test/',
							'/__mocks__/',
							'/mocks?/',
							'/__fixtures__/',
							'/fixtures?/',
							'.test.',
							'.spec.',
							'.test-data.',
							'.mock.',
							'.d.ts',
							'/node_modules/',
							'/coverage/',
							'/.nyc_output/',
							// Only exclude frontend dist files, not all dist (we need backend dist for runtime coverage)
							'/frontend/editor-ui/dist/',
							'/build/',
						];

						currentFileIncluded = !excludePatterns.some((pattern) => filePath.includes(pattern));
						if (currentFileIncluded) {
							filteredLines.push(line);
						}
					} else if (currentFileIncluded) {
						filteredLines.push(line);
					}
				}

				const filteredContent = filteredLines.join('\n');

				return filteredContent;
			})
			.filter((content) => content.length > 0)
			.join('\n');

		fs.mkdirSync(COVERAGE_DIR, { recursive: true });
		fs.writeFileSync(finalLcov, lcovContent);

		// Generate HTML report from merged lcov
		console.log('Generating HTML report from merged coverage...');

		try {
			// Try using lcov-result-merger for better HTML generation
			const mergedDir = path.join(COVERAGE_DIR, 'merged');
			fs.mkdirSync(mergedDir, { recursive: true });

			// Use nyc to convert lcov to HTML, running from repo root with correct config
			execSync(
				`npx nyc report --reporter=html --report-dir=${mergedDir} --temp-dir=${path.join(REPO_ROOT, '.nyc_output_temp')}`,
				{
					stdio: 'inherit',
					cwd: REPO_ROOT,
					env: { ...process.env },
				},
			);
		} catch (error) {
			console.log('Primary method failed, creating simple HTML report...');
			// Create a summary HTML report with links to the LCOV data
			const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>n8n Complete Coverage Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .summary { background: #e8f5e8; padding: 20px; margin: 20px 0; border-radius: 6px; border-left: 4px solid #4caf50; }
        .packages { background: #f8f9fa; padding: 15px; margin: 15px 0; border-radius: 6px; }
        .package-list { columns: 3; column-gap: 20px; }
        .package-item { display: inline-block; width: 100%; margin: 5px 0; padding: 3px 0; }
        .success { color: #4caf50; font-weight: bold; }
        .info { color: #2196f3; }
        .note { background: #fff3cd; padding: 15px; border-radius: 6px; border-left: 4px solid #ffc107; margin: 20px 0; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🎯 n8n Complete Coverage Report</h1>
        
        <div class="summary">
            <h2>📊 Coverage Summary</h2>
            <p><strong>Successfully merged coverage from ${lcovFiles.length} sources:</strong></p>
            <ul>
                <li>Playwright Frontend Coverage: <span class="success">${hasUiCoverage ? '✅ Included' : '❌ Not Available'}</span></li>
                <li>Playwright Backend Coverage: <span class="success">${hasBackendCoverage ? '✅ Included' : '❌ Not Available'}</span></li>
                <li>Unit Test Coverage: <span class="success">✅ ${unitTestCoverage.length} packages</span></li>
            </ul>
            <p><strong>📄 LCOV Report:</strong> <a href="../merged-lcov.info" class="info">merged-lcov.info</a> (${Math.round(fs.statSync(finalLcov).size / 1024)} KB)</p>
        </div>

        <div class="packages">
            <h3>📦 Included Packages</h3>
            <div class="package-list">
                ${unitTestCoverage.map((pkg) => `<div class="package-item">• ${pkg.name}</div>`).join('')}
            </div>
        </div>

        <div class="note">
            <h3>🔧 Using the Coverage Data</h3>
            <p>The merged LCOV file can be used with various tools:</p>
            <ul>
                <li><strong>VS Code:</strong> Install "Coverage Gutters" extension and open the LCOV file</li>
                <li><strong>SonarQube:</strong> Import the LCOV file for detailed coverage analysis</li>
                <li><strong>Codecov/Coveralls:</strong> Upload the LCOV file to your coverage service</li>
                <li><strong>genhtml:</strong> Generate HTML with <code>genhtml merged-lcov.info --output-directory html-report</code></li>
            </ul>
        </div>

        <div class="summary">
            <h3>📈 Quick Stats</h3>
            <p>Total coverage data points: ${lcovContent
							.split('\\n')
							.filter((line) => line.startsWith('DA:'))
							.length.toLocaleString()}</p>
            <p>Source files covered: ${lcovContent
							.split('\\n')
							.filter((line) => line.startsWith('SF:'))
							.length.toLocaleString()}</p>
            <p>Generated: ${new Date().toLocaleString()}</p>
        </div>
    </div>
</body>
</html>`;

			const mergedDir = path.join(COVERAGE_DIR, 'merged');
			fs.mkdirSync(mergedDir, { recursive: true });
			fs.writeFileSync(path.join(mergedDir, 'index.html'), htmlContent);
			console.log('  ✅ Created summary HTML report');
		}

		const htmlReportPath = path.join(COVERAGE_DIR, 'merged', 'index.html');
		const lcovReportPath = path.join(COVERAGE_DIR, 'merged-lcov.info');

		console.log(`\n✅ Coverage report generated successfully!`);
		console.log(`📊 HTML Report: ${htmlReportPath}`);
		console.log(`📄 LCOV Report: ${lcovReportPath}`);
		console.log(`🌐 Open: file://${htmlReportPath}`);
		console.log(`\n📈 Coverage includes:`);
		console.log(`   - Playwright frontend: ${hasUiCoverage ? '✅' : '❌'}`);
		console.log(`   - Playwright backend: ${hasBackendCoverage ? '✅' : '❌'}`);
		console.log(`   - Unit test packages: ${unitTestCoverage.length} packages`);
		if (unitTestCoverage.length > 0) {
			unitTestCoverage.forEach((cov) => console.log(`     • ${cov.name}`));
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
