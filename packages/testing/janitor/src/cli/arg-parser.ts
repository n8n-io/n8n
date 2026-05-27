/**
 * CLI Argument Parser
 *
 * Extracts argument parsing logic from main CLI.
 * Handles subcommands, flags, and options.
 */

export type Command =
	| 'analyze'
	| 'tcr'
	| 'inventory'
	| 'impact'
	| 'method-impact'
	| 'baseline'
	| 'rules'
	| 'discover'
	| 'orchestrate'
	| 'affected-packages'
	| 'scope'
	| 'test-scoped'
	| 'filter-shard';

export interface CliOptions {
	command: Command;
	config?: string;
	rule?: string;
	files?: string[];
	json: boolean;
	verbose: boolean;
	fix: boolean;
	write: boolean;
	help: boolean;
	list: boolean;
	// TCR-specific options
	execute: boolean;
	message?: string;
	baseRef?: string;
	targetBranch?: string;
	maxDiffLines?: number;
	testCommand?: string;
	// Impact-specific options
	testList: boolean;
	// Method-impact specific options
	method?: string;
	methodIndex: boolean;
	// Rule-specific options
	allowInExpect: boolean;
	// Baseline options
	ignoreBaseline: boolean;
	// Inventory-specific options
	summary: boolean;
	category?: string;
	// Orchestration-specific options
	shards?: number;
	shardIndex?: number;
	impact: boolean;
	// Affected-packages / scope options
	changedFiles?: string;
	runner?: 'jest' | 'vitest';
	packageDir?: string;
	/** Anything after `--` — forwarded to the test runner by `test-scoped`. */
	passthroughArgs: string[];
	// filter-shard-specific options
	url?: string;
}

const SUBCOMMANDS: Record<string, Command> = {
	tcr: 'tcr',
	inventory: 'inventory',
	impact: 'impact',
	'method-impact': 'method-impact',
	baseline: 'baseline',
	rules: 'rules',
	discover: 'discover',
	orchestrate: 'orchestrate',
	'affected-packages': 'affected-packages',
	scope: 'scope',
	'test-scoped': 'test-scoped',
	'filter-shard': 'filter-shard',
};

interface FlagHandler {
	(options: CliOptions, value?: string): void;
}

const FLAG_HANDLERS: Record<string, FlagHandler> = {
	'--help': (opts) => {
		opts.help = true;
	},
	'-h': (opts) => {
		opts.help = true;
	},
	'--json': (opts) => {
		opts.json = true;
	},
	'--verbose': (opts) => {
		opts.verbose = true;
	},
	'-v': (opts) => {
		opts.verbose = true;
	},
	'--fix': (opts) => {
		opts.fix = true;
	},
	'--write': (opts) => {
		opts.write = true;
	},
	'--list': (opts) => {
		opts.list = true;
	},
	'-l': (opts) => {
		opts.list = true;
	},
	'--execute': (opts) => {
		opts.execute = true;
	},
	'-x': (opts) => {
		opts.execute = true;
	},
	'--test-list': (opts) => {
		opts.testList = true;
	},
	'--index': (opts) => {
		opts.methodIndex = true;
	},
	'--allow-in-expect': (opts) => {
		opts.allowInExpect = true;
	},
	'--ignore-baseline': (opts) => {
		opts.ignoreBaseline = true;
	},
	'--summary': (opts) => {
		opts.summary = true;
	},
	'-s': (opts) => {
		opts.summary = true;
	},
	'--impact': (opts) => {
		opts.impact = true;
	},
};

const VALUE_FLAG_HANDLERS: Record<string, (options: CliOptions, value: string) => void> = {
	'--config=': (opts, value) => {
		opts.config = value;
	},
	'--rule=': (opts, value) => {
		opts.rule = value;
	},
	'--file=': (opts, value) => {
		opts.files?.push(value);
	},
	'--files=': (opts, value) => {
		opts.files?.push(...value.split(','));
	},
	'--message=': (opts, value) => {
		opts.message = value;
	},
	'-m=': (opts, value) => {
		opts.message = value;
	},
	'--base=': (opts, value) => {
		opts.baseRef = value;
	},
	'--method=': (opts, value) => {
		opts.method = value;
	},
	'--target-branch=': (opts, value) => {
		opts.targetBranch = value;
	},
	'--max-diff-lines=': (opts, value) => {
		opts.maxDiffLines = Number.parseInt(value, 10);
	},
	'--test-command=': (opts, value) => {
		opts.testCommand = value;
	},
	'--category=': (opts, value) => {
		opts.category = value;
	},
	'--shards=': (opts, value) => {
		opts.shards = Number.parseInt(value, 10);
	},
	'--shard-index=': (opts, value) => {
		opts.shardIndex = Number.parseInt(value, 10);
	},
	'--changed-files=': (opts, value) => {
		opts.changedFiles = value;
	},
	'--runner=': (opts, value) => {
		if (value === 'jest' || value === 'vitest') {
			opts.runner = value;
		} else {
			throw new Error(`Unknown --runner=${value}. Expected 'jest' or 'vitest'.`);
		}
	},
	'--package-dir=': (opts, value) => {
		opts.packageDir = value;
	},
	'--url=': (opts, value) => {
		opts.url = value;
	},
};

function createDefaultOptions(): CliOptions {
	return {
		command: 'analyze',
		config: undefined,
		rule: undefined,
		files: [],
		json: false,
		verbose: false,
		fix: false,
		write: false,
		help: false,
		list: false,
		execute: false,
		message: undefined,
		baseRef: undefined,
		targetBranch: undefined,
		maxDiffLines: undefined,
		testCommand: undefined,
		testList: false,
		method: undefined,
		methodIndex: false,
		allowInExpect: false,
		ignoreBaseline: false,
		summary: false,
		category: undefined,
		shards: undefined,
		shardIndex: undefined,
		impact: false,
		changedFiles: undefined,
		runner: undefined,
		packageDir: undefined,
		passthroughArgs: [],
		url: undefined,
	};
}

function parseSubcommand(args: string[]): { command: Command; startIdx: number } {
	if (args[0] && !args[0].startsWith('-')) {
		const subcommand = SUBCOMMANDS[args[0]];
		if (subcommand) {
			return { command: subcommand, startIdx: 1 };
		}
	}
	return { command: 'analyze', startIdx: 0 };
}

/**
 * For test-scoped, unrecognised flags must forward to the underlying runner
 * (jest/vitest) — they can't be silently dropped because consumers compose
 * extra flags via turbo + npm script chains. For all other subcommands the
 * passthrough list stays empty and unused.
 */
const PASSTHROUGH_COMMANDS = new Set<Command>(['test-scoped']);

function parseFlags(args: string[], startIdx: number, options: CliOptions): void {
	const allowPassthrough = PASSTHROUGH_COMMANDS.has(options.command);
	let passthroughActive = false;
	for (let i = startIdx; i < args.length; i++) {
		const arg = args[i];

		if (passthroughActive) {
			options.passthroughArgs.push(arg);
			continue;
		}
		if (arg === '--') {
			passthroughActive = true;
			continue;
		}

		// Handle simple flags
		const handler = FLAG_HANDLERS[arg];
		if (handler) {
			handler(options);
			continue;
		}

		// Handle value flags
		let matched = false;
		for (const [prefix, valueHandler] of Object.entries(VALUE_FLAG_HANDLERS)) {
			if (arg.startsWith(prefix)) {
				const value = arg.slice(prefix.length);
				valueHandler(options, value);
				matched = true;
				break;
			}
		}
		if (!matched && allowPassthrough) {
			options.passthroughArgs.push(arg);
		}
	}
}

export function parseArgs(): CliOptions {
	const args = process.argv.slice(2);
	const options = createDefaultOptions();

	const { command, startIdx } = parseSubcommand(args);
	options.command = command;

	parseFlags(args, startIdx, options);

	return options;
}
