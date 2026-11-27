import { stripVTControlCharacters } from 'node:util';

const ESC = '\u001b';
const MIN_ROWS = 8;

/** Cuts a colored string to a visible width. Keeps escape codes and resets the color at the end. */
export function truncateVisible(text: string, width: number): string {
	if (stripVTControlCharacters(text).length <= width) return text;
	let visible = 0;
	let output = '';
	for (let i = 0; i < text.length && visible < width - 1; i++) {
		if (text[i] === ESC) {
			const end = text.indexOf('m', i);
			if (end !== -1) {
				output += text.slice(i, end + 1);
				i = end;
				continue;
			}
		}
		output += text[i];
		visible++;
	}
	return `${output}…${ESC}[0m`;
}

/**
 * A line at the bottom of the terminal. The rows above it are a scroll
 * region, so logs scroll and the line stays. Off when stdout is not a terminal.
 */
export class StatusLine {
	private text = '';
	private active = false;
	private readonly stream = process.stdout;

	private get rows(): number {
		return this.stream.rows ?? 0;
	}

	private readonly onResize = () => {
		if (!this.active) return;
		this.setRegion();
		this.draw();
	};

	start(): void {
		if (!this.stream.isTTY || this.rows < MIN_ROWS) return;
		this.active = true;
		// Make sure the cursor is on an empty line above the last row: a new line
		// (it scrolls when the cursor is at the bottom), then one row up.
		this.stream.write(`\n${ESC}[A`);
		this.setRegion();
		this.stream.on('resize', this.onResize);
		this.draw();
	}

	update(text: string): void {
		if (text === this.text) return;
		this.text = text;
		if (this.active) this.draw();
	}

	stop(): void {
		if (!this.active) return;
		this.active = false;
		this.stream.off('resize', this.onResize);
		// Reset the region, clear the line, and continue below the logs.
		this.stream.write(`${ESC}7${ESC}[r${ESC}[${this.rows};1H${ESC}[2K${ESC}8`);
	}

	private setRegion(): void {
		// Setting a region moves the cursor to the top-left, so save and restore it.
		this.stream.write(`${ESC}7${ESC}[1;${this.rows - 1}r${ESC}8`);
	}

	private draw(): void {
		const width = this.stream.columns ?? 80;
		const line = truncateVisible(this.text, width);
		this.stream.write(`${ESC}7${ESC}[${this.rows};1H${ESC}[2K${line}${ESC}8`);
	}
}
