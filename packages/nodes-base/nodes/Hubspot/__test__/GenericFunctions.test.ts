import { mockDeep } from 'vitest-mock-extended';
import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { hubspotApiRequest as hubspotApiRequestV1 } from '../V1/GenericFunctions';
import { hubspotApiRequest as hubspotApiRequestV2 } from '../V2/GenericFunctions';

describe.each([
	['V1', hubspotApiRequestV1],
	['V2', hubspotApiRequestV2],
])('hubspotApiRequest %s', (_version, hubspotApiRequest) => {
	it('should encode path values as one segment', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getNodeParameter.mockReturnValue('oAuth2');
		context.getNode.mockReturnValue({ type: 'n8n-nodes-base.hubspot' } as INode);

		const ticketId = '176602/176603?x=1';
		await hubspotApiRequest.call(
			context,
			'GET',
			requestPath`/crm-objects/v1/objects/tickets/${ticketId}`,
		);

		expect(context.helpers.requestOAuth2).toHaveBeenCalledWith(
			'hubspotOAuth2Api',
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://api.hubapi.com/crm-objects/v1/objects/tickets/176602%2F176603%3Fx=1',
				}),
			}),
			expect.anything(),
		);
	});
});
