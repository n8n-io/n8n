import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

const joinWebUrl =
	'https://teams.microsoft.com/l/meetup-join/19%3ameeting_ZDE2Nzg0%40thread.v2/0?context=%7b%22Tid%22%3a%22abc%22%7d';

describe('Test MicrosoftTeamsV2, onlineMeeting => get by join URL (Service Principal)', () => {
	nock('https://graph.microsoft.com')
		.matchHeader('Prefer', 'include-unknown-enum-members')
		.get('/v1.0/users/11111111-2222-3333-4444-555555555555/onlineMeetings')
		.query({ $filter: `JoinWebUrl eq '${joinWebUrl}'` })
		.reply(200, {
			value: [
				{
					id: 'MSpkYzE3Njc0Yy04MWQ5LTRhZGItYmZi',
					startDateTime: '2026-09-10T10:00:00Z',
					endDateTime: '2026-09-10T10:30:00Z',
					joinWebUrl,
					subject: 'Quarterly Sync',
				},
			],
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['get.servicePrincipal.workflow.json'],
	});
});
