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

		mock.post('/v1/projects/test-project/databases/(default)/documents:runQuery').reply(200, [
			{
				document: {
					name: 'projects/test-project/databases/(default)/documents/users/user1',
					id: 'user1',
					fields: {
						name: { stringValue: 'John Doe' },
						email: { stringValue: 'john@example.com' },
						active: { booleanValue: true },
					},
					createTime: '2023-01-01T10:00:00.000Z',
					updateTime: '2023-01-01T10:00:00.000Z',
				},
			},
			{
				document: {
					name: 'projects/test-project/databases/(default)/documents/users/user2',
					id: 'user2',
					fields: {
						name: { stringValue: 'Jane Smith' },
						email: { stringValue: 'jane@example.com' },
						active: { booleanValue: true },
					},
					createTime: '2023-01-01T10:00:00.000Z',
					updateTime: '2023-01-01T10:00:00.000Z',
				},
			},
		]);
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['document-query.workflow.json'],
	});
});
