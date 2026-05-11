#!/usr/bin/env tsx
/**
 * Pre-pull test container images in parallel.
 *
 * Usage:
 *   npx tsx pull-test-images.ts              # Pull all images
 *   npx tsx pull-test-images.ts postgres redis mailpit  # Pull specific images
 */

import { exec } from 'child_process';
import { promisify } from 'util';

import { TEST_CONTAINER_IMAGES } from './test-containers';

const execAsync = promisify(exec);

type ImageKey = keyof typeof TEST_CONTAINER_IMAGES;

interface PullResult {
	image: string;
	duration: string;
	success: boolean;
	cached: number;
	pulled: number;
}

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 10_000;

async function sleep(ms: number): Promise<void> {
	return await new Promise((resolve) => setTimeout(resolve, ms));
}

async function pullImage(image: string): Promise<PullResult> {
	const imageStart = Date.now();

	for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
		try {
			const { stdout, stderr } = await execAsync(`docker pull ${image}`);
			const output = stdout + stderr;

			const cached = (output.match(/Already exists/g) ?? []).length;
			const pulled = (output.match(/Pull complete/g) ?? []).length;

			const duration = ((Date.now() - imageStart) / 1000).toFixed(1);
			return { image, duration, success: true, cached, pulled };
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			if (attempt < MAX_RETRIES) {
				console.warn(
					`   ⚠️  Pull attempt ${attempt}/${MAX_RETRIES} failed for ${image}: ${message}`,
				);
				console.warn(`   ⏳ Retrying in ${RETRY_DELAY_MS / 1000}s...`);
				await sleep(RETRY_DELAY_MS);
			} else {
				console.error(`   ❌ Pull failed for ${image} after ${MAX_RETRIES} attempts: ${message}`);
			}
		}
	}

	const duration = ((Date.now() - imageStart) / 1000).toFixed(1);
	return { image, duration, success: false, cached: 0, pulled: 0 };
}

function isValidImageKey(key: string): key is ImageKey {
	return key in TEST_CONTAINER_IMAGES;
}

function getRequestedImages(args: string[]): string[] {
	if (args.length === 0) {
		return Object.values(TEST_CONTAINER_IMAGES);
	}

	const invalid = args.filter((arg) => !isValidImageKey(arg));
	if (invalid.length > 0) {
		console.error(`❌ Unknown image(s): ${invalid.join(', ')}`);
		console.error(`   Valid: ${Object.keys(TEST_CONTAINER_IMAGES).join(', ')}`);
		process.exit(1);
	}

	return args.filter(isValidImageKey).map((key) => TEST_CONTAINER_IMAGES[key]);
}

async function main() {
	const args = process.argv.slice(2);
	const images = getRequestedImages(args);

	const mode = args.length > 0 ? `${args.length} specified` : 'all';
	console.log(`🐳 Pre-pulling test container images (${mode})...`);
	const startTime = Date.now();

	// Filter out local images and start all pulls in parallel
	const imagesToPull = images.filter((image) => {
		if (image.endsWith(':local')) {
			console.log(`⏭️  Skipping ${image} (local build)`);
			return false;
		}
		return true;
	});

	for (const image of imagesToPull) {
		console.log(`🔄 Starting pull: ${image}`);
	}

	const pullPromises = imagesToPull.map(pullImage);

	const results = await Promise.all(pullPromises);

	// Check for failures
	const failures = results.filter((r) => !r.success);
	if (failures.length > 0 && process.env.STRICT_IMAGE_PULL === 'true') {
		console.error(`❌ Failed to pull ${failures.length} image(s)`);
		process.exit(1);
	}

	const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
	const totalCached = results.reduce((sum, r) => sum + r.cached, 0);
	const totalPulled = results.reduce((sum, r) => sum + r.pulled, 0);

	console.log('\n' + '='.repeat(60));
	console.log('📊 Pull Summary:');
	results.forEach(({ image, duration, success, cached, pulled }) => {
		const layers = cached + pulled > 0 ? ` (${cached} cached, ${pulled} pulled)` : '';
		console.log(`  ${success ? '✅' : '❌'} ${image}: ${duration}s${layers}`);
	});
	console.log('='.repeat(60));
	console.log(`📦 Layers: ${totalCached} cached, ${totalPulled} pulled`);
	console.log(`✅ Total time: ${totalTime}s (parallel)`);
}

void main();
