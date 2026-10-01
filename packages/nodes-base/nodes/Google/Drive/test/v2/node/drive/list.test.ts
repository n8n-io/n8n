import type { IHttpRequestMethods } from 'n8n-workflow';

import * as list from '../../../../v2/actions/drive/list.operation';
import * as transport from '../../../../v2/transport';
import { createMockExecuteFunction, driveNode } from '../helpers';
import type * as _importType0 from '../../../../v2/transport';

vi.mock('../../../../v2/transport', async () => {
	const originalModule = await vi.importActual<typeof _importType0>('../../../../v2/transport');
	return {
		...originalModule,
		googleApiRequest: vi.fn(async function (method: IHttpRequestMethods) {
			if (method === 'GET') {
				return {};
			}
		}),
		googleApiRequestAllItems: vi.fn(async function (method: IHttpRequestMethods) {
			if (method === 'GET') {
				return {};
			}
		}),
	};
});

describe('test GoogleDriveV2: drive list', () => {
	it('should be called with limit', async () => {
		const nodeParameters = {
			resource: 'drive',
			operation: 'list',
			limit: 20,
			options: {},
		};

		const fakeExecuteFunction = createMockExecuteFunction(nodeParameters, driveNode);

		await list.execute.call(fakeExecuteFunction, 0);

		expect(transport.googleApiRequest).toBeCalledTimes(1);
		expect(transport.googleApiRequest).toHaveBeenCalledWith(
			'GET',
			'/drive/v3/drives',
			{},
			{ pageSize: 20 },
		);
	});

	it('should be called with returnAll true', async () => {
		const nodeParameters = {
			resource: 'drive',
			operation: 'list',
			returnAll: true,
			options: {},
		};

		const fakeExecuteFunction = createMockExecuteFunction(nodeParameters, driveNode);

		await list.execute.call(fakeExecuteFunction, 0);

		expect(transport.googleApiRequestAllItems).toBeCalledTimes(1);
		expect(transport.googleApiRequestAllItems).toHaveBeenCalledWith(
			'GET',
			'drives',
			'/drive/v3/drives',
			{},
			{},
		);
	});
});
