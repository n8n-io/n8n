import type { IHookFunctions, NodeParameterValueType } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { GetResponseTrigger } from '../GetResponseTrigger.node';

describe('GetResponseTrigger webhookMethods', () => {
	const callbacksUrl = 'https://api.getresponse.com/v3/accounts/callbacks';
	const trigger = new GetResponseTrigger();
	let hookFunctions: ReturnType<typeof mockDeep<IHookFunctions>>;

	beforeEach(() => {
		hookFunctions = mockDeep<IHookFunctions>();
		const params: Record<string, unknown> = {
			authentication: 'apiKey',
			events: ['subscribe'],
			'options.delete': true,
		};
		hookFunctions.getNodeParameter.mockImplementation(
			(name: string) => params[name] as NodeParameterValueType,
		);
		hookFunctions.getNodeWebhookUrl.mockReturnValue('https://n8n.example.com/webhook/abc');
		hookFunctions.helpers.requestWithAuthentication.mockResolvedValue({
			url: 'https://other.example.com/hook',
		});
	});

	const requests = () =>
		hookFunctions.helpers.requestWithAuthentication.mock.calls.map(([, options]) => [
			options.method,
			String(options.uri),
		]);

	it('should read and delete the current callback', async () => {
		await trigger.webhookMethods.default.checkExists.call(hookFunctions);

		expect(requests()).toEqual([
			['GET', callbacksUrl],
			['DELETE', callbacksUrl],
		]);
	});

	it('should create the callback', async () => {
		await trigger.webhookMethods.default.create.call(hookFunctions);

		expect(requests()).toEqual([['POST', callbacksUrl]]);
	});

	it('should delete the callback', async () => {
		await trigger.webhookMethods.default.delete.call(hookFunctions);

		expect(requests()).toEqual([['DELETE', callbacksUrl]]);
	});
});
