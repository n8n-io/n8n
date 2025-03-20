import type { ICredentialDataDecryptedObject, IHttpRequestOptions } from 'n8n-workflow';
import nock from 'nock';

import { CredentialsHelper, equalityTest, setup, workflowToTests } from '@test/nodes/Helpers';

import { AzureStorageSharedKeyApi } from '../../../../../credentials/AzureStorageSharedKeyApi.credentials';
import { FAKE_CREDENTIALS_DATA } from '../../../../../test/nodes/FakeCredentialsMap';

describe('Azure Storage Node', () => {
	const workflows = ['nodes/Microsoft/Storage/test/workflows/credentials_sharedKey.workflow.json'];
	const workflowTests = workflowToTests(workflows);

	beforeEach(() => {
		// https://github.com/nock/nock/issues/2057#issuecomment-663665683
		if (!nock.isActive()) {
			nock.activate();
		}
	});

	describe('should use correct shared key credentials', () => {
		beforeAll(() => {
			nock.disableNetConnect();

			jest
				.spyOn(CredentialsHelper.prototype, 'authenticate')
				.mockImplementation(
					async (
						_credentials: ICredentialDataDecryptedObject,
						typeName: string,
						requestParams: IHttpRequestOptions,
					): Promise<IHttpRequestOptions> => {
						if (typeName === 'azureStorageSharedKeyApi') {
							return {
								...requestParams,
								headers: {
									authorization:
										'SharedKey Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==',
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
						requestHeaders: {
							authorization:
								'SharedKey Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==',
						},
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

	describe('authenticate', () => {
		const azureStorageSharedKeyApi = new AzureStorageSharedKeyApi();

		it('should remove undefined query parameters and headers', async () => {
			const credentials: ICredentialDataDecryptedObject = {
				account: FAKE_CREDENTIALS_DATA.azureStorageSharedKeyApi.account,
				key: FAKE_CREDENTIALS_DATA.azureStorageSharedKeyApi.key,
			};
			const requestOptions: IHttpRequestOptions = {
				url: `${FAKE_CREDENTIALS_DATA.azureStorageSharedKeyApi.baseUrl}/mycontainer`,
				qs: { restype: 'container', query1: undefined },
				headers: {
					'Content-Length': undefined,
				},
				method: 'GET',
			};

			const result = await azureStorageSharedKeyApi.authenticate(credentials, requestOptions);

			expect(result.qs).toEqual({ restype: 'container' });
			expect(result.headers).not.toHaveProperty('Content-Length');
		});

		it('should default method to GET if not provided', async () => {
			const credentials: ICredentialDataDecryptedObject = {
				account: FAKE_CREDENTIALS_DATA.azureStorageSharedKeyApi.account,
				key: FAKE_CREDENTIALS_DATA.azureStorageSharedKeyApi.key,
			};
			const requestOptions: IHttpRequestOptions = {
				url: `${FAKE_CREDENTIALS_DATA.azureStorageSharedKeyApi.baseUrl}/mycontainer`,
				qs: { restype: 'container' },
				headers: {
					'Content-Length': undefined,
				},
			};

			const result = await azureStorageSharedKeyApi.authenticate(credentials, requestOptions);
			expect(result.method).toBe('GET');
		});

		it('should generate a valid authorization header', async () => {
			const credentials: ICredentialDataDecryptedObject = {
				account: FAKE_CREDENTIALS_DATA.azureStorageSharedKeyApi.account,
				key: FAKE_CREDENTIALS_DATA.azureStorageSharedKeyApi.key,
			};
			const requestOptions: IHttpRequestOptions = {
				url: `${FAKE_CREDENTIALS_DATA.azureStorageSharedKeyApi.baseUrl}/mycontainer/myblob`,
				qs: { param1: 'value1' },
				headers: {
					'x-ms-date': 'Thu, 27 Feb 2025 11:05:49 GMT',
					'x-ms-version': '2021-12-02',
					'x-ms-blob-content-language': 'en-EN',
					'x-ms-blob-content-type': 'image/jpeg',
					'x-ms-expiry-option': 'Absolute',
					'x-ms-blob-type': 'BlockBlob',
					'x-ms-blob-content-disposition': 'attachment; filename="image.jpg"',
					'x-ms-meta-key1': 'value1',
					'x-ms-tags': 'tag1=value1',
				},
				method: 'PUT',
			};
			const result = await azureStorageSharedKeyApi.authenticate(credentials, requestOptions);

			expect(result.headers?.authorization).toBe(
				'SharedKey devstoreaccount1:6sSQ3N4yNFQynBs/iLptIRPS5DQeaFBocW+dyYbAdOI=',
			);
		});
	});
});
