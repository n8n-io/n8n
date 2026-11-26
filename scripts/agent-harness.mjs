#!/usr/bin/env node
import { execFileSync } from 'node:child_process';
import {
	existsSync,
	lstatSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	renameSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const REPOSITORY = 'n8n-io/cat-bot';
const BUNDLE_ROOT = 'n8n-opencode-harness';
const PLUGIN_NAME = 'n8n-harness';
const PLUGIN_ENTRY = 'index.js';
const LEGACY_PLUGIN_FILE = 'n8n-harness.js';
const PLUGIN_SUBPATH = join(PLUGIN_NAME, PLUGIN_ENTRY);
const MANAGED_HEADER = '// Managed by n8n agent-harness. Do not edit.';
const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

export function validateLock(lock) {
	if (
		lock?.repository !== REPOSITORY ||
		!/^[0-9]+\.[0-9]+\.[0-9]+$/.test(lock.version) ||
		lock.releaseTag !== `harness-v${lock.version}` ||
		lock.assetName !== `n8n-opencode-harness-${lock.version}.tgz`
	) {
		throw new Error('The agent harness lock is invalid.');
	}
	return lock;
}

export function readLock(lockPath = join(REPO_ROOT, 'agent-harness.lock.json')) {
	try {
		return validateLock(JSON.parse(readFileSync(lockPath, 'utf8')));
	} catch (error) {
		throw new Error(`Cannot read the agent harness lock at ${lockPath}: ${error.message}`);
	}
}

export function downloadReleaseAsset(lock, destination, { run = execFileSync } = {}) {
	try {
		run(
			'gh',
			[
				'release',
				'download',
				lock.releaseTag,
				'--repo',
				lock.repository,
				'--pattern',
				lock.assetName,
				'--dir',
				destination,
			],
			{ stdio: 'pipe' },
		);
	} catch (error) {
		const detail = error.stderr?.toString().trim() || error.message;
		throw new Error(
			`Cannot download the private agent harness release. Confirm that gh can read ${lock.repository}. ${detail}`,
		);
	}
}

function statIfPresent(targetPath) {
	try {
		return lstatSync(targetPath);
	} catch (error) {
		if (error.code === 'ENOENT') return undefined;
		throw error;
	}
}

function buildPluginShim(pluginPath) {
	const targetUrl = pathToFileURL(resolve(pluginPath)).href;
	return `${MANAGED_HEADER}\nexport { default } from ${JSON.stringify(targetUrl)};\n`;
}

function activatePlugin(pluginPath, pluginDir) {
	const pluginDirStat = statIfPresent(pluginDir);
	if (pluginDirStat && (pluginDirStat.isSymbolicLink() || !pluginDirStat.isDirectory())) {
		throw new Error(`Refusing to overwrite the unmanaged plugin path ${pluginDir}.`);
	}

	const pluginEntry = join(pluginDir, PLUGIN_ENTRY);
	const pluginEntryStat = statIfPresent(pluginEntry);
	if (pluginEntryStat) {
		if (!pluginEntryStat.isFile()) {
			throw new Error(`Refusing to overwrite the unmanaged plugin path ${pluginEntry}.`);
		}
		const existing = readFileSync(pluginEntry, 'utf8');
		if (!existing.startsWith(`${MANAGED_HEADER}\n`)) {
			throw new Error(`Refusing to overwrite the unmanaged plugin file ${pluginEntry}.`);
		}
	}

	mkdirSync(pluginDir, { recursive: true });
	const temporaryEntry = join(pluginDir, `.${PLUGIN_ENTRY}.tmp-${process.pid}`);
	try {
		// OpenCode V2 resolves relative imports from the symlink path, so re-export
		// from the absolute cache file URL instead of symlinking the plugin directory.
		writeFileSync(temporaryEntry, buildPluginShim(pluginPath));
		renameSync(temporaryEntry, pluginEntry);
	} finally {
		rmSync(temporaryEntry, { force: true });
	}

	// Remove the V1 single-file symlink without touching unmanaged user files.
	const legacyPluginLink = join(dirname(pluginDir), LEGACY_PLUGIN_FILE);
	if (statIfPresent(legacyPluginLink)?.isSymbolicLink()) {
		rmSync(legacyPluginLink, { force: true });
	}

	return pluginEntry;
}

export function installAgentHarness({
	lockPath = join(REPO_ROOT, 'agent-harness.lock.json'),
	cacheRoot = join(homedir(), '.cache', 'n8n-agent-harness'),
	pluginDir = join(homedir(), '.config', 'opencode', 'plugins', PLUGIN_NAME),
	download = downloadReleaseAsset,
	extract = (archive, destination) =>
		execFileSync('tar', ['-xzf', archive, '-C', destination], { stdio: 'pipe' }),
} = {}) {
	const lock = readLock(lockPath);
	const versionDir = join(cacheRoot, lock.version);
	const bundlePath = join(versionDir, BUNDLE_ROOT);
	const pluginPath = join(bundlePath, 'plugins', PLUGIN_SUBPATH);
	mkdirSync(cacheRoot, { recursive: true });

	// The version cache is write-once after a successful installation.
	const cacheHit = existsSync(pluginPath);
	if (!cacheHit) {
		const stagingRoot = mkdtempSync(join(cacheRoot, '.install-'));
		const stagedVersion = join(stagingRoot, lock.version);
		const archivePath = join(stagedVersion, lock.assetName);
		try {
			mkdirSync(stagedVersion);
			download(lock, stagedVersion);
			// Cat-bot validates archive contents before publishing these pinned bytes.
			extract(archivePath, stagedVersion);
			if (!existsSync(join(stagedVersion, BUNDLE_ROOT, 'plugins', PLUGIN_SUBPATH))) {
				throw new Error(`The agent harness bundle has no ${PLUGIN_SUBPATH} plugin.`);
			}
			rmSync(versionDir, { recursive: true, force: true });
			renameSync(stagedVersion, versionDir);
		} finally {
			rmSync(stagingRoot, { recursive: true, force: true });
		}
	}

	const pluginEntry = activatePlugin(pluginPath, pluginDir);
	return { version: lock.version, cacheHit, bundlePath, pluginDir, pluginEntry };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
	try {
		const result = installAgentHarness();
		console.log(
			`Agent harness ${result.version} is active${result.cacheHit ? ' from cache' : ''}.`,
		);
	} catch (error) {
		console.error(`Agent harness setup failed: ${error.message}`);
		process.exitCode = 1;
	}
}
