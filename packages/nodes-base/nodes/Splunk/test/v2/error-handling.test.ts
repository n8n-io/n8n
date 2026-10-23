import type { IExecuteFunctions, INode, JsonObject } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';
import { mock, mockDeep } from 'vitest-mock-extended';

import { SplunkV2 } from '../../v2/SplunkV2.node';
import * as getSearch from '../../v2/actions/search/get.operation';

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
			name: 'network error wrapped in NodeApiError',
			error: () =>
				new NodeApiError(
					node,
					Object.assign(new Error('Connection reset'), {
						name: 'AxiosError',
						code: 'ECONNRESET',
					}) as unknown as JsonObject,
				),
			message:
				'The connection to the server was closed unexpectedly, perhaps it is offline. You can retry the request immediately or wait and retry later.',
		},
		{
			name: 'Axios 404 error wrapped in NodeApiError',
			error: () =>
				new NodeApiError(
					node,
					Object.assign(new Error('Request failed with status code 404'), {
						name: 'AxiosError',
						response: {
							status: 404,
							data: { messages: [{ type: 'ERROR', text: 'Search job not found' }] },
						},
					}) as unknown as JsonObject,
				),
			message: 'The resource you are requesting could not be found',
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
		expect(context.helpers.httpRequestWithAuthentication).toHaveBeenCalledWith(
			'splunkApi',
			expect.objectContaining({ url: expect.stringMatching(/\/second$/) }),
		);
	});

	test.each(cases)('stops after $name when Continue On Fail is off', async ({ error }) => {
		const context = setup(false);
		const apiError = error();
		context.helpers.httpRequestWithAuthentication.mockRejectedValue(apiError);

		await expect(SplunkV2.prototype.execute.call(context)).rejects.toBe(apiError);
		expect(apiError.context.itemIndex).toBe(0);
		expect(context.helpers.httpRequestWithAuthentication).not.toHaveBeenCalledWith(
			'splunkApi',
			expect.objectContaining({ url: expect.stringMatching(/\/second$/) }),
		);
	});

	test('preserves the error response from a legacy XML request', async () => {
		const context = setup(true);
		context.getNodeParameter.calledWith('operation', 0).mockReturnValue('deleteJob');
		const payload =
			'<response><messages><msg type="ERROR">Search job not found</msg></messages></response>';
		const apiError = new NodeApiError(
			node,
			Object.assign(new Error('404 - Search job not found'), {
				name: 'AxiosError',
				statusCode: 404,
				status: 404,
				error: payload,
				response: { status: 404, statusText: 'Not Found', headers: {} },
			}) as unknown as JsonObject,
		);
		context.helpers.requestWithAuthentication.mockImplementation(async (_credentials, options) => {
			if (options.uri?.endsWith('/first')) throw apiError;
			return '<response />';
		});

		await expect(SplunkV2.prototype.execute.call(context)).resolves.toEqual([
			[
				{ json: { error: payload }, pairedItem: { item: 0 } },
				{ json: { success: true }, pairedItem: { item: 1 } },
			],
		]);
	});

	test('continues after an operation throws an API error without a cause', async () => {
		const context = setup(true);
		const operation = vi
			.spyOn(getSearch, 'execute')
			.mockRejectedValueOnce(
				new NodeApiError(
					node,
					{ message: 'Search job not found' },
					{ message: 'Search job not found' },
				),
			)
			.mockResolvedValueOnce({ sid: 'second' });

		try {
			await expect(SplunkV2.prototype.execute.call(context)).resolves.toEqual([
				[
					{ json: { error: 'Search job not found' }, pairedItem: { item: 0 } },
					{ json: { sid: 'second' }, pairedItem: { item: 1 } },
				],
			]);
		} finally {
			operation.mockRestore();
		}
	});

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
