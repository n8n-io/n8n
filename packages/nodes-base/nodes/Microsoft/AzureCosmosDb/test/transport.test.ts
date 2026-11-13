import { mock } from 'vitest-mock-extended';
import type { IExecuteSingleFunctions } from 'n8n-workflow';
import { requestPath } from 'n8n-workflow';

import { credentials } from './credentials';
import { azureCosmosDbApiRequest } from '../transport';

describe('azureCosmosDbApiRequest', () => {
	it('should encode a path value that contains a slash', async () => {
		const httpRequestWithAuthentication = vi.fn().mockResolvedValue({});
		const context = mock<IExecuteSingleFunctions>({
			helpers: mock<IExecuteSingleFunctions['helpers']>({ httpRequestWithAuthentication }),
		});
		context.getCredentials.mockResolvedValue(credentials.microsoftAzureCosmosDbSharedKeyApi);

		await azureCosmosDbApiRequest.call(context, 'GET', requestPath`/colls/${'container1/users'}`);

		expect(String(httpRequestWithAuthentication.mock.calls[0][1].url)).toBe(
			'https://n8n-us-east-account.documents.azure.com/dbs/database_1/colls/container1%2Fusers',
		);
	});
});
