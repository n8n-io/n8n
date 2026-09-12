import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { NodeApiError } from 'n8n-workflow';

import { notionApiRequestV3 } from '../../v3/transport';

const node = { name: 'Notion', type: 'n8n-nodes-base.notion', typeVersion: 3 } as INode;

function buildContext(httpRequestWithAuthentication: ReturnType<typeof vi.fn>) {
	return {
		getNodeParameter: vi.fn().mockReturnValue('apiKey'),
		getNode: () => node,
		helpers: { httpRequestWithAuthentication },
	} as unknown as IExecuteFunctions;
}

describe('Notion V3 transport', () => {
	it('always sends the 2026 Notion API version header', async () => {
		const httpRequestWithAuthentication = vi.fn().mockResolvedValue({});
		const context = buildContext(httpRequestWithAuthentication);

		await notionApiRequestV3.call(context, 'GET', '/users');

		expect(httpRequestWithAuthentication).toHaveBeenCalledWith(
			'notionApi',
			expect.objectContaining({
				headers: expect.objectContaining({
					'Notion-Version': '2026-03-11',
				}),
			}),
		);
	});

	it('rewrites a formula-of-unknown-type filter error into actionable guidance', async () => {
		// Mirrors what httpHelpers.httpRequestWithAuthentication actually throws for a
		// non-2xx response: an already-wrapped NodeApiError, message/description
		// derived from Notion's raw `{ response: { status, data: { message } } }` body.
		const notionRejection = new NodeApiError(node, {
			response: {
				status: 400,
				data: { message: 'Unable to filter based on a formula of unknown type.' },
			},
		});
		const httpRequestWithAuthentication = vi.fn().mockRejectedValue(notionRejection);
		const context = buildContext(httpRequestWithAuthentication);

		await expect(
			notionApiRequestV3.call(context, 'POST', '/data_sources/abc/query'),
		).rejects.toMatchObject({
			message: "Notion couldn't determine this formula's return type",
			description: expect.stringContaining('empty()'),
		});
	});

	it('leaves unrelated API errors untouched', async () => {
		const notFoundError = new NodeApiError(node, {
			response: { status: 404, data: { message: 'Could not find data source.' } },
		});
		const httpRequestWithAuthentication = vi.fn().mockRejectedValue(notFoundError);
		const context = buildContext(httpRequestWithAuthentication);

		await expect(
			notionApiRequestV3.call(context, 'GET', '/data_sources/missing'),
		).rejects.toMatchObject({
			message: 'The resource you are requesting could not be found',
			description: 'Could not find data source.',
		});
	});
});
