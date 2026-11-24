import { defineCommand } from 'citty';
import pc from 'picocolors';

import { describeTopology, requiredServices } from '../config/env-yaml';
import { RigError } from '../errors';
import { isReady, readinessProbe } from '../runtime/health';
import { LogFollower, tailLines } from '../runtime/logs';
import { preflight } from '../runtime/preflight';
import { type DependencyMode, Session } from '../runtime/session';
import { openSplit, splitPanes } from '../runtime/split';
import { liveState } from '../runtime/state';
import { type InspectMode, Supervisor } from '../runtime/supervisor';
import { serviceAddress, servicesDown, servicesStatus, servicesUp } from '../services/compose';
import { type Component, portsOf } from '../topology/components';
import { validateTopology } from '../topology/validate';
import { PrefixPrinter, table, ui } from '../ui/output';
import { openUrl } from '../integrations/browser';
import { stopEverything } from './lifecycle';
import {
	envArg,
	loadEnv,
	newSupervisor,
	parseAssignments,
	positionals,
	repeatedFlag,
	restartComponents,
	stopComponents,
} from './common';
import { RIG } from '../meta';

function inspectOption(
	args: { inspect?: boolean; 'inspect-brk'?: boolean },
	components: Component[],
): { mode: InspectMode; components: Set<string> } | undefined {
	const mode: InspectMode | undefined = args['inspect-brk']
		? 'inspect-brk'
		: args.inspect
			? 'inspect'
			: undefined;
	if (!mode) return undefined;
	return { mode, components: new Set(components.map((c) => c.name)) };
}

export const upCommand = defineCommand({
	meta: { name: 'up', description: 'Start the services and all components, and show their logs' },
	args: {
		...envArg,
		'auto-restart': { type: 'boolean', description: 'Restart components when their env changes' },
		split: {
			type: 'boolean',
			description: 'Open one tmux pane for each n8n process. Each pane runs `rig run`',
		},
		inspect: {
			type: 'boolean',
			description: 'Start the n8n processes with the Node inspector (port block +5)',
		},
		'inspect-brk': {
			type: 'boolean',
			description: 'Like --inspect, and wait for a debugger before the first line',
		},
	},
	async run({ args }) {
		const env = loadEnv(args.env);
		const targets = env.components();
		await preflight(env, targets);
		if (args.split) {
			const extra = [
				...(args['auto-restart'] ? ['--auto-restart'] : []),
				...(args['inspect-brk'] ? ['--inspect-brk'] : args.inspect ? ['--inspect'] : []),
			];
			openSplit(env, splitPanes(env, extra));
			return;
		}
		const printer = new PrefixPrinter();
		const supervisor = new Supervisor({ env, printer, inspect: inspectOption(args, targets) });
		await new Session({
			env,
			supervisor,
			printer,
			targets,
			dependencies: 'none',
			autoRestart: Boolean(args['auto-restart']),
			withRunners: true,
		}).run();
	},
});

export const runCommand = defineCommand({
	meta: {
		name: 'run',
		description:
			'Run components or roles in the foreground, for example `rig run worker-2` or `rig run worker`',
	},
	args: {
		...envArg,
		target: {
			type: 'positional',
			required: true,
			description: 'Component or role. Add more after it',
		},
		e: { type: 'string', description: 'One-off env var KEY=VALUE. Not saved. Repeat for more' },
		yes: {
			type: 'boolean',
			alias: 'y',
			description: 'Start missing dependencies in the background without a prompt',
		},
		deps: {
			type: 'boolean',
			default: true,
			description: 'Check dependencies. Use --no-deps to skip',
		},
		'wait-deps': {
			type: 'boolean',
			description: 'Wait for missing dependencies to start elsewhere, without a prompt',
		},
		services: {
			type: 'boolean',
			default: true,
			description: 'Start the services. Use --no-services when they run already',
		},
		launcher: {
			type: 'boolean',
			default: true,
			description:
				'Also run the launcher (or the direct runners) of each process. Use --no-launcher to skip',
		},
		'inherit-env': {
			type: 'boolean',
			description: 'Pass the full parent shell env to the components',
		},
		'auto-restart': { type: 'boolean', description: 'Restart components when their env changes' },
		inspect: {
			type: 'boolean',
			description: 'Start the n8n processes with the Node inspector (port block +5)',
		},
		'inspect-brk': {
			type: 'boolean',
			description: 'Like --inspect, and wait for a debugger before the first line',
		},
	},
	async run({ args, rawArgs }) {
		// One-off values can decide which launchers and runners a process needs.
		const oneOff = parseAssignments(repeatedFlag(rawArgs, ['-e', '--e']));
		const env = loadEnv(args.env).withOverrides({
			oneOff,
			inheritEnv: Boolean(args['inherit-env']),
		});
		const names = positionals(args);
		const selected = names.flatMap((name) => env.select(name));
		if (args.launcher) {
			// A process without its launcher or runners cannot run Code nodes, so they come along.
			const hosts = new Set(selected.map((c) => c.name));
			selected.push(...env.runnerHosts().filter((l) => hosts.has(l.host.name)));
		}
		const targets = [...new Map(selected.map((c) => [c.name, c])).values()];

		await preflight(env, targets, { services: args.services });
		const printer = new PrefixPrinter();
		const supervisor = new Supervisor({
			env,
			printer,
			// Only the named components get the inspector, not the launchers or dependencies.
			inspect: inspectOption(args, selected),
		});
		const dependencies: DependencyMode = !args.deps
			? 'none'
			: args['wait-deps']
				? 'wait'
				: args.yes
					? 'background'
					: 'prompt';
		await new Session({
			env,
			supervisor,
			printer,
			targets,
			dependencies,
			autoRestart: Boolean(args['auto-restart']),
			withRunners: args.launcher,
		}).run();
	},
});

export const stopCommand = defineCommand({
	meta: {
		name: 'stop',
		description: 'Stop components. Without a target, stop all components and the services',
	},
	args: {
		...envArg,
		target: { type: 'positional', required: false, description: 'Component or role' },
	},
	async run({ args }) {
		const env = loadEnv(args.env);
		if (args.target) {
			const targets = positionals(args).flatMap((name) => env.select(name));
			const stopped = await stopComponents(newSupervisor(env), targets);
			ui.success(
				stopped.length > 0 ? `Stopped ${stopped.join(', ')}` : 'No component was running.',
			);
			return;
		}
		if ((await stopEverything(env)).length === 0) ui.success('No component was running.');
		if (requiredServices(env.topology).length > 0) {
			await servicesDown(env.name, env.paths);
			ui.success('Stopped the services. The data stays.');
		}
	},
});

export const restartCommand = defineCommand({
	meta: {
		name: 'restart',
		description: 'Restart components. They keep the terminal that shows their logs',
	},
	args: {
		...envArg,
		target: { type: 'positional', required: true, description: 'Component or role' },
	},
	async run({ args }) {
		const env = loadEnv(args.env);
		validateTopology(env.topology);
		const targets = positionals(args).flatMap((name) => env.select(name));
		await restartComponents(newSupervisor(env), targets);
	},
});

export const servicesCommand = defineCommand({
	meta: { name: 'services', description: 'Start or stop only the service containers' },
	subCommands: {
		up: defineCommand({
			meta: { name: 'up', description: 'Start the services' },
			args: { ...envArg },
			async run({ args }) {
				const env = loadEnv(args.env);
				const services = await servicesUp(env.name, env.topology, env.paths);
				if (services.length === 0) ui.info('This topology needs no services.');
				for (const service of services) {
					ui.success(`${service} is ready: ${serviceAddress(env.topology, env.paths, service)}`);
				}
			},
		}),
		down: defineCommand({
			meta: { name: 'down', description: 'Stop the services. The data stays' },
			args: { ...envArg },
			async run({ args }) {
				const env = loadEnv(args.env);
				await servicesDown(env.name, env.paths);
				ui.success('Stopped the services.');
			},
		}),
	},
});

function uptime(startedAt: string): string {
	const seconds = Math.round((Date.now() - new Date(startedAt).getTime()) / 1000);
	if (seconds < 60) return `${seconds}s`;
	if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
	return `${Math.floor(seconds / 3600)}h${Math.floor((seconds % 3600) / 60)}m`;
}

export const statusCommand = defineCommand({
	meta: { name: 'status', description: 'Show services and components' },
	args: { ...envArg },
	async run({ args }) {
		const env = loadEnv(args.env);
		const supervisor = newSupervisor(env);
		ui.header(`${env.name} · ${describeTopology(env.topology)}`);

		const needed = requiredServices(env.topology);
		if (needed.length > 0) {
			const statuses = servicesStatus(env.name, env.topology);
			const rows = [[pc.dim('SERVICE'), pc.dim('STATE'), pc.dim('ADDRESS')]];
			for (const name of needed) {
				const status = statuses.find((s) => s.name === name);
				const state = status
					? `${status.state}${status.health ? ` (${status.health})` : ''}`
					: 'stopped';
				rows.push([
					name,
					status?.state !== 'running'
						? pc.dim(state)
						: status.health === 'unhealthy'
							? pc.red(state)
							: status.health === '' || status.health === 'healthy'
								? pc.green(state)
								: pc.yellow(state),
					serviceAddress(env.topology, env.paths, name),
				]);
			}
			console.log(`\n${table(rows)}`);
		}

		const rows = [
			[
				pc.dim('COMPONENT'),
				pc.dim('STATE'),
				pc.dim('PID'),
				pc.dim('PORTS'),
				pc.dim('UPTIME'),
				pc.dim('OWNER'),
				pc.dim('DRIFT'),
			],
		];
		const components = env.components();
		const checks = await Promise.all(
			components.map(async (component: Component) => {
				const state = liveState(env.paths, component.name);
				if (!state) return { component, state, ready: false, drift: false };
				const { env: resolved } = env.resolve(component);
				const ready = await isReady(readinessProbe(component, resolved));
				let drift = false;
				try {
					drift = supervisor.hash(component) !== state.envHash;
				} catch {
					drift = false;
				}
				return { component, state, ready, drift };
			}),
		);
		for (const { component, state, ready, drift } of checks) {
			const ports = portsOf(component, env.topology).join(',');
			if (!state) {
				rows.push([component.name, pc.dim('stopped'), '', pc.dim(ports), '', '', '']);
				continue;
			}
			rows.push([
				component.name,
				ready ? pc.green('ready') : pc.yellow('starting'),
				String(state.pid),
				state.inspect && component.kind === 'process'
					? `${ports} ${pc.cyan(`debug:${component.ports.inspect}`)}`
					: ports,
				uptime(state.startedAt),
				state.ownerPid === null
					? pc.dim('background')
					: (state.ownerTty ?? `pid ${state.ownerPid}`),
				drift ? pc.yellow('yes') : pc.dim('no'),
			]);
		}
		console.log(`\n${table(rows)}`);
		if (checks.some((c) => c.drift)) {
			console.log(
				pc.dim(`\nDrift: the env changed after the start. Run \`${RIG} restart <component>\`.`),
			);
		}
		const sources = new Set(checks.map((c) => c.state?.source).filter(Boolean));
		if (sources.size > 0) console.log(pc.dim(`\nSource: ${[...sources].join(', ')}`));
	},
});

export const logsCommand = defineCommand({
	meta: { name: 'logs', description: 'Show the logs of components. Without a target, show all' },
	args: {
		...envArg,
		target: { type: 'positional', required: false, description: 'Component or role' },
		follow: { type: 'boolean', alias: 'f', description: 'Follow new lines' },
		lines: { type: 'string', alias: 'n', description: 'Number of lines to show', default: '100' },
		raw: {
			type: 'boolean',
			description: 'Show JSON log lines as they are. Default when the output is not a terminal',
		},
	},
	async run({ args }) {
		const env = loadEnv(args.env);
		const components = args.target
			? positionals(args).flatMap((name) => env.select(name))
			: env.components();
		const printer = new PrefixPrinter(!args.raw && process.stdout.isTTY);
		printer.register(components.map((c) => c.name));
		const count = Number(args.lines);
		if (!Number.isInteger(count) || count < 1) {
			throw new RigError('--lines must be a whole number greater than 0.');
		}
		for (const component of components) {
			printer.lines(component.name, tailLines(env.paths.log(component.name), count));
		}
		if (!args.follow) return;

		const followers = components.map(
			(component) =>
				new LogFollower(env.paths.log(component.name), (lines) =>
					printer.lines(component.name, lines),
				),
		);
		followers.forEach((f) => f.start());
		await new Promise<void>((resolve) => process.once('SIGINT', () => resolve()));
		followers.forEach((f) => f.stop());
	},
});

export const openCommand = defineCommand({
	meta: { name: 'open', description: 'Open the editor of a main in the browser' },
	args: {
		...envArg,
		target: { type: 'positional', required: false, description: 'Main component, default main-1' },
		public: { type: 'boolean', description: 'Open the public HTTPS URL of the tunnel' },
		mail: { type: 'boolean', description: 'Open the Mailpit UI with the emails of n8n' },
	},
	async run({ args }) {
		const env = loadEnv(args.env);
		if (args.mail) {
			const url = env.mailUrl();
			if (!url) {
				throw new RigError(
					'This environment has no mail server.',
					'Set `mail: mailpit` in env.yaml.',
				);
			}
			await openUrl(url);
			ui.info(url);
			return;
		}
		const publicUrl = args.public ? env.tunnelUrl() : undefined;
		if (args.public && !publicUrl) {
			throw new RigError(
				'The tunnel has no URL.',
				env.topology.tunnel.provider === 'cloudflare'
					? `Run \`${RIG} services up\` or \`${RIG} up\`.`
					: 'Set `tunnel: cloudflare` in env.yaml.',
			);
		}
		const url = publicUrl ?? env.editorUrl(args.target ?? 'main-1');
		await openUrl(url);
		ui.info(url);
	},
});
