/* eslint-disable @typescript-eslint/no-explicit-any */
import type { IExecuteFunctions } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import { describe, expect, it, vi } from 'vitest';

import { router } from '../actions/router';

/**
 * Minimal execute context for the router: three input items, Get Item on
 * each, with per-item parameters resolved from the input item's json.
 */
function makeContext(options: { continueOnFail: boolean; itemIds: string[] }) {
	const httpRequestWithAuthentication = vi.fn();
	const context = {
		getInputData: () => options.itemIds.map((id) => ({ json: { id } })),
		getNode: () => ({ name: 'monday.com', type: 'CUSTOM.monday', typeVersion: 2 }),
		continueOnFail: () => options.continueOnFail,
		getNodeParameter: (name: string, itemIndex: number, fallback?: unknown) => {
			switch (name) {
				case 'resource':
					return 'item';
				case 'operation':
					return 'getItem';
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
});
