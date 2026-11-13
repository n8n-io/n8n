import { mockDeep } from 'vitest-mock-extended';
import type { IDataObject, IExecuteFunctions, INode } from 'n8n-workflow';

import { UnleashedSoftware } from '../UnleashedSoftware.node';

const page = { PageNumber: 1, NumberOfPages: 1 };

async function requestedUrls(parameters: IDataObject) {
	const context = mockDeep<IExecuteFunctions>();
	context.getInputData.mockReturnValue([{ json: {} }]);
	context.getNode.mockReturnValue({ typeVersion: 1.1 } as INode);
	context.getNodeParameter.mockImplementation((name: string) => parameters[name] as never);
	context.getCredentials.mockResolvedValue({ apiId: 'fake-api-id', apiKey: 'fake-api-key' });
	context.helpers.request.mockResolvedValue({ Items: [], Pagination: page });
	context.helpers.returnJsonArray.mockImplementation(() => []);
	context.helpers.constructExecutionMetaData.mockImplementation(() => []);

	await new UnleashedSoftware().execute.call(context);

	return context.helpers.request.mock.calls.map(([options]) =>
		typeof options === 'string' ? options : String(options.url),
	);
}

describe('UnleashedSoftware Node: request URLs', () => {
	it.each([
		[
			{ resource: 'salesOrder', operation: 'getAll', returnAll: false, limit: 2, filters: {} },
			'https://api.unleashedsoftware.com///SalesOrders/1',
		],
		[
			{ resource: 'salesOrder', operation: 'getAll', returnAll: true, filters: {} },
			'https://api.unleashedsoftware.com///SalesOrders/1',
		],
		[
			{ resource: 'stockOnHand', operation: 'getAll', returnAll: false, limit: 2, filters: {} },
			'https://api.unleashedsoftware.com///StockOnHand/1',
		],
		[
			{ resource: 'stockOnHand', operation: 'getAll', returnAll: true, filters: {} },
			'https://api.unleashedsoftware.com///StockOnHand/1',
		],
		[
			{ resource: 'stockOnHand', operation: 'get', productId: 'COFFEE01' },
			'https://api.unleashedsoftware.com///StockOnHand/COFFEE01',
		],
	])('should request the expected URL for %o', async (parameters, url) => {
		expect(await requestedUrls(parameters)).toEqual([url]);
	});
});
