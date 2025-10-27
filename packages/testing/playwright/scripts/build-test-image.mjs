#!/usr/bin/env node

import { execSync } from 'child_process';
import { writeFileSync, unlinkSync, existsSync, mkdirSync, copyFileSync, rmSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '../../../..');

function execCommand(command, options = {}) {
	return execSync(command, { cwd: repoRoot, stdio: 'inherit', ...options });
}

function cleanup(files = []) {
	files.forEach(file => {
		try {
			if (file.endsWith('/')) {
				rmSync(file, { recursive: true, force: true });
			} else {
				unlinkSync(file);
			}
		} catch {}
	});
}

function buildTestImage(targetImage) {
	const tempBuildDir = path.join(repoRoot, 'temp-build-e2e');
	const dockerfilePath = path.join(repoRoot, 'Dockerfile.test');
	const tempTag = `${targetImage}-temp-${Date.now()}`;

	try {
		console.log(`🎯 Preparing test image from ${targetImage}`);

		// Build CLI with e2e controller
		execCommand('pnpm turbo build --filter=n8n', {
			env: { ...process.env, INCLUDE_TEST_CONTROLLER: 'true' }
		});

		// Pull base image
		execCommand(`docker pull ${targetImage}`);

		// Verify controller exists
		const controllerPath = path.join(repoRoot, 'packages/cli/dist/controllers/e2e.controller.js');
		if (!existsSync(controllerPath)) {
			throw new Error(`E2E controller not found. Build may have failed.`);
		}

		// Setup temp files
		cleanup([tempBuildDir, dockerfilePath]);
		mkdirSync(tempBuildDir, { recursive: true });
		copyFileSync(controllerPath, path.join(tempBuildDir, 'e2e.controller.js'));

		// Create Dockerfile
		writeFileSync(dockerfilePath, `FROM ${targetImage}
COPY temp-build-e2e/e2e.controller.js /usr/local/lib/node_modules/n8n/dist/controllers/e2e.controller.js`);

		// Build and replace image
		execCommand(`docker build -f Dockerfile.test -t ${tempTag} .`);
		execCommand(`docker rmi ${targetImage}`);
		execCommand(`docker tag ${tempTag} ${targetImage}`);
		execCommand(`docker rmi ${tempTag}`);

		console.log(`✅ Modified ${targetImage} with e2e controller`);
	} finally {
		cleanup([tempBuildDir, dockerfilePath]);
	}
}

// Main execution
const targetImage = process.argv[2] || 'n8nio/n8n:nightly';
try {
	buildTestImage(targetImage);
} catch (error) {
	console.error('❌ Failed:', error.message);
	process.exit(1);
}
