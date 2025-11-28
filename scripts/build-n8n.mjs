#!/usr/bin/env node
/**
 * This script is used to build the n8n application for production.
 * It will:
 * 1. Clean the previous build output
 * 2. Run pnpm install and build
 * 3. Prepare for deployment - clean package.json files
 * 4. Create a pruned production deployment in 'compiled'
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

// #region ===== Configuration =====
const config = {
	compiledAppDir: path.join(rootDir, 'compiled'),
	compiledTaskRunnerDir: path.join(rootDir, 'dist', 'task-runner-javascript'),
	cliDir: path.join(rootDir, 'packages', 'cli'),
	rootDir: rootDir,
};

// Define backend patches to keep during deployment
const PATCHES_TO_KEEP = ['pdfjs-dist', 'pkce-challenge', 'bull'];

// #endregion ===== Configuration =====

// #region ===== Helper Functions =====
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

// #endregion ===== Helper Functions =====

// #region ===== Main Build Process =====
printHeader('n8n Build & Production Preparation');
echo(`INFO: Output Directory: ${config.compiledAppDir}`);
printDivider();

startTimer('total_build');

// 0. Clean Previous Build Output
echo(chalk.yellow(`INFO: Cleaning previous output directory: ${config.compiledAppDir}...`));
await fs.remove(config.compiledAppDir);
echo(
	chalk.yellow(
		`INFO: Cleaning previous task runner output directory: ${config.compiledTaskRunnerDir}...`,
	),
);
await fs.remove(config.compiledTaskRunnerDir);
printDivider();

// 1. Local Application Pre-build
echo(chalk.yellow('INFO: Starting local application pre-build...'));
startTimer('package_build');

echo(chalk.yellow('INFO: Running pnpm install and build...'));
try {
	const installProcess = $`cd ${config.rootDir} && pnpm install --frozen-lockfile`;
	installProcess.pipe(process.stdout);
	await installProcess;

	const buildProcess = $`cd ${config.rootDir} && pnpm build`;
	buildProcess.pipe(process.stdout);
	await buildProcess;

	// Generate third-party licenses for production build
	echo(chalk.yellow('INFO: Generating third-party licenses...'));
	try {
		const licenseProcess = $`cd ${config.rootDir} && node scripts/generate-third-party-licenses.mjs`;
		licenseProcess.pipe(process.stdout);
		await licenseProcess;
		echo(chalk.green('✅ Third-party licenses generated successfully'));
	} catch (error) {
		echo(chalk.yellow('⚠️  Warning: Third-party license generation failed, continuing build...'));
		echo(chalk.red(`ERROR: License generation failed: ${error.message}`));
	}

	echo(chalk.green('✅ pnpm install and build completed'));
} catch (error) {
	console.error(chalk.red('\n🛑 BUILD PROCESS FAILED!'));
	console.error(chalk.red('An error occurred during the build process:'));
	process.exit(1);
}

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
// This is only needed locally, not in CI
if (process.env.CI !== 'true') {
	for (const file of packageJsonFiles) {
		if (file) {
			const fullPath = path.join(config.rootDir, file);
			await fs.copy(fullPath, `${fullPath}.bak`);
		}
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
		echo(
			chalk.gray(
				`Removed FE/dev patches that are not in the list of backend patches to keep: ${PATCHES_TO_KEEP.join(', ')}`,
			),
		);
	} catch (error) {
		echo(chalk.red(`ERROR: Failed to cleanup patches in package.json: ${error.message}`));
		process.exit(1);
	}
}

echo(chalk.yellow(`INFO: Creating pruned production deployment in '${config.compiledAppDir}'...`));
startTimer('package_deploy');

await fs.ensureDir(config.compiledAppDir);

if (excludeTestController) {
	const cliPackagePath = path.join(config.rootDir, 'packages/cli/package.json');
	const content = await fs.readFile(cliPackagePath, 'utf8');
	const packageJson = JSON.parse(content);
	packageJson.files.push('!dist/**/e2e.*');
	await fs.writeFile(cliPackagePath, JSON.stringify(packageJson, null, 2));
	echo(chalk.gray('  - Excluded test controller from packages/cli/package.json'));
}

await $`cd ${config.rootDir} && NODE_ENV=production DOCKER_BUILD=true pnpm --filter=n8n --prod --legacy deploy --no-optional ./compiled`;
await fs.ensureDir(config.compiledTaskRunnerDir);

echo(
	chalk.yellow(
		`INFO: Creating JavaScript task runner deployment in '${config.compiledTaskRunnerDir}'...`,
	),
);

await $`cd ${config.rootDir} && NODE_ENV=production DOCKER_BUILD=true pnpm --filter=@n8n/task-runner --prod --legacy deploy --no-optional ${config.compiledTaskRunnerDir}`;

const packageDeployTime = getElapsedTime('package_deploy');

// Restore package.json files
// This is only needed locally, not in CI
if (process.env.CI !== 'true') {
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

// Calculate output size
const compiledAppOutputSize = (await $`du -sh ${config.compiledAppDir} | cut -f1`).stdout.trim();
const compiledTaskRunnerOutputSize = (
	await $`du -sh ${config.compiledTaskRunnerDir} | cut -f1`
).stdout.trim();

// Generate build manifests
const buildManifest = {
	buildTime: new Date().toISOString(),
	artifactSize: compiledAppOutputSize,
	buildDuration: {
		packageBuild: packageBuildTime,
		packageDeploy: packageDeployTime,
		total: getElapsedTime('total_build'),
	},
};

// Copy third-party licenses if they exist
const licensesSourcePath = path.join(config.cliDir, 'THIRD_PARTY_LICENSES.md');
if (await fs.pathExists(licensesSourcePath)) {
	await fs.copy(licensesSourcePath, path.join(config.compiledAppDir, 'THIRD_PARTY_LICENSES.md'));
}

await fs.writeJson(path.join(config.compiledAppDir, 'build-manifest.json'), buildManifest, {
	spaces: 2,
});

const taskRunnerbuildManifest = {
	buildTime: new Date().toISOString(),
	artifactSize: compiledTaskRunnerOutputSize,
	buildDuration: {
		packageBuild: packageBuildTime,
		packageDeploy: packageDeployTime,
		total: getElapsedTime('total_build'),
	},
};

await fs.writeJson(
	path.join(config.compiledTaskRunnerDir, 'build-manifest.json'),
	taskRunnerbuildManifest,
	{
		spaces: 2,
	},
);

echo(chalk.green(`✅ Package deployment completed in ${formatDuration(packageDeployTime)}`));
echo(`INFO: Size of ${config.compiledAppDir}: ${compiledAppOutputSize}`);
printDivider();

// Calculate total time
const totalBuildTime = getElapsedTime('total_build');

// #endregion ===== Main Build Process =====

// #region ===== Final Output =====
echo('');
echo(chalk.green.bold('================ BUILD SUMMARY ================'));
echo(chalk.green(`✅ n8n built successfully!`));
echo('');
echo(chalk.blue('📦 Build Output:'));
echo(chalk.green('   n8n:'));
echo(`   Directory:      ${path.resolve(config.compiledAppDir)}`);
echo(`   Size:           ${compiledAppOutputSize}`);
echo('');
echo(chalk.green('   task-runner-javascript:'));
echo(`   Directory:      ${path.resolve(config.compiledTaskRunnerDir)}`);
echo(`   Size:           ${compiledTaskRunnerOutputSize}`);
echo('');
echo(chalk.blue('⏱️  Build Times:'));
echo(`   Package Build:  ${formatDuration(packageBuildTime)}`);
echo(`   Package Deploy: ${formatDuration(packageDeployTime)}`);
echo(chalk.gray('   -----------------------------'));
echo(chalk.bold(`   Total Time:     ${formatDuration(totalBuildTime)}`));
echo('');
echo(chalk.blue('📋 Build Manifests:'));
echo(`   ${path.resolve(config.compiledAppDir)}/build-manifest.json`);
echo(`   ${path.resolve(config.compiledTaskRunnerDir)}/build-manifest.json`);
echo(chalk.green.bold('=============================================='));

// #endregion ===== Final Output =====

// Exit with success
process.exit(0);
