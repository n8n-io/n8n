#!/usr/bin/env node
import { $, fs, echo, chalk } from 'zx';
import path from 'path';

$.verbose = false;
process.env.FORCE_COLOR = '1';

const ROOT_DIR = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const env = process.env;

const NODE_VERSION = env.NODE_VERSION || '22.21';
const PYTHON_VERSION = env.PYTHON_VERSION || '3.13';
const IMAGE_TAG = env.IMAGE_TAG || 'local';
const IMAGE_BASE_NAME = env.IMAGE_BASE_NAME || 'n8nio/n8n';
const VUE_APP_URL_BASE_API = env.VUE_APP_URL_BASE_API || 'http://localhost:5678/';
const CONTAINER_ENGINE = (env.CONTAINER_ENGINE || 'docker').toLowerCase();

const BUILD_EDITOR = (env.BUILD_EDITOR ?? 'true') === 'true';
const BUILD_RUNNERS = (env.BUILD_RUNNERS ?? 'true') === 'true';
const BUILD_BASE = (env.BUILD_BASE ?? 'true') === 'true';
const BUILD_N8N = (env.BUILD_N8N ?? 'true') === 'true';

const cmdExists = async (cmd) => {
	try {
		await $`command -v ${cmd}`;
		return true;
	} catch {
		return false;
	}
};

async function run() {
	echo(chalk.blue.bold('=== build-all-images (node) ==='));
	echo(`ROOT_DIR: ${ROOT_DIR}`);
	echo(`NODE_VERSION: ${NODE_VERSION}`);
	echo(`PYTHON_VERSION: ${PYTHON_VERSION}`);
	echo(`IMAGE_TAG: ${IMAGE_TAG}`);
	echo(`IMAGE_BASE_NAME: ${IMAGE_BASE_NAME}`);
	echo(`VUE_APP_URL_BASE_API: ${VUE_APP_URL_BASE_API}`);
	echo(`CONTAINER_ENGINE: ${CONTAINER_ENGINE}`);

	if (!(await cmdExists(CONTAINER_ENGINE))) {
		echo(chalk.red(`Error: container engine '${CONTAINER_ENGINE}' not found in PATH`));
		process.exit(1);
	}

	// 1) Build n8n-base
	if (BUILD_BASE) {
		echo(chalk.yellow('\n=== 1/4: Building n8n-base image ==='));
		await $`${CONTAINER_ENGINE} build -f docker/images/n8n-base/Dockerfile --build-arg NODE_VERSION=${NODE_VERSION} -t n8nio/base:${NODE_VERSION} .`;
	}

	// 2) Build runners
	if (BUILD_RUNNERS) {
		echo(chalk.yellow('\n=== 2/4: Building runners image ==='));
		await $`${CONTAINER_ENGINE} build -f docker/images/runners/Dockerfile --build-arg NODE_VERSION=${NODE_VERSION} --build-arg PYTHON_VERSION=${PYTHON_VERSION} -t n8nio/n8n-runners:${IMAGE_TAG} .`;
	}

	// 3) Build editor-ui
	if (BUILD_EDITOR) {
		const distPath = path.join(ROOT_DIR, 'packages', 'frontend', 'editor-ui', 'dist');
		console.log('Checking for editor-ui dist at:', distPath);
		if (!(await fs.pathExists(distPath))) {
			echo(
				chalk.red(
					`Expected dist at ${distPath} but it does not exist. Aborting editor-ui image build.`,
				),
			);
			process.exit(1);
		}

		echo(chalk.yellow('\n=== 3/4: Building editor-ui image ==='));
		await $`${CONTAINER_ENGINE} build -f docker/images/editor-ui/Dockerfile -t local-n8n-editor-ui:${IMAGE_TAG} ${ROOT_DIR}`;
	}

	// 4) Build final n8n image via dockerize script
	if (BUILD_N8N) {
		echo(chalk.yellow('\n=== 4/4: Building final n8n image ==='));
		const dockerizeScript = path.join(ROOT_DIR, 'scripts', 'dockerize-n8n.mjs');
		if (await fs.pathExists(dockerizeScript)) {
			await $`IMAGE_BASE_NAME=${IMAGE_BASE_NAME} IMAGE_TAG=${IMAGE_TAG} node ${dockerizeScript}`;
		} else {
			echo(chalk.red('Error: dockerize-n8n.mjs not found; cannot build final n8n image.'));
		}
	}

	echo(chalk.green('\nAll requested images built.\n'));

	try {
		await $`${CONTAINER_ENGINE} images | grep -E "n8nio/base|n8nio/n8n-runners|local-n8n-editor-ui|${IMAGE_BASE_NAME}" || true`;
	} catch (err) {
		// ignore grep errors
	}
}

run().catch((err) => {
	echo(chalk.red(`Unexpected error: ${err.message || err}`));
	process.exit(1);
});
