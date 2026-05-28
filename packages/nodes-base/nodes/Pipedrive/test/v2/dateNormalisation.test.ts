import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';

import { execute as activityCreateExecute } from '../../v2/actions/activity/create.operation';
import { execute as activityUpdateExecute } from '../../v2/actions/activity/update.operation';
import { execute as dealCreateExecute } from '../../v2/actions/deal/create.operation';
import { execute as dealUpdateExecute } from '../../v2/actions/deal/update.operation';
import { pipedriveApiRequest, pipedriveGetCustomProperties } from '../../v2/transport';

jest.mock('../../v2/transport', () => ({
	pipedriveApiRequest: { call: jest.fn() },
	pipedriveApiRequestAllItemsCursor: { call: jest.fn() },
	pipedriveApiRequestAllItemsOffset: { call: jest.fn() },
	pipedriveGetCustomProperties: { call: jest.fn() },
}));

const mockApiRequest = pipedriveApiRequest as unknown as { call: jest.Mock };
const mockGetCustomProperties = pipedriveGetCustomProperties as unknown as { call: jest.Mock };

function buildContext(params: Record<string, unknown>): IExecuteFunctions {
	return {
		getInputData: jest.fn(() => [{ json: {} }]),
		getNodeParameter: jest.fn((name: string, _i?: number, defaultValue?: unknown) => {
			if (Object.prototype.hasOwnProperty.call(params, name)) return params[name];
			return defaultValue;
		}),
		continueOnFail: jest.fn(() => false),
		helpers: {
			returnJsonArray: jest.fn((data: unknown) => (Array.isArray(data) ? data : [data])),
			constructExecutionMetaData: jest.fn((items: unknown) => items),
		},
		getNode: jest.fn(() => ({})),
	} as unknown as IExecuteFunctions;
}

describe('Pipedrive v2 normalises ISO date inputs to YYYY-MM-DD on outgoing requests', () => {
	beforeEach(() => {
		mockApiRequest.call.mockReset().mockResolvedValue({ data: {}, additionalData: {} });
		mockGetCustomProperties.call.mockReset().mockResolvedValue({});
	});

	it('deal/create strips the time component from expected_close_date', async () => {
		const ctx = buildContext({
			rawCustomFieldKeys: true,
			title: 'Test Deal',
			associateWith: 'organization',
			org_id: 7,
			additionalFields: { expected_close_date: '2026-04-13T00:00:00.000Z' },
		});

		await dealCreateExecute.call(ctx);

		const [, method, endpoint, body] = mockApiRequest.call.mock.calls[0] as [
			unknown,
			string,
			string,
			IDataObject,
		];
		expect(method).toBe('POST');
		expect(endpoint).toBe('/deals');
		expect(body.expected_close_date).toBe('2026-04-13');
	});

	it('deal/update strips the time component from expected_close_date', async () => {
		const ctx = buildContext({
			rawCustomFieldKeys: true,
			dealId: 10,
			updateFields: { expected_close_date: '2026-04-13T00:00:00.000Z' },
		});

		await dealUpdateExecute.call(ctx);

		const [, method, endpoint, body] = mockApiRequest.call.mock.calls[0] as [
			unknown,
			string,
			string,
			IDataObject,
		];
		expect(method).toBe('PATCH');
		expect(endpoint).toBe('/deals/10');
		expect(body.expected_close_date).toBe('2026-04-13');
	});

	it('activity/create strips the time component from due_date', async () => {
		const ctx = buildContext({
			rawCustomFieldKeys: true,
			subject: 'Call client',
			done: false,
			type: 'call',
			additionalFields: { due_date: '2026-04-01T00:00:00.000Z' },
		});

		await activityCreateExecute.call(ctx);

		const [, method, endpoint, body] = mockApiRequest.call.mock.calls[0] as [
			unknown,
			string,
			string,
			IDataObject,
		];
		expect(method).toBe('POST');
		expect(endpoint).toBe('/activities');
		expect(body.due_date).toBe('2026-04-01');
	});

	it('activity/update strips the time component from due_date', async () => {
		const ctx = buildContext({
			rawCustomFieldKeys: true,
			activityId: 10,
			updateFields: { due_date: '2026-04-02T00:00:00.000Z' },
		});

		await activityUpdateExecute.call(ctx);

		const [, method, endpoint, body] = mockApiRequest.call.mock.calls[0] as [
			unknown,
			string,
			string,
			IDataObject,
		];
		expect(method).toBe('PATCH');
		expect(endpoint).toBe('/activities/10');
		expect(body.due_date).toBe('2026-04-02');
	});
});
