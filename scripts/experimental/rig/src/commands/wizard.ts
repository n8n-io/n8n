import { existsSync } from 'node:fs';
import pc from 'picocolors';

import {
	describeTopology,
	ENV_NAME_PATTERN,
	type EngineMode,
	type Language,
	MAX_SLOT,
	parseTopology,
	type TopologyInput,
} from '../config/env-yaml';
import { isPresetName, PRESETS, type PresetName } from '../config/presets';
import { envPaths } from '../environment';
import { defaultLicense, describeLicense, listLicenses } from '../licenses';
import { addLicenseInteractively } from './license';
import { launcherComponents, processComponents, runnerComponents } from '../topology/components';
import { validateTopology } from '../topology/validate';
import { ask, type Choice, confirm, intro, multiselect, note, outro, select } from '../ui/prompt';
import { slotsInUse } from '../topology/slots';

type Start = PresetName | 'custom';

function counts(
	from: number,
	to: number,
	hint?: (n: number) => string | undefined,
): Array<Choice<number>> {
	return Array.from({ length: to - from + 1 }, (_, i) => from + i).map((n) => ({
		value: n,
		label: String(n),
		hint: hint?.(n),
	}));
}

async function customTopology(): Promise<Omit<TopologyInput, 'name'>> {
	const db = await select<'sqlite' | 'postgres'>('Database', [
		{ value: 'sqlite', label: 'SQLite', hint: 'no containers' },
		{ value: 'postgres', label: 'Postgres', hint: 'runs in a container' },
	]);
	if (db === 'sqlite') {
		return { db, ...(await runnerSetup()) };
	}

	const queue = await select('Execution mode', [
		{ value: false, label: 'Regular', hint: 'the main runs executions' },
		{ value: true, label: 'Queue', hint: 'workers run executions, adds Redis' },
	]);

	const scale = queue
		? {
				mains: await select(
					'Mains',
					counts(1, 4, (n) => (n > 1 ? 'multi-main, needs a license' : undefined)),
					1,
				),
				workers: await select('Workers', counts(0, 4), 1),
			}
		: {};

	// The in-process engine cannot share queue mode.
	const engine = await select<EngineMode>('Engine v2', [
		{ value: 'off', label: 'Off' },
		...(queue
			? []
			: [
					{
						value: 'in-process' as const,
						label: 'In-process',
						hint: 'the data plane runs in the main',
					},
				]),
		{ value: 'remote', label: 'Remote', hint: 'separate `n8n engine` process, adds Redis' },
	]);
	const engineTls =
		engine === 'remote' &&
		(await select('TLS between the main and the engine', [
			{ value: false, label: 'Off', hint: 'plain HTTP on 127.0.0.1' },
			{ value: true, label: 'On', hint: 'mutual TLS with certificates from rig, needs openssl' },
		]));
	return { db, queue, ...scale, engine, engineTls, ...(await runnerSetup()) };
}

async function runnerSetup(): Promise<Pick<TopologyInput, 'runners'>> {
	const choice = await select<'launcher' | 'direct' | 'internal'>('Task runners', [
		{ value: 'launcher', label: 'External via launcher', hint: 'like production' },
		{
			value: 'direct',
			label: 'External, direct',
			hint: 'rig runs each runner as a component, no launcher',
		},
		{ value: 'internal', label: 'Internal', hint: 'n8n starts the runners itself' },
	]);
	if (choice === 'internal') return { runners: { mode: 'internal' } };
	const languages = await multiselect<Language>(
		'Runner languages (space to toggle)',
		[
			{ value: 'js', label: 'JavaScript' },
			{ value: 'python', label: 'Python', hint: 'needs uv' },
		],
		['js', 'python'],
	);
	return { runners: { mode: 'external', via: choice, languages } };
}

function freeName(base: string): string {
	if (!existsSync(envPaths(base).envYaml)) return base;
	for (let i = 2; ; i++) {
		const name = `${base}-${i}`;
		if (!existsSync(envPaths(name).envYaml)) return name;
	}
}

function validateName(name: string): string | undefined {
	if (!ENV_NAME_PATTERN.test(name)) return 'Use lowercase letters, digits, and dashes.';
	if (existsSync(envPaths(name).envYaml)) return `"${name}" exists. Choose another name.`;
	return undefined;
}

function summary(input: TopologyInput): string {
	const topology = parseTopology(input);
	const processes = processComponents(topology);
	const components = [
		...processes,
		// The env does not exist yet. rig sets OFFLOAD_MANUAL_EXECUTIONS_TO_WORKERS=true by default.
		...launcherComponents(topology, processes, () => true),
		...runnerComponents(topology, processes, () => true),
	];
	return [
		describeTopology(topology),
		'',
		...components.map(
			(c) => `${pc.cyan(c.name)}${c.kind === 'process' ? pc.dim(` :${c.ports.http}`) : ''}`,
		),
	].join('\n');
}

// License names cannot start with `:`, so these values do not clash with a name.
const NO_LICENSE = ':none';
const NEW_LICENSE = ':new';

/** Asks for a stored license, or adds a new one. Returns undefined for no license. */
async function licenseStep(mains: number): Promise<string | undefined> {
	while (true) {
		const names = listLicenses();
		const fallback = defaultLicense();
		const choice = await select<string>(
			'License',
			[
				{
					value: NO_LICENSE,
					label: 'None',
					hint: mains > 1 ? 'multi-main needs a license' : undefined,
				},
				...names.map((name) => ({
					value: name,
					label: describeLicense(name),
					hint: name === fallback ? 'default' : undefined,
				})),
				{ value: NEW_LICENSE, label: '+ Add a new license…' },
			],
			fallback ?? (mains > 1 && names.length > 0 ? names[0] : NO_LICENSE),
		);
		if (choice === NO_LICENSE) return undefined;
		if (choice !== NEW_LICENSE) return choice;
		const added = await addLicenseInteractively();
		if (added) return added;
	}
}

/**
 * Asks for a topology and a name with arrow-key prompts. Returns undefined when
 * the user declines. A given license (a name, or `false` for none) skips the license step.
 */
export async function wizard(
	givenName?: string,
	options: { license?: string | false } = {},
): Promise<TopologyInput | undefined> {
	intro(pc.bold('rig · new environment'));

	const presetNames = Object.keys(PRESETS).filter(isPresetName);
	const start = await select<Start>('Topology', [
		...presetNames.map((name) => ({ value: name, label: name, hint: PRESETS[name].description })),
		{ value: 'custom', label: 'custom', hint: 'choose each part' },
	]);

	const topology: Omit<TopologyInput, 'name'> = {
		...(start === 'custom' ? await customTopology() : PRESETS[start].topology),
	};
	const tunnel = await select('Public HTTPS URL', [
		{ value: false, label: 'No', hint: 'localhost only' },
		{
			value: true,
			label: 'Cloudflare quick tunnel',
			hint: 'random trycloudflare.com URL for webhooks and OAuth, no account needed',
		},
	]);
	if (tunnel) topology.tunnel = { provider: 'cloudflare' };
	const mail = await select('Email', [
		{ value: false, label: 'Off', hint: 'n8n sends no emails' },
		{
			value: true,
			label: 'Mailpit',
			hint: 'catches invites and password resets, shows them in a web UI',
		},
	]);
	if (mail) topology.mail = { provider: 'mailpit' };
	const license =
		options.license === undefined ? await licenseStep(topology.mains ?? 1) : options.license;
	if (license) topology.license = license;
	const used = slotsInUse();
	const sharing = used.get(0);
	if (sharing) {
		const slot = Array.from({ length: MAX_SLOT + 1 }, (_, i) => i).find((s) => !used.has(s));
		const choices: Array<Choice<number>> = [
			{
				value: 0,
				label: 'Default ports (slot 0)',
				hint: `same as ${sharing.join(', ')}: they cannot run at the same time`,
			},
		];
		if (slot !== undefined) {
			choices.push({
				value: slot,
				label: `Own ports (slot ${slot})`,
				hint: `runs next to other environments, editor on port ${5678 + 1000 * slot}`,
			});
		}
		topology.slot = await select('Ports', choices, slot ?? 0);
	}
	const name =
		givenName ??
		(await ask('Environment name', {
			defaultValue: freeName(start === 'custom' ? 'local' : start),
			validate: validateName,
		}));

	const input: TopologyInput = { name, ...topology };
	validateTopology(parseTopology(input));
	note(summary(input), name);

	if (!(await confirm('Create it?', true))) {
		outro('Nothing created.');
		return undefined;
	}
	outro(`Creating ${pc.bold(name)}`);
	return input;
}
