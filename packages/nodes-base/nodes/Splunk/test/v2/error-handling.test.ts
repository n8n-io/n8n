import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeApiError, NodeOperationError } from 'n8n-workflow';
import { mock, mockDeep } from 'vitest-mock-extended';

import { SplunkV2 } from '../../v2/SplunkV2.node';

vi.mock('@n8n/utils/sleep', () => ({ sleep: vi.fn().mockResolvedValue(undefined) }));

describe('Splunk v2 error handling', () => {
	const node = mock<INode>({ name: 'Splunk', type: 'n8n-nodes-base.splunk', typeVersion: 2 });

	function setup(continueOnFail: boolean) {
		const context = mockDeep<IExecuteFunctions>();
		context.getNode.mockReturnValue(node);
		context.getInputData.mockReturnValue([{ json: { sid: 'first' } }, { json: { sid: 'second' } }]);
		context.continueOnFail.mockReturnValue(continueOnFail);
		context.getCredentials.mockResolvedValue({
			baseUrl: 'https://splunk.example.test',
			allowUnauthorizedCerts: false,
		});
		context.getNodeParameter.calledWith('resource', 0).mockReturnValue('search');
		context.getNodeParameter.calledWith('operation', 0).mockReturnValue('get');
		context.getNodeParameter
			.calledWith('searchJobId', 0, '', expect.objectContaining({ extractValue: true }))
			.mockReturnValue('first');
		context.getNodeParameter
			.calledWith('searchJobId', 1, '', expect.objectContaining({ extractValue: true }))
			.mockReturnValue('second');
		context.helpers.returnJsonArray.mockImplementation((data) =>
			(Array.isArray(data) ? data : [data]).map((json) => ({ json })),
		);
		context.helpers.constructExecutionMetaData.mockImplementation((items, { itemData }) =>
			items.map((item) => ({ ...item, pairedItem: itemData })),
		);
		return context;
	}

	const cases = [
		{
			name: 'network failure',
			error: () => new Error('Connection reset'),
			message: 'No response from API call',
			errorType: NodeOperationError,
		},
		{
			name: 'API error without a cause',
			error: () =>
				new NodeApiError(
					node,
					{ message: 'Search job not found', statusCode: 404 },
					{
						message: 'Search job not found',
					},
				),
			message: 'Search job not found',
			errorType: NodeApiError,
		},
		{
			name: 'API error with an existing error payload',
			error: () =>
				Object.assign(new NodeApiError(node, { message: 'Request failed' }), {
					cause: { error: 'Original Splunk error' },
				}),
			message: 'Original Splunk error',
			errorType: NodeApiError,
		},
	];

	test.each(cases)('continues after $name and preserves item links', async ({ error, message }) => {
		const context = setup(true);
		context.helpers.httpRequestWithAuthentication.mockImplementation(
			async (_credentials, options) => {
				if (options.url.endsWith('/first')) throw error();
				return { sid: 'second' };
			},
		);

		await expect(SplunkV2.prototype.execute.call(context)).resolves.toEqual([
			[
				{ json: { error: message }, pairedItem: { item: 0 } },
				{ json: { sid: 'second' }, pairedItem: { item: 1 } },
			],
		]);
		expect(context.helpers.httpRequestWithAuthentication).toHaveBeenCalledTimes(7);
	});

	test.each(cases)(
		'stops after $name when Continue On Fail is off',
		async ({ error, errorType }) => {
			const context = setup(false);
			context.helpers.httpRequestWithAuthentication.mockRejectedValue(error());

			await expect(SplunkV2.prototype.execute.call(context)).rejects.toBeInstanceOf(errorType);
			expect(context.helpers.httpRequestWithAuthentication).toHaveBeenCalledTimes(6);
			expect(
				context.helpers.httpRequestWithAuthentication.mock.calls.every(([, options]) =>
					options.url.endsWith('/first'),
				),
			).toBe(true);
		},
	);

	test('returns successful items with their input links', async () => {
		const context = setup(true);
		context.helpers.httpRequestWithAuthentication
			.mockResolvedValueOnce({ sid: 'first' })
			.mockResolvedValueOnce({ sid: 'second' });

		await expect(SplunkV2.prototype.execute.call(context)).resolves.toEqual([
			[
				{ json: { sid: 'first' }, pairedItem: { item: 0 } },
				{ json: { sid: 'second' }, pairedItem: { item: 1 } },
			],
		]);
	});
});
