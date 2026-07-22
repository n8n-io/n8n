export interface CliOptions {
	command: 'analyze' | 'baseline' | 'rules' | 'verify-closure' | 'verify-npm-install';
	rule?: string;
	file?: string;
	ignoreBaseline: boolean;
	/** Remaining args after the command — interpreted by the `verify-*` subcommands. */
	args: string[];
}

const COMMANDS = new Set(['baseline', 'rules', 'verify-closure', 'verify-npm-install']);

export function parseArgs(args: string[]): CliOptions {
	const options: CliOptions = {
		command: 'analyze',
		ignoreBaseline: false,
		args: [],
	};

	let i = 0;

	if (args.length > 0 && !args[0].startsWith('-')) {
		if (COMMANDS.has(args[0])) {
			options.command = args[0] as CliOptions['command'];
		}
		i = 1;
	}

	options.args = args.slice(i);

	for (; i < args.length; i++) {
		const arg = args[i];

		if (arg === '--ignore-baseline') {
			options.ignoreBaseline = true;
		} else if (arg.startsWith('--rule=')) {
			options.rule = arg.slice('--rule='.length);
		} else if (arg.startsWith('--file=')) {
			options.file = arg.slice('--file='.length);
		}
	}

	return options;
}
