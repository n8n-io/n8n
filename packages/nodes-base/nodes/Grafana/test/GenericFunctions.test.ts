import type { IExecuteFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';
import { mockDeep } from 'vitest-mock-extended';

import { deriveUid, grafanaApiRequest } from '../GenericFunctions';

describe('deriveUid', () => {
	it.each([
		'https://grafana.example.com/d/cIBgcSjkk?orgId=1',
		'https://grafana.example.com/d/cIBgcSjkk/ops?orgId=1',
	])('should ignore the query in %s', (url) => {
		const context = mockDeep<IExecuteFunctions>();

		expect(deriveUid.call(context, url)).toBe('cIBgcSjkk');
	});
});

describe('grafanaApiRequest', () => {
	it('should encode path values', async () => {
		const context = mockDeep<IExecuteFunctions>();
		context.getCredentials.mockResolvedValue({
			apiKey: 'fake-api-key',
			baseUrl: 'https://grafana.example.com/',
		});
		context.helpers.requestWithAuthentication.mockResolvedValue({});

		const teamId = '5/admin/users';
		await grafanaApiRequest.call(context, 'GET', requestPath`/teams/${teamId}`);

		expect(context.helpers.requestWithAuthentication).toHaveBeenCalledWith(
			'grafanaApi',
			expect.objectContaining({
				uri: expect.objectContaining({
					value: 'https://grafana.example.com/api/teams/5%2Fadmin%2Fusers',
				}),
			}),
		);
	});
});
