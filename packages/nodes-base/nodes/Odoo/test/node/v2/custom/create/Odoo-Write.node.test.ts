import type { IExecuteFunctions, INodeTypeBaseDescription } from 'n8n-workflow';
import { constructExecutionMetaData, returnJsonArray } from 'n8n-core';

import { OdooV2 } from '../../../../../v2/OdooV2.node';

describe('OdooV2', () => {
	let node: OdooV2;
	let executeFunctions: IExecuteFunctions;

	beforeEach(() => {
		const baseDescription: INodeTypeBaseDescription = {
			displayName: 'Odoo',
			name: 'odoo',
			description: 'Test Odoo Create Node',
			group: [],
		};
		node = new OdooV2(baseDescription);
		executeFunctions = {
			getInputData: jest.fn(),
			getNodeParameter: jest.fn(),
			getNode: jest.fn(() => {
				return {
					type: 'n8n-nodes-base.odoo',
					typeVersion: 2,
				};
			}),
			getCredentials: jest.fn(),
			helpers: {
				httpRequest: jest.fn(),
				constructExecutionMetaData,
				returnJsonArray,
			},
			getContext: jest.fn(),
			sendMessageToUI: jest.fn(),
			continueOnFail: jest.fn(),
			getMode: jest.fn(),
		} as unknown as IExecuteFunctions;
	});

	it('should make a JSONRPC request', async () => {
		(executeFunctions.getInputData as jest.Mock).mockReturnValue([{ json: {} }]);

		(executeFunctions.getCredentials as jest.Mock).mockResolvedValue({
			url: 'http://localhost:8069',
			database: 'test_db',
			username: 'test_user',
			password: 'test_password',
		});
		(executeFunctions.getNodeParameter as jest.Mock).mockImplementation((paramName: string) => {
			switch (paramName) {
				case 'resource':
					return 'custom';
				case 'customResource':
					return 'res.partner';
				case 'customResourceId':
					return '35';
				case 'operation':
					return 'update';
				case 'fieldsToCreateOrUpdate':
					return {
						fields: [{ fieldName: 'name', fieldValue: 'Partner Name' }],
					};
				default:
					return '';
			}
		});

		(executeFunctions.helpers.httpRequest as jest.Mock).mockImplementation((options) => {
			if (options?.body?.params?.method === 'login') {
				return {
					jsonrpc: '2.0',
					id: 1,
					result: 40,
				};
			}
			return {
				jsonrpc: '2.0',
				id: 1,
				result: true,
			};
		});

		const result = await node.execute.call(executeFunctions);

		expect(result).toEqual([[{ json: { id: '35' }, pairedItem: { item: 0 } }]]);
	});
});
