import type {
	ICredentialDataDecryptedObject,
	IDataObject,
	IHttpRequestOptions,
} from 'n8n-workflow';
import nock from 'nock';

import { CredentialsHelper, equalityTest, setup, workflowToTests } from '@test/nodes/Helpers';

describe('Azure Storage Node', () => {
	const workflows = ['nodes/Microsoft/Storage/test/workflows/credentials_oauth2.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	beforeEach(() => {
		// https://github.com/nock/nock/issues/2057#issuecomment-663665683
		if (!nock.isActive()) {
			nock.activate();
		}
	});

	describe('should use correct oauth2 credentials', () => {
		beforeAll(() => {
			nock.disableNetConnect();

			jest
				.spyOn(CredentialsHelper.prototype, 'authenticate')
				.mockImplementation(
					async (
						credentials: ICredentialDataDecryptedObject,
						typeName: string,
						requestParams: IHttpRequestOptions,
					): Promise<IHttpRequestOptions> => {
						if (typeName === 'azureStorageOAuth2Api') {
							return {
								...requestParams,
								headers: {
									authorization: `bearer ${(credentials.oauthTokenData as IDataObject).access_token as string}`,
								},
							};
						} else {
							return requestParams;
						}
					},
				);
		});

		afterAll(() => {
			nock.restore();
			jest.restoreAllMocks();
		});

		const nodeTypes = setup(workflowTests);

		for (const workflow of workflowTests) {
			workflow.nock = {
				baseUrl: 'https://myaccount.blob.core.windows.net',
				mocks: [
					{
						method: 'get',
						path: '/mycontainer?restype=container',
						statusCode: 200,
						requestHeaders: { authorization: 'bearer ACCESSTOKEN' },
						responseBody: '',
						responseHeaders: {
							'content-length': '0',
							'last-modified': 'Tue, 28 Jan 2025 16:40:21 GMT',
							etag: '"0x8DD3FBA74CF3620"',
							server: 'Windows-Azure-Blob/1.0 Microsoft-HTTPAPI/2.0',
							'x-ms-request-id': '49edb268-b01e-0053-6e29-72d574000000',
							'x-ms-version': '2020-10-02',
							'x-ms-lease-status': 'unlocked',
							'x-ms-lease-state': 'available',
							'x-ms-has-immutability-policy': 'false',
							'x-ms-has-legal-hold': 'false',
							date: 'Wed, 29 Jan 2025 08:43:08 GMT',
							'x-ms-meta-key1': 'field1',
							'x-ms-blob-public-access': 'blob',
							'x-ms-lease-duration': 'infinite',
						},
					},
				],
			};
			test(workflow.description, async () => await equalityTest(workflow, nodeTypes));
		}
	});
});
