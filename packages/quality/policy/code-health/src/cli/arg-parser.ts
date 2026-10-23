// The default command is `analyze`; these are the explicit subcommands accepted as argv[0].
const SUBCOMMANDS = ['baseline', 'rules', 'verify-closure', 'verify-npm-install'] as const;
type Subcommand = (typeof SUBCOMMANDS)[number];

export interface CliOptions {
	command: 'analyze' | Subcommand;
	rule?: string;
	file?: string;
	ignoreBaseline: boolean;
	/** Remaining args after the command — interpreted by the `verify-*` subcommands. */
	args: string[];
}

function isSubcommand(value: string): value is Subcommand {
	return (SUBCOMMANDS as readonly string[]).includes(value);
}

export function parseArgs(args: string[]): CliOptions {
	const options: CliOptions = {
		command: 'analyze',
		ignoreBaseline: false,
		args: [],
	};

	let i = 0;

	// Every caller spells the subcommand out in a YAML or shell literal, so a typo must not fall
	// back to `analyze` — that reports 0 new violations and exits 0, i.e. a pass that checked
	// nothing the caller asked for.
	if (args.length > 0 && !args[0].startsWith('-')) {
		if (!isSubcommand(args[0])) {
			throw new Error(`Unknown command "${args[0]}". Expected one of: ${SUBCOMMANDS.join(', ')}.`);
		}
		options.command = args[0];
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
