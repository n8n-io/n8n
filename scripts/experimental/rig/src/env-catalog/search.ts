import type { EnvVarInfo } from './extract';

export interface Searchable {
	name: string;
	description: string;
	group: string;
}

/**
 * Returns the vars that match every word of the search, best matches first:
 * exact name, name prefix, a name segment that starts with the search, any
 * name match, then a match in the group or description.
 * `n8n log level` matches `N8N_LOG_LEVEL`, and `port` ranks `N8N_PORT` above
 * `N8N_IMPORT_MAX`.
 */
export function rankVars<T extends Searchable>(vars: T[], term: string): T[] {
	const words = term
		.toLowerCase()
		.split(/[\s_]+/)
		.filter(Boolean);
	if (words.length === 0) return vars;
	const compact = words.join('_');

	const scored: Array<{ item: T; score: number }> = [];
	for (const item of vars) {
		const name = item.name.toLowerCase();
		const text = `${name} ${item.group.toLowerCase()} ${item.description.toLowerCase()}`;
		if (!words.every((word) => text.includes(word))) continue;

		let score = 5;
		if (name === compact) score = 0;
		else if (name.startsWith(compact)) score = 1;
		else if (name.includes(`_${compact}`)) score = 2;
		else if (name.includes(compact)) score = 3;
		else if (words.every((word) => name.includes(word))) score = 4;
		scored.push({ item, score });
	}
	return scored
		.sort((a, b) => a.score - b.score || a.item.name.localeCompare(b.item.name))
		.map(({ item }) => item);
}

/** One line of a description, short enough for a list hint. */
export function shortDescription(info: Pick<EnvVarInfo, 'description'>, max = 70): string {
	const firstSentence =
		info.description.split(/(?<=\.)(?<!\b(?:e\.g|i\.e)\.)\s/i)[0]?.replace(/\s+/g, ' ') ?? '';
	return firstSentence.length > max ? `${firstSentence.slice(0, max - 1)}…` : firstSentence;
}
