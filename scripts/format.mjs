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

const resolveBin = (rootDir, name) =>
	path.resolve(
		rootDir,
		'node_modules',
		'.bin',
		process.platform === 'win32' ? `${name}.cmd` : name,
	);

const assertBinExists = (binPath) => {
	if (!fs.existsSync(binPath)) {
		throw new Error(
			[`${path.basename(binPath)} not found at path: ${binPath}`, 'Please run `pnpm i` first'].join(
				'\n',
			),
		);
	}
};

export const formatRootFiles = ({ rootDir = process.cwd(), run = execFileSync } = {}) => {
	const resolvedRoot = path.resolve(rootDir);
	const { prettierTargets, biomeTargets } = collectFormatTargets(resolvedRoot);

	const execOptions = {
		cwd: resolvedRoot,
		stdio: 'inherit',
		...(process.platform === 'win32' ? { shell: true } : {}),
	};

	if (prettierTargets.length > 0) {
		const prettier = resolveBin(resolvedRoot, 'prettier');
		assertBinExists(prettier);
		const prettierConfig = path.resolve(resolvedRoot, '.prettierrc.js');
		const ignore = path.resolve(resolvedRoot, '.prettierignore');

		run(
			prettier,
			['--config', prettierConfig, '--ignore-path', ignore, '--write', ...prettierTargets],
			execOptions,
		);
	}

	if (biomeTargets.length > 0) {
		const biome = resolveBin(resolvedRoot, 'biome');
		assertBinExists(biome);
		const biomeConfig = path.resolve(resolvedRoot, 'biome.jsonc');

		run(biome, ['format', '--write', `--config-path=${biomeConfig}`, ...biomeTargets], execOptions);
	}

	return { prettierTargets, biomeTargets };
};

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
	formatRootFiles();
}
