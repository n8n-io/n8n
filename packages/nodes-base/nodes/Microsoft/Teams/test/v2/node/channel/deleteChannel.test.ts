import nock from 'nock';

import { testWorkflows } from '@test/nodes/Helpers';

import { credentials } from '../../../credentials';

describe('Test MicrosoftTeamsV2, channel => deleteChannel', () => {
	nock('https://graph.microsoft.com')
		.delete(
			'/v1.0/teams/1644e7fe-547e-4223-a24f-922395865343/channels/19:16259efabba44a66916d91dd91862a6f@thread.tacv2',
		)
		.reply(200, {});

	const workflows = ['nodes/Microsoft/Teams/test/v2/node/channel/deleteChannel.workflow.json'];
	testWorkflows(workflows, credentials);
});
