import { nanoid } from 'nanoid';

import type { ApiHelpers } from '../../../services/api-helper';

/**
 * A workflow with a Slack node that has pinned data, and a Slack credential.
 * A run never uses the credential or calls Slack.
 */
export async function createSlackWorkflow(api: ApiHelpers, name = `Side panel ${nanoid()}`) {
	const credential = await api.credentials.createCredential({
		name: `Slack ${nanoid()}`,
		type: 'slackApi',
		data: { accessToken: 'xoxb-not-a-real-token' },
	});
	const workflow = await api.workflows.createWorkflow({
		name,
		nodes: [
			{
				id: nanoid(),
				name: 'Start here',
				type: 'n8n-nodes-base.manualTrigger',
				typeVersion: 1,
				position: [0, 0],
				parameters: {},
			},
			{
				id: nanoid(),
				name: 'Post alert',
				type: 'n8n-nodes-base.slack',
				typeVersion: 2.3,
				position: [200, 0],
				parameters: {
					resource: 'message',
					operation: 'post',
					select: 'channel',
					channelId: {
						__rl: true,
						mode: 'list',
						value: 'C123',
						cachedResultName: '#qa-alerts',
						cachedResultUrl: 'https://example.slack.com/archives/C123',
					},
					text: 'hello',
				},
				credentials: { slackApi: { id: credential.id, name: credential.name } },
			},
		],
		connections: {
			'Start here': { main: [[{ node: 'Post alert', type: 'main', index: 0 }]] },
		},
		pinData: {
			'Post alert': [
				{ json: { ts: '1', text: 'hello from qa' } },
				{ json: { ts: '2', text: 'second message' } },
			],
		},
	});
	return { id: String(workflow.id), name, credential };
}
