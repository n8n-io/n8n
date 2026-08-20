import type { INode } from 'n8n-workflow';

import { parseAndResolveQueryParameters } from '../query-parameters';

const mockNode = { name: 'Test Node', type: 'n8n-nodes-base.test' } as INode;

describe('parseAndResolveQueryParameters', () => {
	it('replaces placeholders with scalars and scalar arrays', () => {
		const query = JSON.stringify({
			name: '$1',
			age: { gte: '$2' },
			tags: { in: '$3' },
		});

		const result = parseAndResolveQueryParameters(
			query,
			'["Alice", 30, ["active", "admin"]]',
			mockNode,
			0,
		);

		expect(result).toEqual({
			name: 'Alice',
			age: { gte: 30 },
			tags: { in: ['active', 'admin'] },
		});
	});

	it('only replaces complete values, not keys or parts of strings', () => {
		const query = JSON.stringify({ $1: 'key', exact: '$1', partial: 'user-$1' });

		const result = parseAndResolveQueryParameters(query, ['Alice'], mockNode, 0);

		expect(result).toEqual({ $1: 'key', exact: 'Alice', partial: 'user-$1' });
	});

	it('treats a parameter containing JSON as a plain string value', () => {
		const query = JSON.stringify({ term: { user: '$1' } });

		const result = parseAndResolveQueryParameters(
			query,
			['zzz", "match_all": {}, "boost": "2'],
			mockNode,
			0,
		);

		expect(result).toEqual({ term: { user: 'zzz", "match_all": {}, "boost": "2' } });
	});

	it('does not replace placeholders when parameters are empty', () => {
		const result = parseAndResolveQueryParameters('{ "name": "$1" }', [], mockNode, 0);

		expect(result).toEqual({ name: '$1' });
	});

	it('throws when a placeholder has no matching parameter', () => {
		expect(() =>
			parseAndResolveQueryParameters('{ "a": "$1", "b": "$2" }', ['Alice'], mockNode, 0),
		).toThrow('Query placeholder $2 has no matching value');
	});

	it.each([{ parameters: [{ name: 'Alice' }] }, { parameters: [[['nested']]] }])(
		'throws for unsupported parameter value $parameters',
		({ parameters }) => {
			expect(() =>
				parseAndResolveQueryParameters('{ "name": "$1" }', parameters, mockNode, 0),
			).toThrow(/must be a scalar or an array of scalars/);
		},
	);

	it('throws when a parameter is not used', () => {
		expect(() =>
			parseAndResolveQueryParameters('{ "name": "$1" }', ['Alice', 30], mockNode, 0),
		).toThrow('Query parameter 2 is not used');
	});

	it('throws when the parameters are not a JSON array', () => {
		expect(() =>
			parseAndResolveQueryParameters('{ "name": "$1" }', '{ "name": "Alice" }', mockNode, 0),
		).toThrow('Query Parameters must be a JSON array');
	});

	it('throws when the parameters are not valid JSON', () => {
		expect(() => parseAndResolveQueryParameters('{ "name": "$1" }', '[', mockNode, 0)).toThrow(
			'Query Parameters must be valid JSON',
		);
	});

	it('throws when the query is not valid JSON', () => {
		expect(() => parseAndResolveQueryParameters('{ "name": ', ['Alice'], mockNode, 0)).toThrow(
			"Invalid JSON in 'Query'",
		);
	});
});
