import type { ICredentialDataDecryptedObject, IHttpRequestOptions } from 'n8n-workflow';

import { MicrosoftAzureCosmosDbSharedKeyApi } from '../../../../../credentials/MicrosoftAzureCosmosDbSharedKeyApi.credentials';
import { FAKE_CREDENTIALS_DATA } from '../../../../../test/nodes/FakeCredentialsMap';

describe('Azure Cosmos DB', () => {
	describe('authenticate', () => {
		const azureStorageSharedKeyApi = new MicrosoftAzureCosmosDbSharedKeyApi();

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
			const result = await azureStorageSharedKeyApi.authenticate(credentials, requestOptions);

			expect(result.headers?.authorization).toBe(
				'type%3Dmaster%26ver%3D1.0%26sig%3DRuXkVr%2BEib7sX3QuhtA4BjbqbD%2BtS1G1emPvH7upycg%3D',
			);
		});
	});
});
