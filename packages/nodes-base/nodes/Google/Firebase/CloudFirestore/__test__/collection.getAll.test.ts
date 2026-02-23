import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('GoogleFirebaseCloudFirestore', () => {
	const credentials = {
		googleFirebaseCloudFirestoreOAuth2Api: {
			oauthTokenData: {
				access_token: 'test-access-token',
			},
		},
	};

	beforeAll(() => {
		const mock = nock('https://firestore.googleapis.com');

		mock
			.get('/v1/projects/test-project/databases/(default)/documents/users')
			.query({ pageSize: 100 })
			.reply(200, {
				documents: [
					{
						name: 'projects/test-project/databases/(default)/documents/users/user1',
						id: 'user1',
						fields: {
							name: { stringValue: 'John Doe' },
							email: { stringValue: 'john@example.com' },
						},
						createTime: '2023-01-01T10:00:00.000Z',
						updateTime: '2023-01-01T10:00:00.000Z',
					},
					{
						name: 'projects/test-project/databases/(default)/documents/users/user2',
						id: 'user2',
						fields: {
							name: { stringValue: 'Jane Smith' },
							email: { stringValue: 'jane@example.com' },
						},
						createTime: '2023-01-01T10:00:00.000Z',
						updateTime: '2023-01-01T10:00:00.000Z',
					},
				],
			});
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['collection-getAll.workflow.json'],
	});
});
