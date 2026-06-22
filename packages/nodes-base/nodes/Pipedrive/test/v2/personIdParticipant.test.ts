import type { IDataObject, IExecuteFunctions } from 'n8n-workflow';

import { execute as activityCreateExecute } from '../../v2/actions/activity/create.operation';
import { pipedriveApiRequest, pipedriveGetCustomProperties } from '../../v2/transport';
import type { Mock } from 'vitest';

vi.mock('../../v2/transport', () => ({
	pipedriveApiRequest: { call: vi.fn() },
	pipedriveApiRequestAllItemsCursor: { call: vi.fn() },
	pipedriveApiRequestAllItemsOffset: { call: vi.fn() },
	pipedriveGetCustomProperties: { call: vi.fn() },
}));

const mockApiRequest = pipedriveApiRequest as unknown as { call: Mock };
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

describe('Pipedrive v2 activity/create maps person_id to a primary participant', () => {
	beforeEach(() => {
		mockApiRequest.call.mockReset().mockResolvedValue({ data: {}, additionalData: {} });
		mockGetCustomProperties.call.mockReset().mockResolvedValue({});
	});

	it('sends person_id as a primary participant instead of a read-only person_id field', async () => {
		const ctx = buildContext({
			rawCustomFieldKeys: true,
			subject: 'Call client',
			done: false,
			type: 'call',
			additionalFields: { person_id: 42 },
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
		// The v2 activities API rejects a top-level `person_id`; it must be supplied
		// through the `participants` array with the person flagged as primary.
		expect(body).not.toHaveProperty('person_id');
		expect(body.participants).toEqual([{ person_id: 42, primary: true }]);
	});

	it('does not add a participants array when no person_id is provided', async () => {
		const ctx = buildContext({
			rawCustomFieldKeys: true,
			subject: 'Call client',
			done: false,
			type: 'call',
			additionalFields: {},
		});

		await activityCreateExecute.call(ctx);

		const [, , , body] = mockApiRequest.call.mock.calls[0] as [
			unknown,
			string,
			string,
			IDataObject,
		];
		expect(body).not.toHaveProperty('person_id');
		expect(body).not.toHaveProperty('participants');
	});
});
