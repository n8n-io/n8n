import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
	copyFileSync,
	existsSync,
	lstatSync,
	mkdirSync,
	mkdtempSync,
	readdirSync,
	readFileSync,
	rmSync,
	symlinkSync,
	writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, test } from 'node:test';
import { pathToFileURL } from 'node:url';

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
	const source = join(root, `source-${version}`);
	const bundle = join(source, 'n8n-opencode-harness');
	mkdirSync(join(bundle, 'plugins', 'n8n-harness'), { recursive: true });
	mkdirSync(join(bundle, 'lib'), { recursive: true });
	writeFileSync(
		join(bundle, 'lib', 'n8n-harness.js'),
		`export const plugin = { id: 'n8n.harness', version: ${JSON.stringify(version)} };\n`,
	);
	writeFileSync(
		join(bundle, 'plugins', 'n8n-harness', 'index.js'),
		"import { plugin } from '../../lib/n8n-harness.js';\nexport default plugin;\n",
	);
	const asset = join(root, `n8n-opencode-harness-${version}.tgz`);
	execFileSync('tar', ['-czf', asset, '-C', source, 'n8n-opencode-harness']);
	return asset;
}

function makeLegacyOnlyAsset(root, version = '0.11.0') {
	const source = join(root, `legacy-source-${version}`);
	const bundle = join(source, 'n8n-opencode-harness');
	mkdirSync(join(bundle, 'plugins'), { recursive: true });
	writeFileSync(join(bundle, 'plugins', 'n8n-harness.js'), 'export default async () => ({});\n');
	const asset = join(root, `n8n-opencode-harness-${version}.tgz`);
	execFileSync('tar', ['-czf', asset, '-C', source, 'n8n-opencode-harness']);
	return asset;
}

function writeLock(root, overrides = {}) {
	const version = overrides.version ?? '1.2.3';
	const lock = {
		repository: 'n8n-io/cat-bot',
		releaseTag: `harness-v${version}`,
		version,
		assetName: `n8n-opencode-harness-${version}.tgz`,
		...overrides,
	};
	const lockPath = join(root, `agent-harness-${version}.lock.json`);
	writeFileSync(lockPath, JSON.stringify(lock));
	return lockPath;
}

function installerPaths(root) {
	return {
		cacheRoot: join(root, 'cache'),
		pluginDir: join(root, 'config', 'opencode', 'plugins', 'n8n-harness'),
	};
}

function copyAsset(asset) {
	return (lock, destination) => copyFileSync(asset, join(destination, lock.assetName));
}

test('validates the pinned release values', () => {
	const lock = {
		repository: 'n8n-io/cat-bot',
		releaseTag: 'harness-v1.1.0',
		version: '1.1.0',
		assetName: 'n8n-opencode-harness-1.1.0.tgz',
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

test('installs the V2 release, writes a managed shim, and resolves relative bundle imports', async () => {
	const root = fixtureDirectory();
	const asset = makeAsset(root, '1.1.0');
	const result = installAgentHarness({
		...installerPaths(root),
		lockPath: writeLock(root, { version: '1.1.0' }),
		download: copyAsset(asset),
	});

	assert.equal(result.cacheHit, false);
	assert.equal(result.pluginEntry, join(result.pluginDir, 'index.js'));
	assert.equal(lstatSync(result.pluginDir).isDirectory(), true);
	assert.equal(lstatSync(result.pluginEntry).isFile(), true);
	assert.match(
		readFileSync(result.pluginEntry, 'utf8'),
		new RegExp(pathToFileURL(join(result.bundlePath, 'plugins', 'n8n-harness', 'index.js')).href),
	);
	assert.deepEqual(readdirSync(join(root, 'cache')), ['1.1.0']);

	// Importing the shim must resolve relative imports inside the cached V2 bundle.
	const loaded = await import(pathToFileURL(result.pluginEntry).href);
	assert.deepEqual(loaded.default, { id: 'n8n.harness', version: '1.1.0' });
});

test('updates a previously managed shim to a newer release', async () => {
	const root = fixtureDirectory();
	const paths = installerPaths(root);
	installAgentHarness({
		...paths,
		lockPath: writeLock(root, { version: '1.0.0' }),
		download: copyAsset(makeAsset(root, '1.0.0')),
	});
	const updated = installAgentHarness({
		...paths,
		lockPath: writeLock(root, { version: '1.1.0' }),
		download: copyAsset(makeAsset(root, '1.1.0')),
	});

	const loaded = await import(`${pathToFileURL(updated.pluginEntry).href}?updated=1`);
	assert.deepEqual(loaded.default, { id: 'n8n.harness', version: '1.1.0' });
});

test('removes live and dangling legacy n8n-harness.js symlinks during activation', () => {
	for (const dangling of [false, true]) {
		const root = fixtureDirectory();
		const asset = makeAsset(root);
		const paths = installerPaths(root);
		const pluginsDir = dirname(paths.pluginDir);
		mkdirSync(pluginsDir, { recursive: true });
		const legacyLink = join(pluginsDir, 'n8n-harness.js');
		const legacyTarget = join(root, 'legacy-target.js');
		if (!dangling) writeFileSync(legacyTarget, 'export default async () => ({});\n');
		symlinkSync(legacyTarget, legacyLink);

		installAgentHarness({
			...paths,
			lockPath: writeLock(root),
			download: copyAsset(asset),
		});

		assert.throws(() => lstatSync(legacyLink), { code: 'ENOENT' });
	}
});

test('does not delete an unmanaged non-symlink legacy n8n-harness.js file', () => {
	const root = fixtureDirectory();
	const asset = makeAsset(root);
	const paths = installerPaths(root);
	const pluginsDir = dirname(paths.pluginDir);
	mkdirSync(pluginsDir, { recursive: true });
	const legacyFile = join(pluginsDir, 'n8n-harness.js');
	writeFileSync(legacyFile, 'user legacy file\n');

	installAgentHarness({
		...paths,
		lockPath: writeLock(root),
		download: copyAsset(asset),
	});

	assert.equal(readFileSync(legacyFile, 'utf8'), 'user legacy file\n');
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

test('keeps the active plugin and legacy symlink when installation fails', () => {
	const root = fixtureDirectory();
	const asset = makeAsset(root);
	const paths = installerPaths(root);
	const pluginsDir = dirname(paths.pluginDir);
	mkdirSync(pluginsDir, { recursive: true });
	const legacyLink = join(pluginsDir, 'n8n-harness.js');
	const previous = join(root, 'previous-plugin.js');
	writeFileSync(previous, 'previous plugin\n');
	symlinkSync(previous, legacyLink);

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
	assert.equal(lstatSync(legacyLink).isSymbolicLink(), true);
	assert.equal(existsSync(paths.pluginDir), false);
});

test('rejects bundles without the V2 plugin entrypoint', () => {
	const root = fixtureDirectory();
	const asset = makeLegacyOnlyAsset(root, '0.11.0');
	assert.throws(
		() =>
			installAgentHarness({
				...installerPaths(root),
				lockPath: writeLock(root, { version: '0.11.0' }),
				download: copyAsset(asset),
			}),
		/has no n8n-harness\/index\.js plugin/,
	);
});

test('does not overwrite unmanaged user plugin files or symlinks', () => {
	const root = fixtureDirectory();
	const asset = makeAsset(root);
	const paths = installerPaths(root);
	mkdirSync(paths.pluginDir, { recursive: true });
	const userEntry = join(paths.pluginDir, 'index.js');
	writeFileSync(userEntry, 'export default { id: "user.custom" };\n');

	assert.throws(
		() =>
			installAgentHarness({
				...paths,
				lockPath: writeLock(root),
				download: copyAsset(asset),
			}),
		/unmanaged plugin file/,
	);
	assert.equal(readFileSync(userEntry, 'utf8'), 'export default { id: "user.custom" };\n');

	// Also refuse when the plugin directory itself is a symlink to another directory.
	const symlinkRoot = fixtureDirectory();
	const symlinkPaths = installerPaths(symlinkRoot);
	const targetDir = join(symlinkRoot, 'user-plugin-dir');
	mkdirSync(targetDir, { recursive: true });
	writeFileSync(join(targetDir, 'index.js'), 'original target\n');
	mkdirSync(dirname(symlinkPaths.pluginDir), { recursive: true });
	symlinkSync(targetDir, symlinkPaths.pluginDir);

	assert.throws(
		() =>
			installAgentHarness({
				...symlinkPaths,
				lockPath: writeLock(symlinkRoot),
				download: copyAsset(makeAsset(symlinkRoot)),
			}),
		/unmanaged plugin path/,
	);
	assert.equal(readFileSync(join(targetDir, 'index.js'), 'utf8'), 'original target\n');
});

test('reports a clear GitHub access failure', () => {
	assert.throws(
		() =>
			downloadReleaseAsset(
				{ repository: 'n8n-io/cat-bot', releaseTag: 'harness-v1.1.0', assetName: 'asset.tgz' },
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
