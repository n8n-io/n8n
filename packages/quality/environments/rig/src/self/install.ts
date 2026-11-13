import { spawnSync } from 'node:child_process';
import {
	accessSync,
	chmodSync,
	constants,
	copyFileSync,
	existsSync,
	mkdirSync,
	readFileSync,
	renameSync,
	rmSync,
	writeFileSync,
} from 'node:fs';
import { homedir } from 'node:os';
import { delimiter, dirname, join } from 'node:path';
import { z } from 'zod';

import { dataDir } from '../config/paths';
import { RigError } from '../errors';
import { type BuildInfo, versionId } from './build-info';

/** The rig package inside an n8n checkout. */
export const RIG_PACKAGE_DIR = 'packages/quality/environments/rig';
/** The number of installed versions to keep for rollbacks. */
const KEEP_VERSIONS = 5;
const SHIM_MARKER = '# rig-shim';

const buildInfoSchema = z.object({
	version: z.string(),
	commit: z.string(),
	dirty: z.boolean(),
	builtAt: z.string(),
});

const installedSchema = buildInfoSchema.extend({
	/** The checkout that the version was built from. */
	checkout: z.string(),
});
export type InstalledVersion = z.infer<typeof installedSchema>;

const installStateSchema = z.object({
	current: z.string(),
	/** Installed version ids, oldest first. */
	history: z.array(z.string()),
});
type InstallState = z.infer<typeof installStateSchema>;

export function versionsDir(): string {
	return join(dataDir(), 'versions');
}

function installStateFile(): string {
	return join(dataDir(), 'install.json');
}

/** The directory of the shim. `RIG_BIN_DIR` overrides `~/.local/bin`. */
export function binDir(): string {
	return process.env.RIG_BIN_DIR ?? join(homedir(), '.local', 'bin');
}

export function shimPath(): string {
	return join(binDir(), 'rig');
}

function bundlePath(id: string): string {
	return join(versionsDir(), id, 'rig.mjs');
}

function readJson<T>(file: string, schema: z.ZodType<T>): T | undefined {
	if (!existsSync(file)) return undefined;
	try {
		const result = schema.safeParse(JSON.parse(readFileSync(file, 'utf8')));
		return result.success ? result.data : undefined;
	} catch {
		return undefined;
	}
}

function writeJson(file: string, value: unknown): void {
	mkdirSync(dirname(file), { recursive: true });
	const temporary = `${file}.tmp`;
	writeFileSync(temporary, `${JSON.stringify(value, null, 2)}\n`);
	renameSync(temporary, file);
}

function readInstallState(): InstallState | undefined {
	return readJson(installStateFile(), installStateSchema);
}

export function installedVersion(id: string): InstalledVersion | undefined {
	return readJson(join(versionsDir(), id, 'build.json'), installedSchema);
}

/** The version that the shim runs, if rig is installed. */
export function currentInstall(): { id: string; info?: InstalledVersion } | undefined {
	const state = readInstallState();
	if (!state) return undefined;
	return { id: state.current, info: installedVersion(state.current) };
}

function shellQuote(value: string): string {
	return `'${value.replace(/'/g, "'\\''")}'`;
}

export function isShim(file: string): boolean {
	try {
		return readFileSync(file, 'utf8').includes(SHIM_MARKER);
	} catch {
		return false;
	}
}

/**
 * Writes the shim. It runs `node` from `PATH`, so a Node version switch
 * applies to rig too.
 */
function writeShim(id: string, force: boolean): void {
	const file = shimPath();
	if (existsSync(file) && !isShim(file) && !force) {
		throw new RigError(
			`${file} exists and rig did not create it.`,
			'Remove it, or run the command again with `--force` to replace it.',
		);
	}
	mkdirSync(dirname(file), { recursive: true });
	const temporary = `${file}.tmp`;
	writeFileSync(
		temporary,
		[
			'#!/bin/sh',
			`${SHIM_MARKER}: written by \`rig install-global\` and \`rig self-update\`. Do not edit.`,
			`exec node ${shellQuote(bundlePath(id))} "$@"`,
			'',
		].join('\n'),
	);
	chmodSync(temporary, 0o755);
	renameSync(temporary, file);
}

function prune(state: InstallState): InstallState {
	const keep = state.history.slice(-KEEP_VERSIONS);
	if (!keep.includes(state.current)) keep.push(state.current);
	for (const id of state.history) {
		if (!keep.includes(id)) rmSync(join(versionsDir(), id), { recursive: true, force: true });
	}
	return { current: state.current, history: keep };
}

/** Builds the bundle in a checkout with tsdown. Returns the file and its build info. */
export function buildBundle(checkout: string): { file: string; info: BuildInfo } {
	const packageDir = join(checkout, RIG_PACKAGE_DIR);
	if (!existsSync(join(packageDir, 'package.json'))) {
		throw new RigError(
			`${checkout} has no rig package.`,
			'Use a checkout of a branch that contains rig.',
		);
	}
	const tsdown = join(packageDir, 'node_modules', '.bin', 'tsdown');
	if (!existsSync(tsdown)) {
		throw new RigError(
			`The rig dependencies are not installed in ${checkout}.`,
			`Run \`pnpm install\` in ${checkout}.`,
		);
	}
	const result = spawnSync(tsdown, ['--config-loader', 'unrun', '--logLevel', 'warn'], {
		cwd: packageDir,
		encoding: 'utf8',
	});
	if (result.error || result.status !== 0) {
		const output = `${result.stdout ?? ''}${result.stderr ?? ''}`.trim();
		throw new RigError(`Cannot build rig: ${result.error?.message ?? output}`);
	}
	const file = join(packageDir, 'dist', 'rig.mjs');
	const info = readJson(join(packageDir, 'dist', 'build.json'), buildInfoSchema);
	if (!existsSync(file) || !info) throw new RigError(`The build did not write ${file}.`);
	return { file, info };
}

/** Copies a bundle into the versions directory and points the shim to it. */
export function installBundle(
	bundle: { file: string; info: BuildInfo },
	checkout: string,
	options: { force?: boolean } = {},
): { id: string; previous?: string } {
	const id = versionId(bundle.info);
	const target = bundlePath(id);
	mkdirSync(dirname(target), { recursive: true });
	copyFileSync(bundle.file, target);
	writeJson(join(dirname(target), 'build.json'), { ...bundle.info, checkout });

	writeShim(id, options.force ?? false);
	const state = readInstallState();
	const history = [...(state?.history ?? []).filter((entry) => entry !== id), id];
	writeJson(installStateFile(), prune({ current: id, history }));
	return { id, previous: state?.current === id ? undefined : state?.current };
}

/** Points the shim to the version before the current one. */
export function rollback(): { from: string; to: string } {
	const state = readInstallState();
	if (!state) throw new RigError('rig is not installed globally.');
	const index = state.history.indexOf(state.current);
	const candidates = state.history
		.slice(0, index === -1 ? state.history.length : index)
		.filter((id) => existsSync(bundlePath(id)));
	const to = candidates.at(-1);
	if (!to) throw new RigError('There is no earlier version to roll back to.');
	writeShim(to, false);
	writeJson(installStateFile(), { ...state, current: to });
	return { from: state.current, to };
}

export function installedIds(): string[] {
	return readInstallState()?.history ?? [];
}

function isExecutable(file: string): boolean {
	try {
		accessSync(file, constants.X_OK);
		return true;
	} catch {
		return false;
	}
}

/** Whether the shim directory is on `PATH`, and which `rig` the shell finds first. */
export function pathStatus(): { onPath: boolean; first?: string } {
	const dirs = (process.env.PATH ?? '').split(delimiter).filter(Boolean);
	const first = dirs.map((dir) => join(dir, 'rig')).find(isExecutable);
	return { onPath: dirs.includes(binDir()), first };
}
