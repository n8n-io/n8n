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

	it('only replaces complete values, not parts of strings', () => {
		const query = JSON.stringify({ exact: '$1', partial: 'user-$1' });

		const result = parseAndResolveQueryParameters(query, ['Alice'], mockNode, 0);

		expect(result).toEqual({ exact: 'Alice', partial: 'user-$1' });
	});

	it('replaces placeholders that make up a complete key', () => {
		const query = JSON.stringify({ _id: 0, $1: 1, 'nested.$1': 1 });

		const result = parseAndResolveQueryParameters(query, ['name'], mockNode, 0);

		expect(result).toEqual({ _id: 0, name: 1, 'nested.$1': 1 });
	});

	it('keeps a parameter bound to a key as a single field name', () => {
		const query = JSON.stringify({ _id: 0, $1: 1 });

		const result = parseAndResolveQueryParameters(query, ['name":1,"password_hash'], mockNode, 0);

		expect(result).toEqual({ _id: 0, 'name":1,"password_hash': 1 });
	});

	it.each(['$where', '', 30, 'constructor', '__proto__', 'prototype'])(
		'throws when %p is bound to a key',
		(parameter) => {
			expect(() => parseAndResolveQueryParameters('{ "$1": 1 }', [parameter], mockNode, 0)).toThrow(
				'Query placeholder $1 is not a valid field name',
			);
		},
	);

	it('throws when a bound field name collides with a field the author wrote', () => {
		const query = JSON.stringify({ tenantId: 'acme', $1: '$2' });

		expect(() => parseAndResolveQueryParameters(query, ['tenantId', 'beta'], mockNode, 0)).toThrow(
			'Query field name "tenantId" is used more than once',
		);
	});

	it('throws when two bound field names collide', () => {
		expect(() =>
			parseAndResolveQueryParameters('{ "$1": 1, "$2": 2 }', ['name', 'name'], mockNode, 0),
		).toThrow('Query field name "name" is used more than once');
	});

	it('allows the same field name at different nesting levels', () => {
		const query = JSON.stringify({ $and: [{ $1: 'a' }, { $2: 'b' }] });

		const result = parseAndResolveQueryParameters(query, ['name', 'name'], mockNode, 0);

		expect(result).toEqual({ $and: [{ name: 'a' }, { name: 'b' }] });
	});

	it('uses the given label in error messages', () => {
		expect(() => parseAndResolveQueryParameters('{', [], mockNode, 0, 'Sort')).toThrow(
			"Invalid JSON in 'Sort'",
		);
		expect(() => parseAndResolveQueryParameters('{}', '{}', mockNode, 0, 'Sort')).toThrow(
			'Sort Parameters must be a JSON array',
		);
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

	describe('dollar strings', () => {
		const escape = { escapeDollarStrings: true };

		it('keeps a string that starts with $ as a field path by default', () => {
			const result = parseAndResolveQueryParameters('{ "label": "$1" }', ['$owner'], mockNode, 0);

			expect(result).toEqual({ label: '$owner' });
		});

		it.each(['$owner', '$$ROOT', '$'])('wraps %p in $literal when escaping', (parameter) => {
			const result = parseAndResolveQueryParameters(
				'{ "label": "$1" }',
				[parameter],
				mockNode,
				0,
				'Projection',
				escape,
			);

			expect(result).toEqual({ label: { $literal: parameter } });
		});

		it('wraps each string that starts with $ inside an array parameter', () => {
			const result = parseAndResolveQueryParameters(
				'{ "label": "$1" }',
				[['$owner', 'plain', 5]],
				mockNode,
				0,
				'Projection',
				escape,
			);

			expect(result).toEqual({ label: [{ $literal: '$owner' }, 'plain', 5] });
		});

		it('leaves other values unchanged when escaping', () => {
			const date = new Date('2024-01-01');
			const result = parseAndResolveQueryParameters(
				'{ "a": "$1", "b": "$2", "c": "$3", "d": "$4", "e": "$5" }',
				['plain', 1, true, null, date],
				mockNode,
				0,
				'Projection',
				escape,
			);

			expect(result).toEqual({ a: 'plain', b: 1, c: true, d: null, e: date });
		});

		it('does not touch strings the author wrote or bound field names', () => {
			const result = parseAndResolveQueryParameters(
				'{ "$1": 1, "fixed": "$owner" }',
				['name'],
				mockNode,
				0,
				'Projection',
				escape,
			);

			expect(result).toEqual({ name: 1, fixed: '$owner' });
		});

		it('wraps dollar strings only inside configured fields', () => {
			const result = parseAndResolveQueryParameters(
				'{ "name": "$1", "$expr": { "$eq": ["$owner", "$2"] } }',
				['$owner', '$owner'],
				mockNode,
				0,
				'Query',
				{ escapeDollarStringsInFields: ['$expr'] },
			);

			expect(result).toEqual({
				name: '$owner',
				$expr: { $eq: ['$owner', { $literal: '$owner' }] },
			});
		});

		it('keeps configured escaping active in nested expression arrays', () => {
			const result = parseAndResolveQueryParameters(
				'{ "$and": [{ "$expr": { "$eq": ["$owner", "$1"] } }] }',
				['$owner'],
				mockNode,
				0,
				'Query',
				{ escapeDollarStringsInFields: ['$expr'] },
			);

			expect(result).toEqual({
				$and: [{ $expr: { $eq: ['$owner', { $literal: '$owner' }] } }],
			});
		});

		it('preserves dollar strings inside configured query fields', () => {
			const result = parseAndResolveQueryParameters(
				'{ "items": { "$elemMatch": { "sku": "$1" } } }',
				['$5-OFF'],
				mockNode,
				0,
				'Projection',
				{
					escapeDollarStrings: true,
					preserveDollarStringsInFields: ['$elemMatch'],
				},
			);

			expect(result).toEqual({
				items: { $elemMatch: { sku: '$5-OFF' } },
			});
		});
	});

	describe('null parameters', () => {
		it('allows a null parameter by default', () => {
			const result = parseAndResolveQueryParameters('{ "name": "$1" }', [null], mockNode, 0);

			expect(result).toEqual({ name: null });
		});

		it.each([
			['a null parameter', [null], 'Query parameter 1 must not be null'],
			['a null inside an array parameter', [['a', null]], 'Query parameter 1 must not be null'],
			['a later null parameter', ['a', null], 'Query parameter 2 must not be null'],
		])('rejects %s when rejectNull is set', (_label, parameters, message) => {
			expect(() =>
				parseAndResolveQueryParameters(
					'{ "a": "$1", "b": "$2" }',
					parameters,
					mockNode,
					0,
					'Query',
					{ rejectNull: true },
				),
			).toThrow(message);
		});

		it('allows non-null parameters when rejectNull is set', () => {
			const result = parseAndResolveQueryParameters(
				'{ "name": "$1", "age": "$2" }',
				['Alice', 0],
				mockNode,
				0,
				'Query',
				{ rejectNull: true },
			);

			expect(result).toEqual({ name: 'Alice', age: 0 });
		});
	});
});
