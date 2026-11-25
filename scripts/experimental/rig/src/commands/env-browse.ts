import { defineCommand } from 'citty';
import pc from 'picocolors';

import { loadEnvCatalog } from '../env-catalog/catalog';
import type { EnvVarInfo } from '../env-catalog/extract';
import { rankVars, shortDescription } from '../env-catalog/search';
import type { RigEnv } from '../environment';
import { unsetInDotenvFile } from '../env/dotenv';
import { TOPOLOGY_KEYS } from '../env/managed';
import { CancelledError, RigError } from '../errors';
import { RUNNER_LAYERS } from '../topology/components';
import {
	ask,
	type Choice,
	confirm,
	intro,
	isInteractive,
	log,
	multiselect,
	note,
	outro,
	password,
	search,
	select,
	spinner,
} from '../ui/prompt';
import { envArg, loadEnv, offerRestart } from './common';
import { isMaskedValue, isSensitiveKey } from '../env/sensitive';
import {
	generatedSecretWarning,
	isSecretLayer,
	managedConflicts,
	readLayer,
	resolveLayer,
	setInLayer,
} from './layers';
import { RIG } from '../meta';

type Pick =
	| { type: 'done' }
	| { type: 'layer' }
	| { type: 'other'; name?: string }
	| { type: 'var'; info: EnvVarInfo };

/** What the user chose for a value. */
type Answer = { type: 'set'; value: string } | { type: 'unset' } | { type: 'back' };

const ENV_NAME = /^[A-Za-z_][A-Za-z0-9_]*$/;
const MAX_VALUE_WIDTH = 40;

function truncate(value: string, max = MAX_VALUE_WIDTH): string {
	const flat = value.replace(/\s+/g, ' ');
	return flat.length > max ? `${flat.slice(0, max - 1)}…` : flat;
}

/** A value of the layer file for display. Masks secrets: every value of a secrets layer, and sensitive keys. */
export function shownValue(
	layer: string,
	key: string,
	value: string,
	max = MAX_VALUE_WIDTH,
): string {
	return isSecretLayer(layer) || isSensitiveKey(key) ? '••••••' : truncate(value, max);
}

function customVar(name: string): EnvVarInfo {
	return {
		name,
		description: 'This variable is not declared with @Env in the n8n source.',
		kind: 'string',
		group: 'Custom',
		source: '',
	};
}

function isRunnerLayer(layer: string): boolean {
	return RUNNER_LAYERS.some((runner) => layer === runner || layer.startsWith(`${runner}@`));
}

function layerValues(env: RigEnv, layer: string): Map<string, string> {
	return new Map(readLayer(env, layer).map((entry) => [entry.key, entry.value]));
}

/** The value that running components get, for a few components that the layer affects. */
function effectiveValues(env: RigEnv, layer: string, key: string): string[] {
	if (isRunnerLayer(layer)) return [];
	return env
		.affectedBy(layer)
		.slice(0, 4)
		.map((component) => {
			const sources = env.resolve(component).trace.get(key) ?? [];
			const winner = sources[sources.length - 1];
			if (!winner || winner.layer === 'shell') return `${component.name}: ${pc.dim('not set')}`;
			const value = isMaskedValue(key, winner) ? '••••••' : truncate(winner.value, 60);
			return `${component.name}: ${value} ${pc.dim(`(${winner.label})`)}`;
		});
}

function wrap(text: string, width = 76): string[] {
	const lines: string[] = [];
	for (const paragraph of text.split(/\n\s*\n/)) {
		let line = '';
		for (const word of paragraph.split(/\s+/).filter(Boolean)) {
			if (line && line.length + word.length + 1 > width) {
				lines.push(line);
				line = word;
			} else {
				line = line ? `${line} ${word}` : word;
			}
		}
		if (line) lines.push(line);
		lines.push('');
	}
	return lines.slice(0, -1);
}

function details(
	env: RigEnv,
	layer: string,
	info: EnvVarInfo,
	current: string | undefined,
): string {
	const lines = [pc.dim(`${info.group} · ${info.kind}`), ''];
	lines.push(...wrap(info.description || pc.dim('No description.')));
	lines.push('');
	if (info.options)
		lines.push(`Options:  ${info.options.map((o) => (o === '' ? '""' : o)).join(', ')}`);
	if (info.separator && info.kind !== 'json')
		lines.push(`Format:   separated by "${info.separator}"`);
	if (info.defaultValue !== undefined)
		lines.push(`Default:  ${truncate(info.defaultValue, 60) || '""'}`);
	const shown =
		current === undefined ? pc.dim('not set') : pc.green(shownValue(layer, info.name, current, 60));
	lines.push(`In ${env.layerLabel(layer)}: ${shown}`);
	const effective = effectiveValues(env, layer, info.name);
	if (effective.length > 0) {
		lines.push('', pc.dim('Running with:'), ...effective);
	}
	if (info.source) lines.push('', pc.dim(info.source));
	return lines.join('\n');
}

const BACK: Choice<Answer> = { value: { type: 'back' }, label: pc.dim('← Back') };
const UNSET: Choice<Answer> = {
	value: { type: 'unset' },
	label: 'Unset',
	hint: 'remove from this layer',
};
const CUSTOM = 'custom';

function unquoteDefault(value: string | undefined): string | undefined {
	return value?.replace(/^(['"`])(.*)\1$/, '$2');
}

async function askValue(
	info: EnvVarInfo,
	current: string | undefined,
	masked: boolean,
): Promise<Answer> {
	const defaultValue = unquoteDefault(info.defaultValue);
	const extras = current === undefined ? [BACK] : [UNSET, BACK];
	const tag = (value: string) =>
		[value === current ? 'current' : '', value === defaultValue ? 'default' : '']
			.filter(Boolean)
			.join(', ') || undefined;

	if (info.kind === 'boolean' || info.kind === 'enum') {
		const options = info.kind === 'boolean' ? ['true', 'false'] : (info.options ?? []);
		const choices: Array<Choice<Answer | typeof CUSTOM>> = [
			...options.map((option) => ({
				value: { type: 'set' as const, value: option },
				label: option === '' ? '""' : option,
				hint: tag(option),
			})),
			{ value: CUSTOM, label: 'Custom value…' },
			...extras,
		];
		const initial = choices.find(
			(c) =>
				typeof c.value !== 'string' &&
				c.value.type === 'set' &&
				c.value.value === (current ?? defaultValue),
		);
		const answer = await select(info.name, choices, initial?.value);
		if (answer !== CUSTOM) return answer;
		return await askText(info, current, masked);
	}

	if (info.kind === 'enum-list') {
		const separator = info.separator ?? ',';
		const selected = (current ?? '')
			.split(separator)
			.map((v) => v.trim())
			.filter(Boolean);
		const values = await multiselect(
			`${info.name} ${pc.dim('(space toggles, enter confirms, none selected unsets)')}`,
			(info.options ?? []).map((option) => ({ value: option, label: option })),
			selected,
			{ required: false },
		);
		if (values.length === 0) return current === undefined ? { type: 'back' } : { type: 'unset' };
		return { type: 'set', value: values.join(separator) };
	}

	return await askText(info, current, masked);
}

async function askText(
	info: EnvVarInfo,
	current: string | undefined,
	masked: boolean,
): Promise<Answer> {
	if (masked) {
		// A masked input cannot show the value, so unset is a choice, not an empty input.
		if (current !== undefined) {
			const action = await select<'set' | Answer>(info.name, [
				{ value: 'set', label: 'New value…' },
				{ value: UNSET.value, label: UNSET.label, hint: UNSET.hint },
				{ value: BACK.value, label: BACK.label },
			]);
			if (action !== 'set') return action;
		}
		const value = await password(`${info.name} ${pc.dim('(empty goes back)')}`);
		return value === '' ? { type: 'back' } : { type: 'set', value };
	}
	const hint =
		info.kind === 'list'
			? `separated by "${info.separator ?? ','}"`
			: info.kind === 'json'
				? 'JSON'
				: info.kind;
	const value = await ask(
		`${info.name} ${pc.dim(`(${hint}${current === undefined ? '' : ', empty unsets it'})`)}`,
		{
			initialValue: current,
			placeholder: unquoteDefault(info.defaultValue),
			validate: (input) => {
				if (input === '') return undefined;
				if (info.kind === 'number' && Number.isNaN(Number(input))) return 'Enter a number.';
				if (info.kind === 'json') {
					try {
						JSON.parse(input);
					} catch {
						return 'Enter valid JSON.';
					}
				}
				return undefined;
			},
		},
	);
	if (value === '') return current === undefined ? { type: 'back' } : { type: 'unset' };
	return { type: 'set', value };
}

/** Asks before a value overrides the topology or wiring that rig manages. */
async function passesGuardrails(env: RigEnv, layer: string, key: string): Promise<boolean> {
	const topologyKey = TOPOLOGY_KEYS[key];
	if (topologyKey) {
		log.warn(`${key} comes from the topology. Change \`${topologyKey}\` in env.yaml instead.`);
		return await confirm('Set it anyway?', false);
	}
	const generated = generatedSecretWarning(env, layer, key);
	if (generated) {
		log.warn(generated);
		return await confirm('Override it?', false);
	}
	const conflicts = managedConflicts(env, layer, key);
	if (conflicts.length > 0) {
		const list = conflicts.map((c) => `${c.component}=${c.value}`).join(', ');
		log.warn(`rig manages ${key} (${list}). Your value overrides it.`);
		return await confirm('Override it?', false);
	}
	return true;
}

async function chooseLayer(env: RigEnv, layer: string): Promise<string> {
	const targets = env.layerTargets();
	return await select(
		'Layer to edit',
		targets.map((target) => {
			const affected = env.affectedBy(target).map((c) => c.name);
			return {
				value: target,
				label: target,
				hint: affected.length > 3 ? `${affected.length} components` : affected.join(', '),
			};
		}),
		layer,
	);
}

export const browseCommand = defineCommand({
	meta: {
		name: 'browse',
		description: 'Search every env var that n8n reads, and set values interactively',
	},
	args: {
		...envArg,
		on: {
			type: 'string',
			description: 'Layer to edit first: shared (default), a role, a component, or a runner layer',
			valueHint: 'layer',
		},
		refresh: { type: 'boolean', description: 'Read the env vars from the source again' },
		restart: {
			type: 'boolean',
			description: 'Restart affected components at the end without a prompt. --no-restart skips it',
		},
	},
	async run({ args }) {
		if (!isInteractive()) {
			throw new RigError(
				'rig env browse needs a terminal.',
				`Use \`${RIG} env set KEY=VALUE\` instead.`,
			);
		}
		let env = loadEnv(args.env);
		const repoRoot = env.requireRepoRoot();
		let layer = resolveLayer(env, args.on);

		intro(pc.bold(`rig · env · ${env.name}`));
		const loading = spinner();
		loading.start('Reading env vars from the n8n source');
		const { vars, fromCache } = await loadEnvCatalog(repoRoot, { refresh: Boolean(args.refresh) });
		loading.stop(`${vars.length} env vars${fromCache ? '' : ' indexed'}`);

		const changed = new Set<string>();
		while (true) {
			env = env.reload();
			const values = layerValues(env, layer);
			const known = new Set(vars.map((v) => v.name));
			const all = [...vars, ...[...values.keys()].filter((k) => !known.has(k)).map(customVar)];

			const varChoices = new Map<string, Choice<Pick>>();
			const choiceFor = (info: EnvVarInfo): Choice<Pick> => {
				let choice = varChoices.get(info.name);
				if (!choice) {
					const value = values.get(info.name);
					choice = {
						value: { type: 'var', info },
						label:
							value === undefined
								? info.name
								: `${pc.green('●')} ${info.name} ${pc.dim('=')} ${pc.green(shownValue(layer, info.name, value))}`,
						hint: shortDescription(info),
					};
					varChoices.set(info.name, choice);
				}
				return choice;
			};
			const setFirst = [...all].sort(
				(a, b) =>
					Number(values.has(b.name)) - Number(values.has(a.name)) || a.name.localeCompare(b.name),
			);
			const actions: Array<Choice<Pick>> = [
				{ value: { type: 'done' }, label: pc.bold('✓ Done') },
				{ value: { type: 'layer' }, label: '⇄ Change layer', hint: `now: ${layer}` },
				{ value: { type: 'other' }, label: '+ Other variable…', hint: 'a name that is not listed' },
			];
			const otherFor = new Map<string, Choice<Pick>>();

			let pick: Pick;
			try {
				pick = await search(
					`Env var to set in ${pc.cyan(env.layerLabel(layer))} ${pc.dim(`(${values.size} set · type to search)`)}`,
					(term) => {
						if (!term.trim()) return [...actions, ...setFirst.map(choiceFor)];
						const matches = rankVars(all, term).map(choiceFor);
						const name = term.trim().toUpperCase();
						if (ENV_NAME.test(name) && !all.some((v) => v.name === name)) {
							let other = otherFor.get(name);
							if (!other) {
								other = {
									value: { type: 'other', name },
									label: `+ ${name}`,
									hint: 'set a variable with this name',
								};
								otherFor.set(name, other);
							}
							matches.push(other);
						}
						return matches;
					},
				);
			} catch (error) {
				if (error instanceof CancelledError) break;
				throw error;
			}

			if (pick.type === 'done') break;

			try {
				if (pick.type === 'layer') {
					layer = await chooseLayer(env, layer);
					continue;
				}

				let info: EnvVarInfo;
				if (pick.type === 'other') {
					const name =
						pick.name ??
						(await ask('Variable name', {
							validate: (input) =>
								ENV_NAME.test(input) ? undefined : 'Use letters, digits, and underscores.',
						}));
					info = vars.find((v) => v.name === name) ?? customVar(name);
				} else {
					info = pick.info;
				}

				const current = values.get(info.name);
				note(details(env, layer, info, current), info.name);
				const answer = await askValue(
					info,
					current,
					isSecretLayer(layer) || isSensitiveKey(info.name),
				);
				if (answer.type === 'back') continue;

				if (answer.type === 'unset') {
					unsetInDotenvFile(env.layerFile(layer), info.name);
					log.success(`${info.name} removed from ${env.layerLabel(layer)}`);
				} else {
					if (answer.value === current) continue;
					if (!(await passesGuardrails(env, layer, info.name))) continue;
					setInLayer(env, layer, info.name, answer.value);
					log.success(
						`${info.name}=${shownValue(layer, info.name, answer.value, 60)} in ${env.layerLabel(layer)}`,
					);
				}
				changed.add(layer);
			} catch (error) {
				// Ctrl+C in a value prompt goes back to the search.
				if (!(error instanceof CancelledError)) throw error;
			}
		}

		outro(
			changed.size > 0
				? `Changed ${[...changed].map((l) => `env/${l}.env`).join(', ')}`
				: 'No changes.',
		);
		if (changed.size > 0) await offerRestart(env, [...changed], args.restart);
	},
});
