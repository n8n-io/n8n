import { existsSync } from 'node:fs';
import pc from 'picocolors';

import {
	describeTopology,
	ENV_NAME_PATTERN,
	type EngineMode,
	type Language,
	parseTopology,
	type TopologyInput,
} from '../config/env-yaml';
import { isPresetName, PRESETS, type PresetName } from '../config/presets';
import { envPaths } from '../environment';
import { launcherComponents, processComponents } from '../topology/components';
import { validateTopology } from '../topology/validate';
import { ask, type Choice, confirm, intro, multiselect, note, outro, select } from '../ui/prompt';

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

	if (queue) {
		const mains = await select(
			'Mains',
			counts(1, 4, (n) => (n > 1 ? 'multi-main, needs a license' : undefined)),
			1,
		);
		const workers = await select('Workers', counts(0, 4), 1);
		return { db, queue, mains, workers, ...(await runnerSetup()) };
	}

	const engine = await select<EngineMode>('Engine v2', [
		{ value: 'off', label: 'Off' },
		{ value: 'in-process', label: 'In-process', hint: 'the data plane runs in the main' },
		{ value: 'remote', label: 'Remote', hint: 'separate `n8n engine` process, adds Redis' },
	]);
	return { db, queue, engine, ...(await runnerSetup()) };
}

async function runnerSetup(): Promise<Pick<TopologyInput, 'runners'>> {
	const mode = await select<'external' | 'internal'>('Task runners', [
		{ value: 'external', label: 'External', hint: 'launcher, like production' },
		{ value: 'internal', label: 'Internal', hint: 'n8n starts the runners itself' },
	]);
	if (mode === 'internal') return { runners: { mode } };
	const languages = await multiselect<Language>(
		'Runner languages (space to toggle)',
		[
			{ value: 'js', label: 'JavaScript' },
			{ value: 'python', label: 'Python', hint: 'needs uv' },
		],
		['js', 'python'],
	);
	return { runners: { mode, languages } };
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
	const components = [...processes, ...launcherComponents(topology, processes, () => false)];
	return [
		describeTopology(topology),
		'',
		...components.map(
			(c) => `${pc.cyan(c.name)}${c.kind === 'process' ? pc.dim(` :${c.ports.http}`) : ''}`,
		),
	].join('\n');
}

/** Asks for a topology and a name with arrow-key prompts. Returns undefined when the user declines. */
export async function wizard(givenName?: string): Promise<TopologyInput | undefined> {
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
