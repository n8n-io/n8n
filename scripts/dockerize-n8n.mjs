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
 * Get Docker platform string based on host architecture or environment override
 * @returns {string} Platform string (e.g., 'linux/amd64')
 */
function getDockerPlatform() {
	// Allow environment variable override for cross-platform builds
	if (process.env.DOCKER_PLATFORM) {
		return process.env.DOCKER_PLATFORM;
	}

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
 * Get the driver of the currently selected buildx builder ('docker', 'docker-container', etc).
 * Colima defaults to the 'docker' driver, which doesn't support buildkit-container flags
 * like `--load` or `--provenance=false`.
 * @returns {Promise<string|null>}
 */
async function getBuildxDriver() {
	try {
		const { stdout } = await $`docker buildx inspect`;
		const match = stdout.match(/Driver:\s+(\S+)/);
		return match ? match[1] : null;
	} catch {
		return null;
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

const noCache = process.env.DOCKER_BUILD_NO_CACHE === 'true';
const withBaseImage = process.env.DOCKER_BUILD_BASE_IMAGE === 'true';
const nodeVersion = process.env.NODE_VERSION || '24.16.0';

const config = {
	base: {
		dockerfilePath: path.join(rootDir, 'docker/images/n8n-base/Dockerfile'),
		get fullImageName() {
			return `n8nio/base:${nodeVersion}`;
		},
	},
	n8n: {
		// In-image build (DEVP-262): compiles n8n inside the musl builder, so the
		// glibc→musl native-addon rebuild (sqlite3, isolated-vm) disappears. Reads a
		// Turbo *remote* cache when the caller exports TURBO_API (CI: the rharkor
		// server; local: scripts/turbo-cache.mjs), else builds cold.
		dockerfilePath: path.join(rootDir, 'docker/images/n8n/Dockerfile.inbuild'),
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

// In-image n8n build reads a Turbo remote cache when the caller exports
// TURBO_API. The musl team slug keeps its artefacts separate from the host
// glibc build's cache. Absent TURBO_API, the build runs cold.
const turboApi = process.env.TURBO_API;
const turboTeam = process.env.TURBO_TEAM_MUSL ?? 'n8n-musl';

async function main() {
	echo(chalk.blue.bold('===== Docker Build for n8n & Runners ====='));
	echo(`INFO: n8n Image: ${config.n8n.fullImageName}`);
	echo(`INFO: Runners Image: ${config.runners.fullImageName}`);
	echo(`INFO: Platform: ${platform}`);
	if (noCache) echo(chalk.yellow('INFO: Docker layer cache disabled (DOCKER_BUILD_NO_CACHE=true)'));
	if (withBaseImage) echo(chalk.yellow('INFO: Building base image first (DOCKER_BUILD_BASE_IMAGE=true)'));
	echo(chalk.gray('-'.repeat(47)));

	await checkPrerequisites();

	if (withBaseImage) {
		await buildDockerImage({
			name: 'base',
			dockerfilePath: config.base.dockerfilePath,
			fullImageName: config.base.fullImageName,
			buildArgs: [`NODE_VERSION=${nodeVersion}`],
		});
	}

	const nodeVersionArgs = withBaseImage ? [`NODE_VERSION=${nodeVersion}`] : [];

	const n8nBuildArgs = [...nodeVersionArgs];
	if (turboApi) n8nBuildArgs.push(`TURBO_API=${turboApi}`, `TURBO_TEAM=${turboTeam}`);
	// The in-image build runs build-n8n.mjs itself, so build env the host build
	// received must cross the boundary as a build arg (the D1 COPY path got the
	// host's already-built compiled/ for free). INCLUDE_TEST_CONTROLLER keeps the
	// e2e controller in CI test images; BUILD_WITH_COVERAGE instruments the build
	// (it's in turbo's globalEnv, so it also keys the cache).
	for (const name of ['INCLUDE_TEST_CONTROLLER', 'BUILD_WITH_COVERAGE']) {
		if (process.env[name]) n8nBuildArgs.push(`${name}=${process.env[name]}`);
	}

	const n8nBuildTime = await buildDockerImage({
		name: 'n8n',
		dockerfilePath: config.n8n.dockerfilePath,
		fullImageName: config.n8n.fullImageName,
		buildArgs: n8nBuildArgs,
		useTurboCache: true,
	});

	const runnersBuildTime = await buildDockerImage({
		name: 'runners',
		dockerfilePath: config.runners.dockerfilePath,
		fullImageName: config.runners.fullImageName,
		buildArgs: nodeVersionArgs,
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

async function buildDockerImage({
	name,
	dockerfilePath,
	fullImageName,
	buildArgs = [],
	useTurboCache = false,
}) {
	const startTime = Date.now();
	const containerEngine = await getContainerEngine();
	// Push directly if image name contains a registry (e.g., ghcr.io/...)
	// This avoids the slow --load step (export/import tarball) when pushing to a registry
	const shouldPush = fullImageName.includes('/') && fullImageName.split('/').length > 2;

	const extraFlags = [
		...buildArgs.flatMap((arg) => ['--build-arg', arg]),
		...(noCache ? ['--no-cache'] : []),
	];

	// In-image Turbo cache (buildx only): mount the token as a secret (never a
	// layer) and give the build network access to the cache server. localhost ⇒
	// the CI server on the runner (needs the host-network entitlement);
	// otherwise host.docker.internal ⇒ the local turbo-cache.mjs server.
	const turboFlags = [];
	if (useTurboCache && turboApi) {
		if (process.env.TURBO_TOKEN) turboFlags.push('--secret', 'id=TURBO_TOKEN,env=TURBO_TOKEN');
		turboFlags.push(
			...(turboApi.includes('localhost')
				? ['--network=host', '--allow', 'network.host']
				: ['--add-host=host.docker.internal:host-gateway']),
		);
	}

	echo(chalk.yellow(`INFO: Building ${name} Docker image using ${containerEngine}...`));
	if (shouldPush) {
		echo(chalk.yellow(`INFO: Registry detected - pushing directly to ${fullImageName}`));
	}

	const buildxDriver = containerEngine === 'docker' ? await getBuildxDriver() : null;
	const useLegacyDockerBuild = containerEngine === 'docker' && buildxDriver === 'docker';

	try {
		if (containerEngine === 'podman') {
			const { stdout } = await $`podman build \
				--platform ${platform} \
				--build-arg TARGETPLATFORM=${platform} \
				${extraFlags} \
				-t ${fullImageName} \
				-f ${dockerfilePath} \
				${config.buildContext}`;
			echo(stdout);
		} else if (useLegacyDockerBuild) {
			// Buildx 'docker' driver (colima default) doesn't support `--load` or
			// `--provenance=false`. Use plain `docker build` instead.
			const { stdout } = await $`docker build \
				--platform ${platform} \
				--build-arg TARGETPLATFORM=${platform} \
				${extraFlags} \
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
				${extraFlags} \
				${turboFlags} \
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

main().catch((error) => {
	echo(chalk.red(`Unexpected error: ${error.message}`));
	process.exit(1);
});
