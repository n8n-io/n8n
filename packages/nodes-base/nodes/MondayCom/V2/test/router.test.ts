/* eslint-disable @typescript-eslint/no-explicit-any */
import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import { describe, expect, it, vi } from 'vitest';

import * as board from '../actions/board';
import * as column from '../actions/column';
import * as group from '../actions/group';
import * as item from '../actions/item';
import { router } from '../actions/router';
import * as update from '../actions/update';

/**
 * Minimal execute context for the router: three input items, Get Item on
 * each, with per-item parameters resolved from the input item's json.
 */
function makeContext(options: {
	continueOnFail: boolean;
	itemIds: string[];
	resource?: string;
	operation?: string;
}) {
	const httpRequestWithAuthentication = vi.fn();
	const context = {
		getInputData: () => options.itemIds.map((id) => ({ json: { id } })),
		getNode: () => ({ name: 'monday.com', type: 'CUSTOM.monday', typeVersion: 2 }),
		continueOnFail: () => options.continueOnFail,
		getNodeParameter: (name: string, itemIndex: number, fallback?: unknown) => {
			switch (name) {
				case 'resource':
					return options.resource ?? 'item';
				case 'operation':
					return options.operation ?? 'getItem';
				case 'authentication':
					return 'accessToken';
				case 'itemId':
					return options.itemIds[itemIndex];
				case 'simplify':
					return false;
				default:
					return fallback;
			}
		},
		helpers: { httpRequestWithAuthentication },
	} as unknown as IExecuteFunctions;
	return { context, httpRequestWithAuthentication };
}

const itemResponse = (id: string) => ({ data: { items: [{ id, name: `Item ${id}` }] } });
const columnError = {
	errors: [
		{
			message: 'Invalid column value provided',
			extensions: { code: 'ColumnValueException', status_code: 200 },
		},
	],
};

describe('router', () => {
	it('with Continue On Fail, keeps the other items and pairs the error row to the failing item', async () => {
		const { context, httpRequestWithAuthentication } = makeContext({
			continueOnFail: true,
			itemIds: ['1', '2', '3'],
		});
		httpRequestWithAuthentication
			.mockResolvedValueOnce(itemResponse('1'))
			.mockResolvedValueOnce(columnError)
			.mockResolvedValueOnce(itemResponse('3'));

		const [output] = await router.call(context);

		expect(output).toHaveLength(3);
		expect(output[0]).toEqual({
			json: { id: '1', name: 'Item 1' },
			pairedItem: { item: 0 },
		});
		expect(output[1].pairedItem).toEqual({ item: 1 });
		expect(output[1].json).toEqual({ error: expect.stringContaining('Invalid column value') });
		expect(output[2]).toEqual({
			json: { id: '3', name: 'Item 3' },
			pairedItem: { item: 2 },
		});
		expect(httpRequestWithAuthentication).toHaveBeenCalledTimes(3);
	});

	it('without Continue On Fail, rethrows the mapped error and stops at the failing item', async () => {
		const { context, httpRequestWithAuthentication } = makeContext({
			continueOnFail: false,
			itemIds: ['1', '2', '3'],
		});
		httpRequestWithAuthentication
			.mockResolvedValueOnce(itemResponse('1'))
			.mockResolvedValueOnce(columnError)
			.mockResolvedValueOnce(itemResponse('3'));

		await expect(router.call(context)).rejects.toBeInstanceOf(NodeApiError);
		expect(httpRequestWithAuthentication).toHaveBeenCalledTimes(2);
	});

	it('pairs every row of a multi-row result to its input item', async () => {
		const { context, httpRequestWithAuthentication } = makeContext({
			continueOnFail: false,
			itemIds: ['7'],
			operation: 'getItemSubscribers',
		});
		httpRequestWithAuthentication.mockResolvedValueOnce({
			data: {
				items: [{ id: '7', name: 'Item 7', subscribers: [{ id: 'u1' }, { id: 'u2' }] }],
			},
		});

		const [output] = await router.call(context);

		expect(output).toEqual([
			{ json: { id: 'u1', itemId: '7', itemName: 'Item 7' }, pairedItem: { item: 0 } },
			{ json: { id: 'u2', itemId: '7', itemName: 'Item 7' }, pairedItem: { item: 0 } },
		]);
	});

	it('rejects an operation that the resource does not have', async () => {
		const { context, httpRequestWithAuthentication } = makeContext({
			continueOnFail: false,
			itemIds: ['1'],
			resource: 'board',
			operation: 'getItem',
		});

		await expect(router.call(context)).rejects.toThrow('The operation "getItem" is not supported');
		expect(httpRequestWithAuthentication).not.toHaveBeenCalled();
	});

	it('has an operation module with fields and an execute function for every dropdown option', () => {
		const resources = { board, column, group, item, update };
		for (const [resource, module] of Object.entries(resources)) {
			const dropdown = module.description.find((p) => p.name === 'operation');
			const values = (dropdown?.options ?? []).map((o) => ('value' in o ? String(o.value) : ''));
			expect(values.length).toBeGreaterThan(0);
			for (const value of values) {
				const operation = (module as Record<string, unknown>)[value] as
					| { execute?: unknown; description?: unknown }
					| undefined;
				expect(typeof operation?.execute, `${resource}.${value}`).toBe('function');
				expect(Array.isArray(operation?.description), `${resource}.${value}`).toBe(true);
			}
		}
	});
});
