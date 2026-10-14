import get from 'lodash/get';
import { constructExecutionMetaData } from 'n8n-core';
import type { IDataObject, IExecuteFunctions, ILoadOptionsFunctions, INode } from 'n8n-workflow';

import * as genericFunctions from '../GenericFunctions';
import { ServiceNow } from '../ServiceNow.node';

jest.mock('../GenericFunctions', () => ({
	...jest.requireActual('../GenericFunctions'),
	serviceNowApiRequest: jest.fn(),
	serviceNowRequestAllItems: jest.fn(),
	serviceNowDownloadAttachment: jest.fn(),
}));

const serviceNowNode: INode = {
	id: '1',
	name: 'ServiceNow',
	type: 'n8n-nodes-base.serviceNow',
	typeVersion: 1,
	position: [0, 0],
	parameters: {},
};

const createMockExecuteFunction = (nodeParameters: IDataObject) =>
	({
		getInputData: () => [{ json: {} }],
		getNodeParameter: (name: string, _itemIndex?: number, fallback?: IDataObject) =>
			get(nodeParameters, name, fallback),
		getNode: () => serviceNowNode,
		continueOnFail: () => false,
		helpers: {
			constructExecutionMetaData,
			returnJsonArray: (data: IDataObject) => [{ json: data }],
		},
	}) as unknown as IExecuteFunctions;

const mockedApiRequest = jest.mocked(genericFunctions.serviceNowApiRequest);
const mockedRequestAllItems = jest.mocked(genericFunctions.serviceNowRequestAllItems);
const mockedDownloadAttachment = jest.mocked(genericFunctions.serviceNowDownloadAttachment);

describe('ServiceNow Node', () => {
	beforeEach(() => {
		jest.clearAllMocks();
		mockedApiRequest.mockResolvedValue({ result: [] });
		mockedRequestAllItems.mockResolvedValue([]);
		mockedDownloadAttachment.mockResolvedValue({} as never);
	});

	describe('request paths', () => {
		// `.call(this, ...)` on a jest.fn records only the arguments, so the path is the 2nd.
		const sentPath = () => mockedApiRequest.mock.calls[0][1];
		const columns = { dataToSend: 'columns', fieldsToSend: { field: [] } };

		it.each([
			[
				{ resource: 'tableRecord', operation: 'create', tableName: 'a/b', ...columns },
				'/now/table/a%2Fb',
			],
			[
				{ resource: 'tableRecord', operation: 'get', tableName: 'a/b', id: 'c/d', options: {} },
				'/now/table/a%2Fb/c%2Fd',
			],
			[
				{
					resource: 'tableRecord',
					operation: 'getAll',
					tableName: 'a/b',
					returnAll: false,
					limit: 1,
					options: {},
				},
				'/now/table/a%2Fb',
			],
			[
				{ resource: 'tableRecord', operation: 'update', tableName: 'a/b', id: 'c/d', ...columns },
				'/now/table/a%2Fb/c%2Fd',
			],
			[
				{ resource: 'tableRecord', operation: 'delete', tableName: 'a/b', id: 'c/d' },
				'/now/table/a%2Fb/c%2Fd',
			],
			[
				{ resource: 'incident', operation: 'get', id: 'c/d', options: {} },
				'/now/table/incident/c%2Fd',
			],
			[
				{ resource: 'incident', operation: 'update', id: 'c/d', updateFields: {} },
				'/now/table/incident/c%2Fd',
			],
			[{ resource: 'incident', operation: 'delete', id: 'c/d' }, '/now/table/incident/c%2Fd'],
			[
				{ resource: 'user', operation: 'get', getOption: 'id', id: 'c/d', options: {} },
				'/now/table/sys_user/c%2Fd',
			],
			[
				{ resource: 'user', operation: 'update', id: 'c/d', updateFields: {} },
				'/now/table/sys_user/c%2Fd',
			],
			[{ resource: 'user', operation: 'delete', id: 'c/d' }, '/now/table/sys_user/c%2Fd'],
			[
				{ resource: 'attachment', operation: 'get', attachmentId: 'c/d', download: false },
				'/now/attachment/c%2Fd',
			],
			[
				{ resource: 'attachment', operation: 'delete', attachmentId: 'c/d' },
				'/now/attachment/c%2Fd',
			],
		])('encodes path values for $resource $operation', async (parameters, expectedPath) => {
			await new ServiceNow().execute.call(createMockExecuteFunction(parameters));

			expect(sentPath()).toBe(expectedPath);
		});

		it('encodes the attachment id when downloading attachments', async () => {
			mockedRequestAllItems.mockResolvedValueOnce([{ sys_id: 'c/d' }]);

			await new ServiceNow().execute.call(
				createMockExecuteFunction({
					resource: 'attachment',
					operation: 'getAll',
					tableName: 'incident',
					download: true,
					outputField: 'data',
					returnAll: true,
					options: {},
				}),
			);

			expect(mockedDownloadAttachment.mock.calls[0][0]).toBe('/now/attachment/c%2Fd');
		});

		it('rejects a table name of ".."', async () => {
			const execute = new ServiceNow().execute.call(
				createMockExecuteFunction({
					resource: 'tableRecord',
					operation: 'delete',
					tableName: '..',
					id: 'abc',
				}),
			);

			await expect(execute).rejects.toThrow('Invalid identifier');
			expect(mockedApiRequest).not.toHaveBeenCalled();
		});
	});

	describe('loadOptions', () => {
		const createMockLoadOptionsFunction = (nodeParameters: IDataObject) =>
			({
				getNodeParameter: (name: string, _i?: number, fallback?: IDataObject) =>
					get(nodeParameters, name, fallback),
				getNode: () => serviceNowNode,
			}) as unknown as ILoadOptionsFunctions;

		it('encodes member ids and skips unusable ones in getUsers', async () => {
			mockedRequestAllItems.mockResolvedValueOnce([
				{ user: { value: 'c/d' } },
				{ user: { value: '..' } },
			]);
			mockedApiRequest.mockResolvedValue({ result: { user_name: 'Jane', sys_id: 'abc' } });
			const ctx = createMockLoadOptionsFunction({
				resource: 'incident',
				operation: 'create',
				additionalFields: { assignment_group: 'group1' },
			});

			const options = await new ServiceNow().methods.loadOptions.getUsers.call(ctx);

			expect(mockedApiRequest).toHaveBeenCalledTimes(1);
			expect(mockedApiRequest.mock.calls[0][1]).toBe('/now/table/sys_user/c%2Fd');
			expect(options).toEqual([{ name: 'Jane', value: 'abc' }]);
		});
	});
});
