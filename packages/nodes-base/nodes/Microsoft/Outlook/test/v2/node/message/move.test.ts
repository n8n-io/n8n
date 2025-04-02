import nock from 'nock';

import { testWorkflows } from '@test/nodes/Helpers';

describe('Test MicrosoftOutlookV2, message => move', () => {
	nock('https://graph.microsoft.com/v1.0/me')
		.post(
			'/messages/AAMkADlhOTA0MTc5LWUwOTMtNDRkZS05NzE0LTNlYmI0ZWM5OWI5OABGAAAAAABPLqzvT6b9RLP0CKzHiJrRBwBZf4De-LkrSqpPI8eyjUmAAAAAAAEJAABZf4De-LkrSqpPI8eyjUmAAAFXBEVwAAA=/move',
			{
				destinationId:
					'AAMkADlhOTA0MTc5LWUwOTMtNDRkZS05NzE0LTNlYmI0ZWM5OWI5OAAuAAAAAABPLqzvT6b9RLP0CKzHiJrRAQBZf4De-LkrSqpPI8eyjUmAAAFXBAEHAAA=',
			},
		)
		.reply(200);

	const workflows = ['nodes/Microsoft/Outlook/test/v2/node/message/move.workflow.json'];
	testWorkflows(workflows);
});
