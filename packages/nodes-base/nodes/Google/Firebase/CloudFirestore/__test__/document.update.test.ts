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

		mock.post('/v1/projects/test-project/databases/(default)/documents:batchWrite').reply(200, {
			writeResults: [
				{
					updateTime: '2023-01-01T11:00:00.000Z',
				},
			],
			status: [
				{
					code: 0,
				},
			],
		});
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['document-update.workflow.json'],
	});
});
