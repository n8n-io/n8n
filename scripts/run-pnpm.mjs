import { spawn, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const WINDOWS_PNPM_ENTRY_PATTERN = /"([^"]*pnpm\.(?:c?js|mjs))"/i;

const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDirectory, '..');

const getFirstPathMatch = (stdout) =>
	stdout
		.split(/\r?\n/)
		.map((line) => line.trim())
		.find((line) => line !== '') ?? null;

const getPathEnvironmentKey = () =>
	Object.keys(process.env).find((environmentKey) => environmentKey.toLowerCase() === 'path') ??
	'PATH';

const prependPathEntries = (existingPath, pathEntries) => {
	const normalizedEntries = pathEntries
		.filter((pathEntry) => typeof pathEntry === 'string' && pathEntry !== '')
		.filter((pathEntry, index, allEntries) => {
			const normalizedEntry = pathEntry.toLowerCase();
			return allEntries.findIndex((entry) => entry.toLowerCase() === normalizedEntry) === index;
		});

	if (normalizedEntries.length === 0) {
		return existingPath;
	}

	return [normalizedEntries.join(path.delimiter), existingPath].filter(Boolean).join(path.delimiter);
};

const findCommandOnPath = (command) => {
	const lookup =
		process.platform === 'win32'
			? spawnSync('where.exe', [command], { encoding: 'utf8' })
			: spawnSync('which', [command], { encoding: 'utf8' });

	if (lookup.status !== 0 || typeof lookup.stdout !== 'string') {
		return null;
	}

	return getFirstPathMatch(lookup.stdout);
};

const resolveWindowsCmdEntry = (commandPath) => {
	if (!existsSync(commandPath)) {
		return null;
	}

	const commandFile = readFileSync(commandPath, 'utf8');
	const entryMatch = commandFile.match(WINDOWS_PNPM_ENTRY_PATTERN);
	if (!entryMatch) {
		return null;
	}

	const commandDirectory = path.dirname(commandPath);
	const expandedEntry = entryMatch[1].replace(/%~dp0/gi, `${commandDirectory}${path.sep}`);
	const normalizedEntry = path.normalize(expandedEntry);

	return existsSync(normalizedEntry) ? normalizedEntry : null;
};

const resolveWindowsPnpm = () => {
	const candidates = [
		path.resolve(repoRoot, '..', '.local-bin', 'pnpm.CMD'),
		findCommandOnPath('pnpm'),
	].filter((candidate) => typeof candidate === 'string' && candidate !== '');

	const seenCandidates = new Set();

	for (const candidate of candidates) {
		const normalizedCandidate = candidate.toLowerCase();
		if (seenCandidates.has(normalizedCandidate)) {
			continue;
		}

		seenCandidates.add(normalizedCandidate);

		const extension = path.extname(candidate).toLowerCase();
		if (extension === '.exe' && existsSync(candidate)) {
			return {
				command: candidate,
				prefixArguments: [],
				pathEntries: [path.dirname(candidate)],
			};
		}

		const entryPath = resolveWindowsCmdEntry(candidate);
		if (entryPath) {
			return {
				command: process.execPath,
				prefixArguments: [entryPath],
				pathEntries: [path.dirname(candidate)],
			};
		}
	}

	return null;
};

const resolvePnpmCommand = () => {
	if (process.platform === 'win32') {
		return resolveWindowsPnpm();
	}

	const workspaceShim = path.resolve(repoRoot, '..', '.local-bin', 'pnpm');
	if (existsSync(workspaceShim)) {
		return {
			command: workspaceShim,
			prefixArguments: [],
			pathEntries: [path.dirname(workspaceShim)],
		};
	}

	return {
		command: 'pnpm',
		prefixArguments: [],
		pathEntries: [],
	};
};

const pnpmCommand = resolvePnpmCommand();
const pathEnvironmentKey = getPathEnvironmentKey();
const childEnvironment = {
	...process.env,
	[pathEnvironmentKey]: prependPathEntries(
		process.env[pathEnvironmentKey] ?? '',
		pnpmCommand?.pathEntries ?? [],
	),
};

if (!pnpmCommand) {
	console.error(
		'Unable to resolve pnpm for Git hooks. Install pnpm or provide a workspace shim at ../.local-bin/pnpm.CMD.',
	);
	process.exit(1);
}

const child = spawn(
	pnpmCommand.command,
	[...pnpmCommand.prefixArguments, ...process.argv.slice(2)],
	{
		cwd: repoRoot,
		env: childEnvironment,
		stdio: 'inherit',
	},
);

child.on('error', (error) => {
	console.error(`Unable to launch pnpm for Git hooks: ${error.message}`);
	process.exit(1);
});

child.on('exit', (code, signal) => {
	if (signal) {
		process.kill(process.pid, signal);
		return;
	}

	process.exit(code ?? 1);
});