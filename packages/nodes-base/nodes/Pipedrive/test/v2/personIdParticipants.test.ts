import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';

import { execute as activityCreateExecute } from '../../v2/actions/activity/create.operation';
import { execute as activityUpdateExecute } from '../../v2/actions/activity/update.operation';
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

function getRequestBody(): IDataObject {
	const [, , , body] = mockApiRequest.call.mock.calls[0] as [unknown, string, string, IDataObject];
	return body;
}

describe('Pipedrive v2 maps activity person_id to a primary participant on outgoing requests', () => {
	beforeEach(() => {
		mockApiRequest.call.mockReset().mockResolvedValue({ data: {}, additionalData: {} });
		mockGetCustomProperties.call.mockReset().mockResolvedValue({});
	});

	it('activity/create sends person_id as a primary participant', async () => {
		const ctx = buildContext({
			rawCustomFieldKeys: true,
			subject: 'Call client',
			done: false,
			type: 'call',
			additionalFields: { person_id: 42 },
		});

		await activityCreateExecute.call(ctx);

		const [, method, endpoint] = mockApiRequest.call.mock.calls[0] as [unknown, string, string];
		const body = getRequestBody();
		expect(method).toBe('POST');
		expect(endpoint).toBe('/activities');
		expect(body.participants).toEqual([{ person_id: 42, primary: true }]);
		expect(body).not.toHaveProperty('person_id');
	});

	it('activity/update sends person_id as a primary participant', async () => {
		const ctx = buildContext({
			rawCustomFieldKeys: true,
			activityId: 10,
			updateFields: { person_id: 42 },
		});

		await activityUpdateExecute.call(ctx);

		const [, method, endpoint] = mockApiRequest.call.mock.calls[0] as [unknown, string, string];
		const body = getRequestBody();
		expect(method).toBe('PATCH');
		expect(endpoint).toBe('/activities/10');
		expect(body.participants).toEqual([{ person_id: 42, primary: true }]);
		expect(body).not.toHaveProperty('person_id');
	});

	it('activity/create omits participants and the read-only key when no person_id is set', async () => {
		const ctx = buildContext({
			rawCustomFieldKeys: true,
			subject: 'Call client',
			done: false,
			type: 'call',
			additionalFields: { person_id: 0 },
		});

		await activityCreateExecute.call(ctx);

		const body = getRequestBody();
		expect(body).not.toHaveProperty('participants');
		expect(body).not.toHaveProperty('person_id');
	});
});
