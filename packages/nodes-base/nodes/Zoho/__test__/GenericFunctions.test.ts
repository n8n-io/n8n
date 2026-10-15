import type { IExecuteFunctions, INode } from 'n8n-workflow';
import { mock, mockDeep } from 'vitest-mock-extended';
import type { Mocked } from 'vitest';

import { zohoApiRequest } from '../GenericFunctions';

describe('Zoho > GenericFunctions', () => {
	let mockExecuteFunctions: Mocked<IExecuteFunctions>;
	let mockNode: INode;
	const mockRequestOAuth2 = vi.fn();

	beforeEach(() => {
		mockExecuteFunctions = mockDeep<IExecuteFunctions>();
		mockNode = mock<INode>({
			id: 'test-node',
			name: 'Create a lead',
			type: 'n8n-nodes-base.zohoCrm',
			typeVersion: 1,
			position: [0, 0],
			parameters: {},
		});

		mockExecuteFunctions.getNode.mockReturnValue(mockNode);
		mockExecuteFunctions.getCredentials.mockResolvedValue({
			oauthTokenData: { api_domain: 'https://www.zohoapis.com' },
		});
		mockExecuteFunctions.helpers.requestOAuth2 = mockRequestOAuth2;

		vi.clearAllMocks();
	});

	describe('zohoApiRequest', () => {
		// Reproduces NODE-5538: creating a lead whose email already exists in Zoho.
		// The Zoho CRM API responds HTTP 2xx with a per-record error status, e.g.
		// `{ data: [{ code: 'DUPLICATE_DATA', message: 'duplicate data', status: 'error' }] }`.
		it('should surface the duplicate-data message when the record already exists', async () => {
			mockRequestOAuth2.mockResolvedValue({
				data: [
					{
						code: 'DUPLICATE_DATA',
						details: {
							api_name: 'Email',
							duplicate_record: { module: { api_name: 'Leads', id: '1' }, id: '123456' },
						},
						message: 'duplicate data',
						status: 'error',
					},
				],
			});

			await expect(
				zohoApiRequest.call(mockExecuteFunctions, 'POST', '/leads', {
					Company: 'Acme Corp',
					Last_Name: 'Doe',
					Email: 'duplicate@example.com',
				}),
			).rejects.toThrow('duplicate data');
		});
	});
});
