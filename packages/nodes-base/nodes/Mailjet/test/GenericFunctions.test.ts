import { mock, mockDeep } from 'vitest-mock-extended';
import type { IHookFunctions, INode } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { mailjetApiRequest } from '../GenericFunctions';

describe('Mailjet -> mailjetApiRequest', () => {
	it('should encode a path value that contains a slash', async () => {
		const hookFunctions = mockDeep<IHookFunctions>();
		hookFunctions.getNodeParameter.mockReturnValue(undefined);
		hookFunctions.getNode.mockReturnValue(
			mock<INode>({ type: 'n8n-nodes-base.mailjetTrigger', typeVersion: 1 }),
		);
		hookFunctions.getCredentials.mockResolvedValue({ sandboxMode: false });
		hookFunctions.helpers.requestWithAuthentication.mockResolvedValue({});

		await mailjetApiRequest.call(
			hookFunctions,
			'DELETE',
			requestPath`/v3/rest/eventcallbackurl/${'123/template'}`,
		);

		const options = hookFunctions.helpers.requestWithAuthentication.mock.calls[0][1];
		expect(String(options.uri)).toBe(
			'https://api.mailjet.com/v3/rest/eventcallbackurl/123%2Ftemplate',
		);
	});
});
