#!/usr/bin/env node
/**
 * Third-Party License Generator for n8n
 *
 * Generates THIRD_PARTY_LICENSES.md by scanning all dependencies using license-checker,
 * extracting license information, and formatting it into a markdown report.
 *
 * Usage: node scripts/generate-third-party-licenses.mjs
 */

import { $, echo, fs, chalk, path } from 'zx';
import { fileURLToPath } from 'url';

// Configuration
const CONFIG = {
	TEMP_LICENSE_FILE: 'licenses.json',
	OUTPUT_FILE: 'THIRD_PARTY_LICENSES.md',
	INVALID_LICENSE_FILES: ['readme.md', 'readme.txt', 'readme', 'package.json'],
	VALID_LICENSE_FILES: ['license', 'licence', 'copying', 'copyright'],
};

const PATHS = (() => {
	const __filename = fileURLToPath(import.meta.url);
	const __dirname = path.dirname(__filename);
	const rootDir = path.join(__dirname, '..');

	return {
		root: rootDir,
		cliDist: path.join(rootDir, 'packages', 'cli', 'dist'),
		formatConfig: path.join(__dirname, 'third-party-license-format.json'),
		tempLicenses: path.join(rootDir, CONFIG.TEMP_LICENSE_FILE),
		output: path.join(rootDir, 'packages', 'cli', 'dist', CONFIG.OUTPUT_FILE),
	};
})();

// Disable verbose zx output
$.verbose = false;

/**
 * Validates that license-checker is available
 */
async function validateLicenseChecker() {
	try {
		await $`pnpm exec license-checker --version`.nothrow();
		echo(chalk.green('✓ license-checker is available'));
	} catch (error) {
		echo(chalk.red('✗ license-checker not found. Run: pnpm install'));
		process.exit(1);
	}
}

async function generateLicenseData() {
	echo(chalk.yellow('📊 Running license-checker...'));

	try {
		$.cwd = PATHS.root;
		await $`pnpm exec license-checker --json --customPath ${PATHS.formatConfig}`.pipe(
			fs.createWriteStream(PATHS.tempLicenses),
		);

		echo(chalk.green('✓ License data collected'));
		return PATHS.tempLicenses;
	} catch (error) {
		echo(chalk.red('✗ Failed to run license-checker'));
		throw error;
	}
}

async function readLicenseData(filePath) {
	try {
		const data = await fs.readFile(filePath, 'utf-8');
		const parsed = JSON.parse(data);
		echo(chalk.green(`✓ Parsed ${Object.keys(parsed).length} packages`));
		return parsed;
	} catch (error) {
		echo(chalk.red('✗ Failed to parse license data'));
		throw error;
	}
}

function parsePackageKey(packageKey) {
	const lastAtIndex = packageKey.lastIndexOf('@');
	return {
		packageName: packageKey.substring(0, lastAtIndex),
		version: packageKey.substring(lastAtIndex + 1),
	};
}

function shouldExcludePackage(packageName) {
	const n8nPatterns = [
		/^@n8n\//,      // @n8n/package
		/^@n8n_/,       // @n8n_io/package  
		/^n8n-/,        // n8n-package
		/-n8n/          // package-n8n
	];
	
	return n8nPatterns.some(pattern => pattern.test(packageName));
}

function isValidLicenseFile(filePath) {
	if (!filePath) return false;

	const fileName = filePath.toLowerCase();

	// Exclude non-license files
	const isInvalidFile = CONFIG.INVALID_LICENSE_FILES.some((invalid) => fileName.endsWith(invalid));

	if (isInvalidFile) return false;

	// Must contain license-related keywords
	return CONFIG.VALID_LICENSE_FILES.some((valid) => fileName.includes(valid));
}

function processLicenseText(licenseText, licenseFilePath, licenseType) {
	if (licenseText?.trim() && isValidLicenseFile(licenseFilePath)) {
		return licenseText.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\r\n/g, '\n').trim();
	}

	if (licenseType && licenseType !== 'Unknown' && licenseType.trim()) {
		return `Licensed under ${licenseType}`;
	}

	return 'License text not available.';
}

function groupPackagesByLicense(packages) {
	const licenseGroups = new Map();
	const licenseTexts = new Map();
	let processedCount = 0;

	for (const [packageKey, pkg] of Object.entries(packages)) {
		const { packageName, version } = parsePackageKey(packageKey);

		if (shouldExcludePackage(packageName)) {
			continue;
		}

		const licenseType = pkg.licenses || 'Unknown';
		processedCount++;

		if (!licenseGroups.has(licenseType)) {
			licenseGroups.set(licenseType, []);
		}

		licenseGroups.get(licenseType).push({
			name: packageName,
			version,
			repository: pkg.repository,
			copyright: pkg.copyright,
		});

		if (!licenseTexts.has(licenseType)) {
			const text = processLicenseText(pkg.licenseText, pkg.licenseFile, licenseType);
			licenseTexts.set(licenseType, text);
		}
	}

	echo(
		chalk.cyan(`📦 Processed ${processedCount} packages in ${licenseGroups.size} license groups`),
	);
	return { licenseGroups, licenseTexts, processedCount };
}

function createLicenseSection(licenseType, packages, licenseText) {
	const sortedPackages = [...packages].sort((a, b) => a.name.localeCompare(b.name));

	let section = `## ${licenseType}\n\n`;
	section += `The following components are licensed under ${licenseType}:\n\n`;

	for (const pkg of sortedPackages) {
		section += `* ${pkg.name} ${pkg.version}`;
		if (pkg.copyright) {
			section += `, ${pkg.copyright}`;
		}
		section += '\n';
	}

	section += '\n';

	if (licenseText && licenseText !== 'License text not available.') {
		section += `\`\`\`\n${licenseText}\n\`\`\`\n\n`;
	} else {
		section += `${licenseType} license text not available.\n\n`;
	}

	return section;
}

function createDocumentHeader() {
	return `# Third-Party Licenses

This file lists third-party software components included in n8n and their respective license terms.

The n8n software includes open source packages, libraries, and modules, each of which is subject to its own license. The following sections list those dependencies and provide required attributions and license texts.

`;
}

function buildMarkdownDocument(packages) {
	echo(chalk.yellow('📝 Building markdown document...'));

	const { licenseGroups, licenseTexts, processedCount } = groupPackagesByLicense(packages);

	let document = createDocumentHeader();

	const sortedLicenseTypes = [...licenseGroups.keys()].sort();

	for (const licenseType of sortedLicenseTypes) {
		const packages = licenseGroups.get(licenseType);
		const licenseText = licenseTexts.get(licenseType);
		document += createLicenseSection(licenseType, packages, licenseText);
	}

	return { content: document, processedCount };
}

async function generateThirdPartyLicenses() {
	echo(chalk.blue('🚀 Generating third-party licenses for n8n...'));

	try {
		await validateLicenseChecker();

		const licensesJsonPath = await generateLicenseData();
		const packages = await readLicenseData(licensesJsonPath);

		const { content, processedCount } = buildMarkdownDocument(packages);

		await fs.ensureDir(PATHS.cliDist);
		await fs.writeFile(PATHS.output, content);

		await fs.remove(licensesJsonPath);

		echo(chalk.green('\n🎉 License generation completed successfully!'));
		echo(chalk.green(`📄 Output: ${PATHS.output}`));
		echo(chalk.green(`📦 Packages: ${processedCount}`));
	} catch (error) {
		echo(chalk.red(`\n💥 Generation failed: ${error.message}`));
		process.exit(1);
	}
}

generateThirdPartyLicenses();
