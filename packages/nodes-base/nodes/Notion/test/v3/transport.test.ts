import type { IExecuteFunctions, INode } from 'n8n-workflow';

import { notionApiRequestV3 } from '../../v3/transport';

describe('Notion V3 transport', () => {
	it('always sends the 2026 Notion API version header', async () => {
		const httpRequestWithAuthentication = vi.fn().mockResolvedValue({});
		const context = {
			getNodeParameter: vi.fn().mockReturnValue('apiKey'),
			getNode: () => ({ name: 'Notion', type: 'n8n-nodes-base.notion', typeVersion: 3 }) as INode,
			helpers: {
				httpRequestWithAuthentication,
			},
		} as unknown as IExecuteFunctions;

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
});
