export interface CliOptions {
	command: 'analyze' | 'baseline' | 'rules';
	rule?: string;
	file?: string;
	ignoreBaseline: boolean;
}

export function parseArgs(args: string[]): CliOptions {
	const options: CliOptions = {
		command: 'analyze',
		ignoreBaseline: false,
	};

	let i = 0;

	if (args.length > 0 && !args[0].startsWith('-')) {
		const command = args[0];
		if (command === 'baseline' || command === 'rules') {
			options.command = command;
		}
		i = 1;
	}

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
