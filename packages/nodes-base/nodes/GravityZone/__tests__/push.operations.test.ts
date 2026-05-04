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
import * as push from '../actions/push';
import { execute as executeGetPushEventSettings } from '../actions/push/getPushEventSettings.operation';
import { execute as executeGetPushEventStats } from '../actions/push/getPushEventStats.operation';
import { execute as executeResetPushEventStats } from '../actions/push/resetPushEventStats.operation';
import { execute as executeSendTestPushEvent } from '../actions/push/sendTestPushEvent.operation';
import { execute as executeSetPushEventSettings } from '../actions/push/setPushEventSettings.operation';
import { gravityZoneApiRequest } from '../transport';

jest.mock('../transport', () => ({
	gravityZoneApiRequest: jest.fn(),
}));

const gravityZoneApiRequestMock =
	gravityZoneApiRequest as jest.MockedFunction<GravityZoneApiRequest>;

describe('GravityZone push operations', () => {
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

	const wrapExecutionData = (data: IDataObject | IDataObject[]) =>
		(Array.isArray(data) ? data : [data]).map((item) => ({ json: item }));

	const wrapPairedExecutionData = (data: IDataObject | IDataObject[], itemIndex: number) =>
		wrapExecutionData(data).map((item) => ({
			...item,
			pairedItem: { item: itemIndex },
		}));

	const expectDisplayOptions = (description: INodeProperties[], action: string) => {
		for (const property of description) {
			expect(property.displayOptions?.show?.category).toEqual(['push']);
			expect(property.displayOptions?.show?.action).toEqual([action]);
		}
	};

	beforeEach(() => {
		jest.clearAllMocks();

		mockExecuteFunctions = createMockExecuteFunctions();
	});

	describe('getPushEventSettings', () => {
		it('requests the settings without parameters', async () => {
			const apiResult: IDataObject = { status: 1 };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult as unknown as IDataObject);

			const result = await executeGetPushEventSettings.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('push', 'getPushEventSettings', {});
			expect(result).toEqual(wrapPairedExecutionData(apiResult, 0));
		});

		it('wraps array responses and preserves item index', async () => {
			const apiResult: IDataObject[] = [{ status: 1 }, { status: 2 }];

			gravityZoneApiRequestMock.mockResolvedValue(apiResult as unknown as IDataObject);

			const constructExecutionMetaDataMock = jest.spyOn(
				mockExecuteFunctions.helpers,
				'constructExecutionMetaData',
			);

			const result = await executeGetPushEventSettings.call(mockExecuteFunctions, 2);

			expect(constructExecutionMetaDataMock).toHaveBeenCalledWith(wrapExecutionData(apiResult), {
				itemData: { item: 2 },
			});
			expect(result).toEqual(wrapPairedExecutionData(apiResult, 2));
		});
	});

	describe('getPushEventStats', () => {
		it('requests stats and wraps array responses', async () => {
			const apiResult: IDataObject[] = [{ count: 1 }, { count: 2 }];

			gravityZoneApiRequestMock.mockResolvedValue(apiResult as unknown as IDataObject);

			const result = await executeGetPushEventStats.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('push', 'getPushEventStats', {});
			expect(result).toEqual(wrapPairedExecutionData(apiResult, 0));
		});

		it('wraps object responses and preserves item index', async () => {
			const apiResult: IDataObject = { count: 7 };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const constructExecutionMetaDataMock = jest.spyOn(
				mockExecuteFunctions.helpers,
				'constructExecutionMetaData',
			);

			const result = await executeGetPushEventStats.call(mockExecuteFunctions, 1);

			expect(constructExecutionMetaDataMock).toHaveBeenCalledWith(wrapExecutionData(apiResult), {
				itemData: { item: 1 },
			});
			expect(result).toEqual(wrapPairedExecutionData(apiResult, 1));
		});
	});

	describe('resetPushEventStats', () => {
		it('resets stats without parameters', async () => {
			const apiResult: IDataObject = { reset: true };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeResetPushEventStats.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('push', 'resetPushEventStats', {});
			expect(result).toEqual(wrapPairedExecutionData(apiResult, 0));
		});

		it('wraps array responses and preserves item index', async () => {
			const apiResult: IDataObject[] = [{ reset: true }, { reset: false }];

			gravityZoneApiRequestMock.mockResolvedValue(apiResult as unknown as IDataObject);

			const constructExecutionMetaDataMock = jest.spyOn(
				mockExecuteFunctions.helpers,
				'constructExecutionMetaData',
			);

			const result = await executeResetPushEventStats.call(mockExecuteFunctions, 3);

			expect(constructExecutionMetaDataMock).toHaveBeenCalledWith(wrapExecutionData(apiResult), {
				itemData: { item: 3 },
			});
			expect(result).toEqual(wrapPairedExecutionData(apiResult, 3));
		});
	});

	describe('setPushEventSettings', () => {
		it('builds payload with parsed settings and subscriptions', async () => {
			stubParameters({
				status: 1,
				serviceType: 'splunk',
				serviceSettingsJson: '{"endpoint":"https://example.com","token":"secret"}',
				subscribeToEventTypes: ['av', 'fw'],
			});

			const apiResult: IDataObject = { ok: true };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeSetPushEventSettings.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('push', 'setPushEventSettings', {
				status: 1,
				serviceType: 'splunk',
				serviceSettings: {
					endpoint: 'https://example.com',
					token: 'secret',
				},
				subscribeToEventTypes: {
					av: true,
					fw: true,
				},
			});
			expect(result).toEqual(wrapPairedExecutionData(apiResult, 0));
		});

		it('accepts object settings', async () => {
			const serviceSettings: IDataObject = {
				endpoint: 'https://example.com',
				token: 'secret',
			};

			stubParameters({
				status: 0,
				serviceType: 'jsonRPC',
				serviceSettingsJson: serviceSettings,
				subscribeToEventTypes: ['avc'],
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeSetPushEventSettings.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('push', 'setPushEventSettings', {
				status: 0,
				serviceType: 'jsonRPC',
				serviceSettings,
				subscribeToEventTypes: {
					avc: true,
				},
			});
		});

		it('handles empty subscriptions', async () => {
			stubParameters({
				status: 1,
				serviceType: 'jsonRPC',
				serviceSettingsJson: '{"host":"example"}',
				subscribeToEventTypes: [],
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeSetPushEventSettings.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('push', 'setPushEventSettings', {
				status: 1,
				serviceType: 'jsonRPC',
				serviceSettings: { host: 'example' },
				subscribeToEventTypes: {},
			});
		});

		it('wraps array responses and preserves item index', async () => {
			stubParameters({
				status: 1,
				serviceType: 'jsonRPC',
				serviceSettingsJson: '{"endpoint":"https://example.com"}',
				subscribeToEventTypes: ['av'],
			});

			const apiResult: IDataObject[] = [{ ok: true }, { ok: false }];

			gravityZoneApiRequestMock.mockResolvedValue(apiResult as unknown as IDataObject);

			const constructExecutionMetaDataMock = jest.spyOn(
				mockExecuteFunctions.helpers,
				'constructExecutionMetaData',
			);

			const result = await executeSetPushEventSettings.call(mockExecuteFunctions, 4);

			expect(constructExecutionMetaDataMock).toHaveBeenCalledWith(wrapExecutionData(apiResult), {
				itemData: { item: 4 },
			});
			expect(result).toEqual(wrapPairedExecutionData(apiResult, 4));
		});

		it('throws when service settings is invalid JSON', async () => {
			stubParameters({
				status: 1,
				serviceType: 'jsonRPC',
				serviceSettingsJson: '{not-json',
				subscribeToEventTypes: ['av'],
			});

			await expect(executeSetPushEventSettings.call(mockExecuteFunctions, 0)).rejects.toThrow(
				/Input 'Service Settings'\s+must contain a valid JSON/,
			);
			expect(gravityZoneApiRequestMock).not.toHaveBeenCalled();
		});

		it('throws when service settings is not JSON input', async () => {
			stubParameters({
				status: 1,
				serviceType: 'jsonRPC',
				serviceSettingsJson: 42,
				subscribeToEventTypes: ['av'],
			});

			await expect(executeSetPushEventSettings.call(mockExecuteFunctions, 0)).rejects.toThrow(
				/Input 'Service Settings'\s+must contain a valid JSON/,
			);
			expect(gravityZoneApiRequestMock).not.toHaveBeenCalled();
		});
	});

	describe('sendTestPushEvent', () => {
		it('sends the event type when options are empty', async () => {
			stubParameters({
				eventType: 'av',
				options: {},
			});

			const apiResult: IDataObject[] = [{ ok: true }, { ok: false }];

			gravityZoneApiRequestMock.mockResolvedValue(apiResult as unknown as IDataObject);

			const constructExecutionMetaDataMock = jest.spyOn(
				mockExecuteFunctions.helpers,
				'constructExecutionMetaData',
			);

			const result = await executeSendTestPushEvent.call(mockExecuteFunctions, 2);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('push', 'sendTestPushEvent', {
				eventType: 'av',
			});
			expect(constructExecutionMetaDataMock).toHaveBeenCalledWith(wrapExecutionData(apiResult), {
				itemData: { item: 2 },
			});
			expect(result).toEqual(wrapPairedExecutionData(apiResult, 2));
		});

		it('includes parsed data when dataJson is provided', async () => {
			stubParameters({
				eventType: 'fw',
				options: {
					dataJson: '{"device":"host-1"}',
				},
			});

			const apiResult: IDataObject = { ok: true };

			gravityZoneApiRequestMock.mockResolvedValue(apiResult);

			const result = await executeSendTestPushEvent.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('push', 'sendTestPushEvent', {
				eventType: 'fw',
				data: {
					device: 'host-1',
				},
			});
			expect(result).toEqual(wrapPairedExecutionData(apiResult, 0));
		});

		it('accepts object data payloads', async () => {
			const dataPayload: IDataObject = {
				device: 'host-2',
				status: 'clean',
			};

			stubParameters({
				eventType: 'avc',
				options: {
					dataJson: dataPayload,
				},
			});

			gravityZoneApiRequestMock.mockResolvedValue({});

			await executeSendTestPushEvent.call(mockExecuteFunctions, 0);

			expect(gravityZoneApiRequestMock).toHaveBeenCalledWith('push', 'sendTestPushEvent', {
				eventType: 'avc',
				data: dataPayload,
			});
		});

		it('throws when dataJson is invalid JSON', async () => {
			stubParameters({
				eventType: 'av',
				options: {
					dataJson: '{not-json',
				},
			});

			await expect(executeSendTestPushEvent.call(mockExecuteFunctions, 0)).rejects.toThrow(
				/Input 'Data'\s+must contain a valid JSON/,
			);
			expect(gravityZoneApiRequestMock).not.toHaveBeenCalled();
		});

		it('throws when dataJson is not JSON input', async () => {
			stubParameters({
				eventType: 'av',
				options: {
					dataJson: 123,
				},
			});

			await expect(executeSendTestPushEvent.call(mockExecuteFunctions, 0)).rejects.toThrow(
				/Input 'Data'\s+must contain a valid JSON/,
			);
			expect(gravityZoneApiRequestMock).not.toHaveBeenCalled();
		});
	});

	describe('display options', () => {
		it('applies push display options to getPushEventSettings fields', () => {
			expectDisplayOptions(push.getPushEventSettings.description, 'getPushEventSettings');
		});

		it('applies push display options to getPushEventStats fields', () => {
			expectDisplayOptions(push.getPushEventStats.description, 'getPushEventStats');
		});

		it('applies push display options to resetPushEventStats fields', () => {
			expectDisplayOptions(push.resetPushEventStats.description, 'resetPushEventStats');
		});

		it('applies push display options to sendTestPushEvent fields', () => {
			expectDisplayOptions(push.sendTestPushEvent.description, 'sendTestPushEvent');
		});

		it('applies push display options to setPushEventSettings fields', () => {
			expectDisplayOptions(push.setPushEventSettings.description, 'setPushEventSettings');
		});
	});

	describe('action description', () => {
		it('lists push actions in the action options', () => {
			const actionProperty = push.description.find((property) => property.name === 'action');

			expect(actionProperty?.default).toBe('getPushEventSettings');
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
				'getPushEventSettings',
				'getPushEventStats',
				'resetPushEventStats',
				'sendTestPushEvent',
				'setPushEventSettings',
			]);
		});

		it('includes description entries from each push action', () => {
			const propertyNames = push.description.map((property) => property.name);

			expect(propertyNames).toEqual(
				expect.arrayContaining([
					'getPushEventSettingsDocsNotice',
					'getPushEventStatsDocsNotice',
					'resetPushEventStatsDocsNotice',
					'sendTestPushEventDocsNotice',
					'setPushEventSettingsDocsNotice',
				]),
			);
		});

		it('includes all action fields in the combined description', () => {
			const combinedPropertyNames = new Set(push.description.map((property) => property.name));

			for (const { module } of getOperationEntries(push as Record<string, unknown>)) {
				for (const property of module.description) {
					expect(combinedPropertyNames.has(property.name)).toBe(true);
				}
			}
		});
	});

	describe('operation exports', () => {
		const operations = getOperationEntries(push as Record<string, unknown>);

		it('includes all push operation files', () => {
			const actionsDir = path.join(__dirname, '../actions/push');

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
