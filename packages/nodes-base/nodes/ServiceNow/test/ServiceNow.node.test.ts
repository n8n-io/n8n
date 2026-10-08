import get from 'lodash/get';
import { constructExecutionMetaData } from 'n8n-core';
import type { IDataObject, IExecuteFunctions, ILoadOptionsFunctions, INode } from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import { ServiceNow } from '../ServiceNow.node';
import * as genericFunctions from '../GenericFunctions';
import type * as _importType from '../GenericFunctions';

vi.mock('../GenericFunctions', async () => {
	const original = await vi.importActual<typeof _importType>('../GenericFunctions');
	return {
		...original,
		serviceNowApiRequest: vi.fn().mockResolvedValue({ result: [] }),
		serviceNowRequestAllItems: vi.fn().mockResolvedValue([]),
		serviceNowDownloadAttachment: vi.fn().mockResolvedValue({}),
	};
});

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

const mockedApiRequest = genericFunctions.serviceNowApiRequest as unknown as ReturnType<
	typeof vi.fn
>;

describe('ServiceNow Node', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockedApiRequest.mockResolvedValue({ result: [] });
	});

	// `.call(this, ...)` on a vi.fn records only the arguments, so qs is the 4th.
	const sentQuerystring = () => mockedApiRequest.mock.calls[0][3] as IDataObject;

	describe('user: get by username', () => {
		const parameters = (userName: string) => ({
			resource: 'user',
			operation: 'get',
			getOption: 'user_name',
			user_name: userName,
			options: {},
		});

		it('looks the user up by exact username', async () => {
			await new ServiceNow().execute.call(createMockExecuteFunction(parameters('jane.doe')));

			expect(sentQuerystring()).toMatchObject({
				sysparm_query: 'user_name=jane.doe',
				sysparm_limit: 1,
			});
		});

		it('rejects a username carrying a clause separator', async () => {
			const execute = new ServiceNow().execute.call(createMockExecuteFunction(parameters('a^b')));

			await expect(execute).rejects.toThrow(NodeOperationError);
			await expect(execute).rejects.toThrow("'Username' cannot contain ^");
			expect(mockedApiRequest).not.toHaveBeenCalled();
		});
	});

	describe('attachment: getAll', () => {
		const parameters = (tableName: string) => ({
			resource: 'attachment',
			operation: 'getAll',
			tableName,
			download: false,
			returnAll: true,
			options: {},
		});

		it('filters attachments by the exact table name', async () => {
			await new ServiceNow().execute.call(createMockExecuteFunction(parameters('incident')));

			expect(
				(genericFunctions.serviceNowRequestAllItems as unknown as ReturnType<typeof vi.fn>).mock
					.calls[0][3],
			).toMatchObject({ sysparm_query: 'table_name=incident' });
		});

		it('rejects a table name carrying a clause separator', async () => {
			const execute = new ServiceNow().execute.call(
				createMockExecuteFunction(parameters('incident^b')),
			);

			await expect(execute).rejects.toThrow("'Table Name' cannot contain ^");
		});
	});

	describe('loadOptions guards', () => {
		const createMockLoadOptionsFunction = (nodeParameters: IDataObject) =>
			({
				getNodeParameter: (name: string, _i?: number, fallback?: IDataObject) =>
					get(nodeParameters, name, fallback),
				getNode: () => serviceNowNode,
			}) as unknown as ILoadOptionsFunctions;

		const loadOptions = new ServiceNow().methods.loadOptions;

		it('rejects a table name carrying a clause separator in getColumns', async () => {
			const ctx = createMockLoadOptionsFunction({
				resource: 'tableRecord',
				operation: 'getAll',
				tableName: 'incident^ORnameISNOTEMPTY',
			});

			await expect(loadOptions.getColumns.call(ctx)).rejects.toThrow(
				"'Table Name' cannot contain ^",
			);
			expect(mockedApiRequest).not.toHaveBeenCalled();
		});

		it('looks columns up for an exact table name', async () => {
			mockedApiRequest.mockResolvedValue({ result: [] });
			const ctx = createMockLoadOptionsFunction({
				resource: 'tableRecord',
				operation: 'getAll',
				tableName: 'incident',
			});

			await loadOptions.getColumns.call(ctx);

			expect(mockedApiRequest.mock.calls[0][3]).toMatchObject({
				sysparm_query: 'name=incident',
			});
		});

		it('rejects an assignment group carrying a clause separator', async () => {
			const ctx = createMockLoadOptionsFunction({
				resource: 'incident',
				operation: 'create',
				additionalFields: { assignment_group: 'a^ORactive=true' },
			});

			await expect(loadOptions.getUsers.call(ctx)).rejects.toThrow(
				"'Assignment Group' cannot contain ^",
			);
		});

		it('rejects a category carrying a clause separator', async () => {
			const ctx = createMockLoadOptionsFunction({
				resource: 'incident',
				operation: 'create',
				additionalFields: { category: 'a^ORactive=true' },
			});

			await expect(loadOptions.getIncidentSubcategories.call(ctx)).rejects.toThrow(
				"'Category' cannot contain ^",
			);
		});
	});
});
