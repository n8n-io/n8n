/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import nock from 'nock';

import {
	equalityTest,
	getWorkflowFilenames,
	initBinaryDataService,
	setup,
	workflowToTests,
} from '@test/nodes/Helpers';

describe('GraphQL Node', () => {
	const workflows = getWorkflowFilenames(__dirname);
	const workflowTests = workflowToTests(workflows);

	const baseUrl = 'https://api.n8n.io/';

	beforeAll(async () => {
		await initBinaryDataService();

		nock(baseUrl)
			.matchHeader('accept', 'application/json')
			.matchHeader('content-type', 'application/json')
			.matchHeader('user-agent', 'axios/1.7.4')
			.matchHeader('content-length', '263')
			.matchHeader('accept-encoding', 'gzip, compress, deflate, br')
			.post(
				'/graphql',
				'{"query":"query {\\n  nodes(pagination: { limit: 1 }) {\\n    data {\\n      id\\n      attributes {\\n        name\\n        displayName\\n        description\\n        group\\n        codex\\n        createdAt\\n      }\\n    }\\n  }\\n}","variables":{},"operationName":null}',
			)
			.reply(200, {
				data: {
					nodes: {
						data: [
							{
								id: '1',
								attributes: {
									name: 'n8n-nodes-base.activeCampaign',
									displayName: 'ActiveCampaign',
									description: 'Create and edit data in ActiveCampaign',
									group: '["transform"]',

									codex: {
										data: {
											details:
												'ActiveCampaign is a cloud software platform that allows customer experience automation, which combines email marketing, marketing automation, sales automation, and CRM categories. Use this node when you want to interact with your ActiveCampaign account.',
											resources: {
												primaryDocumentation: [
													{
														url: 'https://docs.n8n.io/integrations/builtin/app-nodes/n8n-nodes-base.activecampaign/',
													},
												],
												credentialDocumentation: [
													{
														url: 'https://docs.n8n.io/integrations/builtin/credentials/activeCampaign/',
													},
												],
											},
											categories: ['Marketing'],
											nodeVersion: '1.0',
											codexVersion: '1.0',
										},
									},
									createdAt: '2019-08-30T22:54:39.934Z',
								},
							},
						],
					},
				},
			});
	});

	const nodeTypes = setup(workflowTests);

	for (const workflow of workflowTests) {
		test(workflow.description, async () => await equalityTest(workflow, nodeTypes));
	}
});
