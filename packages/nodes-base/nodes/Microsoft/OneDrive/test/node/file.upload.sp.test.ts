import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../credentials';

// Uploads via the text path under a Service Principal drive scope. A /drives/{id}
// root is already a drive, so the path has no extra `/drive` segment; this proves
// the :/path:/content addressing survives scoping end-to-end with the real
// requestWithAuthentication helper. The binary path's JSON.parse of the string body
// is covered by the direct-unit file.upload.test.ts.
describe('Test MicrosoftOneDrive, Service Principal file:upload (text path, scoped)', () => {
	nock('https://graph.microsoft.com/v1.0')
		.matchHeader('Authorization', 'Bearer test-access-token')
		.put('/drives/b!targetdrive/items/PARENT123:/report.txt:/content', 'hello world')
		.reply(200, {
			id: 'UPLOADED1',
			name: 'report.txt',
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['file.upload.sp.workflow.json'],
	});
});
