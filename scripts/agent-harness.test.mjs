import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
	copyFileSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	readlinkSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, test } from 'node:test';

import { downloadReleaseAsset, installAgentHarness, validateLock } from './agent-harness.mjs';

const temporaryDirectories = [];

afterEach(() => {
	for (const directory of temporaryDirectories.splice(0)) {
		rmSync(directory, { recursive: true, force: true });
	}
});

function fixtureDirectory() {
	const directory = mkdtempSync(join(tmpdir(), 'agent-harness-test-'));
	temporaryDirectories.push(directory);
	return directory;
}

function makeAsset(root, version = '1.2.3') {
	const source = join(root, 'source');
	const bundle = join(source, 'n8n-opencode-harness');
	mkdirSync(join(bundle, 'plugins'), { recursive: true });
	writeFileSync(join(bundle, 'plugins', 'n8n-harness.js'), 'export default async () => ({});\n');
	const asset = join(root, `n8n-opencode-harness-${version}.tgz`);
	execFileSync('tar', ['-czf', asset, '-C', source, 'n8n-opencode-harness']);
	return asset;
}

function writeLock(root, overrides = {}) {
	const version = '1.2.3';
	const lock = {
		repository: 'n8n-io/cat-bot',
		releaseTag: `harness-v${version}`,
		version,
		assetName: `n8n-opencode-harness-${version}.tgz`,
		...overrides,
	};
	const lockPath = join(root, 'agent-harness.lock.json');
	writeFileSync(lockPath, JSON.stringify(lock));
	return lockPath;
}

function installerPaths(root) {
	return {
		cacheRoot: join(root, 'cache'),
		pluginLink: join(root, 'config', 'opencode', 'plugins', 'n8n-harness.js'),
	};
}

function copyAsset(asset) {
	return (lock, destination) => copyFileSync(asset, join(destination, lock.assetName));
}

test('validates the pinned release values', () => {
	const lock = {
		repository: 'n8n-io/cat-bot',
		releaseTag: 'harness-v1.2.3',
		version: '1.2.3',
		assetName: 'n8n-opencode-harness-1.2.3.tgz',
	};
	assert.equal(validateLock(lock), lock);
	for (const invalid of [
		{ repository: 'other/repo' },
		{ releaseTag: 'latest' },
		{ version: '../outside' },
		{ assetName: 'other.tgz' },
	]) {
		assert.throws(() => validateLock({ ...lock, ...invalid }), /lock is invalid/);
	}
});

test('installs the pinned release and activates its plugin', () => {
	const root = fixtureDirectory();
	const asset = makeAsset(root);
	const result = installAgentHarness({
		...installerPaths(root),
		lockPath: writeLock(root),
		download: copyAsset(asset),
	});

	assert.equal(result.cacheHit, false);
	assert.equal(
		readlinkSync(result.pluginLink),
		join(result.bundlePath, 'plugins', 'n8n-harness.js'),
	);
	assert.match(readFileSync(result.pluginLink, 'utf8'), /export default/);
	assert.deepEqual(readdirSync(join(root, 'cache')), ['1.2.3']);
});

test('reuses an installed release without downloading it again', () => {
	const root = fixtureDirectory();
	const asset = makeAsset(root);
	const options = {
		...installerPaths(root),
		lockPath: writeLock(root),
		download: copyAsset(asset),
	};
	installAgentHarness(options);
	const result = installAgentHarness({
		...options,
		download: () => assert.fail('downloaded a cached release'),
	});

	assert.equal(result.cacheHit, true);
});

test('keeps the active plugin when installation fails', () => {
	const root = fixtureDirectory();
	const asset = makeAsset(root);
	const paths = installerPaths(root);
	mkdirSync(dirname(paths.pluginLink), { recursive: true });
	const previous = join(root, 'previous-plugin.js');
	writeFileSync(previous, 'previous plugin\n');
	symlinkSync(previous, paths.pluginLink);

	assert.throws(
		() =>
			installAgentHarness({
				...paths,
				lockPath: writeLock(root),
				download: copyAsset(asset),
				extract: () => {
					throw new Error('extraction failed');
				},
			}),
		/extraction failed/,
	);
	assert.equal(readlinkSync(paths.pluginLink), previous);
});

test('does not overwrite a user plugin file', () => {
	const root = fixtureDirectory();
	const asset = makeAsset(root);
	const paths = installerPaths(root);
	mkdirSync(dirname(paths.pluginLink), { recursive: true });
	writeFileSync(paths.pluginLink, 'user plugin\n');

	assert.throws(
		() =>
			installAgentHarness({
				...paths,
				lockPath: writeLock(root),
				download: copyAsset(asset),
			}),
		/non-symlink path/,
	);
});

test('reports a clear GitHub access failure', () => {
	assert.throws(
		() =>
			downloadReleaseAsset(
				{ repository: 'n8n-io/cat-bot', releaseTag: 'harness-v1.2.3', assetName: 'asset.tgz' },
				fixtureDirectory(),
				{
					run: () => {
						throw new Error('release not found');
					},
				},
			),
		/Confirm that gh can read n8n-io\/cat-bot.*release not found/,
	);
});
