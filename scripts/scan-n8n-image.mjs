#!/usr/bin/env node
/**
 * This script is used to scan the n8n docker image for vulnerabilities.
 * It uses Trivy to scan the image.
 */

import { $, echo, fs, chalk } from 'zx';
import path from 'path';

$.verbose = false;
process.env.FORCE_COLOR = '1';

const scriptDir = path.dirname(new URL(import.meta.url).pathname);
const isInScriptsDir = path.basename(scriptDir) === 'scripts';
const rootDir = isInScriptsDir ? path.join(scriptDir, '..') : scriptDir;

// #region ===== Configuration =====
const config = {
	imageBaseName: process.env.IMAGE_BASE_NAME || 'n8nio/n8n',
	imageTag: process.env.IMAGE_TAG || 'local',
	trivyImage: process.env.TRIVY_IMAGE || 'aquasec/trivy:latest',
	severity: process.env.TRIVY_SEVERITY || 'CRITICAL,HIGH,MEDIUM,LOW',
	outputFormat: process.env.TRIVY_FORMAT || 'table',
	outputFile: process.env.TRIVY_OUTPUT || null,
	scanTimeout: process.env.TRIVY_TIMEOUT || '10m',
	ignoreUnfixed: process.env.TRIVY_IGNORE_UNFIXED === 'true',
	scanners: process.env.TRIVY_SCANNERS || 'vuln',
	quiet: process.env.TRIVY_QUIET === 'true',
	rootDir: rootDir,
};

config.fullImageName = `${config.imageBaseName}:${config.imageTag}`;

const printHeader = (title) =>
	!config.quiet && echo(`\n${chalk.blue.bold(`===== ${title} =====`)}`);

const printSummary = (status, time, message) => {
	if (config.quiet) return;

	echo('\n' + chalk.blue.bold('===== Scan Summary ====='));
	echo(status === 'success' ? chalk.green.bold(message) : chalk.yellow.bold(message));
	echo(chalk[status === 'success' ? 'green' : 'yellow'](`   Scan time: ${time}s`));

	if (config.outputFile) {
		const resolvedPath = path.isAbsolute(config.outputFile)
			? config.outputFile
			: path.join(config.rootDir, config.outputFile);
		echo(chalk[status === 'success' ? 'green' : 'yellow'](`   Report saved to: ${resolvedPath}`));
	}

	echo('\n' + chalk.gray('Scan Configuration:'));
	echo(chalk.gray(`  • Target Image: ${config.fullImageName}`));
	echo(chalk.gray(`  • Severity Levels: ${config.severity}`));
	echo(chalk.gray(`  • Scanners: ${config.scanners}`));
	if (config.ignoreUnfixed) echo(chalk.gray(`  • Ignored unfixed: yes`));
	echo(chalk.blue.bold('========================'));
};

// #endregion ===== Configuration =====

// #region ===== Main Process =====
(async () => {
	printHeader('Trivy Security Scan for n8n Image');

	try {
		await $`command -v docker`;
	} catch {
		echo(chalk.red('Error: Docker is not installed or not in PATH'));
		process.exit(1);
	}

	try {
		await $`docker image inspect ${config.fullImageName} > /dev/null 2>&1`;
	} catch {
		echo(chalk.red(`Error: Docker image '${config.fullImageName}' not found`));
		echo(chalk.yellow('Please run dockerize-n8n.mjs first!'));
		process.exit(1);
	}

	// Pull latest Trivy image silently
	try {
		await $`docker pull ${config.trivyImage} > /dev/null 2>&1`;
	} catch {
		// Silent fallback to cached version
	}

	// Build Trivy command
	const trivyArgs = [
		'run',
		'--rm',
		'-v',
		'/var/run/docker.sock:/var/run/docker.sock',
		config.trivyImage,
		'image',
		'--severity',
		config.severity,
		'--format',
		config.outputFormat,
		'--timeout',
		config.scanTimeout,
		'--scanners',
		config.scanners,
		'--no-progress',
	];

	if (config.ignoreUnfixed) trivyArgs.push('--ignore-unfixed');
	if (config.quiet && config.outputFormat === 'table') trivyArgs.push('--quiet');

	// Handle output file - resolve relative to root directory
	if (config.outputFile) {
		const outputPath = path.isAbsolute(config.outputFile)
			? config.outputFile
			: path.join(config.rootDir, config.outputFile);
		await fs.ensureDir(path.dirname(outputPath));
		trivyArgs.push('--output', '/tmp/trivy-output', '-v', `${outputPath}:/tmp/trivy-output`);
	}

	trivyArgs.push(config.fullImageName);

	// Run the scan
	const startTime = Date.now();

	try {
		const result = await $`docker ${trivyArgs}`;

		// Print Trivy output first
		if (!config.outputFile && result.stdout) {
			echo(result.stdout);
		}

		// Then print our summary
		const scanTime = Math.floor((Date.now() - startTime) / 1000);
		printSummary('success', scanTime, '✅ Security scan completed successfully');

		process.exit(0);
	} catch (error) {
		const scanTime = Math.floor((Date.now() - startTime) / 1000);

		// Trivy returns exit code 1 when vulnerabilities are found
		if (error.exitCode === 1) {
			// Print Trivy output first
			if (!config.outputFile && error.stdout) {
				echo(error.stdout);
			}

			// Then print our summary
			printSummary('warning', scanTime, '⚠️  Vulnerabilities found!');
			process.exit(1);
		} else {
			echo(chalk.red(`❌ Scan failed: ${error.message}`));
			process.exit(error.exitCode || 1);
		}
	}
})();

// #endregion ===== Main Process =====
