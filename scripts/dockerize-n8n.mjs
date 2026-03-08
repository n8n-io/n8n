#!/usr/bin/env node
/**
 * Build n8n and runners Docker images locally
 *
 * This script simulates the CI build process for local testing.
 * Default output: 'n8nio/n8n:local' and 'n8nio/runners:local'
 * Override with IMAGE_BASE_NAME and IMAGE_TAG environment variables.
 *
 * Usage:
 *   node dockerize-n8n.mjs           - Build images only
 *   node dockerize-n8n.mjs --run     - Build and run n8n container with owner creation
 *   node dockerize-n8n.mjs --run-stop - Stop any existing n8n container before running
 *
 * Environment variables for owner creation (when --run is used):
 *   N8N_DATA_VOLUME     - Docker volume name (default: n8n-data)
 *   N8N_CREATE_OWNER    - Set to 'true' to enable owner creation
 *   N8N_OWNER_EMAIL     - Owner email (default: techyactor15@gmail.com)
 *   N8N_OWNER_FIRSTNAME - Owner first name (default: Daniel)
 *   N8N_OWNER_LASTNAME  - Owner last name (default: Goldstein)
 *   N8N_OWNER_HASH      - Pre-hashed bcrypt password (required for owner creation)
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

// Check for --run flag to build and run container
const runMode = process.argv.includes('--run') ? 'run' :
                process.argv.includes('--run-stop') ? 'run-stop' : null;

// Default owner credentials (can be overridden via env vars)
const DEFAULT_OWNER_EMAIL = 'techyactor15@gmail.com';
const DEFAULT_OWNER_FIRSTNAME = 'Daniel';
const DEFAULT_OWNER_LASTNAME = 'Goldstein';
// Default bcrypt hash for password: ExamplePassword123!
const DEFAULT_OWNER_HASH = '$2a$10$jTnfKXZCiUQwQnG3OOYnVOYHthaNHhK3iPcKq6uMJ8MwcYc80iw5K';

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
	// Push directly if image name contains a registry (e.g., ghcr.io/...)
	// This avoids the slow --load step (export/import tarball) when pushing to a registry
	const shouldPush = fullImageName.includes('/') && fullImageName.split('/').length > 2;

	echo(chalk.yellow(`INFO: Building ${name} Docker image using ${containerEngine}...`));
	if (shouldPush) {
		echo(chalk.yellow(`INFO: Registry detected - pushing directly to ${fullImageName}`));
	}

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
			// In CI, push directly to registry to avoid slow --load (export/import tarball).
			// Locally, use --load to make image available in local daemon.
			const outputFlag = shouldPush ? '--push' : '--load';
			const { stdout } = await $`docker buildx build \
				--platform ${platform} \
				--build-arg TARGETPLATFORM=${platform} \
				-t ${fullImageName} \
				-f ${dockerfilePath} \
				--provenance=false \
				${outputFlag} \
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

// #region ===== Container Run Functions =====

/**
 * Stop and remove existing n8n container
 */
async function stopExistingContainer() {
	const containerName = 'n8n-n8n-1';
	try {
		// Check if container exists
		const { stdout } = await $`docker ps -a --filter name=${containerName} --format "{{.Names}}"`;
		if (stdout.trim() === containerName) {
			echo(chalk.yellow(`INFO: Stopping existing container: ${containerName}`));
			await $`docker stop ${containerName}`;
			await $`docker rm ${containerName}`;
			echo(chalk.green(`✅ Removed existing container: ${containerName}`));
		}
	} catch (error) {
		// Container might not exist, which is fine
		echo(chalk.gray(`INFO: No existing container to remove`));
	}
}

/**
 * Run n8n container with optional owner creation
 */
async function runN8nContainer() {
	const containerName = 'n8n-n8n-1';
	const volumeName = process.env.N8N_DATA_VOLUME || 'n8n-data';
	// Default to creating owner if not explicitly set to false
	const createOwner = process.env.N8N_CREATE_OWNER !== 'false';
	
	// Get owner credentials from env vars or defaults
	const ownerEmail = process.env.N8N_OWNER_EMAIL || DEFAULT_OWNER_EMAIL;
	const ownerFirstName = process.env.N8N_OWNER_FIRSTNAME || DEFAULT_OWNER_FIRSTNAME;
	const ownerLastName = process.env.N8N_OWNER_LASTNAME || DEFAULT_OWNER_LASTNAME;
	const ownerHash = process.env.N8N_OWNER_HASH || DEFAULT_OWNER_HASH;

	// Build environment variables for the container as separate arguments
	const envArgs = [
		'-e', `N8N_CREATE_OWNER=${createOwner ? 'true' : 'false'}`,
		'-e', `N8N_OWNER_EMAIL=${ownerEmail}`,
		'-e', `N8N_OWNER_FIRSTNAME=${ownerFirstName}`,
		'-e', `N8N_OWNER_LASTNAME=${ownerLastName}`,
		'-e', `N8N_OWNER_HASH=${ownerHash}`,
		// Add N|Solid telemetry env vars
		'-e', 'NSOLID_APPNAME=n8n',
		'-e', 'NSOLID_TAGS=production,n8n,workflow-automation',
		'-e', 'NSOLID_TRACING_ENABLED=1',
		'-e', 'NSOLID_OTLP=otlp',
		'-e', 'NODE_ENV=production',
	];

	echo(chalk.blue.bold('===== Running n8n Container ====='));
	echo(`INFO: Container name: ${containerName}`);
	echo(`INFO: Volume: ${volumeName}`);
	echo(`INFO: Image: ${config.n8n.fullImageName}`);
	echo(`INFO: Create owner: ${createOwner}`);
	if (createOwner) {
		echo(`INFO: Owner email: ${ownerEmail}`);
	}
	echo(chalk.gray('-'.repeat(47)));

	// Stop existing container if in run-stop mode
	if (runMode === 'run-stop') {
		await stopExistingContainer();
	}

	// Check if volume exists, create if not
	try {
		await $`docker volume inspect ${volumeName}`;
		echo(chalk.gray(`INFO: Volume '${volumeName}' exists`));
	} catch {
		echo(chalk.yellow(`INFO: Creating volume: ${volumeName}`));
		await $`docker volume create ${volumeName}`;
	}

	// Run the container using spawn with array arguments
	try {
		await $`docker run -d --name ${containerName} -p 5678:5678 -v ${volumeName}:/home/node/.n8n ${envArgs} ${config.n8n.fullImageName}`;
		echo(chalk.green(`✅ Container started: ${containerName}`));
		echo(chalk.green(`   n8n UI: http://localhost:5678`));
		
		if (createOwner) {
			echo(chalk.green(`   Owner email: ${ownerEmail}`));
		}
	} catch (error) {
		echo(chalk.red(`ERROR: Failed to start container: ${error.message}`));
		process.exit(1);
	}
}

// #endregion ===== Container Run Functions =====

async function main() {
	// If run mode is requested, handle it after build
	if (runMode) {
		echo(chalk.blue.bold('===== Building n8n Docker Image ====='));
		echo(`INFO: n8n Image: ${config.n8n.fullImageName}`);
		echo(`INFO: Platform: ${platform}`);
		echo(chalk.gray('-'.repeat(47)));

		await checkPrerequisites();

		const n8nBuildTime = await buildDockerImage({
			name: 'n8n',
			dockerfilePath: config.n8n.dockerfilePath,
			fullImageName: config.n8n.fullImageName,
		});

		const n8nImageSize = await getImageSize(config.n8n.fullImageName);

		echo(chalk.green(`✅ n8n image built: ${config.n8n.fullImageName}`));
		echo(`   Size: ${n8nImageSize}`);
		echo(`   Build time: ${n8nBuildTime}`);
		echo('');

		// Now run the container
		await runN8nContainer();
		
		return;
	}

	// Original build-only logic
	echo(chalk.blue.bold('===== Docker Build for n8n & Runners ====='));
	echo(`INFO: n8n Image: ${config.n8n.fullImageName}`);
	echo(`INFO: Runners Image: ${config.runners.fullImageName}`);
	echo(`INFO: Platform: ${platform}`);
	echo(chalk.gray('-'.repeat(47)));

	await checkPrerequisites();

	const n8nBuildTime = await buildDockerImage({
		name: 'n8n',
		dockerfilePath: config.n8n.dockerfilePath,
		fullImageName: config.n8n.fullImageName,
	});

	const runnersBuildTime = await buildDockerImage({
		name: 'runners',
		dockerfilePath: config.runners.dockerfilePath,
		fullImageName: config.runners.fullImageName,
	});

	// Get image details
	const n8nImageSize = await getImageSize(config.n8n.fullImageName);
	const runnersImageSize = await getImageSize(config.runners.fullImageName);

	const imageStats = [
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
	];

	// Write docker build manifest for telemetry collection
	const dockerManifest = {
		buildTime: new Date().toISOString(),
		platform,
		images: imageStats.map(({ imageName, size, buildTime }) => ({
			imageName,
			size,
			buildTime,
		})),
	};
	await fs.writeJson(path.join(config.buildContext, 'docker-build-manifest.json'), dockerManifest, {
		spaces: 2,
	});

	// Display summary
	displaySummary(imageStats);
}

// Run the main function
main().catch((error) => {
	console.error('Error:', error);
	process.exit(1);
});
