import type { IExecuteSingleFunctions, IHttpRequestOptions } from 'n8n-workflow';
import type { Mock } from 'vitest';

import { opportunityUpdatePreSendAction, taskUpdatePreSendAction } from '../GenericFunctions';

describe('HighLevel v1 request paths', () => {
	let context: Partial<IExecuteSingleFunctions>;

	beforeEach(() => {
		context = {
			getNodeParameter: vi.fn(),
			helpers: {
				requestWithAuthentication: vi.fn().mockResolvedValue({}),
			} as unknown as IExecuteSingleFunctions['helpers'],
		};
	});

	it('encodes opportunity IDs as URL path segments', async () => {
		(context.getNodeParameter as Mock)
			.mockReturnValueOnce('pipeline/id?x#y')
			.mockReturnValueOnce('opportunity/id');

		await opportunityUpdatePreSendAction.call(context as IExecuteSingleFunctions, {
			url: 'https://example.com',
			body: {},
		});

		expect(context.helpers?.requestWithAuthentication).toHaveBeenCalledWith(
			'highLevelApi',
			expect.objectContaining({
				uri: 'https://rest.gohighlevel.com/v1/pipelines/pipeline%2Fid%3Fx%23y/opportunities/opportunity%2Fid',
			}),
		);
	});

	it('encodes task IDs as URL path segments', async () => {
		(context.getNodeParameter as Mock)
			.mockReturnValueOnce('contact/id')
			.mockReturnValueOnce('task/id?x#y');

		await taskUpdatePreSendAction.call(
			context as IExecuteSingleFunctions,
			{
				url: 'https://example.com',
				body: {},
			} as IHttpRequestOptions,
		);

		expect(context.helpers?.requestWithAuthentication).toHaveBeenCalledWith(
			'highLevelApi',
			expect.objectContaining({
				uri: 'https://rest.gohighlevel.com/v1/contacts/contact%2Fid/tasks/task%2Fid%3Fx%23y',
			}),
		);
	});
});
