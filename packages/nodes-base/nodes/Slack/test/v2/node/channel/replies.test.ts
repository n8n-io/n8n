import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

const API_RESPONSE = {
	ok: true,
	messages: [
		{ type: 'message', text: 'Original message', ts: '1734322597.935429' },
		{ type: 'message', text: 'Reply 1', ts: '1734322600.000001', thread_ts: '1734322597.935429' },
	],
};

describe('Test SlackV2, channel => replies', () => {
	// Basic replies request
	nock('https://slack.com')
		.get(
			'/api/conversations.replies?channel=C08514ZPKB8&ts=1734322597.935429&inclusive=true&limit=100',
		)
		.reply(200, API_RESPONSE);

	// Replies including all metadata (include_all_metadata should be present)
	nock('https://slack.com')
		.get(
			'/api/conversations.replies?channel=C08514ZPKB8&ts=1734322597.935429&inclusive=true&include_all_metadata=true&limit=50',
		)
		.reply(200, API_RESPONSE);

	new NodeTestHarness().setupTests({
		workflowFiles: ['replies.workflow.json', 'replies.includeAllMetadata.workflow.json'],
	});
});
