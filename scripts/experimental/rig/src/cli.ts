import { type CommandDef, defineCommand, runCommand as runCitty, runMain, showUsage } from 'citty';

import { cloneCommand } from './commands/clone';
import { doctorCommand } from './commands/doctor';
import { envCommand } from './commands/env';
import {
	createCommand,
	destroyCommand,
	editCommand,
	lsCommand,
	resetCommand,
	useCommand,
} from './commands/lifecycle';
import {
	logsCommand,
	openCommand,
	panesCommand,
	restartCommand,
	runCommand,
	servicesCommand,
	statusCommand,
	stopCommand,
	upCommand,
} from './commands/running';
import {
	configCommand,
	execCommand,
	printCommand,
	psqlCommand,
	redisCliCommand,
} from './commands/tools';
import { licenseCommand } from './commands/license';
import { profileCommand } from './commands/profile';
import { secretsCommand } from './commands/secrets';
import { RigError } from './errors';
import { runningVersion } from './meta';
import { printError } from './ui/output';

const rig = defineCommand({
	meta: {
		name: 'rig',
		version: runningVersion(),
		description: 'Create and run local n8n environments',
	},
	subCommands: {
		create: createCommand,
		ls: lsCommand,
		use: useCommand,
		reset: resetCommand,
		destroy: destroyCommand,
		clone: cloneCommand,
		edit: editCommand,
		up: upCommand,
		run: runCommand,
		stop: stopCommand,
		restart: restartCommand,
		status: statusCommand,
		logs: logsCommand,
		open: openCommand,
		panes: panesCommand,
		services: servicesCommand,
		env: envCommand,
		profile: profileCommand,
		license: licenseCommand,
		secrets: secretsCommand,
		exec: execCommand,
		print: printCommand,
		psql: psqlCommand,
		'redis-cli': redisCliCommand,
		config: configCommand,
		doctor: doctorCommand,
	},
});

/** The code of a citty usage error, for example `E_NO_COMMAND`. */
function usageErrorCode(error: unknown): string | undefined {
	if (!(error instanceof Error) || error.name !== 'CLIError') return undefined;
	return 'code' in error && typeof error.code === 'string' ? error.code : 'E_USAGE';
}

async function main(): Promise<void> {
	const rawArgs = process.argv.slice(2);
	if (rawArgs.length === 1 && ['--version', '-v'].includes(rawArgs[0])) {
		console.log(`rig ${runningVersion()}`);
		return;
	}
	const beforeSeparator = rawArgs.includes('--')
		? rawArgs.slice(0, rawArgs.indexOf('--'))
		: rawArgs;
	if (
		rawArgs.length === 0 ||
		beforeSeparator.includes('--help') ||
		beforeSeparator.includes('-h')
	) {
		// citty prints the usage.
		await runMain(rig, { rawArgs: rawArgs.length === 0 ? ['--help'] : beforeSeparator });
		return;
	}
	try {
		await runCitty(rig, { rawArgs });
	} catch (error) {
		const code = usageErrorCode(error);
		if (!code) {
			printError(error);
			process.exitCode = 1;
			return;
		}
		await showUsage(...(await resolveCommand(rawArgs)));
		// A command group without a subcommand, like `rig services`, asks for its usage.
		if (code === 'E_NO_COMMAND') return;
		printError(new RigError(error instanceof Error ? error.message : String(error)));
		process.exitCode = 1;
	}
}

/** The command that the arguments name, and its parent. Used to show the right usage. */
async function resolveCommand(rawArgs: string[]): Promise<[CommandDef, CommandDef?]> {
	let command: CommandDef = rig;
	let parent: CommandDef | undefined;
	let rest = rawArgs;
	while (true) {
		const subCommands = command.subCommands;
		if (!subCommands || typeof subCommands === 'function' || subCommands instanceof Promise) break;
		const index = rest.findIndex((arg) => !arg.startsWith('-'));
		const next = index === -1 ? undefined : subCommands[rest[index]];
		if (!next || typeof next === 'function' || next instanceof Promise) break;
		parent = command;
		command = next;
		rest = rest.slice(index + 1);
	}
	return [command, parent];
}

// A closed terminal makes writes fail. Ignore that, so a shutdown still stops every component.
for (const stream of [process.stdout, process.stderr]) stream.on('error', () => {});

process.on('unhandledRejection', (error) => {
	printError(error);
	process.exit(1);
});

void main();
