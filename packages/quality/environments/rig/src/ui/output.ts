import { stripVTControlCharacters } from 'node:util';
import pc from 'picocolors';

import { CancelledError, RigError } from '../errors';
import { formatLogLine } from './log-format';

const PREFIX_COLORS = [pc.cyan, pc.magenta, pc.yellow, pc.green, pc.blue, pc.red];

export const ui = {
	info(message: string) {
		console.log(`${pc.cyan('›')} ${message}`);
	},
	success(message: string) {
		console.log(`${pc.green('✔')} ${message}`);
	},
	warn(message: string) {
		console.log(`${pc.yellow('!')} ${message}`);
	},
	error(message: string) {
		console.error(`${pc.red('✖')} ${message}`);
	},
	step(message: string) {
		console.log(pc.dim(`  ${message}`));
	},
	header(message: string) {
		console.log(`\n${pc.bold(message)}`);
	},
};

export function printError(error: unknown): void {
	if (error instanceof CancelledError) return;
	if (error instanceof RigError) {
		ui.error(error.message);
		if (error.hint) console.error(pc.dim(`  ${error.hint}`));
		return;
	}
	ui.error(error instanceof Error ? (error.stack ?? error.message) : String(error));
}

/** Prints lines with a colored, aligned component prefix. */
export class PrefixPrinter {
	private readonly colors = new Map<string, (text: string) => string>();
	private width = 0;
	/** When set, only these components show their log lines. Events always show. */
	private visible: Set<string> | undefined;

	/** Output that waits while a prompt shows. */
	private held: string[] | undefined;

	/** Keeps new output until `release`, so it does not break a prompt. */
	hold(): void {
		this.held ??= [];
	}

	release(): void {
		const held = this.held;
		this.held = undefined;
		if (held && held.length > 0) process.stdout.write(held.join(''));
	}

	private write(output: string): void {
		if (this.held) this.held.push(output);
		else process.stdout.write(output);
	}

	/** @param readable Show JSON log lines in a readable form. The log files keep the raw lines. */
	constructor(private readonly readable = true) {}

	setFilter(names: Set<string> | undefined): void {
		this.visible = names && names.size > 0 ? names : undefined;
	}

	color(name: string): (text: string) => string {
		this.register([name]);
		return this.colors.get(name) ?? pc.white;
	}

	register(names: string[]): void {
		for (const name of names) {
			if (!this.colors.has(name)) {
				this.colors.set(name, PREFIX_COLORS[this.colors.size % PREFIX_COLORS.length]);
			}
			this.width = Math.max(this.width, name.length);
		}
	}

	private prefix(name: string): string {
		this.register([name]);
		const color = this.colors.get(name) ?? pc.white;
		return `${color(name.padEnd(this.width))} ${pc.dim('│')} `;
	}

	line(name: string, text: string): void {
		this.lines(name, [text]);
	}

	/** Writes many lines with one write. A terminal write is a blocking system call. */
	lines(name: string, texts: string[]): void {
		if (texts.length === 0 || (this.visible && !this.visible.has(name))) return;
		const prefix = this.prefix(name);
		let output = '';
		for (const text of texts) {
			// Component output can carry terminal control sequences. Strip them.
			const formatted = this.readable ? formatLogLine(text) : stripVTControlCharacters(text);
			// A JSON message can contain new lines. Each one gets the prefix.
			for (const line of formatted.split('\n')) output += `${prefix}${line}\n`;
		}
		this.write(output);
	}

	event(name: string, text: string): void {
		this.write(`${this.prefix(name)}${pc.bold(text)}\n`);
	}
}

export function table(rows: string[][]): string {
	const strip = stripVTControlCharacters;
	const widths: number[] = [];
	for (const row of rows) {
		row.forEach((cell, i) => {
			widths[i] = Math.max(widths[i] ?? 0, strip(cell).length);
		});
	}
	return rows
		.map((row) =>
			row
				.map((cell, i) =>
					i === row.length - 1 ? cell : cell + ' '.repeat(widths[i] - strip(cell).length),
				)
				.join('  '),
		)
		.join('\n');
}
