import type { INode, INodeParameters, NodeParameterValueType } from '../interfaces';

/** Longest snippet returned around a match. */
export const NODE_SEARCH_SNIPPET_LENGTH = 200;

/** Characters of context kept before the match inside a snippet. */
const NODE_SEARCH_SNIPPET_LEAD = 40;

/**
 * Cap on the searchable text collected from a single node's parameters. Keeps
 * pathological nodes (pasted JSON payloads, base64 blobs) from dominating both
 * the match cost and the payload we hand to the client.
 */
export const NODE_SEARCH_TEXT_MAX_LENGTH = 2_000;

/** Individual values longer than this are skipped — almost always encoded blobs. */
const NODE_SEARCH_VALUE_MAX_LENGTH = 512;

export type NodeSearchField = 'name' | 'type' | 'notes' | 'parameters';

export type NodeSearchMatch = {
	field: NodeSearchField;
	snippet: string;
};

/** Package prefix stripped so queries like "n8n" / "nodes-base" don't match every node. */
function shortNodeType(type: string): string {
	const dot = type.lastIndexOf('.');
	return dot === -1 ? type : type.slice(dot + 1);
}

/**
 * Match the short type id, including spaced camelCase so "http request" hits
 * `httpRequest` without needing the package prefix.
 */
function typeMatchesQuery(type: string, queryLower: string): boolean {
	const short = shortNodeType(type);
	const shortLower = short.toLowerCase();
	if (shortLower.includes(queryLower)) return true;

	const spaced = short
		.replace(/([a-z\d])([A-Z])/g, '$1 $2')
		.replace(/[_.-]+/g, ' ')
		.toLowerCase();

	return spaced.includes(queryLower);
}

function isPlainRecord(value: unknown): value is INodeParameters {
	return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Collect the searchable *values* of a node's parameters, ignoring the keys.
 *
 * Keys are deliberately excluded: every node carries `options`, `mode`, `url`
 * and friends, so matching them makes those queries match the whole instance.
 */
export function collectNodeParameterValues(parameters?: INodeParameters): string[] {
	if (!parameters) return [];

	const values: string[] = [];
	let budget = NODE_SEARCH_TEXT_MAX_LENGTH;

	const visit = (value: NodeParameterValueType | undefined) => {
		if (budget <= 0 || value === undefined || value === null) return;

		if (typeof value === 'string') {
			if (value.length === 0 || value.length > NODE_SEARCH_VALUE_MAX_LENGTH) return;
			values.push(value);
			budget -= value.length;
			return;
		}

		if (typeof value === 'number' || typeof value === 'boolean') {
			const stringified = String(value);
			values.push(stringified);
			budget -= stringified.length;
			return;
		}

		if (Array.isArray(value)) {
			for (const entry of value) visit(entry as NodeParameterValueType);
			return;
		}

		if (isPlainRecord(value)) {
			for (const entry of Object.values(value)) visit(entry);
		}
	};

	visit(parameters);

	return values;
}

/** Build a snippet centred on the match, so the client can show why a node matched. */
export function buildNodeSearchSnippet(text: string, queryLower: string): string {
	const index = text.toLowerCase().indexOf(queryLower);
	if (index === -1) return text.slice(0, NODE_SEARCH_SNIPPET_LENGTH);

	const start = Math.max(0, index - NODE_SEARCH_SNIPPET_LEAD);
	return text.slice(start, start + NODE_SEARCH_SNIPPET_LENGTH);
}

/**
 * Match a node against a lowercased query, reporting which field matched and a
 * snippet of it. Fields are checked in relevance order (name, type, notes, then
 * parameter values) and the first hit wins.
 */
export function findNodeSearchMatch(node: INode, queryLower: string): NodeSearchMatch | null {
	if (queryLower.length === 0) return null;

	if (node.name?.toLowerCase().includes(queryLower)) {
		return { field: 'name', snippet: buildNodeSearchSnippet(node.name, queryLower) };
	}

	// SQL already matches `type` in the nodes JSON; without this, those hits are discarded.
	if (node.type && typeMatchesQuery(node.type, queryLower)) {
		return { field: 'type', snippet: shortNodeType(node.type) };
	}

	if (node.notes?.toLowerCase().includes(queryLower)) {
		return { field: 'notes', snippet: buildNodeSearchSnippet(node.notes, queryLower) };
	}

	for (const value of collectNodeParameterValues(node.parameters)) {
		if (value.toLowerCase().includes(queryLower)) {
			return { field: 'parameters', snippet: buildNodeSearchSnippet(value, queryLower) };
		}
	}

	return null;
}
