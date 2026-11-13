import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import type { WorkflowTestData } from 'n8n-workflow';

const baseUrl = 'https://googleads.googleapis.com';
const credentials = {
	googleAdsOAuth2Api: {
		oauthTokenData: { access_token: 'access-token' },
		developerToken: 'test-developer-token',
	},
};

const workflow = (
	parameters: Record<string, string>,
): WorkflowTestData['input']['workflowData'] => ({
	nodes: [
		{
			id: '1',
			name: 'Trigger',
			type: 'n8n-nodes-base.manualTrigger',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		},
		{
			id: '2',
			name: 'Google Ads',
			type: 'n8n-nodes-base.googleAds',
			typeVersion: 1,
			position: [200, 0],
			credentials: { googleAdsOAuth2Api: { id: '1', name: 'Google Ads account' } },
			parameters: {
				resource: 'campaign',
				operation: 'get',
				managerCustomerId: '111-222-3333',
				campaignId: '12345678901',
				...parameters,
			},
		},
	],
	connections: { Trigger: { main: [[{ node: 'Google Ads', type: 'main', index: 0 }]] } },
});

describe('Google Ads Node > request paths', () => {
	const harness = new NodeTestHarness();

	const cases: Array<{ description: string; clientCustomerId: string; path: string }> = [
		{
			description: 'should remove the dashes from the client customer ID',
			clientCustomerId: '444-555-6666',
			path: '/v25/customers/4445556666/googleAds:search',
		},
		{
			description: 'should send the client customer ID as one path segment',
			clientCustomerId: 'a/b',
			path: '/v25/customers/a%2Fb/googleAds:search',
		},
	];

	for (const { description, clientCustomerId, path } of cases) {
		harness.setupTest({
			description,
			input: { workflowData: workflow({ clientCustomerId }) },
			output: { nodeData: { 'Google Ads': [[{ json: { id: '12345678901' } }]] } },
			credentials,
			nock: {
				baseUrl,
				mocks: [
					{
						method: 'post',
						path,
						statusCode: 200,
						responseBody: { results: [{ campaign: { id: '12345678901' } }] },
					},
				],
			},
		});
	}

	harness.setupTest({
		description: 'should reject a dot segment as the client customer ID',
		input: { workflowData: workflow({ clientCustomerId: '..' }) },
		output: { nodeData: {}, error: 'Invalid identifier: ".." is not allowed' },
		credentials,
	});
});
