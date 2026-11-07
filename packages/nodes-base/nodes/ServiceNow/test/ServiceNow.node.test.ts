import get from 'lodash/get';
import { constructExecutionMetaData } from 'n8n-core';
import type {
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	IExecuteFunctions,
	ILoadOptionsFunctions,
	INode,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

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

	describe('basic credential test', () => {
		const context = mock<ICredentialTestFunctions>({
			helpers: mock<ICredentialTestFunctions['helpers']>({
				request: vi.fn().mockResolvedValue({ statusCode: 200 }),
			}),
		});
		const data = { user: 'jane.doe', password: 'test-password', subdomain: 'test-instance' };
		const testCredentials = async (values: ICredentialsDecrypted['data']) =>
			await new ServiceNow().methods.credentialTest.serviceNowBasicApiTest.call(context, {
				id: 'service-now-credential',
				name: 'ServiceNow integration',
				type: 'serviceNowBasicApi',
				data: values,
			});

		it.each<[number | Error, 'OK' | 'Error', string]>([
			[200, 'OK', 'Connection successful!'],
			[204, 'OK', 'Connection successful!'],
			[299, 'OK', 'Connection successful!'],
			[403, 'OK', 'Connection successful!'],
			[401, 'Error', 'Authentication failed. Check your user and password.'],
			...[302, 400, 404, 418, 429, 500, 503].map((statusCode): [number, 'Error', string] => [
				statusCode,
				'Error',
				`Connection failed. ServiceNow returned HTTP ${statusCode}. Check your instance and try again.`,
			]),
			[
				new Error('getaddrinfo ENOTFOUND test-instance.service-now.com'),
				'Error',
				'Connection failed: getaddrinfo ENOTFOUND test-instance.service-now.com. Check your ServiceNow instance and try again.',
			],
		])('handles the ServiceNow response %s', async (response, status, message) => {
			if (response instanceof Error) {
				vi.mocked(context.helpers.request).mockRejectedValueOnce(response);
			} else {
				vi.mocked(context.helpers.request).mockResolvedValueOnce({ statusCode: response });
			}

			expect(await testCredentials(data)).toEqual({ status, message });
		});

		it('limits a table credential check to one record and its identifier', async () => {
			const result = await testCredentials(data);

			expect(result.status).toBe('OK');
			expect(context.helpers.request).toHaveBeenCalledExactlyOnceWith({
				method: 'GET',
				uri: 'https://test-instance.service-now.com/api/now/table/sys_user',
				followRedirect: false,
				auth: { user: data.user, pass: data.password },
				qs: { sysparm_limit: '1', sysparm_fields: 'sys_id' },
				json: true,
				simple: false,
				resolveWithFullResponse: true,
			});
		});

		describe('subdomain validation', () => {
			it.each(
				[
					'',
					'test.instance',
					'test/instance',
					'test#instance',
					'-test-instance',
					'test-instance-',
					'a'.repeat(64),
				].map((subdomain) => ({ subdomain })),
			)(
				'rejects an invalid subdomain $subdomain before making a request',
				async ({ subdomain }) => {
					const result = await testCredentials({ ...data, subdomain });

					expect(result.status).toBe('Error');
					expect(context.helpers.request).not.toHaveBeenCalled();
				},
			);

			it.each(['test-instance', 'DEV12345', 'a', 'a'.repeat(63)])(
				'checks credentials for the instance subdomain %s',
				async (subdomain) => {
					const result = await testCredentials({ ...data, subdomain });

					expect(result.status).toBe('OK');
					expect(context.helpers.request).toHaveBeenCalledOnce();
					expect(context.helpers.request).toHaveBeenCalledWith(
						expect.objectContaining({
							uri: `https://${subdomain}.service-now.com/api/now/table/sys_user`,
							followRedirect: false,
							auth: { user: data.user, pass: data.password },
						}),
					);
				},
			);
		});
	});

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

	describe('request paths', () => {
		const sentPath = () => mockedApiRequest.mock.calls[0][1] as string;
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
			const requestAllItems = genericFunctions.serviceNowRequestAllItems as unknown as ReturnType<
				typeof vi.fn
			>;
			requestAllItems.mockResolvedValueOnce([{ sys_id: 'c/d' }]);

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

			expect(
				(genericFunctions.serviceNowDownloadAttachment as unknown as ReturnType<typeof vi.fn>).mock
					.calls[0][0],
			).toBe('/now/attachment/c%2Fd');
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

		it('encodes member ids and skips unusable ones in getUsers', async () => {
			(
				genericFunctions.serviceNowRequestAllItems as unknown as ReturnType<typeof vi.fn>
			).mockResolvedValueOnce([{ user: { value: 'c/d' } }, { user: { value: '..' } }]);
			mockedApiRequest.mockResolvedValue({ result: { user_name: 'Jane', sys_id: 'abc' } });
			const ctx = createMockLoadOptionsFunction({
				resource: 'incident',
				operation: 'create',
				additionalFields: { assignment_group: 'group1' },
			});

			const options = await loadOptions.getUsers.call(ctx);

			expect(mockedApiRequest).toHaveBeenCalledTimes(1);
			expect(mockedApiRequest.mock.calls[0][1]).toBe('/now/table/sys_user/c%2Fd');
			expect(options).toEqual([{ name: 'Jane', value: 'abc' }]);
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
