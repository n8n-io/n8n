import nock from 'nock';

import { testWorkflows } from '@test/nodes/Helpers';

import { credentials } from '../../../credentials';

describe('Test MicrosoftTeamsV2, channel => update', () => {
	nock('https://graph.microsoft.com')
		.patch(
			'/v1.0/teams/e25bae35-7bcc-4fb7-b4f2-0d5caef251fd/channels/19:b9daa3647ff8450bacaf39490d3e05e2@thread.tacv2',
			{ description: 'new channel description', displayName: 'New Deals' },
		)
		.reply(200, {});

	const workflows = ['nodes/Microsoft/Teams/test/v2/node/channel/update.workflow.json'];
	testWorkflows(workflows, credentials);
});
