import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { mock } from 'vitest-mock-extended';

import { googleApiRequest } from '../../GenericFunctions';
import { GmailV2 } from '../../v2/GmailV2.node';

vi.mock('../../GenericFunctions', async (importOriginal) => ({
	...(await importOriginal<typeof import('../../GenericFunctions')>()),
	googleApiRequest: vi.fn(),
}));

const apiRequest = vi.mocked(googleApiRequest);

const newCriteria = { subject: 'invoice' };
const newAction = { addLabelIds: ['STARRED'] };

function replaceContext() {
	const ctx = mock<IExecuteFunctions>();
	const params: Record<string, unknown> = {
		resource: 'filter',
		operation: 'replace',
		filterId: 'filter-1',
		criteria: newCriteria,
		action: newAction,
		authentication: 'oAuth2',
	};
	ctx.getInputData.mockReturnValue([{ json: {} }]);
	ctx.getNode.mockReturnValue(mock<INode>({ typeVersion: 2.2 }));
	ctx.getNodeParameter.mockImplementation(((name: string, _i: number, fallback: unknown) =>
		name in params ? params[name] : fallback) as never);
	// The node calls helpers via `.call()`, so they must be real functions, not proxies.
	ctx.helpers = {
		returnJsonArray: vi.fn((data: object) => [data].flat().map((json) => ({ json }))),
		constructExecutionMetaData: vi.fn((data: unknown) => data),
	} as never;
	return ctx;
}

const calls = () => apiRequest.mock.calls.map(([method, endpoint]) => `${method} ${endpoint}`);

describe('Gmail filter replace', () => {
	beforeEach(() => apiRequest.mockReset());

	it('should create the new filter before deleting the old one', async () => {
		apiRequest
			.mockResolvedValueOnce({ id: 'filter-1', criteria: { from: 'a@example.com' }, action: {} })
			.mockResolvedValueOnce({ id: 'filter-2', criteria: newCriteria, action: newAction })
			.mockResolvedValueOnce({});

		await new GmailV2(mock()).execute.call(replaceContext());

		expect(calls()).toEqual([
			'GET /gmail/v1/users/me/settings/filters/filter-1',
			'POST /gmail/v1/users/me/settings/filters',
			'DELETE /gmail/v1/users/me/settings/filters/filter-1',
		]);
	});

	it('should keep the old filter when creating the new one fails', async () => {
		apiRequest
			.mockResolvedValueOnce({ id: 'filter-1', criteria: { from: 'a@example.com' }, action: {} })
			.mockRejectedValueOnce(new Error('Invalid filter'));

		await expect(new GmailV2(mock()).execute.call(replaceContext())).rejects.toThrow(
			'Invalid filter',
		);
		expect(calls()).not.toContain('DELETE /gmail/v1/users/me/settings/filters/filter-1');
	});

	it('should leave an identical filter untouched', async () => {
		const existing = { id: 'filter-1', criteria: newCriteria, action: newAction };
		apiRequest.mockResolvedValueOnce(existing);

		const [[result]] = await new GmailV2(mock()).execute.call(replaceContext());

		expect(calls()).toEqual(['GET /gmail/v1/users/me/settings/filters/filter-1']);
		expect(result.json).toEqual(existing);
	});

	it('should succeed when the old filter was already deleted elsewhere', async () => {
		const created = { id: 'filter-2', criteria: newCriteria, action: newAction };
		apiRequest
			.mockResolvedValueOnce({ id: 'filter-1', criteria: { from: 'a@example.com' }, action: {} })
			.mockResolvedValueOnce(created)
			.mockRejectedValueOnce(Object.assign(new Error('Not found'), { httpCode: '404' }));

		const [[result]] = await new GmailV2(mock()).execute.call(replaceContext());

		expect(result.json).toEqual(created);
	});
});
