import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

const path = (recipient: string) => `/v1.0/users/${recipient}/teamwork/sendActivityNotification`;

const companionAppMissing = (recipient: string) => ({
	error: {
		code: 'Forbidden',
		message: `Application with AAD App Id '22222222-2222-2222-2222-222222222222' is not authorized to generate custom text notifications about '${path(recipient)}' to the recipient. Ensure that the expected Teams app is installed in the target scope (user, team, or chat).`,
	},
});

const scopeMissing = {
	error: {
		code: 'Forbidden',
		message:
			"Missing scope permissions on the request. API requires one of 'TeamsActivity.Send'. Scopes on the request 'Chat.ReadWrite, ChannelMessage.Send, User.Read, offline_access'.",
	},
};

const roleMissing = {
	error: {
		code: 'Forbidden',
		message:
			"Missing role permissions on the request. API requires one of 'TeamsActivity.Send, TeamsActivity.Send.User'. Roles on the request ''. Resource specific consent grants on the request ''.",
	},
};

describe('Test MicrosoftTeamsV2, activityNotification => send (Graph 403 causes)', () => {
	nock('https://graph.microsoft.com')
		.post(path('aaaaaaaa-0000-0000-0000-000000000001'))
		.reply(403, companionAppMissing('aaaaaaaa-0000-0000-0000-000000000001'))
		.post(path('aaaaaaaa-0000-0000-0000-000000000002'))
		.reply(403, scopeMissing)
		.post(path('aaaaaaaa-0000-0000-0000-000000000003'))
		.reply(403, companionAppMissing('aaaaaaaa-0000-0000-0000-000000000003'))
		.post(path('aaaaaaaa-0000-0000-0000-000000000004'))
		.reply(403, roleMissing);

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: [
			'send.companionApp.forbidden.workflow.json',
			'send.permission.forbidden.workflow.json',
			'send.servicePrincipal.companionApp.forbidden.workflow.json',
			'send.servicePrincipal.permission.forbidden.workflow.json',
		],
	});
});
