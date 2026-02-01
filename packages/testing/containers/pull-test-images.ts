#!/usr/bin/env tsx
/**
 * Script to pre-pull all test container images.
 */

import { execSync } from 'child_process';

import { TEST_CONTAINER_IMAGES } from './test-containers';

console.log('🐳 Pre-pulling test container images...');
const startTime = Date.now();
const timings = [];
const images = Object.values(TEST_CONTAINER_IMAGES);

for (const image of images) {
	// Skip :local tagged images - these are locally built and won't exist in any registry
	if (image.endsWith(':local')) {
		console.log(`\n⏭️  Skipping ${image} (local build)`);
		continue;
	}

	const imageStart = Date.now();
	console.log(`\nPulling ${image}...`);
	try {
		execSync(`docker pull ${image}`, { stdio: 'inherit' });
		const duration = ((Date.now() - imageStart) / 1000).toFixed(1);
		timings.push({ image, duration, success: true });
		console.log(`✅ Successfully pulled ${image} (${duration}s)`);
	} catch {
		const duration = ((Date.now() - imageStart) / 1000).toFixed(1);
		timings.push({ image, duration, success: false });
		console.error(`❌ Failed to pull ${image} (${duration}s)`);
		if (process.env.STRICT_IMAGE_PULL === 'true') process.exit(1);
	}
}

const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
console.log('\n' + '='.repeat(50));
console.log('📊 Pull Summary:');
timings.forEach(({ image, duration, success }) => {
	console.log(`  ${success ? '✅' : '❌'} ${image}: ${duration}s`);
});
console.log('='.repeat(50));
console.log(`✅ Total time: ${totalTime}s`);
