import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Google Drive V2', () => {
	const credentials = {
		googleDriveOAuth2Api: {
			scope: 'https://www.googleapis.com/auth/drive',
			oauthTokenData: {
				access_token: 'test-access-token',
			},
		},
	};

	describe('Folder Create Operation', () => {
		beforeAll(() => {
			const mock = nock('https://www.googleapis.com');

			// Mock folder creation
			mock
				.post('/drive/v3/files')
				.query(true)
				.reply(200, {
					id: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
					name: 'Test Folder',
					mimeType: 'application/vnd.google-apps.folder',
					createdTime: '2024-01-01T00:00:00.000Z',
					modifiedTime: '2024-01-01T00:00:00.000Z',
					webViewLink:
						'https://drive.google.com/drive/folders/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
				})
				.persist();
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['folder-create-basic.workflow.json'],
		});
	});

	// Note: File Upload operations are skipped from workflow tests due to binary data complexity
	// The upload functionality is thoroughly tested in the dedicated unit tests

	describe('File Operations', () => {
		beforeAll(() => {
			const mock = nock('https://www.googleapis.com');

			// Mock file copy - correct endpoint
			mock
				.post('/drive/v3/files/123/copy')
				.query(true)
				.reply(200, {
					id: 'copy123',
					name: 'Copy of Test File',
					mimeType: 'text/plain',
				})
				.persist();

			// Mock file createFromText - multipart upload
			mock
				.post('/upload/drive/v3/files')
				.query({ uploadType: 'multipart', supportsAllDrives: true })
				.reply(200, {
					id: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
					name: 'Test Text File',
					mimeType: 'text/plain',
				})
				.persist();

			// Mock metadata update after createFromText
			mock
				.patch('/drive/v3/files/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms')
				.query(true)
				.reply(200, {
					id: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
					name: 'Test Text File',
					mimeType: 'text/plain',
					size: '48',
					createdTime: '2024-01-01T00:00:00.000Z',
					modifiedTime: '2024-01-01T00:00:00.000Z',
				})
				.persist();

			// Mock file download - metadata fetch first
			mock
				.get('/drive/v3/files/123')
				.query({ fields: 'mimeType,name', supportsTeamDrives: true, supportsAllDrives: true })
				.reply(200, {
					id: '123',
					name: 'Test File',
					mimeType: 'text/plain',
				})
				.persist();

			// Mock file download - content download
			mock
				.get('/drive/v3/files/123')
				.query({ alt: 'media', supportsAllDrives: true })
				.reply(200, 'Hello World', {
					'Content-Type': 'text/plain',
				})
				.persist();

			mock.delete('/drive/v3/files/123').query(true).reply(200).persist();

			mock
				.get('/drive/v3/files/123')
				.query(true)
				.reply(200, {
					id: '123',
					name: 'Test File',
					mimeType: 'text/plain',
					size: '1024',
				})
				.persist();

			mock
				.patch('/drive/v3/files/123')
				.query(true)
				.reply(200, {
					id: '123',
					name: 'Updated Test File',
					mimeType: 'text/plain',
				})
				.persist();

			mock
				.post('/drive/v3/files/123/permissions')
				.query(true)
				.reply(200, {
					id: 'permission123',
					role: 'reader',
					type: 'user',
				})
				.persist();
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: [
				'file-copy.workflow.json',
				'file-createFromText.workflow.json',
				'file-delete.workflow.json',
				'file-download.workflow.json',
				'file-move.workflow.json',
				'file-share.workflow.json',
				'file-update.workflow.json',
			],
		});
	});

	describe('Folder Operations', () => {
		beforeAll(() => {
			const mock = nock('https://www.googleapis.com');

			// Mock folder delete
			mock.delete('/drive/v3/files/folder123').query(true).reply(200).persist();

			// Mock folder share
			mock
				.post('/drive/v3/files/folder123/permissions')
				.query(true)
				.reply(200, {
					id: 'permission123',
					role: 'reader',
					type: 'user',
				})
				.persist();
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['folder-delete.workflow.json', 'folder-share.workflow.json'],
		});
	});

	describe('File/Folder Search Operations', () => {
		beforeAll(() => {
			const mock = nock('https://www.googleapis.com');

			// Mock search
			mock
				.get('/drive/v3/files')
				.query(true)
				.reply(200, {
					files: [
						{
							id: '123',
							name: 'Test File',
							mimeType: 'text/plain',
						},
						{
							id: 'folder123',
							name: 'Test Folder',
							mimeType: 'application/vnd.google-apps.folder',
						},
					],
				})
				.persist();
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: ['filefolder-search.workflow.json'],
		});
	});

	describe('Shared Drive Operations', () => {
		beforeAll(() => {
			const mock = nock('https://www.googleapis.com');

			// Mock drive operations
			mock
				.post('/drive/v3/drives')
				.query(true)
				.reply(200, {
					id: 'drive123',
					name: 'Test Drive',
				})
				.persist();

			mock.delete('/drive/v3/drives/drive123').query(true).reply(200).persist();

			mock
				.get('/drive/v3/drives/drive123')
				.query(true)
				.reply(200, {
					id: 'drive123',
					name: 'Test Drive',
				})
				.persist();

			mock
				.get('/drive/v3/drives')
				.query(true)
				.reply(200, {
					drives: [
						{
							id: 'drive123',
							name: 'Test Drive',
						},
					],
				})
				.persist();

			mock
				.patch('/drive/v3/drives/drive123')
				.query(true)
				.reply(200, {
					id: 'drive123',
					name: 'Updated Test Drive',
				})
				.persist();
		});

		new NodeTestHarness().setupTests({
			credentials,
			workflowFiles: [
				'drive-create.workflow.json',
				'drive-delete.workflow.json',
				'drive-get.workflow.json',
				'drive-list.workflow.json',
				'drive-update.workflow.json',
			],
		});
	});
});
