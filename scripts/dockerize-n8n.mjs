#!/usr/bin/env node
/**
 * This script is used to build the n8n docker image locally.
 * It simulates how we build for CI and should allow for local testing.
 * By default it outputs the tag 'dev' and the image name 'n8n-local:dev'.
 * It can be overridden by setting the IMAGE_BASE_NAME and IMAGE_TAG environment variables.
 */

import { $, echo, fs, chalk } from 'zx';
import path from 'path';

// Disable verbose mode for cleaner output
$.verbose = false;
process.env.FORCE_COLOR = '1';

// --- Determine script location ---
const scriptDir = path.dirname(new URL(import.meta.url).pathname);
const isInScriptsDir = path.basename(scriptDir) === 'scripts';
const rootDir = isInScriptsDir ? path.join(scriptDir, '..') : scriptDir;

// --- Configuration ---
const config = {
	dockerfilePath: path.join(rootDir, 'docker/images/n8n/Dockerfile'),
	imageBaseName: process.env.IMAGE_BASE_NAME || 'n8n-local',
	imageTag: process.env.IMAGE_TAG || 'dev',
	buildContext: rootDir,
	compiledAppDir: path.join(rootDir, 'compiled'),
};

config.fullImageName = `${config.imageBaseName}:${config.imageTag}`;

// --- Check Prerequisites ---
echo(chalk.blue.bold('===== Docker Build for n8n ====='));
echo(`INFO: Image: ${config.fullImageName}`);
echo(chalk.gray('-----------------------------------------------'));

// Check if compiled directory exists
if (!(await fs.pathExists(config.compiledAppDir))) {
	echo(chalk.red(`Error: Compiled app directory not found at ${config.compiledAppDir}`));
	echo(chalk.yellow('Please run build-n8n.mjs first!'));
	process.exit(1);
}

// Check Docker
try {
	await $`command -v docker`;
} catch {
	echo(chalk.red('Error: Docker is not installed or not in PATH'));
	process.exit(1);
}

// --- Build Docker Image ---
const startTime = Date.now();
echo(chalk.yellow('INFO: Building Docker image...'));

try {
	const buildOutput = await $`docker build \
		-t ${config.fullImageName} \
		-f ${config.dockerfilePath} \
		${config.buildContext}`;

	echo(buildOutput.stdout);
} catch (error) {
	echo(chalk.red(`ERROR: Docker build failed: ${error.stderr || error.message}`));
	process.exit(1);
}

const buildTime = Math.floor((Date.now() - startTime) / 1000);

// Get image size
let imageSize = 'Unknown';
try {
	const sizeOutput = await $`docker images ${config.fullImageName} --format "{{.Size}}"`;
	imageSize = sizeOutput.stdout.trim();
} catch (error) {
	echo(chalk.yellow('Warning: Could not get image size'));
}

// --- Summary ---
echo('');
echo(chalk.green.bold('================ DOCKER BUILD COMPLETE ================'));
echo(chalk.green(`✅ Image built: ${config.fullImageName}`));
echo(`   Size: ${imageSize}`);
echo(`   Build time: ${buildTime}s`);
echo(chalk.green.bold('===================================================='));

// Exit with success
process.exit(0);
