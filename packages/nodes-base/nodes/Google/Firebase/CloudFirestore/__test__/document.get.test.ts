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

		mock.post('/v1/projects/test-project/databases/(default)/documents:batchGet').reply(200, [
			{
				found: {
					name: 'projects/test-project/databases/(default)/documents/users/test-doc-id',
					fields: {
						name: { stringValue: 'John Doe' },
						email: { stringValue: 'john@example.com' },
						age: { integerValue: '30' },
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
		workflowFiles: ['document-get.workflow.json'],
	});
});
