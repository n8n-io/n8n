import { createHash } from 'node:crypto';
import { relative } from 'node:path';

import type { Topology } from '../config/env-yaml';
import { displayPath, type EnvPaths, globalSecretsFile, profileFile } from '../config/paths';
import type {
	Component,
	LauncherComponent,
	ProcessComponent,
	RunnerComponent,
	RunnerLayer,
} from '../topology/components';
import { readDotenv } from './dotenv';
import {
	defaultLauncherEnv,
	defaultProcessEnv,
	defaultRunnerEnv,
	ENGINE_MODULE,
	isControlPlaneOnlyKey,
	isDataPlaneOnlyKey,
	managedDirectRunnerEnv,
	managedLauncherEnv,
	managedProcessEnv,
	managedRunnerEnv,
} from './managed';
import { RUNNER_ALLOWED_ENV } from '../launcher/config';

export type LayerKind =
	| 'shell'
	| 'default'
	| 'managed'
	| 'profile'
	| 'shared'
	| 'role'
	| 'component'
	| 'secrets'
	| 'one-off';

export interface EnvSource {
	layer: LayerKind;
	/** Where the value comes from, for example `env/worker.env:3` or `rig`. */
	label: string;
	value: string;
}

export interface ResolvedEnv {
	env: Record<string, string>;
	/** Every source of each key, from the lowest layer to the winning layer. */
	trace: Map<string, EnvSource[]>;
}

export interface ResolveContext {
	topology: Topology;
	paths: EnvPaths;
	repoRoot?: string;
	/** One-off values from `rig run -e`. */
	oneOff?: Record<string, string>;
	/** Pass the full parent shell env, not only the safe keys. */
	inheritEnv?: boolean;
	/** The public URL of the tunnel, when it runs. */
	tunnelUrl?: string;
}

/** Parent shell keys that every component gets. */
const SHELL_KEYS = [
	'PATH',
	'HOME',
	'TERM',
	'LANG',
	'NODE_OPTIONS',
	'TMPDIR',
	'USER',
	'LOGNAME',
	'SHELL',
];

interface Layer {
	kind: LayerKind;
	entries: Array<{ key: string; value: string; label: string }>;
}

function fromRecord(kind: LayerKind, label: string, record: Record<string, string>): Layer {
	return {
		kind,
		entries: Object.entries(record).map(([key, value]) => ({ key, value, label })),
	};
}

function fromFile(kind: LayerKind, paths: EnvPaths, file: string): Layer {
	// Files outside the environment, like profiles, show with their full path.
	const inside = file.startsWith(`${paths.root}/`);
	const label = inside ? relative(paths.root, file) : displayPath(file);
	return {
		kind,
		entries: readDotenv(file).map((entry) => ({
			key: entry.key,
			value: entry.value,
			label: `${label}:${entry.line}`,
		})),
	};
}

function without(layer: Layer, exclude: (key: string) => boolean): Layer {
	return { kind: layer.kind, entries: layer.entries.filter((entry) => !exclude(entry.key)) };
}

function shellLayer(ctx: ResolveContext): Layer {
	const env: Record<string, string> = {};
	const keys = ctx.inheritEnv ? Object.keys(process.env) : SHELL_KEYS;
	for (const key of keys) {
		const value = process.env[key];
		if (value !== undefined) env[key] = value;
	}
	return fromRecord('shell', 'shell', env);
}

function merge(layers: Layer[]): ResolvedEnv {
	const env: Record<string, string> = {};
	const trace = new Map<string, EnvSource[]>();
	for (const layer of layers) {
		for (const { key, value, label } of layer.entries) {
			env[key] = value;
			const sources = trace.get(key) ?? [];
			sources.push({ layer: layer.kind, label, value });
			trace.set(key, sources);
		}
	}
	return { env, trace };
}

/** Keeps `engine-v2` in `N8N_ENABLED_MODULES` when a layer file sets other modules. */
function ensureEngineModule(resolved: ResolvedEnv): void {
	const modules = (resolved.env.N8N_ENABLED_MODULES ?? '').split(',').filter(Boolean);
	if (modules.includes(ENGINE_MODULE)) return;
	modules.push(ENGINE_MODULE);
	const value = modules.join(',');
	resolved.env.N8N_ENABLED_MODULES = value;
	const sources = resolved.trace.get('N8N_ENABLED_MODULES') ?? [];
	sources.push({ layer: 'managed', label: 'rig (adds engine-v2)', value });
	resolved.trace.set('N8N_ENABLED_MODULES', sources);
}

function secretsExclusion(topology: Topology): (key: string) => boolean {
	return (key) => topology.engine === 'off' && key.startsWith('N8N_ENGINE_');
}

/** The profiles of the topology, in order. They sit between managed vars and shared.env. */
function profileLayers(ctx: ResolveContext, exclude: (key: string) => boolean): Layer[] {
	return ctx.topology.profiles.map((name) =>
		without(fromFile('profile', ctx.paths, profileFile(name)), exclude),
	);
}

/** Global secrets first, so the secrets of the environment win. */
function secretLayers(ctx: ResolveContext, exclude: (key: string) => boolean): Layer[] {
	return [
		without(fromFile('secrets', ctx.paths, globalSecretsFile()), exclude),
		without(fromFile('secrets', ctx.paths, ctx.paths.secrets), exclude),
	];
}

export function resolveProcessEnv(ctx: ResolveContext, component: ProcessComponent): ResolvedEnv {
	const { paths, topology } = ctx;
	let exclude: (key: string) => boolean = () => false;
	if (component.role === 'engine') exclude = isControlPlaneOnlyKey;
	else if (component.role === 'main' && topology.engine === 'remote') exclude = isDataPlaneOnlyKey;
	const excludeSecrets = secretsExclusion(topology);

	const resolved = merge([
		shellLayer(ctx),
		fromRecord('default', 'rig default', defaultProcessEnv()),
		fromRecord('managed', 'rig', managedProcessEnv(ctx, component)),
		...profileLayers(ctx, exclude),
		without(fromFile('shared', paths, paths.layerFile('shared')), exclude),
		fromFile('role', paths, paths.layerFile(component.role)),
		fromFile('component', paths, paths.layerFile(component.name)),
		...secretLayers(ctx, (key) => exclude(key) || excludeSecrets(key)),
		fromRecord('one-off', '-e', ctx.oneOff ?? {}),
	]);

	const usesEngine =
		component.role === 'engine' || (component.role === 'main' && topology.engine !== 'off');
	if (usesEngine) ensureEngineModule(resolved);
	return resolved;
}

export function resolveLauncherEnv(ctx: ResolveContext, component: LauncherComponent): ResolvedEnv {
	const { paths, topology } = ctx;
	return merge([
		shellLayer(ctx),
		fromRecord('default', 'rig default', defaultLauncherEnv()),
		fromRecord('managed', 'rig', managedLauncherEnv(ctx, component)),
		...profileLayers(ctx, () => false),
		fromFile('shared', paths, paths.layerFile('shared')),
		fromFile('role', paths, paths.layerFile('launcher')),
		fromFile('component', paths, paths.layerFile(component.name)),
		...secretLayers(ctx, secretsExclusion(topology)),
		fromRecord('one-off', '-e', ctx.oneOff ?? {}),
	]);
}

/** The `env-overrides` of one runner type of one launcher. */
export function resolveRunnerEnv(
	ctx: ResolveContext,
	host: string,
	layer: RunnerLayer,
): ResolvedEnv {
	const { paths } = ctx;
	return merge([
		fromRecord('default', 'rig default', defaultRunnerEnv(layer)),
		fromRecord('managed', 'rig', managedRunnerEnv(ctx, layer)),
		fromFile('role', paths, paths.layerFile(layer)),
		fromFile('component', paths, paths.layerFile(`${layer}@${host}`)),
	]);
}

/**
 * A direct runner gets what a launcher would pass it: the allowed keys of the
 * launcher layers, then the runner layers. It does not get secrets.
 */
export function resolveDirectRunnerEnv(
	ctx: ResolveContext,
	component: RunnerComponent,
): ResolvedEnv {
	const { paths } = ctx;
	const allowed = new Set(RUNNER_ALLOWED_ENV[component.language]);
	const onlyAllowed = (layer: Layer) => without(layer, (key) => !allowed.has(key));
	return merge([
		shellLayer(ctx),
		onlyAllowed(fromRecord('default', 'rig default', defaultLauncherEnv())),
		...profileLayers(ctx, () => false).map(onlyAllowed),
		onlyAllowed(fromFile('shared', paths, paths.layerFile('shared'))),
		fromRecord('default', 'rig default', defaultRunnerEnv(component.role)),
		fromRecord('managed', 'rig', managedDirectRunnerEnv(ctx, component)),
		fromFile('role', paths, paths.layerFile(component.role)),
		fromFile('component', paths, paths.layerFile(component.name)),
		fromRecord('one-off', '-e', ctx.oneOff ?? {}),
	]);
}

export function resolveEnv(ctx: ResolveContext, component: Component): ResolvedEnv {
	if (component.kind === 'process') return resolveProcessEnv(ctx, component);
	if (component.kind === 'runner') return resolveDirectRunnerEnv(ctx, component);
	return resolveLauncherEnv(ctx, component);
}

export interface EnvDifference {
	key: string;
	a?: EnvSource;
	b?: EnvSource;
}

/** Keys whose values differ, including keys that only one side has. Shell keys do not count. */
export function diffResolved(
	a: ResolvedEnv,
	b: ResolvedEnv,
	includeShell = false,
): EnvDifference[] {
	const winner = (resolved: ResolvedEnv, key: string) => resolved.trace.get(key)?.at(-1);
	const keys = [...new Set([...Object.keys(a.env), ...Object.keys(b.env)])].sort();
	const differences: EnvDifference[] = [];
	for (const key of keys) {
		const left = winner(a, key);
		const right = winner(b, key);
		if (left?.value === right?.value) continue;
		if (
			!includeShell &&
			(left?.layer ?? 'shell') === 'shell' &&
			(right?.layer ?? 'shell') === 'shell'
		) {
			continue;
		}
		differences.push({ key, a: left, b: right });
	}
	return differences;
}

/**
 * The values that the env files and the topology decide. Drift compares these,
 * so the parent shell and one-off values of `rig run -e` do not count.
 */
export function configuredValues(resolved: ResolvedEnv): Record<string, string> {
	const values: Record<string, string> = {};
	for (const [key, sources] of resolved.trace) {
		const configured = sources.filter((s) => s.layer !== 'shell' && s.layer !== 'one-off').at(-1);
		if (configured) values[key] = configured.value;
	}
	return values;
}

export function hashValues(...parts: unknown[]): string {
	const hash = createHash('sha256');
	for (const part of parts) hash.update(stableStringify(part));
	return hash.digest('hex').slice(0, 16);
}

function stableStringify(value: unknown): string {
	if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'undefined';
	if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
	const entries = Object.entries(value).sort(([a], [b]) => a.localeCompare(b));
	return `{${entries.map(([k, v]) => `${JSON.stringify(k)}:${stableStringify(v)}`).join(',')}}`;
}
