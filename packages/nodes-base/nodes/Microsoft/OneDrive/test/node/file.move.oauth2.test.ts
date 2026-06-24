import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../credentials';

// Proves Move for the common OAuth2 case: PATCH /me/drive/items/{id} with the
// driveId omitted (same-drive move). Mirrors the Excel imperative-OAuth2 harness
// model (nock /me, no login host).
describe('Test MicrosoftOneDrive, OAuth2 file:move', () => {
	nock('https://graph.microsoft.com/v1.0/me')
		.patch('/drive/items/FILE123', { parentReference: { id: 'DESTFOLDER' } })
		.reply(200, {
			id: 'FILE123',
			name: 'report.txt',
			parentReference: { id: 'DESTFOLDER' },
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['file.move.oauth2.workflow.json'],
	});
});
