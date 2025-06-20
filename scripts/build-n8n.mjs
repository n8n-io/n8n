#!/usr/bin/env node

import { $, echo, fs, chalk, spinner } from 'zx';
import path from 'path';

$.verbose = false;
process.env.FORCE_COLOR = '1';

const scriptDir = path.dirname(new URL(import.meta.url).pathname);
const isInScriptsDir = path.basename(scriptDir) === 'scripts';
const rootDir = isInScriptsDir ? path.join(scriptDir, '..') : scriptDir;

// --- Configuration ---
const config = {
	compiledAppDir: process.env.BUILD_OUTPUT_DIR || path.join(rootDir, 'compiled'),
	rootDir: rootDir,
};

// Define backend patches to keep during deployment
const PATCHES_TO_KEEP = ['pdfjs-dist', 'pkce-challenge', 'bull'];

// --- Helper Functions ---
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
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = seconds % 60;

	if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
	if (minutes > 0) return `${minutes}m ${secs}s`;
	return `${secs}s`;
}

function printHeader(title) {
	echo('');
	echo(chalk.blue.bold(`===== ${title} =====`));
}

function printDivider() {
	echo(chalk.gray('-----------------------------------------------'));
}

// --- Main Build Process ---
printHeader('n8n Build & Production Preparation');
echo(`INFO: Output Directory: ${config.compiledAppDir}`);
printDivider();

startTimer('total_build');

// 0. Clean Previous Build Output
echo(chalk.yellow(`INFO: Cleaning previous output directory: ${config.compiledAppDir}...`));
await fs.remove(config.compiledAppDir);
printDivider();

// 1. Local Application Pre-build
echo(chalk.yellow('INFO: Starting local application pre-build...'));
startTimer('package_build');

await spinner(chalk.cyan('Running pnpm install and build...'), async () => {
	await $`cd ${config.rootDir} && pnpm install --frozen-lockfile`;
	await $`cd ${config.rootDir} && pnpm build`;
});

const packageBuildTime = getElapsedTime('package_build');
echo(chalk.green(`✅ Package build completed in ${formatDuration(packageBuildTime)}`));
printDivider();

// 2. Prepare for deployment - clean package.json files
echo(chalk.yellow('INFO: Performing pre-deploy cleanup on package.json files...'));

// Find and backup package.json files
const packageJsonFiles = await $`cd ${config.rootDir} && find . -name "package.json" \
  -not -path "./node_modules/*" \
  -not -path "*/node_modules/*" \
  -not -path "./compiled/*" \
  -type f`.lines();

// Backup all package.json files
for (const file of packageJsonFiles) {
	if (file) {
		const fullPath = path.join(config.rootDir, file);
		await fs.copy(fullPath, `${fullPath}.bak`);
	}
}
// Run FE trim script
await $`cd ${config.rootDir} && node .github/scripts/trim-fe-packageJson.js`;
echo(chalk.yellow('INFO: Performing selective patch cleanup...'));

const packageJsonPath = path.join(config.rootDir, 'package.json');

if (await fs.pathExists(packageJsonPath)) {
	try {
		// 1. Read the package.json file
		const packageJsonContent = await fs.readFile(packageJsonPath, 'utf8');
		let packageJson = JSON.parse(packageJsonContent);

		// 2. Modify the patchedDependencies directly in JavaScript
		if (packageJson.pnpm && packageJson.pnpm.patchedDependencies) {
			const filteredPatches = {};
			for (const [key, value] of Object.entries(packageJson.pnpm.patchedDependencies)) {
				// Check if the key (patch name) starts with any of the allowed patches
				const shouldKeep = PATCHES_TO_KEEP.some((patchPrefix) => key.startsWith(patchPrefix));
				if (shouldKeep) {
					filteredPatches[key] = value;
				}
			}
			packageJson.pnpm.patchedDependencies = filteredPatches;
		}

		// 3. Write the modified package.json back
		await fs.writeFile(packageJsonPath, JSON.stringify(packageJson, null, 2), 'utf8');

		echo(chalk.green('✅ Kept backend patches: ' + PATCHES_TO_KEEP.join(', ')));
		echo(chalk.gray('   Removed FE/dev patches: element-plus, vue-tsc, @types/*, eslint-plugin'));
	} catch (error) {
		echo(chalk.red(`ERROR: Failed to cleanup patches in package.json: ${error.message}`));
		process.exit(1);
	}
}

echo(chalk.yellow(`INFO: Creating pruned production deployment in '${config.compiledAppDir}'...`));
startTimer('package_deploy');

await fs.ensureDir(config.compiledAppDir);

await $`cd ${config.rootDir} && NODE_ENV=production DOCKER_BUILD=true pnpm --filter=n8n --prod --legacy deploy ./compiled`;

const packageDeployTime = getElapsedTime('package_deploy');

// Restore package.json files
for (const file of packageJsonFiles) {
	if (file) {
		const fullPath = path.join(config.rootDir, file);
		const backupPath = `${fullPath}.bak`;
		if (await fs.pathExists(backupPath)) {
			await fs.move(backupPath, fullPath, { overwrite: true });
		}
	}
}

// Calculate output size
const compiledAppOutputSize = (await $`du -sh ${config.compiledAppDir} | cut -f1`).stdout.trim();

// Generate build manifest
const buildManifest = {
	buildTime: new Date().toISOString(),
	artifactSize: compiledAppOutputSize,
	buildDuration: {
		packageBuild: packageBuildTime,
		packageDeploy: packageDeployTime,
		total: getElapsedTime('total_build'),
	},
};

await fs.writeJson(path.join(config.compiledAppDir, 'build-manifest.json'), buildManifest, {
	spaces: 2,
});

echo(chalk.green(`✅ Package deployment completed in ${formatDuration(packageDeployTime)}`));
echo(`INFO: Size of ${config.compiledAppDir}: ${compiledAppOutputSize}`);
printDivider();

// Calculate total time
const totalBuildTime = getElapsedTime('total_build');

// --- Final Output ---
echo('');
echo(chalk.green.bold('================ BUILD SUMMARY ================'));
echo(chalk.green(`✅ n8n built successfully!`));
echo('');
echo(chalk.blue('📦 Build Output:'));
echo(`   Directory:      ${path.resolve(config.compiledAppDir)}`);
echo(`   Size:           ${compiledAppOutputSize}`);
echo('');
echo(chalk.blue('⏱️  Build Times:'));
echo(`   Package Build:  ${formatDuration(packageBuildTime)}`);
echo(`   Package Deploy: ${formatDuration(packageDeployTime)}`);
echo(chalk.gray('   -----------------------------'));
echo(chalk.bold(`   Total Time:     ${formatDuration(totalBuildTime)}`));
echo('');
echo(chalk.blue('📋 Build Manifest:'));
echo(`   ${path.resolve(config.compiledAppDir)}/build-manifest.json`);
echo(chalk.green.bold('=============================================='));

// Exit with success
process.exit(0);
