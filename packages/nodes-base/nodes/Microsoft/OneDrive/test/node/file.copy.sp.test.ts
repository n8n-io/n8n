import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

import { credentials } from '../credentials';

describe('Test MicrosoftOneDrive, Service Principal file:copy', () => {
	describe('with an explicit destination driveId (single POST, no resolution GET)', () => {
		nock('https://graph.microsoft.com/v1.0')
			.matchHeader('Authorization', 'Bearer test-access-token')
			.post('/users/jane%40contoso.com/drive/items/FILE123/copy', {
				parentReference: { id: 'DESTFOLDER', driveId: 'b!explicitdrive' },
			})
			.reply(202, '', { Location: 'https://graph.microsoft.com/v1.0/monitor/copy-token-1' });

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['file.copy.sp.explicitDrive.workflow.json'],
		});
	});

	describe('with an omitted driveId (resolves the default drive, then POSTs the copy)', () => {
		nock('https://graph.microsoft.com/v1.0')
			.matchHeader('Authorization', 'Bearer test-access-token')
			.get('/users/jane%40contoso.com/drive')
			.query({ $select: 'id' })
			.reply(200, { id: 'b!resolveddrive' });

		nock('https://graph.microsoft.com/v1.0')
			.matchHeader('Authorization', 'Bearer test-access-token')
			.post('/users/jane%40contoso.com/drive/items/FILE123/copy', {
				parentReference: { id: 'DESTFOLDER', driveId: 'b!resolveddrive' },
			})
			.reply(202, '', { Location: 'https://graph.microsoft.com/v1.0/monitor/copy-token-2' });

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['file.copy.sp.resolveDrive.workflow.json'],
		});
	});
});
