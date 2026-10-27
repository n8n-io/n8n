import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../credentials';

// Smoke test that de-risks the imperative
// requestWithAuthentication-through-NodeTestHarness path for the app-only Service
// Principal credential. The harness preAuthentication is a no-op, so the token
// POST never fires — we nock ONLY the scoped Graph endpoint and require the
// Bearer header that the credential's `authenticate` attaches from the fixture's
// accessToken. login.microsoftonline.com is deliberately NOT nocked.
describe('Test MicrosoftOneDrive, Service Principal file:get smoke', () => {
	nock('https://graph.microsoft.com/v1.0')
		.matchHeader('Authorization', 'Bearer test-access-token')
		.get('/users/jane%40contoso.com/drive/items/FILE123')
		.reply(200, {
			id: 'FILE123',
			name: 'report.txt',
			file: {
				mimeType: 'text/plain',
			},
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['file.get.sp.workflow.json'],
	});
});
