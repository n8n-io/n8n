#!/usr/bin/env node
/**
 * Third-Party License Generator for n8n
 *
 * Generates THIRD_PARTY_LICENSES.md by scanning all dependencies using license-checker,
 * extracting license information, and formatting it into a markdown report.
 *
 * Usage: node scripts/generate-third-party-licenses.mjs
 */

import { $, echo, fs, chalk } from 'zx';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

// Disable verbose zx output
$.verbose = false;
const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.join(scriptDir, '..');

const config = {
	tempLicenseFile: 'licenses.json',
	outputFile: 'THIRD_PARTY_LICENSES.md',
	invalidLicenseFiles: ['readme.md', 'readme.txt', 'readme', 'package.json', 'changelog.md', 'history.md'],
	validLicenseFiles: ['license', 'licence', 'copying', 'copyright', 'unlicense'],
	paths: {
		root: rootDir,
		cliRoot: path.join(rootDir, 'packages', 'cli'),
		formatConfig: path.join(scriptDir, 'third-party-license-format.json'),
		tempLicenses: path.join(os.tmpdir(), 'licenses.json'),
		output: path.join(rootDir, 'packages', 'cli', 'THIRD_PARTY_LICENSES.md'),
	},
};

// #region ===== Helper Functions =====


async function generateLicenseData() {
	echo(chalk.yellow('📊 Running license-checker...'));

	try {
		$.cwd = config.paths.root;
		await $`pnpm exec license-checker --json --customPath ${config.paths.formatConfig}`.pipe(
			fs.createWriteStream(config.paths.tempLicenses),
		);

		echo(chalk.green('✅ License data collected'));
		return config.paths.tempLicenses;
	} catch (error) {
		echo(chalk.red('❌ Failed to run license-checker'));
		throw error;
	}
}

async function readLicenseData(filePath) {
	try {
		const data = await fs.readFile(filePath, 'utf-8');
		const parsed = JSON.parse(data);
		echo(chalk.green(`✅ Parsed ${Object.keys(parsed).length} packages`));
		return parsed;
	} catch (error) {
		echo(chalk.red('❌ Failed to parse license data'));
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

	const fileName = path.basename(filePath).toLowerCase();

	// Exclude non-license files
	const isInvalidFile = config.invalidLicenseFiles.some((invalid) => 
		fileName === invalid || fileName.endsWith(invalid)
	);
	if (isInvalidFile) return false;

	// Must contain license-related keywords
	return config.validLicenseFiles.some((valid) => fileName.includes(valid));
}

function getFallbackLicenseText(licenseType, packages = []) {
	const fallbacks = {
		'CC-BY-3.0': 'Creative Commons Attribution 3.0 Unported License\n\nFull license text available at: https://creativecommons.org/licenses/by/3.0/legalcode',
		'LGPL-3.0-or-later': 'GNU Lesser General Public License v3.0 or later\n\nFull license text available at: https://www.gnu.org/licenses/lgpl-3.0.html',
		'PSF': 'Python Software Foundation License\n\nFull license text available at: https://docs.python.org/3/license.html',
		'(MIT OR CC0-1.0)': 'Licensed under MIT OR CC0-1.0\n\nMIT License full text available at: https://opensource.org/licenses/MIT\nCC0 1.0 Universal full text available at: https://creativecommons.org/publicdomain/zero/1.0/legalcode',
		'UNKNOWN': `License information not available for the following packages:\n${packages.map(pkg => `- ${pkg.name} ${pkg.version}`).join('\n')}\n\nPlease check individual package repositories for license details.`,
	};

	// Check for custom licenses that start with "Custom:"
	if (licenseType.startsWith('Custom:')) {
		return `Custom license. See: ${licenseType.replace('Custom: ', '')}`;
	}

	return fallbacks[licenseType] || null;
}

function cleanLicenseText(text) {
	return text
		.replaceAll('\\n', '\n')
		.replaceAll('\\"', '"')
		.replaceAll('\r\n', '\n')
		.trim();
}

function addPackageToGroup(licenseGroups, licenseType, packageInfo) {
	if (!licenseGroups.has(licenseType)) {
		licenseGroups.set(licenseType, []);
	}
	licenseGroups.get(licenseType).push(packageInfo);
}

function processLicenseText(licenseTexts, licenseType, pkg) {
	if (!licenseTexts.has(licenseType)) {
		licenseTexts.set(licenseType, null);
	}
	
	if (!licenseTexts.get(licenseType) && pkg.licenseText?.trim() && isValidLicenseFile(pkg.licenseFile)) {
		licenseTexts.set(licenseType, cleanLicenseText(pkg.licenseText));
	}
}

function applyFallbackLicenseTexts(licenseTexts, licenseGroups) {
	const missingTexts = [];
	const fallbacksUsed = [];
	
	for (const [licenseType, text] of licenseTexts.entries()) {
		if (!text || !text.trim()) {
			const packagesForLicense = licenseGroups.get(licenseType) || [];
			const fallback = getFallbackLicenseText(licenseType, packagesForLicense);
			if (fallback) {
				licenseTexts.set(licenseType, fallback);
				fallbacksUsed.push(licenseType);
			} else {
				missingTexts.push(licenseType);
			}
		}
	}

	return { missingTexts, fallbacksUsed };
}

function logProcessingResults(processedCount, licenseGroupCount, fallbacksUsed, missingTexts) {
	echo(chalk.cyan(`📦 Processed ${processedCount} packages in ${licenseGroupCount} license groups`));
	
	if (fallbacksUsed.length > 0) {
		echo(chalk.blue(`ℹ️  Used fallback texts for: ${fallbacksUsed.join(', ')}`));
	}
	
	if (missingTexts.length > 0) {
		echo(chalk.yellow(`⚠️  Still missing license texts for: ${missingTexts.join(', ')}`));
	} else {
		echo(chalk.green(`✅ All license types have texts`));
	}
}

function processPackages(packages) {
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

		// Group packages by license
		addPackageToGroup(licenseGroups, licenseType, {
			name: packageName,
			version,
			repository: pkg.repository,
			copyright: pkg.copyright,
		});

		// Store license text (use first non-empty occurrence)
		processLicenseText(licenseTexts, licenseType, pkg);
	}

	// Apply fallback license texts for missing ones
	const { missingTexts, fallbacksUsed } = applyFallbackLicenseTexts(licenseTexts, licenseGroups);

	logProcessingResults(processedCount, licenseGroups.size, fallbacksUsed, missingTexts);

	return { licenseGroups, licenseTexts, processedCount };
}

// #endregion ===== Helper Functions =====

// #region ===== Document Generation =====

function createPackageSection(licenseType, packages) {
	const sortedPackages = [...packages].sort((a, b) => a.name.localeCompare(b.name));

	let section = `## ${licenseType}\n\n`;

	for (const pkg of sortedPackages) {
		section += `* ${pkg.name} ${pkg.version}`;
		if (pkg.copyright) {
			section += `, ${pkg.copyright}`;
		}
		section += '\n';
	}

	section += '\n';
	return section;
}

function createLicenseTextSection(licenseType, licenseText) {
	let section = `## ${licenseType} License Text\n\n`;
	
	if (licenseText && licenseText.trim()) {
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
	const { licenseGroups, licenseTexts, processedCount } = processPackages(packages);

	let document = createDocumentHeader();

	const sortedLicenseTypes = [...licenseGroups.keys()].sort();

	// First: Add all package sections
	for (const licenseType of sortedLicenseTypes) {
		const packages = licenseGroups.get(licenseType);
		document += createPackageSection(licenseType, packages);
	}

	// Second: Add license texts section
	document += '# License Texts\n\n';
	
	for (const licenseType of sortedLicenseTypes) {
		const licenseText = licenseTexts.get(licenseType);
		document += createLicenseTextSection(licenseType, licenseText);
	}

	return { content: document, processedCount };
}

// #endregion ===== Document Generation =====

async function generateThirdPartyLicenses() {
	echo(chalk.blue('🚀 Generating third-party licenses for n8n...'));

	try {
		const licensesJsonPath = await generateLicenseData();
		const packages = await readLicenseData(licensesJsonPath);

		echo(chalk.yellow('📝 Building markdown document...'));
		const { content, processedCount } = buildMarkdownDocument(packages);

		await fs.ensureDir(config.paths.cliRoot);
		await fs.writeFile(config.paths.output, content);

		// Clean up temporary file
		await fs.remove(licensesJsonPath);

		echo(chalk.green('\n🎉 License generation completed successfully!'));
		echo(chalk.green(`📄 Output: ${config.paths.output}`));
		echo(chalk.green(`📦 Packages: ${processedCount}`));
	} catch (error) {
		echo(chalk.red(`\n❌ Generation failed: ${error.message}`));
		process.exit(1);
	}
}

generateThirdPartyLicenses();
