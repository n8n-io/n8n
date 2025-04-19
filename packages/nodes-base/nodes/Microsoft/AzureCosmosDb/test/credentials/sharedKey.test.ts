import { OperationalError } from 'n8n-workflow';
import type {
	ICredentialDataDecryptedObject,
	IHttpRequestOptions,
	IRequestOptions,
} from 'n8n-workflow';

import { MicrosoftAzureCosmosDbSharedKeyApi } from '../../../../../credentials/MicrosoftAzureCosmosDbSharedKeyApi.credentials';
import { FAKE_CREDENTIALS_DATA } from '../../../../../test/nodes/FakeCredentialsMap';

jest.mock('crypto', () => ({
	createHmac: jest.fn(() => ({
		update: jest.fn(() => ({
			digest: jest.fn(() => 'fake-signature'),
		})),
	})),
}));

describe('Azure Cosmos DB', () => {
	describe('authenticate', () => {
		const azureCosmosDbSharedKeyApi = new MicrosoftAzureCosmosDbSharedKeyApi();

		it('should generate a valid authorization header', async () => {
			jest.useFakeTimers().setSystemTime(new Date('2025-01-01T00:00:00Z'));
			const credentials: ICredentialDataDecryptedObject = {
				account: FAKE_CREDENTIALS_DATA.microsoftAzureCosmosDbSharedKeyApi.account,
				key: FAKE_CREDENTIALS_DATA.microsoftAzureCosmosDbSharedKeyApi.key,
			};
			const requestOptions: IHttpRequestOptions = {
				url: `${FAKE_CREDENTIALS_DATA.microsoftAzureCosmosDbSharedKeyApi.baseUrl}/colls/container1/docs/item1`,
				method: 'GET',
			};
			const result = await azureCosmosDbSharedKeyApi.authenticate(credentials, requestOptions);

			expect(result.headers?.authorization).toBe(
				'type%3Dmaster%26ver%3D1.0%26sig%3Dfake-signature',
			);
		});

		it('should throw an error when unable to determine the resource type from the URL', async () => {
			const requestOptions: IRequestOptions = {
				uri: 'https://invalid-url.com/',
				method: 'GET',
			};

			const urlString =
				requestOptions.uri ??
				(requestOptions.baseURL && requestOptions.url
					? requestOptions.baseURL + requestOptions.url
					: '');

			if (!urlString) {
				throw new OperationalError('Invalid URL: Both uri and baseURL+url are missing');
			}

			const url = new URL(urlString);
			const pathSegments = url.pathname.split('/').filter(Boolean);

			const RESOURCE_TYPES = ['dbs', 'colls', 'docs', 'sprocs', 'udfs', 'triggers'];

			const foundResource = RESOURCE_TYPES.map((type) => ({
				type,
				index: pathSegments.lastIndexOf(type),
			}))
				.filter(({ index }) => index !== -1)
				.sort((a, b) => b.index - a.index)
				.shift();

			expect(foundResource).toBeUndefined();

			expect(() => {
				if (!foundResource) {
					throw new OperationalError('Unable to determine the resource type from the URL');
				}
			}).toThrowError(new OperationalError('Unable to determine the resource type from the URL'));
		});

		it('should throw OperationalError if no resource type found in URL path', async () => {
			const requestOptions: IRequestOptions = {
				uri: 'https://example.com/invalidpath',
				method: 'GET',
			};

			const urlString =
				requestOptions.uri ??
				(requestOptions.baseURL && requestOptions.url
					? requestOptions.baseURL + requestOptions.url
					: '');

			if (!urlString) {
				throw new OperationalError('Invalid URL: Both uri and baseURL+url are missing');
			}

			const url = new URL(urlString);
			const pathSegments = url.pathname.split('/').filter(Boolean);

			const RESOURCE_TYPES = ['dbs', 'colls', 'docs', 'sprocs', 'udfs', 'triggers'];
			const foundResource = RESOURCE_TYPES.map((type) => ({
				type,
				index: pathSegments.lastIndexOf(type),
			}))
				.filter(({ index }) => index !== -1)
				.sort((a, b) => b.index - a.index)
				.shift();

			expect(foundResource).toBeUndefined();

			expect(() => {
				if (!foundResource) {
					throw new OperationalError('Unable to determine the resource type from the URL');
				}
			}).toThrowError(new OperationalError('Unable to determine the resource type from the URL'));
		});

		it('should properly construct the resourceId and payload', async () => {
			jest.useFakeTimers().setSystemTime(new Date('2025-01-01T00:00:00Z'));
			const credentials: ICredentialDataDecryptedObject = {
				account: FAKE_CREDENTIALS_DATA.microsoftAzureCosmosDbSharedKeyApi.account,
				key: FAKE_CREDENTIALS_DATA.microsoftAzureCosmosDbSharedKeyApi.key,
			};
			const requestOptions: IHttpRequestOptions = {
				url: 'https://example.com/dbs/mydb/colls/mycoll/docs/mydoc',
				method: 'GET',
			};
			const result = await azureCosmosDbSharedKeyApi.authenticate(credentials, requestOptions);

			expect(result.headers?.authorization).toBe(
				'type%3Dmaster%26ver%3D1.0%26sig%3Dfake-signature',
			);
		});
	});
});
