import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../credentials';

// Real-composition harness coverage for the drive target. This exercises
// `driveEndpoint` end-to-end through the real requestWithAuthentication path, so a
// reintroduced double-`/drive` fails here — the gap that previously let the
// `/drives/{id}/drive/...` bug ship. Fixtures supply accessToken directly;
// login.microsoftonline.com is never nocked.
describe('Test MicrosoftOneDrive, Service Principal scoped file:get composition', () => {
	describe('drive target — /drives/{id}/items/{id} with NO extra /drive segment', () => {
		nock('https://graph.microsoft.com/v1.0')
			.matchHeader('Authorization', 'Bearer test-access-token')
			.get('/drives/b!targetdrive/items/FILE123')
			.reply(200, {
				id: 'FILE123',
				name: 'report.txt',
				file: { mimeType: 'text/plain' },
			});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['file.get.sp.drive.workflow.json'],
		});
	});
});
