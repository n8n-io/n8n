import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

const meeting = {
	'@odata.context':
		"https://graph.microsoft.com/v1.0/$metadata#users('11111111-2222-3333-4444-555555555555')/onlineMeetings/$entity",
	id: 'MSpjcmVhdGVPckdldC1uZXc',
	creationDateTime: '2026-09-02T14:00:00.123Z',
	startDateTime: '2026-09-15T09:00:00Z',
	endDateTime: '2026-09-15T09:30:00Z',
	joinWebUrl: 'https://teams.microsoft.com/l/meetup-join/19%3ameeting_a2lja29mZg%40thread.v2/0',
	subject: 'Order 4711 kickoff',
	externalId: 'order-4711-kickoff',
};

describe('Test MicrosoftTeamsV2, onlineMeeting => createOrGet', () => {
	nock('https://graph.microsoft.com')
		.matchHeader('Prefer', 'include-unknown-enum-members')
		.post('/v1.0/me/onlineMeetings/createOrGet', {
			externalId: 'order-4711-kickoff',
			subject: 'Order 4711 kickoff',
			startDateTime: '2026-09-15T09:00:00Z',
			endDateTime: '2026-09-15T09:30:00Z',
		})
		.reply(201, meeting)
		.post('/v1.0/me/onlineMeetings/createOrGet', { externalId: 'order-4711-kickoff' })
		.reply(200, meeting);

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['createOrGet.workflow.json', 'createOrGet.existing.workflow.json'],
	});
});
