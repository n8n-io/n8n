import type { IHookFunctions, ILoadOptionsFunctions, IRequestOptions } from 'n8n-workflow';
import { mockDeep } from 'jest-mock-extended';

import { NetlifyTrigger } from '../NetlifyTrigger.node';

describe('NetlifyTrigger request URLs', () => {
	const trigger = new NetlifyTrigger();

	const requestUri = (request: { mock: { calls: unknown[][] } }) =>
		String((request.mock.calls[0][0] as IRequestOptions).uri);

	it('should list the hooks of a site', async () => {
		const context = mockDeep<IHookFunctions>();
		context.getCredentials.mockResolvedValue({ accessToken: 'fake-access-token' });
		context.getWorkflowStaticData.mockReturnValue({});
		context.getNodeParameter.mockImplementation((name: string) =>
			name === 'event' ? 'deployCreated' : '3970e0fe-8564-4903-9a55-c5f8de49fb8b',
		);
		context.helpers.request.mockResolvedValue([]);

		await trigger.webhookMethods.default.checkExists.call(context);

		expect(requestUri(context.helpers.request)).toBe('https://api.netlify.com/api/v1/hooks');
	});

	it('should delete a hook by id', async () => {
		const context = mockDeep<IHookFunctions>();
		context.getCredentials.mockResolvedValue({ accessToken: 'fake-access-token' });
		context.getWorkflowStaticData.mockReturnValue({ webhookId: '5e8f8b7c6d5a4b3c2d1e0f9a' });
		context.helpers.request.mockResolvedValue({});

		await trigger.webhookMethods.default.delete.call(context);

		expect(requestUri(context.helpers.request)).toBe(
			'https://api.netlify.com/api/v1/hooks/5e8f8b7c6d5a4b3c2d1e0f9a',
		);
	});

	it('should load the forms of a site', async () => {
		const context = mockDeep<ILoadOptionsFunctions>();
		context.getCredentials.mockResolvedValue({ accessToken: 'fake-access-token' });
		context.getNodeParameter.mockReturnValue('3970e0fe-8564-4903-9a55-c5f8de49fb8b');
		context.helpers.request.mockResolvedValue([]);

		await trigger.methods.loadOptions.getForms.call(context);

		expect(requestUri(context.helpers.request)).toBe(
			'https://api.netlify.com/api/v1/sites/3970e0fe-8564-4903-9a55-c5f8de49fb8b/forms',
		);
	});
});
