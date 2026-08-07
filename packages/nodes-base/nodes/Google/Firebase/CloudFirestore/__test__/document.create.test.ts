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
			.post(
				'/v1/projects/test-project/databases/(default)/documents/users',
				(requestBody) =>
					JSON.stringify(requestBody) ===
					JSON.stringify({
						fields: {
							numericZero: { integerValue: 0 },
							falseFlag: { booleanValue: false },
							emptyString: { stringValue: '' },
							numericString: { stringValue: '000123' },
							missingField: { nullValue: null },
						},
					}),
			)
			.query({ documentId: 'test-doc-id' })
			.reply(200, {
				name: 'projects/test-project/databases/(default)/documents/users/test-doc-id',
				fields: {
					numericZero: { integerValue: 0 },
					falseFlag: { booleanValue: false },
					emptyString: { stringValue: '' },
					numericString: { stringValue: '000123' },
					missingField: { nullValue: null },
				},
				createTime: '2023-01-01T10:00:00.000Z',
				updateTime: '2023-01-01T10:00:00.000Z',
			});
	});

	new NodeTestHarness().setupTests({
		credentials,
		workflowFiles: ['document-create.workflow.json'],
	});
});
