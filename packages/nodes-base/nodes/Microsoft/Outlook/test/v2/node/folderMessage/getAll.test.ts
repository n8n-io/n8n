import nock from 'nock';

import { testWorkflows } from '@test/nodes/Helpers';

describe('Test MicrosoftOutlookV2, folderMessage => getAll', () => {
	nock('https://graph.microsoft.com/v1.0/me')
		.get(
			'/mailFolders/AAMkADlhOTA0MTc5LWUwOTMtNDRkZS05NzE0LTNlYmI0ZWM5OWI5OAAuAAAAAABPLqzvT6b9RLP0CKzHiJrRAQBZf4De-LkrSqpPI8eyjUmAAAFXBAEHAAA=/messages?%24select=bodyPreview%2Csubject&%24top=100',
		)
		.reply(200, {
			value: [
				{
					'@odata.etag': 'W/"CQAAABYAAABZf4De/LkrSqpPI8eyjUmAAAFW3CAj"',
					id: 'AAMkADlhOTA0MTc5LWUwOTMtNDRkZS05NzE0LTNlYmI0ZWM5OWI5OABGAAAAAABPLqzvT6b9RLP0CKzHiJrRBwBZf4De-LkrSqpPI8eyjUmAAAFXBAEHAABZf4De-LkrSqpPI8eyjUmAAAFXBGDUAAA=',
					subject: 'XXXX',
					bodyPreview: 'test',
				},
			],
		});

	const workflows = ['nodes/Microsoft/Outlook/test/v2/node/folderMessage/getAll.workflow.json'];
	testWorkflows(workflows);
});
