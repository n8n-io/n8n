import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../credentials';

// Drive-mode per-item resolution: with `Access As: Drive` the target id IS the drive,
// addressed as `/drives/{id}` (no `/drive` suffix). Two items with distinct drive-id
// expressions must each hit their own drive root. Consume-once + empty pendingMocks pin
// the exact request set.
describe('Test MicrosoftOneDrive, Service Principal file:get resolves the drive target per item', () => {
	nock('https://graph.microsoft.com/v1.0')
		.matchHeader('Authorization', 'Bearer test-access-token')
		.get('/drives/b!driveA/items/FILE123')
		.reply(200, { id: 'FILE123', name: 'a.txt', file: { mimeType: 'text/plain' } });

	nock('https://graph.microsoft.com/v1.0')
		.matchHeader('Authorization', 'Bearer test-access-token')
		.get('/drives/b!driveB/items/FILE123')
		.reply(200, { id: 'FILE123', name: 'b.txt', file: { mimeType: 'text/plain' } });

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['file.get.sp.drive.perItem.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
