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
	symlinkSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPOSITORY = 'n8n-io/cat-bot';
const BUNDLE_ROOT = 'n8n-opencode-harness';
const PLUGIN_FILE = 'n8n-harness.js';
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

function activatePlugin(pluginPath, pluginLink) {
	if (existsSync(pluginLink) && !lstatSync(pluginLink).isSymbolicLink()) {
		throw new Error(`Refusing to overwrite the non-symlink path ${pluginLink}.`);
	}
	mkdirSync(dirname(pluginLink), { recursive: true });
	const temporaryLink = `${pluginLink}.tmp-${process.pid}`;
	try {
		rmSync(temporaryLink, { force: true });
		symlinkSync(pluginPath, temporaryLink);
		renameSync(temporaryLink, pluginLink);
	} finally {
		rmSync(temporaryLink, { force: true });
	}
}

export function installAgentHarness({
	lockPath = join(REPO_ROOT, 'agent-harness.lock.json'),
	cacheRoot = join(homedir(), '.cache', 'n8n-agent-harness'),
	pluginLink = join(homedir(), '.config', 'opencode', 'plugins', PLUGIN_FILE),
	download = downloadReleaseAsset,
	extract = (archive, destination) =>
		execFileSync('tar', ['-xzf', archive, '-C', destination], { stdio: 'pipe' }),
} = {}) {
	const lock = readLock(lockPath);
	const versionDir = join(cacheRoot, lock.version);
	const bundlePath = join(versionDir, BUNDLE_ROOT);
	const pluginPath = join(bundlePath, 'plugins', PLUGIN_FILE);
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
			if (!existsSync(join(stagedVersion, BUNDLE_ROOT, 'plugins', PLUGIN_FILE))) {
				throw new Error(`The agent harness bundle has no ${PLUGIN_FILE} plugin.`);
			}
			rmSync(versionDir, { recursive: true, force: true });
			renameSync(stagedVersion, versionDir);
		} finally {
			rmSync(stagingRoot, { recursive: true, force: true });
		}
	}

	activatePlugin(pluginPath, pluginLink);
	return { version: lock.version, cacheHit, bundlePath, pluginLink };
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
