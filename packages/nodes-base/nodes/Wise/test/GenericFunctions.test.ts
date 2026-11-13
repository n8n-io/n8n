import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';
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

		await wiseApiRequest.call(executeFunctions, 'GET', requestPath`v1/profiles`);

		expect(String(executeFunctions.helpers.httpRequest.mock.calls[0][0].url)).toBe(url);
	});

	it('should encode a path value that contains a slash', async () => {
		const executeFunctions = mockDeep<IExecuteFunctions>();
		executeFunctions.getCredentials.mockResolvedValue({ apiToken: 'token', environment: 'live' });
		executeFunctions.helpers.httpRequest.mockResolvedValue({ statusCode: 200, body: {} });

		const profileId = '1001/transfers?x=1';
		await wiseApiRequest.call(executeFunctions, 'GET', requestPath`v1/profiles/${profileId}`);

		expect(String(executeFunctions.helpers.httpRequest.mock.calls[0][0].url)).toBe(
			'https://api.wise.com/v1/profiles/1001%2Ftransfers%3Fx=1',
		);
	});
});
