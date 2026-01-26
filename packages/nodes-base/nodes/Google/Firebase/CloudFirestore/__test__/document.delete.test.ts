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
			.delete('/v1/projects/test-project/databases/(default)/documents/users/test-doc-id')
			.reply(200, {});
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['document-delete.workflow.json'],
	});
});
