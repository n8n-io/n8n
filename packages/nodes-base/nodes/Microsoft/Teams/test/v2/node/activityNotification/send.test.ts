import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../../../credentials';

const PATH = '/v1.0/users/11111111-2222-3333-4444-555555555555/teamwork/sendActivityNotification';
const LINK = 'https://teams.microsoft.com/l/chat/0/0?users=someone@contoso.com';
const BODY = {
	topic: { source: 'text', value: 'n8n workflow run', webUrl: LINK },
	activityType: 'systemDefault',
	previewText: { content: 'Order #4711 needs approval' },
	templateParameters: [{ name: 'systemDefaultText', value: 'Approval needed' }],
};

describe('Test MicrosoftTeamsV2, activityNotification => send', () => {
	nock('https://graph.microsoft.com')
		.post(PATH, BODY)
		.times(2)
		.reply(204)
		.post(PATH, { ...BODY, chainId: 4711 })
		.reply(204);

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: [
			'send.workflow.json',
			'send.servicePrincipal.workflow.json',
			'send.chainId.workflow.json',
		],
	});
});
