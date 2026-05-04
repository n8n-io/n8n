import { readdirSync } from 'fs';
import type {
	IDataObject,
	IExecuteFunctions,
	INodeProperties,
	INodePropertyOptions,
	NodeParameterValueType,
} from 'n8n-workflow';
import * as path from 'path';

import {
	createMockExecuteFunctions,
	getOperationEntries,
	runOperationTest,
	type GravityZoneApiRequest,
} from './operationTestUtils';
import * as quarantine from '../actions/quarantine';
import { execute as executeCreateAddFileToQuarantineTask } from '../actions/quarantine/createAddFileToQuarantineTask.operation';
import { execute as executeCreateEmptyQuarantineTask } from '../actions/quarantine/createEmptyQuarantineTask.operation';
import { execute as executeCreateReleaseQuarantineExchangeItemTask } from '../actions/quarantine/createReleaseQuarantineExchangeItemTask.operation';
import { execute as executeCreateRemoveQuarantineItemTask } from '../actions/quarantine/createRemoveQuarantineItemTask.operation';
import { execute as executeCreateRestoreQuarantineExchangeItemTask } from '../actions/quarantine/createRestoreQuarantineExchangeItemTask.operation';
import { execute as executeCreateRestoreQuarantineItemTask } from '../actions/quarantine/createRestoreQuarantineItemTask.operation';
import { execute as executeGetQuarantineItemsList } from '../actions/quarantine/getQuarantineItemsList.operation';
import { gravityZoneApiRequest } from '../transport';

jest.mock('../transport', () => ({
	gravityZoneApiRequest: jest.fn(),
}));

const gravityZoneApiRequestMock =
	gravityZoneApiRequest as jest.MockedFunction<GravityZoneApiRequest>;

describe('GravityZone quarantine operations', () => {
	let mockExecuteFunctions: jest.Mocked<IExecuteFunctions>;

	const stubParameters = (params: Record<string, NodeParameterValueType | object>) => {
		mockExecuteFunctions.getNodeParameter.mockImplementation(
			(paramName: string, _itemIndex: number, defaultValue?: unknown) => {
				if (Object.prototype.hasOwnProperty.call(params, paramName)) {
					return params[paramName];
				}

				return defaultValue as NodeParameterValueType | object | undefined;
			},
		);
	};

	const expectDisplayOptions = (description: INodeProperties[], action: string) => {
		for (const property of description) {
			expect(property.displayOptions?.show?.category).toEqual(['quarantine']);
			expect(property.displayOptions?.show?.action).toEqual([action]);
		}
	};

	beforeEach(() => {
		jest.clearAllMocks();

		mockExecuteFunctions = createMockExecuteFunctions();
	});

	describe('createAddFileToQuarantineTask', () => {
		it('builds params with trimmed endpoint IDs and selected service', async () => {
			stubParameters({
				service: 'exchange',
				endpointIds: 'endpoint-1, endpoint-2, , endpoint-3 ',
				filePath: 'C:\\quarantine\\suspicious.exe',
			});

			const apiResult: IDataObject = { taskId: 'task-101' };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeCreateAddFileToQuarantineTask.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'quarantine/exchange',
				'createAddFileToQuarantineTask',
				{
					endpointIds: ['endpoint-1', 'endpoint-2', 'endpoint-3'],
					filePath: 'C:\\quarantine\\suspicious.exe',
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

		it('targets the computers service when selected', async () => {
			stubParameters({
				service: 'computers',
				endpointIds: 'endpoint-9',
				filePath: 'C:\\quarantine\\malware.exe',
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeCreateAddFileToQuarantineTask.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'quarantine/computers',
				'createAddFileToQuarantineTask',
				{
					endpointIds: ['endpoint-9'],
					filePath: 'C:\\quarantine\\malware.exe',
				},
				'v1.1',
			);
		});
	});

	describe('createEmptyQuarantineTask', () => {
		it('sends an empty payload to the selected service', async () => {
			stubParameters({ service: 'computers' });

			const apiResult: IDataObject = { taskId: 'task-102' };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeCreateEmptyQuarantineTask.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'quarantine/computers',
				'createEmptyQuarantineTask',
				{},
				'v1.1',
			);
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('uses the exchange service when selected', async () => {
			stubParameters({ service: 'exchange' });

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeCreateEmptyQuarantineTask.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'quarantine/exchange',
				'createEmptyQuarantineTask',
				{},
				'v1.1',
			);
		});
	});

	describe('createReleaseQuarantineExchangeItemTask', () => {
		it('parses quarantine item IDs and targets the computers endpoint', async () => {
			stubParameters({
				quarantineItemsIds: 'item-1, , item-2, item-3 ',
			});

			const apiResult: IDataObject = { taskId: 'task-103' };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeCreateReleaseQuarantineExchangeItemTask.call(
				mockExecuteFunctions,
				0,
			);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'quarantine/computers',
				'createReleaseQuarantineExchangeItemTask',
				{
					quarantineItemsIds: ['item-1', 'item-2', 'item-3'],
				},
			);
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});
	});

	describe('createRemoveQuarantineItemTask', () => {
		it('uses the service path and trims the IDs', async () => {
			stubParameters({
				service: 'exchange',
				quarantineItemsIds: 'item-10, item-20, , item-30 ',
			});

			const apiResult: IDataObject = { taskId: 'task-104' };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeCreateRemoveQuarantineItemTask.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'quarantine/exchange',
				'createRemoveQuarantineItemTask',
				{
					quarantineItemsIds: ['item-10', 'item-20', 'item-30'],
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

		it('targets the computers service when selected', async () => {
			stubParameters({
				service: 'computers',
				quarantineItemsIds: 'item-40, item-50',
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeCreateRemoveQuarantineItemTask.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'quarantine/computers',
				'createRemoveQuarantineItemTask',
				{
					quarantineItemsIds: ['item-40', 'item-50'],
				},
				'v1.1',
			);
		});
	});

	describe('createRestoreQuarantineExchangeItemTask', () => {
		it('includes optional Exchange fields when provided', async () => {
			stubParameters({
				quarantineItemsIds: 'item-100, item-200',
				username: 'user@example.com',
				password: 'super-secret',
				options: {
					email: 'user@example.com',
					ewsUrl: 'https://ews.example.com',
				},
			});

			const apiResult: IDataObject = { taskId: 'task-105' };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeCreateRestoreQuarantineExchangeItemTask.call(
				mockExecuteFunctions,
				0,
			);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'quarantine/exchange',
				'createRestoreQuarantineExchangeItemTask',
				{
					quarantineItemsIds: ['item-100', 'item-200'],
					username: 'user@example.com',
					password: 'super-secret',
					email: 'user@example.com',
					ewsUrl: 'https://ews.example.com',
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

		it('includes email when EWS URL is omitted', async () => {
			stubParameters({
				quarantineItemsIds: 'item-250',
				username: 'user@example.com',
				password: 'super-secret',
				options: {
					email: 'alternate@example.com',
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeCreateRestoreQuarantineExchangeItemTask.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'quarantine/exchange',
				'createRestoreQuarantineExchangeItemTask',
				{
					quarantineItemsIds: ['item-250'],
					username: 'user@example.com',
					password: 'super-secret',
					email: 'alternate@example.com',
				},
				'v1.1',
			);
		});

		it('includes EWS URL when email is omitted', async () => {
			stubParameters({
				quarantineItemsIds: 'item-275',
				username: 'user@example.com',
				password: 'super-secret',
				options: {
					ewsUrl: 'https://ews.example.com',
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeCreateRestoreQuarantineExchangeItemTask.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'quarantine/exchange',
				'createRestoreQuarantineExchangeItemTask',
				{
					quarantineItemsIds: ['item-275'],
					username: 'user@example.com',
					password: 'super-secret',
					ewsUrl: 'https://ews.example.com',
				},
				'v1.1',
			);
		});

		it('omits empty optional fields', async () => {
			stubParameters({
				quarantineItemsIds: 'item-300',
				username: 'user@example.com',
				password: 'super-secret',
				options: {
					email: '',
					ewsUrl: '',
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeCreateRestoreQuarantineExchangeItemTask.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'quarantine/exchange',
				'createRestoreQuarantineExchangeItemTask',
				{
					quarantineItemsIds: ['item-300'],
					username: 'user@example.com',
					password: 'super-secret',
				},
				'v1.1',
			);
		});

		it('omits optional fields when options are missing', async () => {
			stubParameters({
				quarantineItemsIds: 'item-350',
				username: 'user@example.com',
				password: 'super-secret',
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeCreateRestoreQuarantineExchangeItemTask.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'quarantine/exchange',
				'createRestoreQuarantineExchangeItemTask',
				{
					quarantineItemsIds: ['item-350'],
					username: 'user@example.com',
					password: 'super-secret',
				},
				'v1.1',
			);
		});
	});

	describe('createRestoreQuarantineItemTask', () => {
		it('includes restore location and exclusion flags', async () => {
			stubParameters({
				quarantineItemsIds: 'item-400',
				options: {
					locationToRestore: 'C:\\restored',
					addExclusionInPolicy: false,
				},
			});

			const apiResult: IDataObject = { taskId: 'task-106' };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeCreateRestoreQuarantineItemTask.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'quarantine/computers',
				'createRestoreQuarantineItemTask',
				{
					quarantineItemsIds: ['item-400'],
					locationToRestore: 'C:\\restored',
					addExclusionInPolicy: false,
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

		it('includes restore location without exclusion flag', async () => {
			stubParameters({
				quarantineItemsIds: 'item-425',
				options: {
					locationToRestore: 'C:\\restore-only',
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeCreateRestoreQuarantineItemTask.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'quarantine/computers',
				'createRestoreQuarantineItemTask',
				{
					quarantineItemsIds: ['item-425'],
					locationToRestore: 'C:\\restore-only',
				},
				'v1.1',
			);
		});

		it('includes addExclusionInPolicy when true without location', async () => {
			stubParameters({
				quarantineItemsIds: 'item-450',
				options: {
					addExclusionInPolicy: true,
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeCreateRestoreQuarantineItemTask.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'quarantine/computers',
				'createRestoreQuarantineItemTask',
				{
					quarantineItemsIds: ['item-450'],
					addExclusionInPolicy: true,
				},
				'v1.1',
			);
		});

		it('omits empty restore location', async () => {
			stubParameters({
				quarantineItemsIds: 'item-500, item-600',
				options: {
					locationToRestore: '',
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeCreateRestoreQuarantineItemTask.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'quarantine/computers',
				'createRestoreQuarantineItemTask',
				{
					quarantineItemsIds: ['item-500', 'item-600'],
				},
				'v1.1',
			);
		});

		it('omits optional fields when options are missing', async () => {
			stubParameters({
				quarantineItemsIds: 'item-700',
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeCreateRestoreQuarantineItemTask.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'quarantine/computers',
				'createRestoreQuarantineItemTask',
				{
					quarantineItemsIds: ['item-700'],
				},
				'v1.1',
			);
		});
	});

	describe('getQuarantineItemsList', () => {
		it('includes endpoint, filters, and pagination', async () => {
			stubParameters({
				service: 'computers',
				options: {
					endpointId: 'endpoint-10',
					filters: '{"status":"quarantined"}',
					page: 2,
					perPage: 25,
				},
			});

			const apiResult: IDataObject = { items: [] };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeGetQuarantineItemsList.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'quarantine/computers',
				'getQuarantineItemsList',
				{
					endpointId: 'endpoint-10',
					filters: { status: 'quarantined' },
					page: 2,
					perPage: 25,
				},
			);
			expect(result).toEqual([
				{
					json: apiResult,
					pairedItem: { item: 0 },
				},
			]);
		});

		it('includes pagination without endpoint filters', async () => {
			stubParameters({
				service: 'computers',
				options: {
					page: 3,
					perPage: 15,
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetQuarantineItemsList.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'quarantine/computers',
				'getQuarantineItemsList',
				{
					page: 3,
					perPage: 15,
				},
			);
		});

		it('sends an empty payload when options are omitted', async () => {
			stubParameters({
				service: 'exchange',
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetQuarantineItemsList.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'quarantine/exchange',
				'getQuarantineItemsList',
				{},
			);
		});

		it('omits empty object filters', async () => {
			stubParameters({
				service: 'exchange',
				options: {
					filters: {},
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetQuarantineItemsList.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'quarantine/exchange',
				'getQuarantineItemsList',
				{},
			);
		});

		it('includes endpoint when filters are omitted', async () => {
			stubParameters({
				service: 'computers',
				options: {
					endpointId: 'endpoint-22',
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetQuarantineItemsList.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'quarantine/computers',
				'getQuarantineItemsList',
				{
					endpointId: 'endpoint-22',
				},
			);
		});

		it('accepts object filters and omits empty endpoint IDs', async () => {
			stubParameters({
				service: 'exchange',
				options: {
					endpointId: '',
					filters: { severity: 'high' },
					perPage: 10,
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetQuarantineItemsList.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'quarantine/exchange',
				'getQuarantineItemsList',
				{
					filters: { severity: 'high' },
					perPage: 10,
				},
			);
		});

		it('omits empty filters', async () => {
			stubParameters({
				service: 'computers',
				options: {
					filters: '{}',
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeGetQuarantineItemsList.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith(
				'quarantine/computers',
				'getQuarantineItemsList',
				{},
			);
		});

		it('throws when filters are invalid JSON', async () => {
			stubParameters({
				service: 'computers',
				options: {
					filters: '{invalid-json',
				},
			});

			await expect(executeGetQuarantineItemsList.call(mockExecuteFunctions, 0)).rejects.toThrow(
				/Input 'Filters'.*valid JSON/,
			);
			expect(gravityZoneApiRequestMock).not.toHaveBeenCalled();
		});

		it('throws when filters are not JSON input', async () => {
			stubParameters({
				service: 'computers',
				options: {
					filters: 42,
				},
			});

			await expect(executeGetQuarantineItemsList.call(mockExecuteFunctions, 0)).rejects.toThrow(
				/Input 'Filters'.*valid JSON/,
			);
			expect(gravityZoneApiRequestMock).not.toHaveBeenCalled();
		});
	});

	describe('display options', () => {
		it('applies quarantine display options to createAddFileToQuarantineTask fields', () => {
			expectDisplayOptions(
				quarantine.createAddFileToQuarantineTask.description,
				'createAddFileToQuarantineTask',
			);
		});

		it('applies quarantine display options to createEmptyQuarantineTask fields', () => {
			expectDisplayOptions(
				quarantine.createEmptyQuarantineTask.description,
				'createEmptyQuarantineTask',
			);
		});

		it('applies quarantine display options to createReleaseQuarantineExchangeItemTask fields', () => {
			expectDisplayOptions(
				quarantine.createReleaseQuarantineExchangeItemTask.description,
				'createReleaseQuarantineExchangeItemTask',
			);
		});

		it('applies quarantine display options to createRemoveQuarantineItemTask fields', () => {
			expectDisplayOptions(
				quarantine.createRemoveQuarantineItemTask.description,
				'createRemoveQuarantineItemTask',
			);
		});

		it('applies quarantine display options to createRestoreQuarantineExchangeItemTask fields', () => {
			expectDisplayOptions(
				quarantine.createRestoreQuarantineExchangeItemTask.description,
				'createRestoreQuarantineExchangeItemTask',
			);
		});

		it('applies quarantine display options to createRestoreQuarantineItemTask fields', () => {
			expectDisplayOptions(
				quarantine.createRestoreQuarantineItemTask.description,
				'createRestoreQuarantineItemTask',
			);
		});

		it('applies quarantine display options to getQuarantineItemsList fields', () => {
			expectDisplayOptions(quarantine.getQuarantineItemsList.description, 'getQuarantineItemsList');
		});
	});

	describe('action description', () => {
		it('lists quarantine actions in the action options', () => {
			const actionProperty = quarantine.description.find((property) => property.name === 'action');

			expect(actionProperty?.default).toBe('getQuarantineItemsList');
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

			expect(optionValues).toEqual([
				'createAddFileToQuarantineTask',
				'createEmptyQuarantineTask',
				'createReleaseQuarantineExchangeItemTask',
				'createRemoveQuarantineItemTask',
				'createRestoreQuarantineExchangeItemTask',
				'createRestoreQuarantineItemTask',
				'getQuarantineItemsList',
			]);
		});
	});

	describe('operation exports', () => {
		const operations = getOperationEntries(quarantine as Record<string, unknown>);

		it('includes all quarantine operation files', () => {
			const actionsDir = path.join(__dirname, '../actions/quarantine');

			const operationFiles = readdirSync(actionsDir).filter(
				(file) => file.endsWith('.operation.ts') || file.endsWith('.operation.js'),
			);

			const expected = operationFiles
				.map((file) => file.replace(/\.operation\.(ts|js)$/, ''))
				.sort();

			const exported = operations.map(({ name }) => name).sort();

			expect(exported).toEqual(expected);
		});

		for (const { name, module } of operations) {
			it(`executes ${name}`, async () => {
				await runOperationTest(name, module, mockExecuteFunctions, gravityZoneApiRequestMock);
			});
		}
	});
});
