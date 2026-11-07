import type { IExecuteFunctions } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { wiseApiRequest } from '../GenericFunctions';

describe('wiseApiRequest', () => {
	it.each([
		['test', 'https://api.wise-sandbox.com/v1/profiles'],
		['live', 'https://api.wise.com/v1/profiles'],
	] as const)('uses the %s API URL', async (environment, url) => {
		const executeFunctions = mockDeep<IExecuteFunctions>();
		executeFunctions.getCredentials.mockResolvedValue({
			apiToken: 'token',
			environment,
		});
		executeFunctions.helpers.httpRequest.mockResolvedValue({
			statusCode: 200,
			body: {},
		});

		await wiseApiRequest.call(executeFunctions, 'GET', 'v1/profiles');

		expect(executeFunctions.helpers.httpRequest).toHaveBeenCalledWith(
			expect.objectContaining({ url }),
		);
	});
});
