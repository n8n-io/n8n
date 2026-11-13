import { NodeTestHarness } from '@nodes-testing/node-test-harness';
import nock from 'nock';

describe('GoogleFirebaseCloudFirestore - collection request URLs', () => {
	beforeAll(() => {
		nock('https://firestore.googleapis.com')
			.post('/v1/projects/test-project/databases/(default)/documents:listCollectionIds')
			.query({ pageSize: 2 })
			.reply(200, { collectionIds: ['users', 'orders'] })
			.post('/v1/projects/test-project/databases/inventory-db/documents:listCollectionIds')
			.query({ pageSize: 100 })
			.reply(200, { collectionIds: ['products'] });
	});

	afterAll(() => {
		expect(nock.pendingMocks()).toEqual([]);
	});

	new NodeTestHarness().setupTests({
		credentials: {
			googleFirebaseCloudFirestoreOAuth2Api: {
				oauthTokenData: { access_token: 'test-access-token' },
			},
		},
		workflowFiles: ['collection-listCollectionIds.workflow.json'],
	});
});
