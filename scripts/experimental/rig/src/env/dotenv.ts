import { existsSync, readFileSync, writeFileSync } from 'node:fs';

/** One `KEY=value` line of a dotenv file. */
export interface DotenvEntry {
	key: string;
	value: string;
	/** 1-based line number. */
	line: number;
}

const LINE_PATTERN = /^\s*(#\s*)?(?:export\s+)?([A-Za-z_][A-Za-z0-9_.]*)\s*=\s*(.*)$/;

interface ParsedLine {
	key: string;
	rawValue: string;
	commented: boolean;
}

function parseLine(line: string): ParsedLine | undefined {
	const match = LINE_PATTERN.exec(line);
	if (!match) return undefined;
	return { commented: match[1] !== undefined, key: match[2], rawValue: match[3] };
}

function unquote(raw: string): string {
	const value = raw.trim();
	if (value.startsWith('"')) {
		const end = findClosingQuote(value, '"');
		const inner = value.slice(1, end === -1 ? undefined : end);
		return inner.replace(/\\(.)/g, (_match, char: string) => {
			if (char === 'n') return '\n';
			if (char === 'r') return '\r';
			if (char === 't') return '\t';
			return char;
		});
	}
	if (value.startsWith("'")) {
		const end = value.indexOf("'", 1);
		return value.slice(1, end === -1 ? undefined : end);
	}
	const comment = value.search(/\s#/);
	return (comment === -1 ? value : value.slice(0, comment)).trim();
}

function findClosingQuote(value: string, quote: string): number {
	for (let i = 1; i < value.length; i++) {
		if (value[i] === '\\') {
			i++;
			continue;
		}
		if (value[i] === quote) return i;
	}
	return -1;
}

/** Parses dotenv text. A later line for the same key wins. Commented lines are skipped. */
export function parseDotenv(text: string): DotenvEntry[] {
	const entries: DotenvEntry[] = [];
	text.split(/\r?\n/).forEach((line, index) => {
		const parsed = parseLine(line);
		if (!parsed || parsed.commented) return;
		entries.push({ key: parsed.key, value: unquote(parsed.rawValue), line: index + 1 });
	});
	return entries;
}

export function readDotenv(file: string): DotenvEntry[] {
	if (!existsSync(file)) return [];
	return parseDotenv(readFileSync(file, 'utf8'));
}

export function formatValue(value: string): string {
	if (/^[A-Za-z0-9_./:@,+=%-]*$/.test(value) && value.length > 0) return value;
	const escaped = value
		.replace(/\\/g, '\\\\')
		.replace(/"/g, '\\"')
		.replace(/\n/g, '\\n')
		.replace(/\r/g, '\\r');
	return `"${escaped}"`;
}

/**
 * Sets a key in dotenv text and keeps comments and order. It updates the last
 * active line for the key. Without one, it uncomments the last commented line
 * for the key. Otherwise it appends a line.
 */
export function setInDotenv(text: string, key: string, value: string): string {
	const lines = text.length > 0 ? text.split('\n') : [];
	const newLine = `${key}=${formatValue(value)}`;

	let activeIndex = -1;
	let commentedIndex = -1;
	lines.forEach((line, index) => {
		const parsed = parseLine(line);
		if (parsed?.key !== key) return;
		if (parsed.commented) commentedIndex = index;
		else activeIndex = index;
	});

	const target = activeIndex !== -1 ? activeIndex : commentedIndex;
	if (target !== -1) {
		lines[target] = newLine;
		// Remove earlier active duplicates, so the file has one source of truth.
		return lines
			.filter((line, index) => {
				if (index === target) return true;
				const parsed = parseLine(line);
				return !(parsed && !parsed.commented && parsed.key === key);
			})
			.join('\n');
	}

	if (lines.length > 0 && lines[lines.length - 1] === '') {
		lines.splice(lines.length - 1, 0, newLine);
		return lines.join('\n');
	}
	lines.push(newLine);
	return `${lines.join('\n')}\n`;
}

/** Removes every active line for the key. Commented lines stay. */
export function unsetInDotenv(text: string, key: string): { text: string; removed: number } {
	let removed = 0;
	const lines = text.split('\n').filter((line) => {
		const parsed = parseLine(line);
		if (parsed && !parsed.commented && parsed.key === key) {
			removed++;
			return false;
		}
		return true;
	});
	return { text: lines.join('\n'), removed };
}

export function setInDotenvFile(file: string, key: string, value: string): void {
	const text = existsSync(file) ? readFileSync(file, 'utf8') : '';
	writeFileSync(file, setInDotenv(text, key, value));
}

export function unsetInDotenvFile(file: string, key: string): number {
	if (!existsSync(file)) return 0;
	const { text, removed } = unsetInDotenv(readFileSync(file, 'utf8'), key);
	if (removed > 0) writeFileSync(file, text);
	return removed;
}
