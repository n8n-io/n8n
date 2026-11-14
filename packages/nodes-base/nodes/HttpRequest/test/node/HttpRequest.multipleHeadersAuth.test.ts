import { NodeTestHarness } from '@nodes-testing/node-test-harness';

import { HttpMultipleHeadersAuth } from '../../../../credentials/HttpMultipleHeadersAuth.credentials';

describe('HTTP Request with Multiple Headers Auth', () => {
	it('classifies the credential as generic authentication', () => {
		expect(new HttpMultipleHeadersAuth()).toMatchObject({ genericAuth: true });
	});

	const harness = new NodeTestHarness();
	const baseUrl = 'https://api.example.com';
	const headers = {
		'X-Service-Token': 'first-test-value',
		'X-Account-Key': 'second-test-value',
	};
	const userHeaders = [
		{ name: 'X-Request-ID', value: 'request-id' },
		{ name: 'X-Service-Token', value: 'overridden-value' },
	];

	for (const typeVersion of [2, 3, 4.5]) {
		for (const authentication of ['genericCredentialType', 'predefinedCredentialType']) {
			harness.setupTest({
				description: `sends both credential headers with ${authentication} in version ${typeVersion}`,
				input: {
					workflowData: {
						nodes: [
							{
								id: 'trigger',
								name: 'Trigger',
								type: 'n8n-nodes-base.manualTrigger',
								typeVersion: 1,
								position: [0, 0],
								parameters: {},
							},
							{
								id: 'request',
								name: 'HTTP Request',
								type: 'n8n-nodes-base.httpRequest',
								typeVersion,
								position: [200, 0],
								credentials: {
									httpMultipleHeadersAuth: { id: 'credential', name: 'API headers' },
								},
								parameters: {
									url: baseUrl,
									authentication,
									genericAuthType: 'httpMultipleHeadersAuth',
									nodeCredentialType: 'httpMultipleHeadersAuth',
									...(typeVersion === 2
										? { headerParametersUi: { parameter: userHeaders } }
										: { sendHeaders: true, headerParameters: { parameters: userHeaders } }),
								},
							},
						],
						connections: {
							Trigger: { main: [[{ node: 'HTTP Request', type: 'main', index: 0 }]] },
						},
					},
				},
				credentials: {
					httpMultipleHeadersAuth: {
						headers: {
							values: Object.entries(headers).map(([name, value]) => ({ name, value })),
						},
					},
				},
				nock: {
					baseUrl,
					mocks: [
						{
							method: 'get',
							path: '/',
							requestHeaders: { ...headers, 'X-Request-ID': 'request-id' },
							statusCode: 200,
							responseBody: { success: true },
						},
					],
				},
				output: { nodeData: { 'HTTP Request': [[{ json: { success: true } }]] } },
			});
		}
	}
});
