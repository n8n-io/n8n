import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const MESSAGES = [
	{
		author_name: 'michael.k',
		author_user_id: 'U0362BXQYJW',
		team_id: 'T0364MSFHV2',
		channel_id: 'C08514ZPKB8',
		channel_name: 'test-002',
		message_ts: '1734322597.935429',
		content: 'test message',
		is_author_bot: false,
		permalink: 'https://myspace-qhg7381.slack.com/archives/C08514ZPKB8/p1734322597935429',
		blocks: [
			{
				type: 'rich_text',
				block_id: '+bc',
				elements: [
					{
						type: 'rich_text_section',
						elements: [
							{
								type: 'text',
								text: 'test message',
							},
						],
					},
				],
			},
		],
	},
	{
		author_name: 'michael.k',
		author_user_id: 'U0362BXQYJW',
		team_id: 'T0364MSFHV2',
		channel_id: 'C08514ZPKB8',
		channel_name: 'test-002',
		message_ts: '1734322341.161179',
		content: 'another test message',
		is_author_bot: false,
		permalink: 'https://myspace-qhg7381.slack.com/archives/C08514ZPKB8/p1734322341161179',
		blocks: [
			{
				type: 'rich_text',
				block_id: 'FGAKN',
				elements: [
					{
						type: 'rich_text_section',
						elements: [
							{
								type: 'text',
								text: 'another test message',
							},
						],
					},
				],
			},
		],
	},
];

const API_RESPONSE = {
	ok: true,
	results: {
		messages: MESSAGES,
	},
	response_metadata: {
		next_cursor: '',
	},
};

describe('Test SlackV2 v2.7, message => search', () => {
	nock('https://slack.com')
		.post('/api/assistant.search.context', {
			query: 'test in:test-002 in:test-003',
			content_types: ['messages'],
			sort: 'timestamp',
			sort_dir: 'desc',
			channel_types: ['public_channel', 'private_channel'],
			disable_semantic_search: true,
			include_archived_channels: true,
			include_bots: true,
			include_message_blocks: true,
			limit: 2,
		})
		.reply(200, API_RESPONSE);

	new NodeTestHarness().setupTests({
		workflowFiles: ['searchV27.workflow.json'],
	});
});
