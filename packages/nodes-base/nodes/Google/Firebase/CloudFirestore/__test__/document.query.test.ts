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

		const runQuery = '/v1/projects/test-project/databases/(default)/documents:runQuery';

		mock.post(runQuery, { structuredQuery: { from: [{ collectionId: 'admins' }] } }).reply(200, [
			{
				document: {
					name: 'projects/test-project/databases/(default)/documents/admins/admin1',
					fields: { name: { stringValue: 'Ada Admin' } },
					createTime: '2023-01-01T10:00:00.000Z',
					updateTime: '2023-01-01T10:00:00.000Z',
				},
			},
		]);

		mock
			.post(runQuery, {
				structuredQuery: {
					where: {
						fieldFilter: {
							field: { fieldPath: 'active' },
							op: 'EQUAL',
							value: { booleanValue: true },
						},
					},
					from: [{ collectionId: 'users' }],
				},
			})
			.reply(200, [
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
