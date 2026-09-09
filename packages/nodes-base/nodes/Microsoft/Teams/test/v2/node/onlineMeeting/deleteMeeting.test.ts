import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

const meetingId = 'MSpkYzE3Njc0Yy04MWQ5LTRhZGItYmZi';
const joinWebUrl =
	'https://teams.microsoft.com/l/meetup-join/19%3ameeting_ZDE2Nzg0%40thread.v2/0?context=%7b%22Tid%22%3a%22abc%22%7d';

describe('Test MicrosoftTeamsV2, onlineMeeting => deleteMeeting', () => {
	nock('https://graph.microsoft.com')
		.matchHeader('Prefer', 'include-unknown-enum-members')
		.get('/v1.0/me/onlineMeetings')
		.query({ $filter: `JoinWebUrl eq '${joinWebUrl}'` })
		.reply(200, { value: [{ id: meetingId, joinWebUrl }] })
		.delete(`/v1.0/me/onlineMeetings/${meetingId}`)
		.times(2)
		.reply(204);

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['deleteMeeting.workflow.json', 'deleteMeeting.joinUrl.workflow.json'],
	});
});
