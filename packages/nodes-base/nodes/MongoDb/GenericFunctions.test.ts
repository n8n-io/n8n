import type { INode } from 'n8n-workflow';

import { parseAndResolveQueryParameters, prepareItems } from './GenericFunctions';

const mockNode = { name: 'MongoDB', type: 'n8n-nodes-base.mongoDb' } as INode;

describe('MongoDB Node: Generic Functions', () => {
	describe('parseAndResolveQueryParameters', () => {
		it('replaces placeholders with scalars and scalar arrays', () => {
			const query = JSON.stringify({
				name: '$1',
				age: { $gte: '$2' },
				tags: { $in: '$3' },
			});

			const result = parseAndResolveQueryParameters(
				query,
				'["Alice", 30, ["active", "admin"]]',
				mockNode,
				0,
			);

			expect(result).toEqual({
				name: 'Alice',
				age: { $gte: 30 },
				tags: { $in: ['active', 'admin'] },
			});
		});

		it('only replaces complete values, not keys or parts of strings', () => {
			const query = JSON.stringify({ $1: 'key', exact: '$1', partial: 'user-$1' });

			const result = parseAndResolveQueryParameters(query, ['Alice'], mockNode, 0);

			expect(result).toEqual({ $1: 'key', exact: 'Alice', partial: 'user-$1' });
		});

		it('does not replace placeholders when parameters are empty', () => {
			const result = parseAndResolveQueryParameters('{ "name": "$1" }', [], mockNode, 0);

			expect(result).toEqual({ name: '$1' });
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
	});

	describe('prepareItems', () => {
		it('should select fields', () => {
			const items = [{ json: { name: 'John', age: 30 } }, { json: { name: 'Jane', age: 25 } }];
			const fields = ['name'];

			const result = prepareItems({ items, fields });

			expect(result).toEqual([{ name: 'John' }, { name: 'Jane' }]);
		});

		it('should add updateKey to selected fields', () => {
			const items = [{ json: { name: 'John', age: 30 } }, { json: { name: 'Jane', age: 25 } }];
			const fields = ['age'];
			const updateKey = 'name';

			const result = prepareItems({ items, fields, updateKey });

			expect(result).toEqual([
				{ name: 'John', age: 30 },
				{ name: 'Jane', age: 25 },
			]);
		});

		it('should handle dot notation', () => {
			const items = [{ json: { user: { name: 'John' } } }, { json: { user: { name: 'Jane' } } }];
			const fields = ['user.name'];
			const useDotNotation = true;

			const result = prepareItems({ items, fields, updateKey: '', useDotNotation });

			expect(result).toEqual([{ user: { name: 'John' } }, { user: { name: 'Jane' } }]);
		});

		it('should parse dates', () => {
			const items = [
				{ json: { date: '2023-10-01T00:00:00Z' } },
				{ json: { date: '2023-10-02T00:00:00Z' } },
			];
			const fields = ['date'];
			const dateFields = ['date'];
			const useDotNotation = false;
			const isUpdate = false;
			const result = prepareItems({
				items,
				fields,
				updateKey: '',
				useDotNotation,
				dateFields,
				isUpdate,
			});
			expect(result).toEqual([
				{ date: new Date('2023-10-01T00:00:00Z') },
				{ date: new Date('2023-10-02T00:00:00Z') },
			]);
		});

		it('should handle updates', () => {
			// Should keep dot notation in result to not overwrite the original values
			const items = [
				{ json: { id: 1, user: { name: 'John', age: 30 } } },
				{ json: { id: 2, user: { name: 'Jane', age: 25 } } },
			];
			const fields = ['user.name'];
			const useDotNotation = true;
			const isUpdate = true;
			const result = prepareItems({
				items,
				fields,
				updateKey: '',
				useDotNotation,
				dateFields: [],
				isUpdate,
			});
			expect(result).toEqual([{ 'user.name': 'John' }, { 'user.name': 'Jane' }]);
		});
	});
});
