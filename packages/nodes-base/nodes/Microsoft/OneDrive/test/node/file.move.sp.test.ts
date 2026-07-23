import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../credentials';

// Move exposes only a Destination Folder ID — cross-drive moves aren't supported,
// so the user can't set a destination drive. For app-only the scope drive id is
// resolved automatically and injected so a same-drive move targets the right drive.
describe('Test MicrosoftOneDrive, Service Principal file:move', () => {
	describe('resolves the scope drive, then PATCHes with the injected driveId', () => {
		// 1) resolution GET returns the default (scope) drive id
		nock('https://graph.microsoft.com/v1.0')
			.matchHeader('Authorization', 'Bearer test-access-token')
			.get('/users/jane%40contoso.com/drive')
			.query({ $select: 'id' })
			.reply(200, { id: 'b!resolveddrive' });

		// 2) the PATCH must carry the resolved driveId injected into parentReference
		nock('https://graph.microsoft.com/v1.0')
			.matchHeader('Authorization', 'Bearer test-access-token')
			.patch('/users/jane%40contoso.com/drive/items/FILE123', {
				parentReference: { id: 'DESTFOLDER', driveId: 'b!resolveddrive' },
			})
			.reply(200, {
				id: 'FILE123',
				name: 'report.txt',
				parentReference: { driveId: 'b!resolveddrive', id: 'DESTFOLDER' },
			});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['file.move.sp.resolveDrive.workflow.json'],
		});
	});
});
