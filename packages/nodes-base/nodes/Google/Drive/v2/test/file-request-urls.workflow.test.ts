import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('Google Drive V2 - file request URLs', () => {
	beforeAll(() => {
		const files = '/drive/v3/files';

		nock('https://www.googleapis.com')
			.post(files, (body) => body.mimeType === 'application/vnd.google-apps.document')
			.query(true)
			.reply(200, { id: '1Gd0Oc3Do6Cu8Me1Nt4Id7Ab0Cd3Ef6Gh' })
			.patch(`${files}/1Qw2Er3Ty4Ui5Op6As7Df8Gh9Jk0LzXc`)
			.query(true)
			.reply(200, { id: '1Qw2Er3Ty4Ui5Op6As7Df8Gh9Jk0LzXc', trashed: true })
			.patch('/upload/drive/v3/files/1Lm4Np7Qr0St3Uv6Wx9Yz2Ab5Cd8Ef1Gh')
			.query({ uploadType: 'media', supportsAllDrives: 'true' })
			.reply(200, { id: '1Lm4Np7Qr0St3Uv6Wx9Yz2Ab5Cd8Ef1Gh' })
			.patch(`${files}/1Lm4Np7Qr0St3Uv6Wx9Yz2Ab5Cd8Ef1Gh`)
			.query(true)
			.reply(200, { id: '1Lm4Np7Qr0St3Uv6Wx9Yz2Ab5Cd8Ef1Gh', name: 'report.json' });

		nock('https://docs.googleapis.com')
			.post('/v1/documents/1Gd0Oc3Do6Cu8Me1Nt4Id7Ab0Cd3Ef6Gh:batchUpdate')
			.reply(200, { documentId: '1Gd0Oc3Do6Cu8Me1Nt4Id7Ab0Cd3Ef6Gh' });
	});

	afterAll(() => {
		expect(nock.pendingMocks()).toEqual([]);
	});

	new NodeTestHarness().setupTests({
		credentials: {
			googleDriveOAuth2Api: {
				scope: 'https://www.googleapis.com/auth/drive',
				oauthTokenData: { access_token: 'test-access-token' },
			},
		},
		workflowFiles: ['file-request-urls.workflow.json'],
	});
});
