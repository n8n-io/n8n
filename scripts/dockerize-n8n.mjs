#!/usr/bin/env node
/**
 * Build the n8n and runners Docker images.
 *
 * Targets, tags and build args live in docker/docker-bake.hcl. CI drives the
 * same file. This script selects the targets, sets the output, and records the
 * image sizes for the metrics pipeline.
 *
 * Default output: 'n8nio/n8n:local' and 'n8nio/runners:local'.
 *
 * Environment:
 *   IMAGE_BASE_NAME, IMAGE_TAG, RUNNERS_IMAGE_BASE_NAME - image naming
 *   NODE_VERSION, BUILDER_IMAGE, RUNTIME_IMAGE          - read by bake directly
 *   DOCKER_PLATFORM                                     - cross-platform builds
 *   DOCKER_BUILD_NO_CACHE, DOCKER_BUILD_BASE_IMAGE, DOCKER_BUILD_DISTROLESS
 *   DOCKER_BUILD_TARBALL_DIR - write per-target docker-archives here instead of
 *                              loading into the daemon (CI image distribution)
 *   CONTAINER_ENGINE                                    - force 'docker' or 'podman'
 */

import { $, echo, fs, chalk, os } from 'zx';
import { fileURLToPath } from 'url';
import path from 'path';

$.verbose = false;
process.env.FORCE_COLOR = '1';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.basename(__dirname) === 'scripts' ? path.join(__dirname, '..') : __dirname;

const BAKE_FILE = path.join(rootDir, 'docker/docker-bake.hcl');

const noCache = process.env.DOCKER_BUILD_NO_CACHE === 'true';
const withBaseImage = process.env.DOCKER_BUILD_BASE_IMAGE === 'true';
// Opt-in: only cloud deploys the distroless runners image, so local builds skip it.
const withDistroless = process.env.DOCKER_BUILD_DISTROLESS === 'true';
// Build n8n on the pointer-compressed bases. The pins live in the bake file.
const pointerCompressed = process.env.DOCKER_BUILD_PC === 'true';

const imageBaseName = process.env.IMAGE_BASE_NAME || 'n8nio/n8n';
const runnersImageBaseName = process.env.RUNNERS_IMAGE_BASE_NAME || 'n8nio/runners';
const imageTag = process.env.IMAGE_TAG || 'local';

// Push directly when the name has a registry host. This avoids the slow
// --load export and import.
const hasRegistryHost = (name) => name.split('/').length > 2;
const shouldPush = hasRegistryHost(imageBaseName);
// CI needs a tarball, not images in the daemon. BuildKit writes it directly.
// This removes the dockerd import and the `docker save` that follows it.
const tarballDir = process.env.DOCKER_BUILD_TARBALL_DIR;

const compiledAppDir = path.join(rootDir, 'compiled');
const compiledTaskRunnerDir = path.join(rootDir, 'dist', 'task-runner-javascript');

/**
 * Which bake targets to build. n8n and runners are always built; the base image
 * and the distroless runners are opt-in.
 * @returns {string[]}
 */
function selectTargets() {
	// The pc target only differs by its base images, so it keeps the plain name -
	// downstream jobs load `n8nio/n8n:local` either way.
	const targets = [pointerCompressed ? 'n8n-pc' : 'n8n', 'runners'];
	if (withDistroless) targets.push('runners-distroless');
	if (withBaseImage) targets.unshift('base');
	return targets;
}

/** @returns {Promise<boolean>} */
async function commandExists(command) {
	try {
		await $`command -v ${command}`;
		return true;
	} catch {
		return false;
	}
}

/** @returns {Promise<boolean>} */
async function hasBake() {
	try {
		await $`docker buildx bake --help`;
		return true;
	} catch {
		return false;
	}
}

/**
 * Buildx driver of the selected builder. Colima defaults to the 'docker'
 * driver, which rejects `--load` and `--provenance=false`.
 * @returns {Promise<string|null>}
 */
async function buildxDriver() {
	try {
		const { stdout } = await $`docker buildx inspect`;
		return stdout.match(/Driver:\s+(\S+)/)?.[1] ?? null;
	} catch {
		return null;
	}
}

/** @returns {string} */
function hostPlatform() {
	if (process.env.DOCKER_PLATFORM) return process.env.DOCKER_PLATFORM;
	const dockerArch = { x64: 'amd64', arm64: 'arm64' }[os.arch()];
	if (!dockerArch) {
		throw new Error(`Unsupported architecture: ${os.arch()}. Only x64 and arm64 are supported.`);
	}
	return `linux/${dockerArch}`;
}

/** Resolved bake plan, so tags and platform are read back rather than re-derived. */
async function bakePlan(targets) {
	const { stdout } = await $`docker buildx bake -f ${BAKE_FILE} ${targets} --print`;
	return JSON.parse(stdout);
}

/** @returns {Promise<string>} */
async function getImageSize(imageName) {
	try {
		const { stdout } = await $`docker images ${imageName} --format {{.Size}}`;
		return stdout.trim() || 'Unknown';
	} catch {
		return 'Unknown';
	}
}

async function checkPrerequisites() {
	if (!(await fs.pathExists(compiledAppDir))) {
		echo(chalk.red(`Error: Compiled app directory not found at ${compiledAppDir}`));
		echo(chalk.yellow('Please run build-n8n.mjs first!'));
		process.exit(1);
	}

	if (!(await fs.pathExists(compiledTaskRunnerDir))) {
		echo(chalk.red(`Error: Task runner directory not found at ${compiledTaskRunnerDir}`));
		echo(chalk.yellow('Please run build-n8n.mjs first!'));
		process.exit(1);
	}
}

async function buildWithBake(targets) {
	const driver = await buildxDriver();
	const isContainerDriver = driver !== 'docker';

	const tarballOutputs = targets.flatMap((t) => [
		'--set',
		`${t}.output=type=docker,dest=${path.join(tarballDir ?? '', `${t}.tar`)},compression=zstd,compression-level=3`,
	]);

	if (tarballDir && !isContainerDriver) {
		throw new Error(
			"DOCKER_BUILD_TARBALL_DIR needs a container-driver builder. The 'docker' driver builds " +
				'into the daemon and cannot write an archive.',
		);
	}

	const flags = [
		...(noCache ? ['--no-cache'] : []),
		// The 'docker' driver builds into the daemon and rejects both flags.
		...(isContainerDriver
			? [
					'--provenance=false',
					...(tarballDir ? tarballOutputs : [shouldPush ? '--push' : '--load']),
				]
			: []),
	];

	echo(chalk.yellow(`INFO: Building ${targets.join(', ')} with docker buildx bake...`));
	if (tarballDir) echo(chalk.yellow(`INFO: Writing image tarballs to ${tarballDir}`));
	if (shouldPush) echo(chalk.yellow(`INFO: Registry detected - pushing directly`));

	await $({ verbose: true })`docker buildx bake -f ${BAKE_FILE} ${targets} ${flags}`;
}

/**
 * Podman has no bake. A podman-only host also has no buildx to resolve the bake
 * plan, so this list repeats the targets. It sends no build args, because this
 * path has always used the Dockerfile defaults.
 */
async function buildWithPodman(platform) {
	const podmanTargets = [
		{ dockerfile: 'docker/images/n8n/Dockerfile', tag: `${imageBaseName}:${imageTag}` },
		{
			dockerfile: 'docker/images/runners/Dockerfile',
			tag: `${runnersImageBaseName}:${imageTag}`,
		},
	];
	if (withDistroless) {
		podmanTargets.push({
			dockerfile: 'docker/images/runners/Dockerfile.distroless',
			tag: `${runnersImageBaseName}:${imageTag}-distroless`,
		});
	}

	echo(chalk.yellow('INFO: docker buildx bake unavailable - building with podman...'));

	for (const { dockerfile, tag } of podmanTargets) {
		await $({
			verbose: true,
		})`podman build --platform ${platform} --build-arg TARGETPLATFORM=${platform} ${noCache ? ['--no-cache'] : []} -t ${tag} -f ${path.join(rootDir, dockerfile)} ${rootDir}`;
	}

	return podmanTargets.map(({ tag }) => tag);
}

async function main() {
	echo(chalk.blue.bold('===== Docker Build for n8n & Runners ====='));

	await checkPrerequisites();

	const engineOverride = process.env.CONTAINER_ENGINE?.toLowerCase();
	const usePodman =
		engineOverride === 'podman' || (engineOverride !== 'docker' && !(await hasBake()));

	if (usePodman && !(await commandExists('podman'))) {
		echo(chalk.red('Error: neither `docker buildx bake` nor `podman` is available'));
		process.exit(1);
	}

	// The podman list is fixed, so it cannot honour these. Fail instead of
	// building something different from what was asked for.
	if (usePodman) {
		const unsupported = [
			withBaseImage && 'DOCKER_BUILD_BASE_IMAGE',
			pointerCompressed && 'DOCKER_BUILD_PC',
			tarballDir && 'DOCKER_BUILD_TARBALL_DIR',
		].filter(Boolean);
		if (unsupported.length > 0) {
			echo(chalk.red(`Error: the podman path does not support ${unsupported.join(', ')}`));
			process.exit(1);
		}
	}

	// --push applies to every target in the bake call. If only the n8n name
	// carries a registry, the runners target would push to its Docker Hub
	// default instead - a 401 at best, a tag in the official repo at worst.
	if (shouldPush && !hasRegistryHost(runnersImageBaseName)) {
		echo(
			chalk.red(
				`Error: IMAGE_BASE_NAME (${imageBaseName}) has a registry host but ` +
					`RUNNERS_IMAGE_BASE_NAME (${runnersImageBaseName}) does not. ` +
					'Set both, or neither.',
			),
		);
		process.exit(1);
	}

	const targets = selectTargets();
	const startTime = Date.now();
	let platform;
	let imageNames;

	if (tarballDir) await fs.ensureDir(tarballDir);

	if (usePodman) {
		platform = hostPlatform();
		imageNames = await buildWithPodman(platform);
	} else {
		if (process.env.DOCKER_PLATFORM) process.env.PLATFORMS = process.env.DOCKER_PLATFORM;
		if (pointerCompressed) process.env.N8N_PC_TAGS = `${imageBaseName}:${imageTag}`;
		const plan = await bakePlan(targets);
		platform = plan.target[targets[0]].platforms.join(',');
		imageNames = targets.map((name) => plan.target[name].tags[0]);
		await buildWithBake(targets);
	}

	const buildDurationMs = Date.now() - startTime;

	const images = [];
	for (const imageName of imageNames) {
		// Tarball mode loads nothing into the daemon, so there is no size to read.
		// The archive size would change the meaning of the docker-image-size metric.
		images.push({ imageName, size: tarballDir ? 'Unknown' : await getImageSize(imageName) });
	}

	await fs.writeJson(
		path.join(rootDir, 'docker-build-manifest.json'),
		{ buildTime: new Date().toISOString(), platform, buildDurationMs, images },
		{ spaces: 2 },
	);

	echo('');
	echo(chalk.green.bold('═'.repeat(54)));
	echo(chalk.green.bold('           DOCKER BUILD COMPLETE'));
	echo(chalk.green.bold('═'.repeat(54)));
	echo(`   Platform:   ${platform}`);
	echo(`   Build time: ${Math.floor(buildDurationMs / 1000)}s`);
	for (const { imageName, size } of images) {
		echo(chalk.green(`✅ ${imageName} (${size})`));
	}
	echo(chalk.green.bold('═'.repeat(54)));
}

main().catch((error) => {
	echo(chalk.red(`ERROR: Docker build failed: ${error.stderr || error.message}`));
	process.exit(1);
});
