import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';
import { mockDeep } from 'jest-mock-extended';

import { pipedriveApiRequest } from '../../GenericFunctions';

describe('Pipedrive v1 pipedriveApiRequest', () => {
	it('should encode a path value that contains a slash', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getNodeParameter.mockReturnValue('apiToken');
		context.helpers.requestWithAuthentication.mockResolvedValue({ success: true, data: {} });

		await pipedriveApiRequest.call(context, 'GET', requestPath`/deals/${'8/persons'}`, {});

		expect(String(context.helpers.requestWithAuthentication.mock.calls[0][1].uri)).toBe(
			'https://api.pipedrive.com/v1/deals/8%2Fpersons',
		);
	});
});
