import nock from 'nock';

import { testWorkflows } from '@test/nodes/Helpers';

describe('Test MicrosoftOutlookV2, calendar => delete', () => {
	nock('https://graph.microsoft.com/v1.0/me')
		.delete(
			'/calendars/AAAXXXYYYnnnT6b9RLP0CKzHiJrRBwBZf4De-LkrSqpPI8eyjUmAAAAAAAEGAABZf4De-LkrSqpPI8eyjUmAAACLtRvIAAA=',
		)
		.reply(200);

	const workflows = ['nodes/Microsoft/Outlook/test/v2/node/calendar/delete.workflow.json'];
	testWorkflows(workflows);
});
