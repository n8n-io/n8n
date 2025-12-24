#!/usr/bin/env node
/**
 * Build n8n and runners Docker images locally
 *
 * This script simulates the CI build process for local testing.
 * Default output: 'n8nio/n8n:local' and 'n8nio/runners:local'
 * Override with IMAGE_BASE_NAME and IMAGE_TAG environment variables.
 */

import { $, echo, fs, chalk, os } from 'zx';
import { fileURLToPath } from 'url';
import path from 'path';

// Disable verbose mode for cleaner output
$.verbose = false;
process.env.FORCE_COLOR = '1';

// #region ===== Helper Functions =====

/**
 * Get Docker platform string based on host architecture
 * @returns {string} Platform string (e.g., 'linux/amd64')
 */
function getDockerPlatform() {
	const arch = os.arch();
	const dockerArch = {
		x64: 'amd64',
		arm64: 'arm64',
	}[arch];

	if (!dockerArch) {
		throw new Error(`Unsupported architecture: ${arch}. Only x64 and arm64 are supported.`);
	}

	return `linux/${dockerArch}`;
}

/**
 * Format duration in seconds
 * @param {number} ms - Duration in milliseconds
 * @returns {string} Formatted duration
 */
function formatDuration(ms) {
	return `${Math.floor(ms / 1000)}s`;
}

/**
 * Get Docker image size
 * @param {string} imageName - Full image name with tag
 * @returns {Promise<string>} Image size or 'Unknown'
 */
async function getImageSize(imageName) {
	try {
		const { stdout } = await $`docker images ${imageName} --format "{{.Size}}"`;
		return stdout.trim();
	} catch {
		return 'Unknown';
	}
}

/**
 * Check if a command exists
 * @param {string} command - Command to check
 * @returns {Promise<boolean>} True if command exists
 */
async function commandExists(command) {
	try {
		await $`command -v ${command}`;
		return true;
	} catch {
		return false;
	}
}

const SupportedContainerEngines = /** @type {const} */ (['docker', 'podman']);

/**
 * Detect if the local `docker` CLI is actually Podman via the docker shim.
 * @returns {Promise<boolean>}
 */
async function isDockerPodmanShim() {
	try {
		const { stdout } = await $`docker version`;
		return stdout.toLowerCase().includes('podman');
	} catch {
		return false;
	}
}
/**
 * @returns {Promise<(typeof SupportedContainerEngines[number])>}
 */
async function getContainerEngine() {
	// Allow explicit override via env var
	const override = process.env.CONTAINER_ENGINE?.toLowerCase();
	if (override && /** @type {readonly string[]} */ (SupportedContainerEngines).includes(override)) {
		return /** @type {typeof SupportedContainerEngines[number]} */ (override);
	}

	const hasDocker = await commandExists('docker');
	const hasPodman = await commandExists('podman');

	if (hasDocker) {
		// If docker is actually a Podman shim, use podman path to avoid unsupported flags like --load
		if (hasPodman && (await isDockerPodmanShim())) {
			return 'podman';
		}
		return 'docker';
	}

	if (hasPodman) return 'podman';

	throw new Error('No supported container engine found. Please install Docker or Podman.');
}

// #endregion ===== Helper Functions =====

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isInScriptsDir = path.basename(__dirname) === 'scripts';
const rootDir = isInScriptsDir ? path.join(__dirname, '..') : __dirname;

const config = {
	n8n: {
		dockerfilePath: path.join(rootDir, 'docker/images/n8n/Dockerfile'),
		imageBaseName: process.env.IMAGE_BASE_NAME || 'n8nio/n8n',
		imageTag: process.env.IMAGE_TAG || 'local',
		get fullImageName() {
			return `${this.imageBaseName}:${this.imageTag}`;
		},
	},
	runners: {
		dockerfilePath: path.join(rootDir, 'docker/images/runners/Dockerfile'),
		imageBaseName: process.env.RUNNERS_IMAGE_BASE_NAME || 'n8nio/runners',
		get imageTag() {
			// Runners use the same tag as n8n for consistency
			return config.n8n.imageTag;
		},
		get fullImageName() {
			return `${this.imageBaseName}:${this.imageTag}`;
		},
	},
	buildContext: rootDir,
	compiledAppDir: path.join(rootDir, 'compiled'),
	compiledTaskRunnerDir: path.join(rootDir, 'dist', 'task-runner-javascript'),
};

// #region ===== Main Build Process =====

const platform = getDockerPlatform();

async function main() {
	echo(chalk.blue.bold('===== Docker Build for n8n & Runners ====='));
	echo(`INFO: n8n Image: ${config.n8n.fullImageName}`);
	echo(`INFO: Runners Image: ${config.runners.fullImageName}`);
	echo(`INFO: Platform: ${platform}`);
	echo(chalk.gray('-'.repeat(47)));

	await checkPrerequisites();

	// Build n8n Docker image
	const n8nBuildTime = await buildDockerImage({
		name: 'n8n',
		dockerfilePath: config.n8n.dockerfilePath,
		fullImageName: config.n8n.fullImageName,
	});

	// Build runners Docker image
	const runnersBuildTime = await buildDockerImage({
		name: 'runners',
		dockerfilePath: config.runners.dockerfilePath,
		fullImageName: config.runners.fullImageName,
	});

	// Get image details
	const n8nImageSize = await getImageSize(config.n8n.fullImageName);
	const runnersImageSize = await getImageSize(config.runners.fullImageName);

	// Display summary
	displaySummary([
		{
			imageName: config.n8n.fullImageName,
			platform,
			size: n8nImageSize,
			buildTime: n8nBuildTime,
		},
		{
			imageName: config.runners.fullImageName,
			platform,
			size: runnersImageSize,
			buildTime: runnersBuildTime,
		},
	]);
}

async function checkPrerequisites() {
	if (!(await fs.pathExists(config.compiledAppDir))) {
		echo(chalk.red(`Error: Compiled app directory not found at ${config.compiledAppDir}`));
		echo(chalk.yellow('Please run build-n8n.mjs first!'));
		process.exit(1);
	}

	if (!(await fs.pathExists(config.compiledTaskRunnerDir))) {
		echo(chalk.red(`Error: Task runner directory not found at ${config.compiledTaskRunnerDir}`));
		echo(chalk.yellow('Please run build-n8n.mjs first!'));
		process.exit(1);
	}

	// Ensure at least one supported container engine is available
	if (!(await commandExists('docker')) && !(await commandExists('podman'))) {
		echo(chalk.red('Error: Neither Docker nor Podman is installed or in PATH'));
		process.exit(1);
	}
}

async function buildDockerImage({ name, dockerfilePath, fullImageName }) {
	const startTime = Date.now();
	const containerEngine = await getContainerEngine();
	echo(chalk.yellow(`INFO: Building ${name} Docker image using ${containerEngine}...`));

	try {
		if (containerEngine === 'podman') {
			const { stdout } = await $`podman build \
				--platform ${platform} \
				--build-arg TARGETPLATFORM=${platform} \
				-t ${fullImageName} \
				-f ${dockerfilePath} \
				${config.buildContext}`;
			echo(stdout);
		} else {
			// Use docker buildx build to leverage Blacksmith's layer caching when running in CI.
			// The setup-docker-builder action creates a buildx builder with sticky disk cache.
			const { stdout } = await $`docker buildx build \
				--platform ${platform} \
				--build-arg TARGETPLATFORM=${platform} \
				-t ${fullImageName} \
				-f ${dockerfilePath} \
				--load \
				${config.buildContext}`;
			echo(stdout);
		}

		return formatDuration(Date.now() - startTime);
	} catch (error) {
		echo(chalk.red(`ERROR: ${name} Docker build failed: ${error.stderr || error.message}`));
		process.exit(1);
	}
}

function displaySummary(images) {
	echo('');
	echo(chalk.green.bold('═'.repeat(54)));
	echo(chalk.green.bold('           DOCKER BUILD COMPLETE'));
	echo(chalk.green.bold('═'.repeat(54)));
	for (const { imageName, platform, size, buildTime } of images) {
		echo(chalk.green(`✅ Image built: ${imageName}`));
		echo(`   Platform: ${platform}`);
		echo(`   Size: ${size}`);
		echo(`   Build time: ${buildTime}`);
		echo('');
	}
	echo(chalk.green.bold('═'.repeat(54)));
}

// #endregion ===== Main Build Process =====

main().catch((error) => {
	echo(chalk.red(`Unexpected error: ${error.message}`));
	process.exit(1);
});
