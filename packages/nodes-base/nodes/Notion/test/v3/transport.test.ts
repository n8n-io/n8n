import type { IExecuteFunctions, INode } from 'n8n-workflow';

import { notionApiRequestV3, resolveDataSourceId } from '../../v3/transport';

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

		await notionApiRequestV3.call(context, 'GET', '/users', {}, {}, undefined, {
			headers: { Accept: 'application/json' },
		});

		expect(httpRequestWithAuthentication).toHaveBeenCalledWith(
			'notionApi',
			expect.objectContaining({
				headers: expect.objectContaining({
					Accept: 'application/json',
					'Notion-Version': '2026-03-11',
				}),
			}),
		);
	});

	it('resolves only data source IDs without falling back to database lookup', async () => {
		const httpRequestWithAuthentication = vi.fn().mockResolvedValue({ object: 'data_source' });
		const context = {
			getNodeParameter: vi.fn().mockReturnValue('apiKey'),
			getNode: () => ({ name: 'Notion', type: 'n8n-nodes-base.notion', typeVersion: 3 }) as INode,
			helpers: {
				httpRequestWithAuthentication,
			},
		} as unknown as IExecuteFunctions;

		const result = resolveDataSourceId.call(context, 'data-source-id');

		expect(result).toBe('data-source-id');
		expect(httpRequestWithAuthentication).not.toHaveBeenCalled();
	});
});
