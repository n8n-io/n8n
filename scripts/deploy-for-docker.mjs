#!/usr/bin/env node
/**
 * This script creates production deployments for Docker builds.
 * It assumes pnpm build has already been run (build outputs exist).
 *
 * It will:
 * 1. Prepare for deployment - clean package.json files
 * 2. Create a pruned production deployment in 'compiled'
 * 3. Create a pruned task runner deployment in 'dist/task-runner-javascript'
 *
 * This script is designed to be run as a Turbo task with cached outputs.
 */

import { $, echo, fs, chalk } from 'zx';
import path from 'path';

// Check if running in a CI environment
const isCI = process.env.CI === 'true';

// Check if test controller should be excluded (CI + flag not set)
const excludeTestController =
	process.env.CI === 'true' && process.env.INCLUDE_TEST_CONTROLLER !== 'true';

// Disable verbose output and force color only if not in CI
$.verbose = !isCI;
process.env.FORCE_COLOR = isCI ? '0' : '1';

const scriptDir = path.dirname(new URL(import.meta.url).pathname);
const isInScriptsDir = path.basename(scriptDir) === 'scripts';
const rootDir = isInScriptsDir ? path.join(scriptDir, '..') : scriptDir;

const config = {
	compiledAppDir: path.join(rootDir, 'compiled'),
	compiledTaskRunnerDir: path.join(rootDir, 'dist', 'task-runner-javascript'),
	cliDir: path.join(rootDir, 'packages', 'cli'),
	rootDir: rootDir,
};

// Define backend patches to keep during deployment
const PATCHES_TO_KEEP = ['pdfjs-dist', 'pkce-challenge', 'bull'];

const timers = new Map();

function startTimer(name) {
	timers.set(name, Date.now());
}

function getElapsedTime(name) {
	const start = timers.get(name);
	if (!start) return 0;
	return Math.floor((Date.now() - start) / 1000);
}

function formatDuration(seconds) {
	const minutes = Math.floor(seconds / 60);
	const secs = seconds % 60;
	if (minutes > 0) return `${minutes}m ${secs}s`;
	return `${secs}s`;
}

echo(chalk.blue.bold('===== Docker Deployment Preparation ====='));
echo(`INFO: Output Directory: ${config.compiledAppDir}`);

startTimer('total');

// Clean previous output
echo(chalk.yellow('INFO: Cleaning previous output directories...'));
await fs.remove(config.compiledAppDir);
await fs.remove(config.compiledTaskRunnerDir);

// Prepare package.json files for deployment
echo(chalk.yellow('INFO: Performing pre-deploy cleanup on package.json files...'));

const packageJsonFiles = await $`cd ${config.rootDir} && find . -name "package.json" \
-not -path "./node_modules/*" \
-not -path "*/node_modules/*" \
-not -path "./compiled/*" \
-type f`.lines();

// Backup package.json files (only needed locally, not in CI)
if (!isCI) {
	for (const file of packageJsonFiles) {
		if (file) {
			const fullPath = path.join(config.rootDir, file);
			await fs.copy(fullPath, `${fullPath}.bak`);
		}
	}
}

// Run FE trim script
await $`cd ${config.rootDir} && node .github/scripts/trim-fe-packageJson.js`;

// Clean up patches
const packageJsonPath = path.join(config.rootDir, 'package.json');
if (await fs.pathExists(packageJsonPath)) {
	const packageJsonContent = await fs.readFile(packageJsonPath, 'utf8');
	let packageJson = JSON.parse(packageJsonContent);

	if (packageJson.pnpm && packageJson.pnpm.patchedDependencies) {
		const filteredPatches = {};
		for (const [key, value] of Object.entries(packageJson.pnpm.patchedDependencies)) {
			const shouldKeep = PATCHES_TO_KEEP.some((patchPrefix) => key.startsWith(patchPrefix));
			if (shouldKeep) {
				filteredPatches[key] = value;
			}
		}
		packageJson.pnpm.patchedDependencies = filteredPatches;
	}

	await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');
	echo(chalk.green('✅ Kept backend patches: ' + PATCHES_TO_KEEP.join(', ')));
}

// Exclude test controller if needed
if (excludeTestController) {
	const cliPackagePath = path.join(config.rootDir, 'packages/cli/package.json');
	const content = await fs.readFile(cliPackagePath, 'utf8');
	const packageJson = JSON.parse(content);
	packageJson.files.push('!dist/**/e2e.*');
	await fs.writeFile(cliPackagePath, JSON.stringify(packageJson, null, 2));
	echo(chalk.gray('  - Excluded test controller from packages/cli/package.json'));
}

// Create deployments
echo(chalk.yellow(`INFO: Creating pruned production deployment in '${config.compiledAppDir}'...`));
startTimer('deploy');

await fs.ensureDir(config.compiledAppDir);
await $`cd ${config.rootDir} && NODE_ENV=production DOCKER_BUILD=true pnpm --filter=n8n --prod --legacy deploy --no-optional ./compiled`;

echo(chalk.yellow(`INFO: Creating task runner deployment in '${config.compiledTaskRunnerDir}'...`));
await fs.ensureDir(config.compiledTaskRunnerDir);
await $`cd ${config.rootDir} && NODE_ENV=production DOCKER_BUILD=true pnpm --filter=@n8n/task-runner --prod --legacy deploy --no-optional ${config.compiledTaskRunnerDir}`;

const deployTime = getElapsedTime('deploy');

// Restore package.json files (only needed locally)
if (!isCI) {
	for (const file of packageJsonFiles) {
		if (file) {
			const fullPath = path.join(config.rootDir, file);
			const backupPath = `${fullPath}.bak`;
			if (await fs.pathExists(backupPath)) {
				await fs.move(backupPath, fullPath, { overwrite: true });
			}
		}
	}
}

// Calculate output sizes
const compiledAppOutputSize = (await $`du -sh ${config.compiledAppDir} | cut -f1`).stdout.trim();
const compiledTaskRunnerOutputSize = (
	await $`du -sh ${config.compiledTaskRunnerDir} | cut -f1`
).stdout.trim();

const totalTime = getElapsedTime('total');

echo('');
echo(chalk.green.bold('===== DEPLOY SUMMARY ====='));
echo(chalk.green(`✅ Docker deployments created successfully!`));
echo('');
echo(chalk.blue('📦 Output:'));
echo(`   n8n:          ${compiledAppOutputSize} -> ${config.compiledAppDir}`);
echo(`   task-runner:  ${compiledTaskRunnerOutputSize} -> ${config.compiledTaskRunnerDir}`);
echo('');
echo(chalk.blue(`⏱️  Deploy Time: ${formatDuration(deployTime)}`));
echo(chalk.bold(`   Total Time:   ${formatDuration(totalTime)}`));
echo(chalk.green.bold('=========================='));

process.exit(0);
