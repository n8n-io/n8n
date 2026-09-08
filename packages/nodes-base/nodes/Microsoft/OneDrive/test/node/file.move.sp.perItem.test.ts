import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../credentials';

// Per-item move with a shared destination-drive cache keyed by scope root: three items
// (alice, bob, alice) must resolve the default drive exactly ONCE per distinct user
// (two `GET …/drive?$select=id`, distinct ids) and each PATCH body must carry that
// user's drive id. Distinct fileIds keep all three PATCH interceptors unique. The
// consume-once interceptors + empty pendingMocks make both failure directions red:
// re-resolving per item leaves an extra GET unmatched; wrongly sharing one cache entry
// across users puts the wrong driveId in bob's PATCH body.
describe('Test MicrosoftOneDrive, Service Principal file:move per-item target', () => {
	// 1) one drive resolution per DISTINCT user, replying distinct drive ids
	nock('https://graph.microsoft.com/v1.0')
		.matchHeader('Authorization', 'Bearer test-access-token')
		.get('/users/alice%40contoso.com/drive')
		.query({ $select: 'id' })
		.reply(200, { id: 'b!driveA' });

	nock('https://graph.microsoft.com/v1.0')
		.matchHeader('Authorization', 'Bearer test-access-token')
		.get('/users/bob%40contoso.com/drive')
		.query({ $select: 'id' })
		.reply(200, { id: 'b!driveB' });

	// 2) each PATCH pins the per-user driveId injected into parentReference
	nock('https://graph.microsoft.com/v1.0')
		.matchHeader('Authorization', 'Bearer test-access-token')
		.patch('/users/alice%40contoso.com/drive/items/FILEA1', {
			parentReference: { id: 'DESTFOLDER', driveId: 'b!driveA' },
		})
		.reply(200, {
			id: 'FILEA1',
			name: 'a1.txt',
			parentReference: { driveId: 'b!driveA', id: 'DESTFOLDER' },
		});

	nock('https://graph.microsoft.com/v1.0')
		.matchHeader('Authorization', 'Bearer test-access-token')
		.patch('/users/bob%40contoso.com/drive/items/FILEB', {
			parentReference: { id: 'DESTFOLDER', driveId: 'b!driveB' },
		})
		.reply(200, {
			id: 'FILEB',
			name: 'b.txt',
			parentReference: { driveId: 'b!driveB', id: 'DESTFOLDER' },
		});

	nock('https://graph.microsoft.com/v1.0')
		.matchHeader('Authorization', 'Bearer test-access-token')
		.patch('/users/alice%40contoso.com/drive/items/FILEA2', {
			parentReference: { id: 'DESTFOLDER', driveId: 'b!driveA' },
		})
		.reply(200, {
			id: 'FILEA2',
			name: 'a2.txt',
			parentReference: { driveId: 'b!driveA', id: 'DESTFOLDER' },
		});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['file.move.sp.perItem.workflow.json'],
		customAssertions: () => expect(nock.pendingMocks()).toEqual([]),
	});
});
