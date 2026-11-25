#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIRS_TO_SKIP = new Set(['.git', 'node_modules', '.turbo']);
const ROOT_DIRS_TO_SKIP = new Set(['packages']);
const EXTENSIONS_TO_FORMAT_WITH_PRETTIER = ['.yml'];
const EXTENSIONS_TO_FORMAT_WITH_BIOME = ['.js', '.json', '.ts'];
const GIT_LS_FILES_MAX_BUFFER = 50 * 1024 * 1024;
// Conservative cross-platform argv budget (below Windows CreateProcess's 32,767-char limit and POSIX ARG_MAX).
const DEFAULT_MAX_ARG_CHARS = 24_000;

const isPrettierTarget = (filePath) =>
	EXTENSIONS_TO_FORMAT_WITH_PRETTIER.some((ext) => filePath.endsWith(ext));
const isBiomeTarget = (filePath) =>
	EXTENSIONS_TO_FORMAT_WITH_BIOME.some((ext) => filePath.endsWith(ext));

const hasSkippedSegment = (relativePath) => {
	const segments = relativePath.split(/[/\\]/);
	if (ROOT_DIRS_TO_SKIP.has(segments[0])) return true;
	return segments.some((segment) => DIRS_TO_SKIP.has(segment));
};

const listGitFiles = (rootDir) => {
	const output = execFileSync(
		'git',
		['ls-files', '-z', '--cached', '--others', '--exclude-standard', '--', ':!packages/**'],
		{
			cwd: rootDir,
			encoding: 'utf8',
			maxBuffer: GIT_LS_FILES_MAX_BUFFER,
			stdio: ['ignore', 'pipe', 'pipe'],
		},
	);
	return output.split('\0').filter(Boolean);
};

const walkFiles = (rootDir) => {
	const files = [];

	const walk = (dir, isRoot) => {
		for (const entry of fs.readdirSync(dir)) {
			if (DIRS_TO_SKIP.has(entry) || (isRoot && ROOT_DIRS_TO_SKIP.has(entry))) {
				continue;
			}
			const entryPath = path.resolve(dir, entry);
			const stat = fs.lstatSync(entryPath);
			if (stat.isDirectory()) {
				walk(entryPath, false);
				continue;
			}
			if (stat.isFile()) {
				files.push(path.relative(rootDir, entryPath));
			}
		}
	};

	walk(rootDir, true);
	return files;
};

const listCandidateFiles = (rootDir) => {
	try {
		return listGitFiles(rootDir);
	} catch (error) {
		// Fall back to filesystem traversal outside a git checkout.
		if (error?.code === 'ENOENT' || error?.status === 128) {
			return walkFiles(rootDir);
		}
		throw error;
	}
};

export const collectFormatTargets = (rootDir = process.cwd()) => {
	const resolvedRoot = path.resolve(rootDir);
	const prettierTargets = [];
	const biomeTargets = [];

	for (const relativePath of listCandidateFiles(resolvedRoot)) {
		if (hasSkippedSegment(relativePath)) continue;

		const entryPath = path.resolve(resolvedRoot, relativePath);
		let stat;
		try {
			// Skip directories (including nested Git repos) and symlinks.
			// Prettier exits with code 2 on explicit symlink paths, and Biome would rewrite symlink targets.
			stat = fs.lstatSync(entryPath);
		} catch {
			continue;
		}
		if (!stat.isFile()) continue;

		if (isPrettierTarget(entryPath)) prettierTargets.push(entryPath);
		if (isBiomeTarget(entryPath)) biomeTargets.push(entryPath);
	}

	return { prettierTargets, biomeTargets };
};

const estimateArgLength = (arg) => Math.max(Buffer.byteLength(arg, 'utf8'), arg.length) + 3;

export const chunkTargets = (
	targets,
	{ baseArgs = [], maxArgChars = DEFAULT_MAX_ARG_CHARS } = {},
) => {
	if (targets.length === 0) return [];

	const baseLength = baseArgs.reduce((sum, arg) => sum + estimateArgLength(arg), 0);
	const chunks = [];
	let currentChunk = [];
	let currentLength = baseLength;

	for (const target of targets) {
		const targetLength = estimateArgLength(target);
		if (currentChunk.length > 0 && currentLength + targetLength > maxArgChars) {
			chunks.push(currentChunk);
			currentChunk = [target];
			currentLength = baseLength + targetLength;
		} else {
			currentChunk.push(target);
			currentLength += targetLength;
		}
	}

	if (currentChunk.length > 0) {
		chunks.push(currentChunk);
	}

	return chunks;
};

const resolveFormatterEntryPoint = (rootDir, packageName, binName) => {
	const packageDir = path.resolve(rootDir, 'node_modules', ...packageName.split('/'));
	const packageJsonPath = path.join(packageDir, 'package.json');
	if (!fs.existsSync(packageJsonPath)) {
		throw new Error(
			[`${binName} not found at path: ${packageJsonPath}`, 'Please run `pnpm i` first'].join('\n'),
		);
	}

	const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
	const binEntry =
		typeof packageJson.bin === 'string' ? packageJson.bin : packageJson.bin?.[binName];
	if (typeof binEntry !== 'string' || binEntry.length === 0) {
		throw new Error(
			[
				`${binName} entry point not defined in: ${packageJsonPath}`,
				'Please run `pnpm i` first',
			].join('\n'),
		);
	}

	const entryPoint = path.resolve(packageDir, binEntry);
	if (!fs.existsSync(entryPoint)) {
		throw new Error(
			[`${binName} not found at path: ${entryPoint}`, 'Please run `pnpm i` first'].join('\n'),
		);
	}

	return entryPoint;
};

const runInBatches = (run, command, baseArgs, targets, execOptions, maxArgChars) => {
	const batches = chunkTargets(targets, {
		baseArgs: [command, ...baseArgs],
		maxArgChars,
	});

	for (const batch of batches) {
		run(command, [...baseArgs, ...batch], execOptions);
	}
};

export const formatRootFiles = ({
	rootDir = process.cwd(),
	run = execFileSync,
	maxArgChars = DEFAULT_MAX_ARG_CHARS,
} = {}) => {
	const resolvedRoot = path.resolve(rootDir);
	const { prettierTargets, biomeTargets } = collectFormatTargets(resolvedRoot);

	// Invoke Node CLI entry points directly without a shell so paths with spaces work on Windows too.
	// Discard formatter stdout (matching prior execSync behavior) while preserving stderr diagnostics.
	const execOptions = {
		cwd: resolvedRoot,
		stdio: ['ignore', 'ignore', 'inherit'],
	};

	if (prettierTargets.length > 0) {
		const prettierEntryPoint = resolveFormatterEntryPoint(resolvedRoot, 'prettier', 'prettier');
		const prettierConfig = path.resolve(resolvedRoot, '.prettierrc.js');
		const ignore = path.resolve(resolvedRoot, '.prettierignore');

		runInBatches(
			run,
			process.execPath,
			[prettierEntryPoint, '--config', prettierConfig, '--ignore-path', ignore, '--write'],
			prettierTargets,
			execOptions,
			maxArgChars,
		);
	}

	if (biomeTargets.length > 0) {
		const biomeEntryPoint = resolveFormatterEntryPoint(resolvedRoot, '@biomejs/biome', 'biome');
		const biomeConfig = path.resolve(resolvedRoot, 'biome.jsonc');

		runInBatches(
			run,
			process.execPath,
			[
				biomeEntryPoint,
				'format',
				'--write',
				'--no-errors-on-unmatched',
				`--config-path=${biomeConfig}`,
			],
			biomeTargets,
			execOptions,
			maxArgChars,
		);
	}

	return { prettierTargets, biomeTargets };
};

const resolveRealPath = (filePath) => {
	try {
		return fs.realpathSync.native(filePath);
	} catch {
		return fs.realpathSync(filePath);
	}
};

const isDirectExecution = (entryPath = process.argv[1], moduleUrl = import.meta.url) => {
	if (!entryPath) return false;
	try {
		return resolveRealPath(fileURLToPath(moduleUrl)) === resolveRealPath(entryPath);
	} catch {
		return false;
	}
};

if (isDirectExecution()) {
	formatRootFiles();
}
