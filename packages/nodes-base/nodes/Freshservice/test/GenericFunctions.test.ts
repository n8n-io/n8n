import type { IDataObject, IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import type { Mocked } from 'vitest';
import { mockDeep } from 'vitest-mock-extended';

import { formatFilters } from '../GenericFunctions';

describe('Freshservice GenericFunctions', () => {
	describe('formatFilters', () => {
		let mockExecuteFunctions: Mocked<IExecuteFunctions>;

		beforeEach(() => {
			mockExecuteFunctions = mockDeep<IExecuteFunctions>();
			mockExecuteFunctions.getNode.mockReturnValue({ name: 'Freshservice' } as INode);
		});

		const format = (filters: IDataObject) => formatFilters.call(mockExecuteFunctions, filters, 0);

		it('quotes a string value', () => {
			expect(format({ name: 'John' })).toEqual({ query: '"name:\'John\'"' });
		});

		it('leaves a numeric value unquoted', () => {
			expect(format({ priority: 3 })).toEqual({ query: '"priority:3"' });
		});

		it('trims a date value to its day', () => {
			expect(format({ created_at: '2026-01-02T03:04:05Z' })).toEqual({
				query: '"created_at:\'2026-01-02\'"',
			});
		});

		it('joins multiple filters with AND', () => {
			expect(format({ name: 'John', priority: 3 })).toEqual({
				query: '"name:\'John\' AND priority:3"',
			});
		});

		it.each([
			['a single quote', "O'Brien"],
			['a double quote', 'say "hi"'],
			['a clause of its own', "a'b"],
		])('rejects a value carrying %s', (_label, value) => {
			expect(() => format({ name: value })).toThrow(NodeOperationError);
		});

		it('rejects a quote in a value that looks like a date', () => {
			// A value ending in `Z` takes the date branch, which also quotes it.
			expect(() => format({ created_at: "a'bZ" })).toThrow(NodeOperationError);
		});

		it('rejects a quote in a value that looks numeric', () => {
			expect(() => format({ department_id: "1'2" })).toThrow(NodeOperationError);
		});

		it('names the offending field in the error', () => {
			expect(() => format({ department_id: "a'b" })).toThrow("'department_id' cannot contain '");
		});
	});
});
