import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
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
import { join } from 'node:path';
import { afterEach, test } from 'node:test';

import {
	downloadReleaseAsset,
	installAgentHarness,
	sha256File,
	validateLock,
} from './agent-harness.mjs';

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
	writeFileSync(
		join(bundle, 'harness.json'),
		JSON.stringify({ name: 'n8n-opencode-harness', version }),
	);
	writeFileSync(join(bundle, 'plugins', 'n8n-harness.js'), 'export default async () => ({});\n');
	const asset = join(root, `n8n-opencode-harness-${version}.tgz`);
	execFileSync('tar', ['-czf', asset, '-C', source, 'n8n-opencode-harness']);
	return asset;
}

function writeLock(root, asset, overrides = {}) {
	const version = overrides.version ?? '1.2.3';
	const lock = {
		repository: 'n8n-io/cat-bot',
		releaseTag: `harness-v${version}`,
		version,
		assetName: `n8n-opencode-harness-${version}.tgz`,
		sha256: sha256File(asset),
		...overrides,
	};
	const lockPath = join(root, 'agent-harness.lock.json');
	writeFileSync(lockPath, JSON.stringify(lock));
	return { lock, lockPath };
}

function installerPaths(root) {
	return {
		cacheRoot: join(root, 'cache'),
		pluginLink: join(root, 'config', 'opencode', 'plugins', 'n8n-harness.js'),
	};
}

test('validates all pinned lock values', () => {
	const valid = {
		repository: 'n8n-io/cat-bot',
		releaseTag: 'harness-v1.2.3',
		version: '1.2.3',
		assetName: 'n8n-opencode-harness-1.2.3.tgz',
		sha256: 'a'.repeat(64),
	};
	assert.throws(() => validateLock({}), /non-empty repository/);
	assert.throws(() => validateLock({ ...valid, repository: 'other/repo' }), /n8n-io\/cat-bot/);
	assert.throws(() => validateLock({ ...valid, version: '1.2' }), /exact semantic version/);
	assert.throws(() => validateLock({ ...valid, releaseTag: 'latest' }), /releaseTag/);
	assert.throws(() => validateLock({ ...valid, assetName: 'bundle.tgz' }), /assetName/);
	assert.throws(() => validateLock({ ...valid, sha256: 'A'.repeat(64) }), /lowercase SHA-256/);
	assert.equal(validateLock(valid), valid);
});

test('preserves the current activation when the checksum is wrong', () => {
	const root = fixtureDirectory();
	const asset = makeAsset(root);
	const { lockPath } = writeLock(root, asset, { sha256: '0'.repeat(64) });
	const paths = installerPaths(root);
	mkdirSync(paths.cacheRoot, { recursive: true });
	const previous = join(root, 'previous-harness');
	mkdirSync(previous);
	symlinkSync(previous, join(paths.cacheRoot, 'current'));

	assert.throws(
		() =>
			installAgentHarness({
				...paths,
				lockPath,
				download: (_lock, destination) =>
					execFileSync('cp', [asset, join(destination, 'n8n-opencode-harness-1.2.3.tgz')]),
			}),
		/checksum mismatch/,
	);
	assert.equal(readlinkSync(join(paths.cacheRoot, 'current')), previous);
});

test('reuses a valid cache without another download', () => {
	const root = fixtureDirectory();
	const asset = makeAsset(root);
	const { lockPath } = writeLock(root, asset);
	const paths = installerPaths(root);
	let downloads = 0;
	const download = (_lock, destination) => {
		downloads++;
		execFileSync('cp', [asset, join(destination, 'n8n-opencode-harness-1.2.3.tgz')]);
	};

	installAgentHarness({ ...paths, lockPath, download });
	const second = installAgentHarness({ ...paths, lockPath, download });
	assert.equal(downloads, 1);
	assert.equal(second.cacheHit, true);
});

test('installs through a temporary directory and activates both symlinks', () => {
	const root = fixtureDirectory();
	const asset = makeAsset(root);
	const { lockPath } = writeLock(root, asset);
	const paths = installerPaths(root);

	const result = installAgentHarness({
		...paths,
		lockPath,
		download: (_lock, destination) =>
			execFileSync('cp', [asset, join(destination, 'n8n-opencode-harness-1.2.3.tgz')]),
	});

	assert.equal(result.bundlePath, join(paths.cacheRoot, '1.2.3', 'n8n-opencode-harness'));
	assert.equal(readlinkSync(join(paths.cacheRoot, 'current')), result.bundlePath);
	assert.equal(
		readlinkSync(paths.pluginLink),
		join(paths.cacheRoot, 'current', 'plugins', 'n8n-harness.js'),
	);
	assert.match(readFileSync(result.pluginLink, 'utf8'), /export default/);
	assert.deepEqual(readdirSync(paths.cacheRoot).sort(), ['1.2.3', 'current']);
});

test('does not overwrite a user plugin file', () => {
	const root = fixtureDirectory();
	const asset = makeAsset(root);
	const { lockPath } = writeLock(root, asset);
	const paths = installerPaths(root);
	mkdirSync(join(root, 'config', 'opencode', 'plugins'), { recursive: true });
	writeFileSync(paths.pluginLink, 'user plugin\n');

	assert.throws(
		() =>
			installAgentHarness({
				...paths,
				lockPath,
				download: (_lock, destination) =>
					execFileSync('cp', [asset, join(destination, 'n8n-opencode-harness-1.2.3.tgz')]),
			}),
		/Refusing to overwrite the non-symlink path/,
	);
	assert.equal(readFileSync(paths.pluginLink, 'utf8'), 'user plugin\n');
});

test('reports a clear GitHub access failure', () => {
	const lock = {
		repository: 'n8n-io/cat-bot',
		releaseTag: 'harness-v1.2.3',
		version: '1.2.3',
		assetName: 'n8n-opencode-harness-1.2.3.tgz',
		sha256: 'a'.repeat(64),
	};
	assert.throws(
		() =>
			downloadReleaseAsset(lock, fixtureDirectory(), {
				run: () => {
					const error = new Error('gh failed');
					error.stderr = Buffer.from('HTTP 404');
					throw error;
				},
			}),
		/gh is authenticated and has contents:read access to n8n-io\/cat-bot.*HTTP 404/,
	);
});
