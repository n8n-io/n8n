import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { parseFilterProperties } from '../GenericFunctions';

describe('Grist parseFilterProperties', () => {
	const node: INode = {
		id: 'uuid-1234',
		name: 'Grist',
		type: 'n8n-nodes-base.grist',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	};
	const ctx = mock<IExecuteFunctions>();
	ctx.getNode.mockReturnValue(node);

	it('auto-detects a numeric-looking value as a number by default (back-compat)', () => {
		expect(parseFilterProperties.call(ctx, [{ field: 'Amount', values: '123' }])).toEqual({
			Amount: [123],
		});
	});

	it('auto-detects a non-numeric value as a string', () => {
		expect(parseFilterProperties.call(ctx, [{ field: 'Name', values: 'abc' }])).toEqual({
			Name: ['abc'],
		});
	});

	it('keeps a numeric-looking value as a string when type is explicitly "string"', () => {
		// Regression for https://github.com/n8n-io/n8n/issues/39323: filtering a Grist text
		// column whose values happen to look numeric ("123") previously always coerced to a
		// number, which never matched Grist's string-typed cell and returned no rows.
		expect(
			parseFilterProperties.call(ctx, [{ field: 'Code', values: '123', type: 'string' }]),
		).toEqual({
			Code: ['123'],
		});
	});

	it('coerces to a number when type is explicitly "number", even for a value autoDetect would keep as a string', () => {
		// Outside Number.MAX_SAFE_INTEGER, so autoDetect's isSafeInteger check rejects it and
		// keeps it as a string - only the explicit 'number' type forces it to a number here.
		const outOfSafeRange = '99999999999999999999';
		expect(
			parseFilterProperties.call(ctx, [{ field: 'Id', values: outOfSafeRange, type: 'number' }]),
		).toEqual({
			Id: [Number(outOfSafeRange)],
		});
		expect(parseFilterProperties.call(ctx, [{ field: 'Id', values: outOfSafeRange }])).toEqual({
			Id: [outOfSafeRange],
		});
	});

	it('throws a NodeOperationError when type is explicitly "number" but the value is not numeric', () => {
		expect(() =>
			parseFilterProperties.call(ctx, [{ field: 'Name', values: 'abc', type: 'number' }]),
		).toThrow(NodeOperationError);
	});

	it('treats an explicit "autoDetect" type the same as omitting the field', () => {
		expect(
			parseFilterProperties.call(ctx, [{ field: 'Amount', values: '123', type: 'autoDetect' }]),
		).toEqual({
			Amount: [123],
		});
	});

	it('groups multiple filter rows for the same field into one array', () => {
		expect(
			parseFilterProperties.call(ctx, [
				{ field: 'Status', values: 'open' },
				{ field: 'Status', values: 'pending' },
			]),
		).toEqual({
			Status: ['open', 'pending'],
		});
	});
});
