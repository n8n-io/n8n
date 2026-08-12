import type { INode } from '../src/interfaces';
import {
	buildNodeSearchSnippet,
	collectNodeParameterValues,
	findNodeSearchMatch,
	NODE_SEARCH_SNIPPET_LENGTH,
} from '../src/common/node-search';

const makeNode = (overrides: Partial<INode> = {}): INode => ({
	id: 'node-1',
	name: 'HTTP Request',
	type: 'n8n-nodes-base.httpRequest',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
	...overrides,
});

describe('collectNodeParameterValues', () => {
	it('returns an empty array for missing parameters', () => {
		expect(collectNodeParameterValues(undefined)).toEqual([]);
		expect(collectNodeParameterValues({})).toEqual([]);
	});

	it('collects values but never keys', () => {
		const values = collectNodeParameterValues({
			url: 'https://example.com/orders',
			method: 'POST',
		});

		expect(values).toContain('https://example.com/orders');
		expect(values).toContain('POST');
		expect(values).not.toContain('url');
		expect(values).not.toContain('method');
	});

	it('walks nested objects and arrays', () => {
		const values = collectNodeParameterValues({
			options: { headers: [{ name: 'x-tenant', value: 'acme' }] },
		});

		expect(values).toEqual(expect.arrayContaining(['x-tenant', 'acme']));
	});

	it('stringifies numbers and booleans', () => {
		expect(collectNodeParameterValues({ retries: 3, enabled: true })).toEqual(['3', 'true']);
	});

	it('skips oversized values so encoded blobs do not dominate', () => {
		const blob = 'a'.repeat(600);
		expect(collectNodeParameterValues({ data: blob, note: 'keep me' })).toEqual(['keep me']);
	});

	it('stops collecting once the total budget is exhausted', () => {
		const parameters = Object.fromEntries(
			Array.from({ length: 50 }, (_, i) => [`field${i}`, 'x'.repeat(500)]),
		);

		const totalLength = collectNodeParameterValues(parameters).join('').length;

		// Budget is 2000 chars; collection stops on the first value that crosses it.
		expect(totalLength).toBeLessThan(2_500);
	});
});

describe('buildNodeSearchSnippet', () => {
	it('centres the snippet on the match', () => {
		const text = `${'lead '.repeat(40)}NEEDLE${' tail'.repeat(40)}`;
		const snippet = buildNodeSearchSnippet(text, 'needle');

		expect(snippet).toContain('NEEDLE');
		expect(snippet.length).toBeLessThanOrEqual(NODE_SEARCH_SNIPPET_LENGTH);
	});

	it('falls back to the head of the text when the query is absent', () => {
		expect(buildNodeSearchSnippet('some content', 'missing')).toBe('some content');
	});
});

describe('findNodeSearchMatch', () => {
	it('returns null for an empty query', () => {
		expect(findNodeSearchMatch(makeNode(), '')).toBeNull();
	});

	it('matches the node name first', () => {
		const match = findNodeSearchMatch(makeNode({ name: 'Fetch Orders' }), 'orders');
		expect(match).toEqual({ field: 'name', snippet: 'Fetch Orders' });
	});

	it('matches the short node type when the name does not', () => {
		const node = makeNode({
			name: 'Notify sales',
			type: 'n8n-nodes-base.slack',
		});
		const match = findNodeSearchMatch(node, 'slack');

		expect(match).toEqual({ field: 'type', snippet: 'slack' });
	});

	it('matches spaced camelCase type queries', () => {
		const node = makeNode({
			name: 'Call API',
			type: 'n8n-nodes-base.httpRequest',
		});

		expect(findNodeSearchMatch(node, 'http request')?.field).toBe('type');
	});

	it('does not match on the package prefix alone', () => {
		const node = makeNode({ name: 'Do Thing', type: 'n8n-nodes-base.slack' });
		expect(findNodeSearchMatch(node, 'n8n-nodes-base')).toBeNull();
		expect(findNodeSearchMatch(node, 'nodes-base')).toBeNull();
	});

	it('matches notes when the name and type do not', () => {
		const match = findNodeSearchMatch(makeNode({ notes: 'retries on 429' }), '429');
		expect(match?.field).toBe('notes');
		expect(match?.snippet).toContain('429');
	});

	it('matches parameter values', () => {
		const node = makeNode({ parameters: { url: 'https://api.acme.test/v2/orders' } });
		const match = findNodeSearchMatch(node, 'acme.test');

		expect(match?.field).toBe('parameters');
		expect(match?.snippet).toContain('acme.test');
	});

	it('matches sticky note content', () => {
		const node = makeNode({
			type: 'n8n-nodes-base.stickyNote',
			name: 'Sticky Note',
			parameters: { content: '## Deploy checklist\nrotate the signing key' },
		});

		const match = findNodeSearchMatch(node, 'signing key');
		expect(match?.field).toBe('parameters');
		expect(match?.snippet).toContain('signing key');
	});

	it('does not match parameter keys', () => {
		const node = makeNode({ name: 'Do Thing', parameters: { url: 'https://example.com' } });
		expect(findNodeSearchMatch(node, 'url')).toBeNull();
	});

	it('is case insensitive against the lowercased query', () => {
		const node = makeNode({ parameters: { channel: '#Deploys' } });
		expect(findNodeSearchMatch(node, 'deploys')?.field).toBe('parameters');
	});
});
