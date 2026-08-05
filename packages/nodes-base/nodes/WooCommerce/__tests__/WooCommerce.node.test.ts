import { NodeOperationError } from 'n8n-workflow';
import type { IDataObject } from 'n8n-workflow';
import type { Mock } from 'vitest';

import * as GenericFunctions from '../GenericFunctions';
import type * as _importType0 from '../GenericFunctions';
import { WooCommerce } from '../WooCommerce.node';

vi.mock('../GenericFunctions', async () => ({
	...(await vi.importActual<typeof _importType0>('../GenericFunctions')),
	woocommerceApiRequest: vi.fn(),
	woocommerceApiRequestAllItems: vi.fn(),
}));

const woocommerceApiRequestMock = GenericFunctions.woocommerceApiRequest as Mock;

type ParamMap = Record<string, unknown>;

/** Builds a mocked IExecuteFunctions for the given resource/operation and per-item params. */
function createMockExecuteFunctions(resource: string, operation: string, items: ParamMap[]) {
	return {
		getInputData: vi.fn().mockReturnValue(items.map((json) => ({ json }))),
		getNodeParameter: vi
			.fn()
			.mockImplementation((name: string, itemIndex: number, fallback?: unknown) => {
				if (name === 'resource') return resource;
				if (name === 'operation') return operation;
				const value = items[itemIndex]?.[name];
				return value === undefined ? fallback : value;
			}),
		getNode: vi.fn().mockReturnValue({ name: 'WooCommerce' }),
		continueOnFail: vi.fn().mockReturnValue(false),
		helpers: {
			returnJsonArray: vi
				.fn()
				.mockImplementation((data: IDataObject | IDataObject[]) =>
					(Array.isArray(data) ? data : [data]).map((json) => ({ json })),
				),
			constructExecutionMetaData: vi.fn().mockImplementation((data: unknown[]) => data),
		},
	} as any;
}

describe('WooCommerce Node', () => {
	beforeEach(() => {
		woocommerceApiRequestMock.mockReset();
	});

	describe('Order: Get operation', () => {
		it('returns exactly one item per input item when each Order ID is valid', async () => {
			woocommerceApiRequestMock.mockImplementation(async (_method: string, endpoint: string) => ({
				id: endpoint.split('/').pop(),
			}));

			const items = [{ orderId: '14' }, { orderId: '15' }, { orderId: '16' }];
			const mockThis = createMockExecuteFunctions('order', 'get', items);

			const result = await new WooCommerce().execute.call(mockThis);

			expect(result[0]).toHaveLength(3);
			// Single-resource calls only — never the list endpoint.
			for (const call of woocommerceApiRequestMock.mock.calls) {
				expect(call[1]).toMatch(/^\/orders\/\d+$/);
			}
		});

		it('does not send query parameters on a single-resource get', async () => {
			woocommerceApiRequestMock.mockResolvedValue({ id: 14 });

			const mockThis = createMockExecuteFunctions('order', 'get', [{ orderId: '14' }]);
			await new WooCommerce().execute.call(mockThis);

			const qs = woocommerceApiRequestMock.mock.calls[0][3];
			expect(qs).toEqual({});
		});

		it('throws when the Order ID is empty instead of falling back to the list endpoint', async () => {
			// Mirror the real WooCommerce API: GET /orders/ returns a paginated list.
			woocommerceApiRequestMock.mockResolvedValue(
				Array.from({ length: 20 }, (_v, i) => ({ id: i + 1 })),
			);

			const mockThis = createMockExecuteFunctions('order', 'get', [{ orderId: '' }]);

			await expect(new WooCommerce().execute.call(mockThis)).rejects.toBeInstanceOf(
				NodeOperationError,
			);
			expect(woocommerceApiRequestMock).not.toHaveBeenCalled();
		});
	});

	describe.each([
		{ operation: 'update', extra: { updateFields: {} } },
		{ operation: 'delete', extra: {} },
	])('Order: $operation operation', ({ operation, extra }) => {
		it('throws on an empty Order ID instead of issuing a request to the collection endpoint', async () => {
			const mockThis = createMockExecuteFunctions('order', operation, [{ orderId: '', ...extra }]);

			await expect(new WooCommerce().execute.call(mockThis)).rejects.toBeInstanceOf(
				NodeOperationError,
			);
			expect(woocommerceApiRequestMock).not.toHaveBeenCalled();
		});
	});

	// Order is covered above; this locks the same guard on customer and product.
	describe.each([
		{ resource: 'customer', idParam: 'customerId' },
		{ resource: 'product', idParam: 'productId' },
	])('$resource single-resource operations', ({ resource, idParam }) => {
		it.each(['get', 'update', 'delete'])(
			'throws on an empty ID for the %s operation',
			async (operation) => {
				const mockThis = createMockExecuteFunctions(resource, operation, [
					{ [idParam]: '', updateFields: {} },
				]);

				await expect(new WooCommerce().execute.call(mockThis)).rejects.toBeInstanceOf(
					NodeOperationError,
				);
				expect(woocommerceApiRequestMock).not.toHaveBeenCalled();
			},
		);
	});

	describe('continueOnFail', () => {
		it('collects the guard error as item output instead of aborting the run', async () => {
			const mockThis = createMockExecuteFunctions('order', 'get', [
				{ orderId: '14' },
				{ orderId: '' },
			]);
			mockThis.continueOnFail.mockReturnValue(true);
			woocommerceApiRequestMock.mockResolvedValue({ id: 14 });

			const result = await new WooCommerce().execute.call(mockThis);

			expect(result[0]).toHaveLength(2);
			expect(result[0][1].json).toHaveProperty('error', 'Order ID must not be empty');
			// Only the valid item reached the API.
			expect(woocommerceApiRequestMock).toHaveBeenCalledTimes(1);
		});
	});

	describe('Order: Get All operation', () => {
		it('does not leak query parameters between input items', async () => {
			woocommerceApiRequestMock.mockResolvedValue([{ id: 1 }]);

			const items = [
				{ returnAll: false, limit: 50, options: { status: 'completed' } },
				{ returnAll: false, limit: 50, options: {} },
			];
			const mockThis = createMockExecuteFunctions('order', 'getAll', items);

			await new WooCommerce().execute.call(mockThis);

			const secondCallQs = woocommerceApiRequestMock.mock.calls[1][3] as IDataObject;
			expect(secondCallQs.status).toBeUndefined();
			expect(secondCallQs).toEqual({ per_page: 50 });
		});
	});
});
