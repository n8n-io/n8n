import type {
	IDataObject,
	INode,
	INodeExecutionData,
	ILoadOptionsFunctions,
	IExecuteFunctions,
} from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';

import { createMockExecuteFunction } from '@test/nodes/Helpers';

import * as GenericFunctions from '../GenericFunctions';
import { NocoDB } from '../NocoDB.node';

// Mock the GenericFunctions
jest.mock('../GenericFunctions');
const mockedGenericFunctions = jest.mocked(GenericFunctions);

const mockNode: INode = {
	id: '1',
	name: 'NocoDB',
	typeVersion: 3,
	type: 'n8n-nodes-base.nocoDb',
	position: [60, 760],
	parameters: {
		authentication: 'nocoDb',
		version: 3,
		resource: 'row',
		operation: 'get',
		projectId: 'base123',
		table: 'table123',
	},
};

const defaultInputItems: INodeExecutionData[] = [
	{ json: { id: 1, name: 'Test Item' }, pairedItem: { item: 0, input: undefined } },
];

const createNocoDBExecuteFunction = (
	nodeParameters: IDataObject,
	inputItems: INodeExecutionData[] = defaultInputItems,
	continueOnFail = false,
) => {
	const fakeExecuteFunction = createMockExecuteFunction(nodeParameters, mockNode, continueOnFail);
	// Add missing methods for NocoDB node
	(fakeExecuteFunction as any).getInputData = () => inputItems;
	(fakeExecuteFunction as any).helpers = {
		...fakeExecuteFunction.helpers,
		assertBinaryData: jest.fn().mockReturnValue({ fileName: 'test.txt', mimeType: 'text/plain' }),
		getBinaryDataBuffer: jest.fn().mockResolvedValue(Buffer.from('test file content')),
		returnJsonArray: jest.fn((data) => {
			if (Array.isArray(data)) {
				return data.map((item: any) => ({ json: item }));
			}
			return [{ json: data }];
		}),
	};
	return fakeExecuteFunction as IExecuteFunctions;
};

const createMockLoadOptionsFunction = (nodeParameters: IDataObject = {}) => {
	return {
		getNodeParameter: jest.fn((parameterName: string) => nodeParameters[parameterName]),
		getNode: () => mockNode,
		getCurrentNodeParameter: jest.fn(),
		getCurrentNodeParameters: jest.fn(),
	} as unknown as ILoadOptionsFunctions;
};

describe('NocoDB Node', () => {
	let nocoDbNode: NocoDB;

	beforeEach(() => {
		nocoDbNode = new NocoDB();
		jest.clearAllMocks();
	});

	describe('Node Definition', () => {
		it('should have correct node description', () => {
			expect(nocoDbNode.description.displayName).toBe('NocoDB');
			expect(nocoDbNode.description.name).toBe('nocoDb');
			expect(nocoDbNode.description.group).toEqual(['input']);
			expect(nocoDbNode.description.version).toEqual([1, 2, 3]);
		});

		it('should have required credentials', () => {
			expect(nocoDbNode.description.credentials).toHaveLength(2);
			expect(nocoDbNode.description.credentials![0].name).toBe('nocoDb');
			expect(nocoDbNode.description.credentials![1].name).toBe('nocoDbApiToken');
		});
	});

	describe('Load Options Methods', () => {
		describe('getWorkspaces', () => {
			it('should return workspaces list', async () => {
				const mockWorkspaces = {
					list: [
						{ id: 'ws1', title: 'Workspace 1' },
						{ id: 'ws2', title: 'Workspace 2' },
					],
				};
				mockedGenericFunctions.apiRequest.mockResolvedValue(mockWorkspaces);

				const mockLoadOptionsFunction = createMockLoadOptionsFunction({});
				const result =
					await nocoDbNode.methods!.loadOptions!.getWorkspaces.call(mockLoadOptionsFunction);

				expect(result).toEqual([
					{ name: 'Workspace 1', value: 'ws1' },
					{ name: 'Workspace 2', value: 'ws2' },
				]);
			});

			it('should return default when request fails', async () => {
				mockedGenericFunctions.apiRequest.mockRejectedValue(new Error('API Error'));

				const mockLoadOptionsFunction = createMockLoadOptionsFunction({});
				const result =
					await nocoDbNode.methods!.loadOptions!.getWorkspaces.call(mockLoadOptionsFunction);

				expect(result).toEqual([{ name: 'No Workspace', value: 'none' }]);
			});
		});

		describe('getBases', () => {
			it('should return bases for v3 with workspace', async () => {
				const mockBases = { list: [{ id: 'base1', title: 'Base 1' }] };
				const mockLoadOptionsFunction = createMockLoadOptionsFunction({
					version: 3,
					workspaceId: 'ws1',
				});
				mockedGenericFunctions.apiRequest.mockResolvedValue(mockBases);

				const result =
					await nocoDbNode.methods!.loadOptions!.getBases.call(mockLoadOptionsFunction);

				expect(result).toEqual([{ name: 'Base 1', value: 'base1' }]);
				expect(mockedGenericFunctions.apiRequest).toHaveBeenCalledWith(
					'GET',
					'/api/v1/workspaces/ws1/bases/',
					{},
					{},
				);
			});

			it('should return bases for v3 without workspace', async () => {
				const mockBases = { list: [{ id: 'base1', title: 'Base 1' }] };
				const mockLoadOptionsFunction = createMockLoadOptionsFunction({
					version: 3,
					workspaceId: 'none',
				});
				mockedGenericFunctions.apiRequest.mockResolvedValue(mockBases);

				const result =
					await nocoDbNode.methods!.loadOptions!.getBases.call(mockLoadOptionsFunction);

				expect(result).toEqual([{ name: 'Base 1', value: 'base1' }]);
				expect(mockedGenericFunctions.apiRequest).toHaveBeenCalledWith(
					'GET',
					'/api/v2/meta/bases/',
					{},
					{},
				);
			});
		});

		describe('getTables', () => {
			it('should return tables for v3', async () => {
				const mockTables = { list: [{ id: 'table1', title: 'Table 1' }] };
				const mockLoadOptionsFunction = createMockLoadOptionsFunction({
					version: 3,
					projectId: 'base1',
				});
				mockedGenericFunctions.apiRequest.mockResolvedValue(mockTables);

				const result =
					await nocoDbNode.methods!.loadOptions!.getTables.call(mockLoadOptionsFunction);

				expect(result).toEqual([{ name: 'Table 1', value: 'table1' }]);
				expect(mockedGenericFunctions.apiRequest).toHaveBeenCalledWith(
					'GET',
					'/api/v2/meta/bases/base1/tables',
					{},
					{},
				);
			});

			it('should throw error when no base selected', async () => {
				const mockLoadOptionsFunction = createMockLoadOptionsFunction({
					version: 3,
					projectId: '',
				});

				await expect(
					nocoDbNode.methods!.loadOptions!.getTables.call(mockLoadOptionsFunction),
				).rejects.toThrow(NodeOperationError);
			});
		});
	});

	describe('Row Resource', () => {
		describe('Create Operation', () => {
			it('should create rows for v3', async () => {
				const nodeParameters = {
					version: 3,
					resource: 'row',
					operation: 'create',
					projectId: 'base123',
					table: 'table123',
					dataToSend: 'defineBelow',
					fieldsUi: {
						fieldValues: [
							{ fieldName: 'name', fieldValue: 'Test Name', binaryData: false },
							{ fieldName: 'email', fieldValue: 'test@example.com', binaryData: false },
						],
					},
				};

				const mockResponse = [{ id: 1, name: 'Test Name', email: 'test@example.com' }];
				mockedGenericFunctions.apiRequest.mockResolvedValue(mockResponse);

				const executeFunction = createNocoDBExecuteFunction(nodeParameters);
				const result = await nocoDbNode.execute.call(executeFunction);

				expect(result[0]).toHaveLength(1);
				expect(result[0][0].json).toEqual(
					expect.objectContaining({
						name: 'Test Name',
						email: 'test@example.com',
						id: 1,
					}),
				);
				expect(mockedGenericFunctions.apiRequest).toHaveBeenCalledWith(
					'POST',
					'/api/v2/tables/table123/records',
					expect.any(Array),
					{},
				);
			});

			it('should handle binary file upload', async () => {
				const nodeParameters = {
					version: 3,
					resource: 'row',
					operation: 'create',
					projectId: 'base123',
					table: 'table123',
					dataToSend: 'defineBelow',
					fieldsUi: {
						fieldValues: [{ fieldName: 'attachment', binaryProperty: 'data', binaryData: true }],
					},
				};

				const mockUploadResponse = { url: 'http://example.com/file.txt' };
				const mockCreateResponse = [{ id: 1, attachment: JSON.stringify([mockUploadResponse]) }];
				mockedGenericFunctions.apiRequest
					.mockResolvedValueOnce(mockUploadResponse) // upload call
					.mockResolvedValueOnce(mockCreateResponse); // create call

				const executeFunction = createNocoDBExecuteFunction(nodeParameters);
				const result = await nocoDbNode.execute.call(executeFunction);

				expect(result[0]).toHaveLength(1);
				expect(mockedGenericFunctions.apiRequest).toHaveBeenCalledTimes(2);
			});
		});

		describe('Get Operation', () => {
			it('should get single row for v3', async () => {
				const nodeParameters = {
					version: 3,
					resource: 'row',
					operation: 'get',
					projectId: 'base123',
					table: 'table123',
					id: '1',
					downloadAttachments: false,
				};

				const mockResponse = { id: 1, name: 'Test Item' };
				mockedGenericFunctions.apiRequest.mockResolvedValue(mockResponse);

				const executeFunction = createNocoDBExecuteFunction(nodeParameters);
				const result = await nocoDbNode.execute.call(executeFunction);

				expect(result[0]).toHaveLength(1);
				expect(result[0][0].json).toEqual(mockResponse);
				expect(mockedGenericFunctions.apiRequest).toHaveBeenCalledWith(
					'GET',
					'/api/v2/tables/table123/records/1',
					{},
					{},
				);
			});
		});

		describe('Get Many Operation', () => {
			it('should get all rows for v3', async () => {
				const nodeParameters = {
					version: 3,
					resource: 'row',
					operation: 'getAll',
					projectId: 'base123',
					table: 'table123',
					returnAll: true,
					downloadAttachments: false,
					options: {},
				};

				const mockResponse = [
					{ id: 1, name: 'Item 1' },
					{ id: 2, name: 'Item 2' },
				];
				mockedGenericFunctions.apiRequestAllItems.mockResolvedValue(mockResponse);

				const executeFunction = createNocoDBExecuteFunction(nodeParameters);
				const result = await nocoDbNode.execute.call(executeFunction);

				expect(result[0]).toHaveLength(2);
				expect(mockedGenericFunctions.apiRequestAllItems).toHaveBeenCalledWith(
					'GET',
					'/api/v2/tables/table123/records',
					{},
					{},
				);
			});

			it('should limit results when returnAll is false', async () => {
				const nodeParameters = {
					version: 3,
					resource: 'row',
					operation: 'getAll',
					projectId: 'base123',
					table: 'table123',
					returnAll: false,
					limit: 5,
					downloadAttachments: false,
					options: {},
				};

				const mockResponse = { list: [{ id: 1, name: 'Item 1' }] };
				mockedGenericFunctions.apiRequest.mockResolvedValue(mockResponse);

				const executeFunction = createNocoDBExecuteFunction(nodeParameters);
				const result = await nocoDbNode.execute.call(executeFunction);

				expect(result[0]).toHaveLength(1);
				expect(mockedGenericFunctions.apiRequest).toHaveBeenCalledWith(
					'GET',
					'/api/v2/tables/table123/records',
					{},
					{ limit: 5 },
				);
			});
		});

		describe('Update Operation', () => {
			it('should update rows for v3', async () => {
				const nodeParameters = {
					version: 3,
					resource: 'row',
					operation: 'update',
					projectId: 'base123',
					table: 'table123',
					dataToSend: 'defineBelow',
					fieldsUi: {
						fieldValues: [{ fieldName: 'name', fieldValue: 'Updated Name', binaryData: false }],
					},
				};

				const mockResponse = [{ id: 1, name: 'Updated Name' }];
				mockedGenericFunctions.apiRequest.mockResolvedValue(mockResponse);

				const executeFunction = createNocoDBExecuteFunction(nodeParameters);
				const result = await nocoDbNode.execute.call(executeFunction);

				expect(result[0]).toHaveLength(1);
				expect(result[0][0].json.name).toBe('Updated Name');
				expect(mockedGenericFunctions.apiRequest).toHaveBeenCalledWith(
					'PATCH',
					'/api/v2/tables/table123/records',
					expect.any(Array),
					{},
				);
			});
		});

		describe('Delete Operation', () => {
			it('should delete rows for v3', async () => {
				const nodeParameters = {
					version: 3,
					resource: 'row',
					operation: 'delete',
					projectId: 'base123',
					table: 'table123',
					primaryKey: 'id',
					id: '1',
				};

				const mockResponse = [{ id: 1, deleted: true }];
				mockedGenericFunctions.apiRequest.mockResolvedValue(mockResponse);

				const executeFunction = createNocoDBExecuteFunction(nodeParameters);
				const result = await nocoDbNode.execute.call(executeFunction);

				expect(result[0]).toHaveLength(1);
				expect(mockedGenericFunctions.apiRequest).toHaveBeenCalledWith(
					'DELETE',
					'/api/v2/tables/table123/records',
					[{ id: '1' }],
					{},
				);
			});
		});

		describe('Error Handling', () => {
			it('should throw NodeApiError on API failure', async () => {
				const nodeParameters = {
					version: 3,
					resource: 'row',
					operation: 'get',
					projectId: 'base123',
					table: 'table123',
					id: '1',
				};

				const apiError = new Error('API Error');
				mockedGenericFunctions.apiRequest.mockRejectedValue(apiError);

				const executeFunction = createNocoDBExecuteFunction(nodeParameters);

				await expect(nocoDbNode.execute.call(executeFunction)).rejects.toThrow(NodeApiError);
			});

			it('should return error object when continueOnFail is true for getAll operation', async () => {
				const nodeParameters = {
					version: 3,
					resource: 'row',
					operation: 'getAll',
					projectId: 'base123',
					table: 'table123',
					returnAll: false,
					limit: 5,
					downloadAttachments: false,
					options: {},
				};

				const apiError = new Error('API Error');
				mockedGenericFunctions.apiRequest.mockRejectedValue(apiError);

				const executeFunction = createNocoDBExecuteFunction(
					nodeParameters,
					defaultInputItems,
					true,
				);
				const result = await nocoDbNode.execute.call(executeFunction);

				expect(result[0]).toHaveLength(1);
				expect(result[0][0].json.error).toContain('API Error');
			});
		});
	});

	describe('Link Resource', () => {
		describe('Add Operation', () => {
			it('should add link relationships for v3', async () => {
				const nodeParameters = {
					version: 3,
					resource: 'link',
					operation: 'add',
					projectId: 'base123',
					table: 'table123',
					field: 'col123',
					id: '1',
					links: '2,3',
				};

				const mockResponse = { success: true };
				mockedGenericFunctions.apiRequest.mockResolvedValue(mockResponse);

				const executeFunction = createNocoDBExecuteFunction(nodeParameters);
				const result = await nocoDbNode.execute.call(executeFunction);

				expect(result[0]).toHaveLength(1);
				expect(result[0][0].json).toEqual({ result: mockResponse });
				expect(mockedGenericFunctions.apiRequest).toHaveBeenCalledWith(
					'POST',
					'/api/v2/tables/table123/links/col123/records/1',
					[{ Id: '2' }, { Id: '3' }],
					{},
				);
			});

			it('should handle multiple input items for add operation', async () => {
				const inputItems = [
					{ json: { links: '2' }, pairedItem: { item: 0, input: undefined } },
					{ json: { links: '3,4' }, pairedItem: { item: 1, input: undefined } },
				];

				const nodeParameters = {
					version: 3,
					resource: 'link',
					operation: 'add',
					projectId: 'base123',
					table: 'table123',
					field: 'col123',
					id: '1',
					links: '{{$json.links}}',
				};

				const mockResponse = { success: true };
				mockedGenericFunctions.apiRequest.mockResolvedValue(mockResponse);

				const executeFunction = createNocoDBExecuteFunction(nodeParameters, inputItems);
				// Mock getNodeParameter for each item to return the expected links
				(executeFunction as any).getNodeParameter = jest.fn(
					(parameterName: string, itemIndex: number) => {
						if (parameterName === 'links') {
							return itemIndex === 0 ? '2' : '3,4';
						}
						return nodeParameters[parameterName as keyof typeof nodeParameters];
					},
				);

				const result = await nocoDbNode.execute.call(executeFunction);

				expect(result[0]).toHaveLength(1);
				expect(mockedGenericFunctions.apiRequest).toHaveBeenCalledWith(
					'POST',
					'/api/v2/tables/table123/links/col123/records/1',
					[{ Id: '2' }, { Id: '3' }, { Id: '4' }],
					{},
				);
			});
		});

		describe('Delete Operation', () => {
			it('should delete link relationships for v3', async () => {
				const nodeParameters = {
					version: 3,
					resource: 'link',
					operation: 'delete',
					projectId: 'base123',
					table: 'table123',
					field: 'col123',
					id: '1',
					links: '2',
				};

				const mockResponse = { success: true };
				mockedGenericFunctions.apiRequest.mockResolvedValue(mockResponse);

				const executeFunction = createNocoDBExecuteFunction(nodeParameters);
				const result = await nocoDbNode.execute.call(executeFunction);

				expect(result[0]).toHaveLength(1);
				expect(result[0][0].json).toEqual({ result: mockResponse });
				expect(mockedGenericFunctions.apiRequest).toHaveBeenCalledWith(
					'DELETE',
					'/api/v2/tables/table123/links/col123/records/1',
					[{ Id: '2' }],
					{},
				);
			});

			it('should handle multiple links for delete operation', async () => {
				const nodeParameters = {
					version: 3,
					resource: 'link',
					operation: 'delete',
					projectId: 'base123',
					table: 'table123',
					field: 'col123',
					id: '1',
					links: '2,3,4',
				};

				const mockResponse = { success: true };
				mockedGenericFunctions.apiRequest.mockResolvedValue(mockResponse);

				const executeFunction = createNocoDBExecuteFunction(nodeParameters);
				const result = await nocoDbNode.execute.call(executeFunction);

				expect(result[0]).toHaveLength(1);
				expect(mockedGenericFunctions.apiRequest).toHaveBeenCalledWith(
					'DELETE',
					'/api/v2/tables/table123/links/col123/records/1',
					[{ Id: '2' }, { Id: '3' }, { Id: '4' }],
					{},
				);
			});
		});

		describe('Get Many Operation', () => {
			it('should get all linked records for v3', async () => {
				const nodeParameters = {
					version: 3,
					resource: 'link',
					operation: 'getAll',
					projectId: 'base123',
					table: 'table123',
					field: 'col123',
					id: '1',
					returnAll: true,
					downloadAttachments: false,
					options: {},
				};

				const mockResponse = [
					{ id: 2, name: 'Linked Item 1' },
					{ id: 3, name: 'Linked Item 2' },
				];
				mockedGenericFunctions.apiRequestAllItems.mockResolvedValue(mockResponse);

				const executeFunction = createNocoDBExecuteFunction(nodeParameters);
				const result = await nocoDbNode.execute.call(executeFunction);

				expect(result[0]).toHaveLength(2);
				expect(mockedGenericFunctions.apiRequestAllItems).toHaveBeenCalledWith(
					'GET',
					'/api/v2/tables/table123/links/col123/records/1',
					{},
					{},
				);
			});

			it('should handle pagination for linked records', async () => {
				const nodeParameters = {
					version: 3,
					resource: 'link',
					operation: 'getAll',
					projectId: 'base123',
					table: 'table123',
					field: 'col123',
					id: '1',
					returnAll: false,
					limit: 10,
					downloadAttachments: false,
					options: {},
				};

				const mockResponse = {
					list: [{ id: 2, name: 'Linked Item 1' }],
				};
				mockedGenericFunctions.apiRequest.mockResolvedValue(mockResponse);

				const executeFunction = createNocoDBExecuteFunction(nodeParameters);
				const result = await nocoDbNode.execute.call(executeFunction);

				expect(result[0]).toHaveLength(1);
				expect(mockedGenericFunctions.apiRequest).toHaveBeenCalledWith(
					'GET',
					'/api/v2/tables/table123/links/col123/records/1',
					{},
					{ limit: 10 },
				);
			});

			it('should handle sorting and field selection for linked records', async () => {
				const nodeParameters = {
					version: 3,
					resource: 'link',
					operation: 'getAll',
					projectId: 'base123',
					table: 'table123',
					field: 'col123',
					id: '1',
					returnAll: false,
					limit: 5,
					downloadAttachments: false,
					options: {
						sort: {
							property: [
								{ field: 'name', direction: 'asc' },
								{ field: 'created_at', direction: 'desc' },
							],
						},
						fields: ['id', 'name'],
					},
				};

				const mockResponse = {
					list: [{ id: 2, name: 'Linked Item 1' }],
				};
				mockedGenericFunctions.apiRequest.mockResolvedValue(mockResponse);

				const executeFunction = createNocoDBExecuteFunction(nodeParameters);
				const result = await nocoDbNode.execute.call(executeFunction);

				expect(result[0]).toHaveLength(1);
				expect(mockedGenericFunctions.apiRequest).toHaveBeenCalledWith(
					'GET',
					'/api/v2/tables/table123/links/col123/records/1',
					{},
					{
						limit: 5,
						sort: 'name,-created_at',
						fields: 'id,name',
					},
				);
			});

			it('should handle download attachments for linked records', async () => {
				const nodeParameters = {
					version: 3,
					resource: 'link',
					operation: 'getAll',
					projectId: 'base123',
					table: 'table123',
					field: 'col123',
					id: '1',
					returnAll: true,
					downloadAttachments: true,
					downloadFieldNames: 'attachment,image',
				};

				const mockResponse = [{ id: 2, name: 'Linked Item 1', attachment: 'file.pdf' }];
				const mockDownloadResponse = [
					{
						json: { id: 2 },
						binary: {
							attachment: {
								data: 'base64encodeddata',
								mimeType: 'application/pdf',
								fileName: 'file.pdf',
							},
						},
					},
				];
				mockedGenericFunctions.apiRequestAllItems.mockResolvedValue(mockResponse);
				mockedGenericFunctions.downloadRecordAttachments.mockResolvedValue(mockDownloadResponse);

				const executeFunction = createNocoDBExecuteFunction(nodeParameters);
				const result = await nocoDbNode.execute.call(executeFunction);

				expect(result[0]).toEqual(mockDownloadResponse);
				expect(mockedGenericFunctions.downloadRecordAttachments).toHaveBeenCalledWith(
					mockResponse,
					['attachment', 'image'],
					[{ item: 0 }],
				);
			});
		});

		describe('Error Handling', () => {
			it('should throw NodeApiError on link add failure', async () => {
				const nodeParameters = {
					version: 3,
					resource: 'link',
					operation: 'add',
					projectId: 'base123',
					table: 'table123',
					field: 'col123',
					id: '1',
					links: '2',
				};

				const apiError = new Error('Link API Error');
				mockedGenericFunctions.apiRequest.mockRejectedValue(apiError);

				const executeFunction = createNocoDBExecuteFunction(nodeParameters);

				await expect(nocoDbNode.execute.call(executeFunction)).rejects.toThrow(NodeApiError);
			});

			it('should return error object when continueOnFail is true for add operation', async () => {
				const nodeParameters = {
					version: 3,
					resource: 'link',
					operation: 'add',
					projectId: 'base123',
					table: 'table123',
					field: 'col123',
					id: '1',
					links: '2',
				};

				const apiError = new Error('Link creation failed');
				mockedGenericFunctions.apiRequest.mockRejectedValue(apiError);

				const executeFunction = createNocoDBExecuteFunction(
					nodeParameters,
					defaultInputItems,
					true,
				);
				const result = await nocoDbNode.execute.call(executeFunction);

				expect(result[0]).toHaveLength(1);
				expect(result[0][0].json.error).toContain('Link creation failed');
			});

			it('should handle invalid field error for getAll operation', async () => {
				const nodeParameters = {
					version: 3,
					resource: 'link',
					operation: 'getAll',
					projectId: 'base123',
					table: 'table123',
					field: 'invalid_field',
					id: '1',
					returnAll: true,
					downloadAttachments: false,
				};

				const apiError = new Error('Field not found');
				mockedGenericFunctions.apiRequestAllItems.mockRejectedValue(apiError);

				const executeFunction = createNocoDBExecuteFunction(
					nodeParameters,
					defaultInputItems,
					true,
				);
				const result = await nocoDbNode.execute.call(executeFunction);

				expect(result[0]).toHaveLength(1);
				expect(result[0][0].json.error).toContain('Field not found');
			});

			it('should handle missing record error for delete operation', async () => {
				const nodeParameters = {
					version: 3,
					resource: 'link',
					operation: 'delete',
					projectId: 'base123',
					table: 'table123',
					field: 'col123',
					id: '999',
					links: '2',
				};

				const apiError = new Error('Record not found');
				mockedGenericFunctions.apiRequest.mockRejectedValue(apiError);

				const executeFunction = createNocoDBExecuteFunction(
					nodeParameters,
					defaultInputItems,
					true,
				);
				const result = await nocoDbNode.execute.call(executeFunction);

				expect(result[0]).toHaveLength(1);
				expect(result[0][0].json.error).toContain('Record not found');
			});
		});
	});
});
