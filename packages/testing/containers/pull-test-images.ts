#!/usr/bin/env tsx
/**
 * Script to pre-pull all test container images in parallel.
 */

import { exec } from 'child_process';
import { promisify } from 'util';

import { TEST_CONTAINER_IMAGES } from './test-containers';

const execAsync = promisify(exec);

interface PullResult {
	image: string;
	duration: string;
	success: boolean;
	cached: number;
	pulled: number;
}

async function pullImage(image: string): Promise<PullResult> {
	const imageStart = Date.now();
	try {
		const { stdout, stderr } = await execAsync(`docker pull ${image}`);
		const output = stdout + stderr;

		// Count cached vs pulled layers
		const cached = (output.match(/Already exists/g) || []).length;
		const pulled = (output.match(/Pull complete/g) || []).length;

		const duration = ((Date.now() - imageStart) / 1000).toFixed(1);
		return { image, duration, success: true, cached, pulled };
	} catch {
		const duration = ((Date.now() - imageStart) / 1000).toFixed(1);
		return { image, duration, success: false, cached: 0, pulled: 0 };
	}
}

async function main() {
	console.log('🐳 Pre-pulling test container images (parallel)...');
	const startTime = Date.now();
	const images = Object.values(TEST_CONTAINER_IMAGES);

	// Filter out local images and start all pulls in parallel
	const pullPromises = images
		.filter((image) => {
			if (image.endsWith(':local')) {
				console.log(`⏭️  Skipping ${image} (local build)`);
				return false;
			}
			return true;
		})
		.map((image) => {
			console.log(`🔄 Starting pull: ${image}`);
			return pullImage(image);
		});

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

main();
