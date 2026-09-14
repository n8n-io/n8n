#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
	existsSync,
	lstatSync,
	mkdirSync,
	mkdtempSync,
	readFileSync,
	readlinkSync,
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

function isPlainObject(value) {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validateLock(value) {
	if (!isPlainObject(value)) throw new Error('The agent harness lock must be a JSON object.');
	const required = ['repository', 'releaseTag', 'version', 'assetName', 'sha256'];
	for (const field of required) {
		if (typeof value[field] !== 'string' || value[field].length === 0) {
			throw new Error(`The agent harness lock must contain a non-empty ${field} string.`);
		}
	}
	if (value.repository !== REPOSITORY) {
		throw new Error(`The agent harness repository must be ${REPOSITORY}.`);
	}
	if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(value.version)) {
		throw new Error('The agent harness version must be an exact semantic version.');
	}
	if (value.releaseTag !== `harness-v${value.version}`) {
		throw new Error('The agent harness releaseTag must be harness-v<version>.');
	}
	if (value.assetName !== `n8n-opencode-harness-${value.version}.tgz`) {
		throw new Error('The agent harness assetName must match the pinned version.');
	}
	if (!/^[0-9a-f]{64}$/.test(value.sha256)) {
		throw new Error('The agent harness sha256 must be a lowercase SHA-256 value.');
	}
	return value;
}

export function readLock(lockPath = join(REPO_ROOT, 'agent-harness.lock.json')) {
	let content;
	try {
		content = readFileSync(lockPath, 'utf8');
	} catch (error) {
		throw new Error(`Cannot read the agent harness lock at ${lockPath}: ${error.message}`);
	}
	try {
		return validateLock(JSON.parse(content));
	} catch (error) {
		if (error instanceof SyntaxError) {
			throw new Error(`The agent harness lock at ${lockPath} is not valid JSON.`);
		}
		throw error;
	}
}

export function sha256File(path) {
	return createHash('sha256').update(readFileSync(path)).digest('hex');
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
			{ encoding: 'utf8', stdio: 'pipe' },
		);
	} catch (error) {
		const detail = error.stderr?.toString().trim() || error.message;
		throw new Error(
			`Cannot download the private agent harness release. Confirm that gh is authenticated and has contents:read access to ${lock.repository}. ${detail}`,
		);
	}
}

function validateBundle(bundlePath, version) {
	const manifestPath = join(bundlePath, 'harness.json');
	const pluginPath = join(bundlePath, 'plugins', PLUGIN_FILE);
	let manifest;
	try {
		manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
	} catch (error) {
		throw new Error(`The agent harness bundle has no valid harness.json: ${error.message}`);
	}
	if (manifest.name !== BUNDLE_ROOT || manifest.version !== version) {
		throw new Error('The agent harness manifest does not match the lock.');
	}
	if (!existsSync(pluginPath))
		throw new Error(`The agent harness bundle has no ${PLUGIN_FILE} plugin.`);
	return pluginPath;
}

function verifyCachedInstall(versionDir, lock, hashFile) {
	const archivePath = join(versionDir, lock.assetName);
	const bundlePath = join(versionDir, BUNDLE_ROOT);
	if (!existsSync(archivePath) || hashFile(archivePath) !== lock.sha256) return null;
	try {
		validateBundle(bundlePath, lock.version);
		return bundlePath;
	} catch {
		return null;
	}
}

function inspectLink(path) {
	try {
		const stat = lstatSync(path);
		if (!stat.isSymbolicLink())
			throw new Error(`Refusing to overwrite the non-symlink path ${path}.`);
		return { exists: true, target: readlinkSync(path) };
	} catch (error) {
		if (error.code === 'ENOENT') return { exists: false };
		throw error;
	}
}

function replaceSymlink(path, target) {
	mkdirSync(dirname(path), { recursive: true });
	const temporaryLink = `${path}.tmp-${process.pid}-${Date.now()}`;
	try {
		symlinkSync(target, temporaryLink);
		renameSync(temporaryLink, path);
	} finally {
		rmSync(temporaryLink, { force: true });
	}
}

function restoreLink(path, previous) {
	if (previous.exists) replaceSymlink(path, previous.target);
	else rmSync(path, { force: true });
}

function activateHarness({ bundlePath, currentLink, pluginLink }) {
	const current = inspectLink(currentLink);
	inspectLink(pluginLink);
	const currentTarget = bundlePath;
	const pluginTarget = join(currentLink, 'plugins', PLUGIN_FILE);
	try {
		replaceSymlink(currentLink, currentTarget);
		replaceSymlink(pluginLink, pluginTarget);
	} catch (error) {
		try {
			restoreLink(currentLink, current);
		} catch (restoreError) {
			throw new Error(
				`${error.message} The previous harness could not be restored: ${restoreError.message}`,
			);
		}
		throw error;
	}
}

export function installAgentHarness({
	lockPath = join(REPO_ROOT, 'agent-harness.lock.json'),
	cacheRoot = join(homedir(), '.cache', 'n8n-agent-harness'),
	pluginLink = join(homedir(), '.config', 'opencode', 'plugins', PLUGIN_FILE),
	download = downloadReleaseAsset,
	extract = (archive, destination) =>
		execFileSync('tar', ['-xzf', archive, '-C', destination], { stdio: 'pipe' }),
	hashFile = sha256File,
} = {}) {
	const lock = readLock(lockPath);
	const versionDir = join(cacheRoot, lock.version);
	const currentLink = join(cacheRoot, 'current');
	mkdirSync(cacheRoot, { recursive: true });

	let bundlePath = verifyCachedInstall(versionDir, lock, hashFile);
	const cacheHit = bundlePath !== null;
	if (!bundlePath) {
		const current = inspectLink(currentLink);
		if (
			current.exists &&
			resolve(dirname(currentLink), current.target) === join(versionDir, BUNDLE_ROOT)
		) {
			throw new Error(
				'The active agent harness cache is invalid. The current activation was preserved.',
			);
		}
		const stagingDir = mkdtempSync(join(cacheRoot, `.install-${lock.version}-`));
		const archivePath = join(stagingDir, lock.assetName);
		const backupDir = `${versionDir}.backup-${process.pid}-${Date.now()}`;
		let movedExisting = false;
		try {
			download(lock, stagingDir);
			if (!existsSync(archivePath))
				throw new Error(`The release did not contain ${lock.assetName}.`);
			const actualHash = hashFile(archivePath);
			if (actualHash !== lock.sha256) {
				throw new Error(
					`Agent harness checksum mismatch. Expected ${lock.sha256}, got ${actualHash}.`,
				);
			}
			extract(archivePath, stagingDir);
			bundlePath = join(stagingDir, BUNDLE_ROOT);
			validateBundle(bundlePath, lock.version);
			if (existsSync(versionDir)) {
				renameSync(versionDir, backupDir);
				movedExisting = true;
			}
			renameSync(stagingDir, versionDir);
			bundlePath = join(versionDir, BUNDLE_ROOT);
			if (movedExisting) rmSync(backupDir, { recursive: true, force: true });
		} catch (error) {
			if (movedExisting && !existsSync(versionDir) && existsSync(backupDir)) {
				renameSync(backupDir, versionDir);
			}
			rmSync(stagingDir, { recursive: true, force: true });
			throw error;
		}
	}

	activateHarness({ bundlePath, currentLink, pluginLink });
	return { version: lock.version, cacheHit, bundlePath, pluginLink };
}

function isMainModule() {
	return process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1]);
}

if (isMainModule()) {
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
