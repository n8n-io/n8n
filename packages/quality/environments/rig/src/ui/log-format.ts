import { stripVTControlCharacters } from 'node:util';
import pc from 'picocolors';

/** Log lines come from the components and can carry terminal control sequences. */
const clean = stripVTControlCharacters;

const LEVEL_COLORS: Record<string, (text: string) => string> = {
	error: pc.red,
	warn: pc.yellow,
	info: pc.green,
	debug: pc.blue,
	verbose: pc.dim,
	silly: pc.dim,
};

/** Metadata that n8n adds to every JSON line. The readable form leaves it out. */
const NOISE = new Set(['timestamp', 'file', 'function']);

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function time(value: unknown): string | undefined {
	if (typeof value !== 'string') return undefined;
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) return undefined;
	return date.toLocaleTimeString(undefined, { hour12: false });
}

function formatValue(value: unknown): string {
	if (typeof value === 'string') return /\s/.test(value) ? JSON.stringify(value) : value;
	return JSON.stringify(value) ?? String(value);
}

/**
 * The readable form of a JSON log line from `N8N_LOG_FORMAT=json`:
 * `12:00:01 info  message scope key=value`. Other lines stay as they are.
 */
export function formatLogLine(line: string): string {
	if (!line.startsWith('{"')) return clean(line);
	let parsed: unknown;
	try {
		parsed = JSON.parse(line);
	} catch {
		return clean(line);
	}
	if (!isRecord(parsed) || typeof parsed.message !== 'string' || typeof parsed.level !== 'string') {
		return clean(line);
	}
	const metadata = isRecord(parsed.metadata) ? parsed.metadata : {};
	const extra: Record<string, unknown> = { ...metadata };
	for (const [key, value] of Object.entries(parsed)) {
		if (key !== 'message' && key !== 'level' && key !== 'metadata') extra[key] = value;
	}
	const stamp = time(extra.timestamp);
	const scopes = Array.isArray(extra.scopes)
		? extra.scopes.filter((s) => typeof s === 'string').map(clean)
		: [];
	delete extra.scopes;
	const details = Object.entries(extra)
		.filter(([key, value]) => !NOISE.has(key) && value !== undefined)
		.map(([key, value]) => clean(`${key}=${formatValue(value)}`));

	const color = LEVEL_COLORS[parsed.level] ?? ((text: string) => text);
	return [
		stamp ? pc.dim(stamp) : undefined,
		color(clean(parsed.level).padEnd(5)),
		clean(parsed.message),
		scopes.length > 0 ? pc.cyan(`[${scopes.join(',')}]`) : undefined,
		details.length > 0 ? pc.dim(details.join(' ')) : undefined,
	]
		.filter((part): part is string => part !== undefined && part.length > 0)
		.join(' ');
}
