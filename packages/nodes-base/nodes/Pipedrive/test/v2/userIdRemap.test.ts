import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';

import { execute as activityCreateExecute } from '../../v2/actions/activity/create.operation';
import { execute as activityGetAllExecute } from '../../v2/actions/activity/getAll.operation';
import { execute as activityUpdateExecute } from '../../v2/actions/activity/update.operation';
import { execute as dealCreateExecute } from '../../v2/actions/deal/create.operation';
import { execute as dealGetAllExecute } from '../../v2/actions/deal/getAll.operation';
import { execute as dealUpdateExecute } from '../../v2/actions/deal/update.operation';
import {
	pipedriveApiRequest,
	pipedriveApiRequestAllItemsCursor,
	pipedriveGetCustomProperties,
} from '../../v2/transport';
import type { Mock } from 'vitest';

vi.mock('../../v2/transport', () => ({
	pipedriveApiRequest: { call: vi.fn() },
	pipedriveApiRequestAllItemsCursor: { call: vi.fn() },
	pipedriveApiRequestAllItemsOffset: { call: vi.fn() },
	pipedriveGetCustomProperties: { call: vi.fn() },
}));

const mockApiRequest = pipedriveApiRequest as unknown as { call: Mock };
const mockApiRequestAllItemsCursor = pipedriveApiRequestAllItemsCursor as unknown as {
	call: Mock;
};
const mockGetCustomProperties = pipedriveGetCustomProperties as unknown as { call: Mock };

function buildContext(params: Record<string, unknown>): IExecuteFunctions {
	return {
		getInputData: vi.fn(() => [{ json: {} }]),
		getNodeParameter: vi.fn((name: string, _i?: number, defaultValue?: unknown) => {
			if (Object.prototype.hasOwnProperty.call(params, name)) return params[name];
			return defaultValue;
		}),
		continueOnFail: vi.fn(() => false),
		helpers: {
			returnJsonArray: vi.fn((data: unknown) => (Array.isArray(data) ? data : [data])),
			constructExecutionMetaData: vi.fn((items: unknown) => items),
		},
		getNode: vi.fn(() => ({})),
	} as unknown as IExecuteFunctions;
}

describe('Pipedrive v2 maps user_id parameter to owner_id on outgoing requests', () => {
	beforeEach(() => {
		mockApiRequest.call.mockReset().mockResolvedValue({ data: {}, additionalData: {} });
		mockApiRequestAllItemsCursor.call.mockReset().mockResolvedValue({ data: [] });
		mockGetCustomProperties.call.mockReset().mockResolvedValue({});
	});

	it('deal/create sends owner_id in body', async () => {
		const ctx = buildContext({
			rawCustomFieldKeys: true,
			title: 'Test Deal',
			associateWith: 'organization',
			org_id: 7,
			additionalFields: { user_id: 25455458 },
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
		expect(body.owner_id).toBe(25455458);
		expect(body).not.toHaveProperty('user_id');
	});

	it('deal/update sends owner_id in body', async () => {
		const ctx = buildContext({
			rawCustomFieldKeys: true,
			dealId: 10,
			updateFields: { user_id: 25455458 },
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
		expect(body.owner_id).toBe(25455458);
		expect(body).not.toHaveProperty('user_id');
	});

	it('deal/getAll sends owner_id as query filter', async () => {
		const ctx = buildContext({
			rawCustomFieldOutput: true,
			returnAll: false,
			limit: 50,
			filters: { user_id: 25455458 },
		});

		await dealGetAllExecute.call(ctx);

		const [, method, endpoint, , qs] = mockApiRequest.call.mock.calls[0] as [
			unknown,
			string,
			string,
			IDataObject,
			IDataObject,
		];
		expect(method).toBe('GET');
		expect(endpoint).toBe('/deals');
		expect(qs.owner_id).toBe(25455458);
		expect(qs).not.toHaveProperty('user_id');
	});

	it('activity/create sends owner_id in body', async () => {
		const ctx = buildContext({
			rawCustomFieldKeys: true,
			subject: 'Call client',
			done: false,
			type: 'call',
			additionalFields: { user_id: 25455458 },
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
		expect(body.owner_id).toBe(25455458);
		expect(body).not.toHaveProperty('user_id');
	});

	it('activity/update sends owner_id in body', async () => {
		const ctx = buildContext({
			rawCustomFieldKeys: true,
			activityId: 10,
			updateFields: { user_id: 25455458 },
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
		expect(body.owner_id).toBe(25455458);
		expect(body).not.toHaveProperty('user_id');
	});

	it('activity/getAll sends owner_id as query filter', async () => {
		const ctx = buildContext({
			rawCustomFieldOutput: true,
			returnAll: false,
			limit: 50,
			filters: { user_id: 25455458 },
		});

		await activityGetAllExecute.call(ctx);

		const [, method, endpoint, , qs] = mockApiRequest.call.mock.calls[0] as [
			unknown,
			string,
			string,
			IDataObject,
			IDataObject,
		];
		expect(method).toBe('GET');
		expect(endpoint).toBe('/activities');
		expect(qs.owner_id).toBe(25455458);
		expect(qs).not.toHaveProperty('user_id');
	});
});
