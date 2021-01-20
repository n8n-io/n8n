import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	customerFields,
	customerOperations,
} from './CustomerDescription';

import {
	quickBooksApiRequest,
} from './GenericFunctions';

export class QuickBooks implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'QuickBooks',
		name: 'quickbooks',
		icon: 'file:quickbooks.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume the QuickBooks API',
		defaults: {
			name: 'QuickBooks',
			color: '#ff5700',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'quickBooksOAuth2Api',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				options: [
					{
						name: 'Customer',
						value: 'customer',
					},
				],
				default: 'customer',
				description: 'Resource to consume',
			},

			// customer
			...customerOperations,
			...customerFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		let responseData;
		const returnData: IDataObject[] = [];

		for (let i = 0; i < items.length; i++) {

		if (resource === 'customer') {

			if (operation === 'get') {

				const { companyId } = this.getCredentials('quickBooksOAuth2Api') as IDataObject;
				const customerId = this.getNodeParameter('customerId', i);
				const endpoint = `/v3/company/${companyId}/customer/${customerId}`;
				responseData = await quickBooksApiRequest.call(this, 'GET', endpoint, {}, {});

			} else if (operation === 'search') {

				const qs = {
					query: this.getNodeParameter('selectStatement', i),
				};
				const { companyId } = this.getCredentials('quickBooksOAuth2Api') as IDataObject;
				const endpoint = `/v3/company/${companyId}/query`;
				responseData = await quickBooksApiRequest.call(this, 'GET', endpoint, qs, {});
				responseData = responseData.QueryResponse;

			}

		}

		Array.isArray(responseData)
			? returnData.push(...responseData)
			: returnData.push(responseData);
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
