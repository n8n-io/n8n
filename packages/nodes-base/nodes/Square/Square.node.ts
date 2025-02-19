import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { NodeConnectionType } from 'n8n-workflow';

export class Square implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Square',
		name: 'square',
		icon: 'file:square.svg',
		group: ['transform'],
		version: 1,
		description: 'Consume Square API',
		defaults: {
			name: 'Square',
		},
		usableAsTool: true,
		inputs: [{ type: NodeConnectionType.Main }],
		outputs: [{ type: NodeConnectionType.Main }],
		credentials: [
			{
				name: 'squareApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL:
				'={{$credentials?.environment === "sandbox" ? "https://connect.squareupsandbox.com/v2" : "https://connect.squareup.com/v2"}}',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Create Customer',
						value: 'createCustomer',
						description: 'Create a customer profile.',
						action: 'Create a customer',
					},
					{
						name: 'List Customers',
						value: 'listCustomers',
						description: 'List customer profiles.',
						action: 'List customers',
					},
					{
						name: 'Get Customer',
						value: 'getCustomer',
						description: 'Retrieve a specific customer.',
						action: 'Get customer',
					},
					{
						name: 'Update Customer',
						value: 'updateCustomer',
						description: 'Update a customer.',
						action: 'Update customer',
					},
					{
						name: 'Delete Customer',
						value: 'deleteCustomer',
						description: 'Delete a customer.',
						action: 'Delete customer',
					},
					{
						name: 'Search Customers',
						value: 'searchCustomers',
						description: 'Search for customers with advanced queries.',
						action: 'Search customers',
					},
				],
				default: 'createCustomer',
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const operation = this.getNodeParameter('operation', 0) as string;

		// Basic implementation
		try {
			if (operation === 'createCustomer') {
				// Implementation for creating customer
				// This is a placeholder - actual implementation would make API calls to Square
			}
		} catch (error) {
			if (error.response) {
				throw new Error(`Square error response: ${error.response.data.message}`);
			}
			throw error;
		}

		return [returnData];
	}
}
