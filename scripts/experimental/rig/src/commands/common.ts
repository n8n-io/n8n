import pc from 'picocolors';

import { RigEnv } from '../environment';
import { RigError } from '../errors';
import { liveState } from '../runtime/state';
import { Supervisor } from '../runtime/supervisor';
import { type Component, startStages } from '../topology/components';
import { PrefixPrinter, printError, ui } from '../ui/output';
import { confirm, isInteractive } from '../ui/prompt';
import { RIG } from '../meta';

export const envArg = {
	env: {
		type: 'string',
		description: 'Environment name. Defaults to RIG_ENV, then to the default environment',
		valueHint: 'name',
	},
} as const;

export function loadEnv(flag: unknown): RigEnv {
	return RigEnv.load(typeof flag === 'string' && flag.length > 0 ? flag : undefined);
}

export function newSupervisor(env: RigEnv): Supervisor {
	return new Supervisor({ env, printer: new PrefixPrinter() });
}

/** Values of a repeatable flag, for example `-e A=1 -e B=2`. citty keeps only one value. */
export function repeatedFlag(rawArgs: string[], names: string[]): string[] {
	const values: string[] = [];
	for (let i = 0; i < rawArgs.length; i++) {
		const arg = rawArgs[i];
		if (arg === '--') break;
		if (names.includes(arg) && i + 1 < rawArgs.length) {
			values.push(rawArgs[++i]);
			continue;
		}
		for (const name of names) {
			if (name.startsWith('--') && arg.startsWith(`${name}=`))
				values.push(arg.slice(name.length + 1));
		}
	}
	return values;
}

export function parseAssignments(values: string[]): Record<string, string> {
	const result: Record<string, string> = {};
	for (const value of values) {
		const index = value.indexOf('=');
		if (index <= 0) throw new RigError(`Invalid assignment "${value}". Use KEY=VALUE.`);
		result[value.slice(0, index)] = value.slice(index + 1);
	}
	return result;
}

/** Positional arguments after the command name and before `--`. */
export function positionals(args: { _: string[] }): string[] {
	return args._.filter((arg) => arg.length > 0);
}

/** Stops components in reverse start order. */
export async function stopComponents(
	supervisor: Supervisor,
	components: Component[],
): Promise<string[]> {
	const stopped: string[] = [];
	for (const stage of startStages(components).reverse()) {
		await Promise.all(
			stage.map(async (component) => {
				try {
					if (await supervisor.stop(component)) stopped.push(component.name);
				} catch (error) {
					printError(error);
				}
			}),
		);
	}
	return stopped;
}

/** Restarts components in start order and waits until they are ready. */
export async function restartComponents(
	supervisor: Supervisor,
	components: Component[],
): Promise<void> {
	for (const stage of startStages(supervisor.env.withDependentRunners(components))) {
		await Promise.all(
			stage.map(async (component) => {
				ui.info(`Restarting ${component.name}`);
				const pid = await supervisor.restart(component);
				const result = await supervisor.waitReady(component, pid);
				if (result === 'ready') ui.success(`${component.name} is ready (pid ${pid})`);
				else
					ui.error(
						`${component.name} is not ready (${result}). Logs: ${RIG} logs ${component.name}`,
					);
			}),
		);
	}
	supervisor.release();
}

/** Components of the environment that run with an env older than their files. */
export function driftedComponents(env: RigEnv, components: Component[]): Component[] {
	const supervisor = newSupervisor(env);
	return components.filter((component) => {
		const state = liveState(env.paths, component.name);
		return state !== undefined && supervisor.hash(component) !== state.envHash;
	});
}

/** After a change in a layer file: reports drift and offers a restart. */
export async function offerRestart(
	env: RigEnv,
	layer: string | string[],
	restart: boolean | undefined,
): Promise<void> {
	const fresh = env.reload();
	const layers = Array.isArray(layer) ? layer : [layer];
	const affected = [
		...new Map(layers.flatMap((l) => fresh.affectedBy(l)).map((c) => [c.name, c])).values(),
	];
	const drifted = driftedComponents(fresh, affected);
	if (drifted.length === 0) {
		const running = affected.filter((c) => liveState(fresh.paths, c.name));
		ui.step(
			running.length === 0
				? `Affects: ${affected.map((c) => c.name).join(', ') || 'no component'} (not running)`
				: 'No running component has a different env now.',
		);
		return;
	}

	const names = drifted.map((c) => c.name).join(', ');
	ui.info(`Affects running components: ${pc.bold(names)}`);
	const doRestart = restart ?? (isInteractive() ? await confirm('Restart them now?', true) : false);
	if (!doRestart) {
		ui.step(
			`Restart later with \`${RIG} restart <component>\`, or press r in the terminal that runs them.`,
		);
		return;
	}
	await restartComponents(newSupervisor(fresh), drifted);
}
