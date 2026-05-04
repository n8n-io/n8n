import { mockDeep } from 'jest-mock-extended';
import type {
	IDataObject,
	IExecuteFunctions,
	INode,
	INodeExecutionData,
	INodePropertyOptions,
	NodeParameterValueType,
} from 'n8n-workflow';

jest.mock('../transport', () => ({
	gravityZoneApiRequest: jest.fn(),
}));

import {
	getOperationEntries,
	runOperationTest,
	type GravityZoneApiRequest,
} from './operationTestUtils';
import * as incidents from '../actions/incidents';
import { execute as executeAddToBlocklist } from '../actions/incidents/addToBlocklist.operation';
import { execute as executeChangeIncidentStatus } from '../actions/incidents/changeIncidentStatus.operation';
import { execute as executeCreateCustomRule } from '../actions/incidents/createCustomRule.operation';
import { execute as executeCreateIsolateEndpointTask } from '../actions/incidents/createIsolateEndpointTask.operation';
import { execute as executeCreateResponseAction } from '../actions/incidents/createResponseAction.operation';
import { execute as executeCreateRestoreEndpointFromIsolationTask } from '../actions/incidents/createRestoreEndpointFromIsolationTask.operation';
import { execute as executeDeleteCustomRule } from '../actions/incidents/deleteCustomRule.operation';
import { execute as executeGetBlocklistItems } from '../actions/incidents/getBlocklistItems.operation';
import { execute as executeGetCustomRulesList } from '../actions/incidents/getCustomRulesList.operation';
import { execute as executeGetResponseActionStatus } from '../actions/incidents/getResponseActionStatus.operation';
import { execute as executeGetSimilarEmails } from '../actions/incidents/getSimilarEmails.operation';
import { execute as executeRemoveFromBlocklist } from '../actions/incidents/removeFromBlocklist.operation';
import { execute as executeUpdateCustomRule } from '../actions/incidents/updateCustomRule.operation';
import { execute as executeUpdateIncidentNote } from '../actions/incidents/updateIncidentNote.operation';
import { gravityZoneApiRequest } from '../transport';

const gravityZoneApiRequestMock =
	gravityZoneApiRequest as jest.MockedFunction<GravityZoneApiRequest>;

describe('GravityZone incidents operations', () => {
	const expectedIncidentOperations = [
		'addToBlocklist',
		'changeIncidentStatus',
		'createCustomRule',
		'createIsolateEndpointTask',
		'createResponseAction',
		'createRestoreEndpointFromIsolationTask',
		'deleteCustomRule',
		'getBlocklistItems',
		'getCustomRulesList',
		'getResponseActionStatus',
		'getSimilarEmails',
		'removeFromBlocklist',
		'updateCustomRule',
		'updateIncidentNote',
	];

	const mockNode: INode = {
		id: 'test-node-id',
		name: 'GravityZone Test',
		type: 'n8n-nodes-base.gravityZone',
		typeVersion: 1,
		position: [0, 0],
		parameters: {},
	};

	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;

	const mockConstructExecutionMetaData = (
		data: INodeExecutionData[],
		options: { itemData: { item: number } },
	): INodeExecutionData[] =>
		data.map((item) => ({
			...item,
			pairedItem: { item: options.itemData.item },
		}));

	beforeEach(() => {
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();

		jest.clearAllMocks();

		mockExecuteFunctions.getNode.mockReturnValue(mockNode);

		(mockExecuteFunctions.helpers.constructExecutionMetaData as jest.Mock).mockImplementation(
			mockConstructExecutionMetaData,
		);
	});

	function stubParameters(params: Record<string, NodeParameterValueType | object>) {
		mockExecuteFunctions.getNodeParameter.mockImplementation(
			(paramName: string, _itemIndex: number, defaultValue?: unknown) => {
				if (Object.prototype.hasOwnProperty.call(params, paramName)) {
					return params[paramName];
				}

				return defaultValue as NodeParameterValueType | object | undefined;
			},
		);
	}

	describe('addToBlocklist', () => {
		it('should call gravityZoneApiRequest with parsed JSON rules, type, optional recursive, and API v1.2', async () => {
			const rulesJson = '[{"details":{"sha256":"abc"},"note":"n1"}]';

			stubParameters({
				type: 'hash',
				rules: rulesJson,
				options: { recursive: false },
			});

			const apiResult: IDataObject = { added: true, ruleIds: ['r1'] };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeAddToBlocklist.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'incidents',
				'addToBlocklist',
				{
					type: 'hash',
					rules: [{ details: { sha256: 'abc' }, note: 'n1' }],
					recursive: false,
				},
				'v1.2',
			);
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should use rules as IDataObject[] when already parsed', async () => {
			const rules: IDataObject[] = [{ details: { path: '/tmp/x' } }];

			stubParameters({
				type: 'path',
				rules,
				options: {},
			});

			const apiResult: IDataObject = { ok: true };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			await executeAddToBlocklist.call(mockExecuteFunctions, 1);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'incidents',
				'addToBlocklist',
				{
					type: 'path',
					rules,
				},
				'v1.2',
			);
		});

		it('should omit recursive when options.recursive is undefined', async () => {
			stubParameters({
				type: 'connection',
				rules: '[]',
				options: {},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeAddToBlocklist.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'incidents',
				'addToBlocklist',
				{
					type: 'connection',
					rules: [],
				},
				'v1.2',
			);

			const callArgs = gravityZoneApiRequestMock.mock.calls[0][2];

			expect(callArgs.recursive).toBeUndefined();
		});

		it('should throw when rules JSON is invalid', async () => {
			stubParameters({
				type: 'hash',
				rules: 'not-json',
				options: {},
			});

			await expect(executeAddToBlocklist.call(mockExecuteFunctions, 0)).rejects.toThrow();
			expect(gravityZoneApiRequestMock).not.toHaveBeenCalled();
		});

		it('should throw when rules are not JSON input', async () => {
			stubParameters({
				type: 'hash',
				rules: 42,
				options: {},
			});

			await expect(executeAddToBlocklist.call(mockExecuteFunctions, 0)).rejects.toThrow();
			expect(gravityZoneApiRequestMock).not.toHaveBeenCalled();
		});
	});

	describe('changeIncidentStatus', () => {
		it('should call gravityZoneApiRequest with incident type, id, status and default API version', async () => {
			stubParameters({
				type: 'extendedIncidents',
				incidentId: 'inc-42',
				status: 3,
			});

			const apiResult: IDataObject = { success: true };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeChangeIncidentStatus.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('incidents', 'changeIncidentStatus', {
				type: 'extendedIncidents',
				incidentId: 'inc-42',
				status: 3,
			});
			expect(gravityZoneApiRequestMock.mock.calls[0]).toHaveLength(3);
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should pass empty incidentId when parameter is empty string', async () => {
			stubParameters({
				type: 'incidents',
				incidentId: '',
				status: 1,
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeChangeIncidentStatus.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('incidents', 'changeIncidentStatus', {
				type: 'incidents',
				incidentId: '',
				status: 1,
			});
		});
	});

	describe('createCustomRule', () => {
		it('should build params with settings object, optional fields, and split tags', async () => {
			const settings: IDataObject = { target: 'all', severity: 2 };

			stubParameters({
				name: 'Rule A',
				settings,
				options: {
					type: 1,
					description: 'desc',
					tags: 'a, b , , c',
					returnRuleId: true,
				},
			});

			const apiResult: IDataObject = { ruleId: 'rid-1' };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeCreateCustomRule.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('incidents', 'createCustomRule', {
				name: 'Rule A',
				settings,
				type: 1,
				description: 'desc',
				tags: ['a', 'b', 'c'],
				returnRuleId: true,
			});
			expect(result[0]?.json).toEqual(apiResult);
		});

		it('should include returnRuleId when explicitly false', async () => {
			stubParameters({
				name: 'Rule B',
				settings: '{}',
				options: {
					returnRuleId: false,
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeCreateCustomRule.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('incidents', 'createCustomRule', {
				name: 'Rule B',
				settings: {},
				returnRuleId: false,
			});
		});

		it('should parse settings from JSON string', async () => {
			stubParameters({
				name: 'R2',
				settings: '{"filters":[]}',
				options: {},
			});

			gravityZoneApiRequestMock.mockResolvedValue({ ok: true });

			await executeCreateCustomRule.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('incidents', 'createCustomRule', {
				name: 'R2',
				settings: { filters: [] },
			});
		});

		it('should omit description and tags when empty', async () => {
			stubParameters({
				name: 'R3',
				settings: '{}',
				options: {
					description: '',
					tags: '',
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeCreateCustomRule.call(mockExecuteFunctions, 0);

			const params = gravityZoneApiRequestMock.mock.calls[0][2];

			expect(params.description).toBeUndefined();
			expect(params.tags).toBeUndefined();
		});

		it('should throw when settings JSON is invalid', async () => {
			stubParameters({
				name: 'R',
				settings: '{',
				options: {},
			});

			await expect(executeCreateCustomRule.call(mockExecuteFunctions, 0)).rejects.toThrow();
			expect(gravityZoneApiRequestMock).not.toHaveBeenCalled();
		});

		it('should throw when settings are not JSON input', async () => {
			stubParameters({
				name: 'R',
				settings: 10,
				options: {},
			});

			await expect(executeCreateCustomRule.call(mockExecuteFunctions, 0)).rejects.toThrow();
			expect(gravityZoneApiRequestMock).not.toHaveBeenCalled();
		});
	});

	describe('createIsolateEndpointTask', () => {
		it('should call gravityZoneApiRequest with endpointId and API v1.1', async () => {
			stubParameters({ endpointId: 'ep-99' });

			const apiResult: IDataObject = { taskId: 't1' };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeCreateIsolateEndpointTask.call(mockExecuteFunctions, 2);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'incidents',
				'createIsolateEndpointTask',
				{ endpointId: 'ep-99' },
				'v1.1',
			);
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 2 },
				},
			]);
		});

		it('should pass empty endpointId when missing in UI sense', async () => {
			stubParameters({ endpointId: '' });

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeCreateIsolateEndpointTask.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'incidents',
				'createIsolateEndpointTask',
				{ endpointId: '' },
				'v1.1',
			);
		});
	});

	describe('createResponseAction', () => {
		it('should build params with actionType and optional string fields', async () => {
			stubParameters({
				actionType: 6,
				options: {
					incidentId: 'inc-1',
					username: 'user@contoso.com',
					emailId: 'email-123',
					fileUrl: '',
				},
			});

			const apiResult: IDataObject = { actionHandle: 'h1' };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeCreateResponseAction.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('incidents', 'createResponseAction', {
				actionType: 6,
				incidentId: 'inc-1',
				username: 'user@contoso.com',
				emailId: 'email-123',
			});
			expect(result[0]?.json).toEqual(apiResult);
		});

		it('should parse integrationIdentifiers and targets from JSON strings', async () => {
			stubParameters({
				actionType: 11,
				options: {
					integrationIdentifiers: '{"tenant":"t1"}',
					targets: '{"batch":true}',
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeCreateResponseAction.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('incidents', 'createResponseAction', {
				actionType: 11,
				integrationIdentifiers: { tenant: 't1' },
				targets: { batch: true },
			});
		});

		it('should use object integrationIdentifiers and targets without parsing', async () => {
			const integrationIdentifiers: IDataObject = { id: 1 };
			const targets: IDataObject = { x: 2 };

			stubParameters({
				actionType: 10,
				options: {
					incidentId: 'inc',
					fileUrl: 'https://example.com/f',
					integrationIdentifiers,
					targets,
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeCreateResponseAction.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('incidents', 'createResponseAction', {
				actionType: 10,
				incidentId: 'inc',
				fileUrl: 'https://example.com/f',
				integrationIdentifiers,
				targets,
			});
		});

		it('should omit empty optional fields and empty JSON objects', async () => {
			stubParameters({
				actionType: 5,
				options: {
					incidentId: '',
					username: '',
					emailId: '',
					fileUrl: '',
					integrationIdentifiers: '{}',
					targets: '{}',
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeCreateResponseAction.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('incidents', 'createResponseAction', {
				actionType: 5,
			});
		});

		it('should throw when integrationIdentifiers JSON is invalid', async () => {
			stubParameters({
				actionType: 1,
				options: {
					integrationIdentifiers: '{',
				},
			});

			await expect(executeCreateResponseAction.call(mockExecuteFunctions, 0)).rejects.toThrow();
			expect(gravityZoneApiRequestMock).not.toHaveBeenCalled();
		});

		it('should throw when targets JSON is invalid', async () => {
			stubParameters({
				actionType: 11,
				options: {
					targets: '{',
				},
			});

			await expect(executeCreateResponseAction.call(mockExecuteFunctions, 0)).rejects.toThrow();
			expect(gravityZoneApiRequestMock).not.toHaveBeenCalled();
		});

		it('should throw when integrationIdentifiers are not JSON input', async () => {
			stubParameters({
				actionType: 2,
				options: {
					integrationIdentifiers: 123,
				},
			});

			await expect(executeCreateResponseAction.call(mockExecuteFunctions, 0)).rejects.toThrow();
			expect(gravityZoneApiRequestMock).not.toHaveBeenCalled();
		});

		it('should throw when targets are not JSON input', async () => {
			stubParameters({
				actionType: 2,
				options: {
					targets: 123,
				},
			});

			await expect(executeCreateResponseAction.call(mockExecuteFunctions, 0)).rejects.toThrow();
			expect(gravityZoneApiRequestMock).not.toHaveBeenCalled();
		});
	});

	describe('createRestoreEndpointFromIsolationTask', () => {
		it('should call gravityZoneApiRequest with endpointId and API v1.1', async () => {
			stubParameters({ endpointId: 'ep-restore-1' });

			const apiResult: IDataObject = { taskId: 'restore-1' };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeCreateRestoreEndpointFromIsolationTask.call(
				mockExecuteFunctions,
				1,
			);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'incidents',
				'createRestoreEndpointFromIsolationTask',
				{ endpointId: 'ep-restore-1' },
				'v1.1',
			);
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 1 },
				},
			]);
		});

		it('should pass empty endpointId when parameter is empty string', async () => {
			stubParameters({ endpointId: '' });

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeCreateRestoreEndpointFromIsolationTask.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'incidents',
				'createRestoreEndpointFromIsolationTask',
				{ endpointId: '' },
				'v1.1',
			);
		});
	});

	describe('deleteCustomRule', () => {
		it('should include ruleId and type when provided', async () => {
			stubParameters({ ruleId: 'rule-123', options: { type: 1 } });

			const apiResult: IDataObject = { deleted: true };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeDeleteCustomRule.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('incidents', 'deleteCustomRule', {
				ruleId: 'rule-123',
				type: 1,
			});
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should omit type when not provided', async () => {
			stubParameters({ ruleId: 'rule-456', options: {} });

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeDeleteCustomRule.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('incidents', 'deleteCustomRule', {
				ruleId: 'rule-456',
			});
		});
	});

	describe('getBlocklistItems', () => {
		it('should request blocklist items with pagination and API v1.2', async () => {
			stubParameters({ page: 2, perPage: 75 });

			const apiResult: IDataObject = { items: [] };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeGetBlocklistItems.call(mockExecuteFunctions, 2);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'incidents',
				'getBlocklistItems',
				{ page: 2, perPage: 75 },
				'v1.2',
			);
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 2 },
				},
			]);
		});
	});

	describe('getCustomRulesList', () => {
		it('should include provided options', async () => {
			stubParameters({
				options: {
					type: 1,
					page: 3,
					perPage: 20,
				},
			});

			const apiResult: IDataObject = { rules: [] };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeGetCustomRulesList.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('incidents', 'getCustomRulesList', {
				type: 1,
				page: 3,
				perPage: 20,
			});
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should include page without perPage when only page is set', async () => {
			stubParameters({
				options: {
					page: 4,
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetCustomRulesList.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('incidents', 'getCustomRulesList', {
				page: 4,
			});
		});

		it('should include perPage without page when only perPage is set', async () => {
			stubParameters({
				options: {
					perPage: 10,
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetCustomRulesList.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('incidents', 'getCustomRulesList', {
				perPage: 10,
			});
		});

		it('should request list with empty params when options are empty', async () => {
			stubParameters({ options: {} });

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetCustomRulesList.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('incidents', 'getCustomRulesList', {});
		});
	});

	describe('getResponseActionStatus', () => {
		it('should request status for actionId', async () => {
			stubParameters({ actionId: 'action-1' });

			const apiResult: IDataObject = { status: 'done' };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeGetResponseActionStatus.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'incidents',
				'getResponseActionStatus',
				{ actionId: 'action-1' },
			);
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});
	});

	describe('getSimilarEmails', () => {
		it('should include pagination options when provided', async () => {
			stubParameters({
				emailId: 'email-1',
				options: { page: 2, perPage: 25 },
			});

			const apiResult: IDataObject = { items: [] };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeGetSimilarEmails.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('incidents', 'getSimilarEmails', {
				emailId: 'email-1',
				page: 2,
				perPage: 25,
			});
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should include page without perPage when only page is set', async () => {
			stubParameters({
				emailId: 'email-3',
				options: { page: 4 },
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetSimilarEmails.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('incidents', 'getSimilarEmails', {
				emailId: 'email-3',
				page: 4,
			});
		});

		it('should include perPage without page when only perPage is set', async () => {
			stubParameters({
				emailId: 'email-4',
				options: { perPage: 10 },
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetSimilarEmails.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('incidents', 'getSimilarEmails', {
				emailId: 'email-4',
				perPage: 10,
			});
		});

		it('should omit pagination options when not set', async () => {
			stubParameters({ emailId: 'email-2' });

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetSimilarEmails.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('incidents', 'getSimilarEmails', {
				emailId: 'email-2',
			});
		});
	});

	describe('removeFromBlocklist', () => {
		it('should split and trim ids before calling the API', async () => {
			stubParameters({ ids: 'id-1, id-2, , id-3 , ' });

			const apiResult: IDataObject = { removed: 3 };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeRemoveFromBlocklist.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'incidents',
				'removeFromBlocklist',
				{ ids: ['id-1', 'id-2', 'id-3'] },
				'v1.2',
			);
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should send empty ids list when input is empty', async () => {
			stubParameters({ ids: '' });

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeRemoveFromBlocklist.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'incidents',
				'removeFromBlocklist',
				{ ids: [] },
				'v1.2',
			);
		});
	});

	describe('updateCustomRule', () => {
		it('should build params with parsed settings and options', async () => {
			stubParameters({
				ruleId: 'rule-1',
				name: 'Rule One',
				settings: '{"filters":[]}',
				options: {
					type: 1,
					description: 'Updated rule',
					tags: 'tag1, tag2, , tag3',
				},
			});

			const apiResult: IDataObject = { updated: true };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeUpdateCustomRule.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('incidents', 'updateCustomRule', {
				ruleId: 'rule-1',
				name: 'Rule One',
				settings: { filters: [] },
				type: 1,
				description: 'Updated rule',
				tags: ['tag1', 'tag2', 'tag3'],
			});
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('should omit description and tags when empty', async () => {
			stubParameters({
				ruleId: 'rule-2',
				name: 'Rule Two',
				settings: { match: 'any' },
				options: {
					description: '',
					tags: '',
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeUpdateCustomRule.call(mockExecuteFunctions, 0);

			const params = gravityZoneApiRequestMock.mock.calls[0][2];

			expect(params).toEqual({
				ruleId: 'rule-2',
				name: 'Rule Two',
				settings: { match: 'any' },
			});
			expect(params.description).toBeUndefined();
			expect(params.tags).toBeUndefined();
			expect(params.type).toBeUndefined();
		});

		it('should throw when settings JSON is invalid', async () => {
			stubParameters({
				ruleId: 'rule-3',
				name: 'Rule Three',
				settings: '{',
				options: {},
			});

			await expect(executeUpdateCustomRule.call(mockExecuteFunctions, 0)).rejects.toThrow();
			expect(gravityZoneApiRequestMock).not.toHaveBeenCalled();
		});

		it('should throw when settings are not JSON input', async () => {
			stubParameters({
				ruleId: 'rule-4',
				name: 'Rule Four',
				settings: 5,
				options: {},
			});

			await expect(executeUpdateCustomRule.call(mockExecuteFunctions, 0)).rejects.toThrow();
			expect(gravityZoneApiRequestMock).not.toHaveBeenCalled();
		});
	});

	describe('updateIncidentNote', () => {
		it('should update the note and call API v1.1', async () => {
			stubParameters({
				type: 'extendedIncidents',
				incidentId: 'inc-900',
				note: 'Investigating now.',
			});

			const apiResult: IDataObject = { success: true };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeUpdateIncidentNote.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'incidents',
				'updateIncidentNote',
				{
					type: 'extendedIncidents',
					incidentId: 'inc-900',
					note: 'Investigating now.',
				},
				'v1.1',
			);
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});
	});

	describe('action description', () => {
		it('should list every incidents action in the action options', () => {
			const actionProperty = incidents.description.find((property) => property.name === 'action');

			expect(actionProperty?.default).toBe('getCustomRulesList');
			expect(actionProperty?.type).toBe('options');

			const optionValues = Array.isArray(actionProperty?.options)
				? actionProperty.options
						.filter(
							(option): option is INodePropertyOptions =>
								typeof option === 'object' && option !== null && 'value' in option,
						)
						.map((option) => option.value)
						.filter((value): value is string => typeof value === 'string')
				: [];

			expect(optionValues).toEqual(expectedIncidentOperations);
		});
	});

	describe('operation exports', () => {
		const operations = getOperationEntries(incidents as Record<string, unknown>);

		it('should include all incidents operations', () => {
			const operationNames = operations.map(({ name }) => name).sort();

			expect(operationNames).toEqual([...expectedIncidentOperations].sort());
		});

		for (const { name, module } of operations) {
			it(`executes ${name}`, async () => {
				await runOperationTest(name, module, mockExecuteFunctions, gravityZoneApiRequestMock);
			});
		}
	});
});
