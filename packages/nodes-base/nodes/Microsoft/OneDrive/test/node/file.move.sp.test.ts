import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../credentials';

describe('Test MicrosoftOneDrive, Service Principal file:move', () => {
	describe('with an explicit destination driveId (single PATCH, no resolution GET)', () => {
		nock('https://graph.microsoft.com/v1.0')
			.matchHeader('Authorization', 'Bearer test-access-token')
			.patch('/users/jane%40contoso.com/drive/items/FILE123', {
				parentReference: { id: 'DESTFOLDER', driveId: 'b!explicitdrive' },
			})
			.reply(200, {
				id: 'FILE123',
				name: 'report.txt',
				parentReference: { driveId: 'b!explicitdrive', id: 'DESTFOLDER' },
			});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['file.move.sp.explicitDrive.workflow.json'],
		});
	});

	describe('with an omitted driveId (resolves the default drive, then PATCHes)', () => {
		// 1) resolution GET returns the default drive id
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
