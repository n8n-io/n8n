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
	estimateFields,
	estimateOperations,
} from './EstimateDescription';

import {
	handleListing,
	quickBooksApiRequest,
} from './GenericFunctions';

import {
	identity,
	isEmpty,
	pickBy,
} from 'lodash';

import {
	CustomerBillingAddress,
} from './CustomerAdditionalFields';

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
			color: '#2CA01C',
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
					{
						name: 'Estimate',
						value: 'estimate',
					},
				],
				default: 'customer',
				description: 'Resource to consume',
			},

			// customer
			...customerOperations,
			...customerFields,

			// estimate
			...estimateOperations,
			...estimateFields,
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		let responseData;
		const returnData: IDataObject[] = [];

		const { companyId } = this.getCredentials('quickBooksOAuth2Api') as IDataObject;

		for (let i = 0; i < items.length; i++) {

			if (resource === 'customer') {

				if (operation === 'create') {

					const endpoint = `/v3/company/${companyId}/customer`;

					const body = {
						DisplayName: this.getNodeParameter('displayName', i),
					} as IDataObject;

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					Object.keys(additionalFields).forEach(key => body[key] = additionalFields[key]);

					responseData = await quickBooksApiRequest.call(this, 'POST', endpoint, {}, body);

				} else if (operation === 'get') {

					const customerId = this.getNodeParameter('customerId', i);
					const endpoint = `/v3/company/${companyId}/customer/${customerId}`;
					responseData = await quickBooksApiRequest.call(this, 'GET', endpoint, {}, {});

				} else if (operation === 'getAll') {

					const endpoint = `/v3/company/${companyId}/query`;
					responseData = await handleListing.call(this, i, endpoint, resource);

				} else if (operation === 'update') {

					const customerId = this.getNodeParameter('customerId', i);
					const getEndpoint = `/v3/company/${companyId}/customer/${customerId}`;
					const { Customer: { SyncToken } } = await quickBooksApiRequest.call(this, 'GET', getEndpoint, {}, {});

					const updateEndpoint = `/v3/company/${companyId}/customer`;
					const body = {
						Id: this.getNodeParameter('customerId', i),
						SyncToken,
						sparse: true,
					} as IDataObject;

					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

					if (isEmpty(updateFields)) {
						throw new Error('Please enter at least one field to update for the customer.');
					}

					Object.entries(updateFields).forEach(([key, value]) => {
						if (key === 'PrimaryEmailAddr') {
							body.PrimaryEmailAddr = { Address: value };
						} else if (key === 'billingAddress') {
							const { details } = updateFields[key] as CustomerBillingAddress;
							body.BillAddr = pickBy(details[0], v => v !== '');
						} else {
							body[key] = value;
						}
					});

					responseData = await quickBooksApiRequest.call(this, 'POST', updateEndpoint, {}, body);

				}

			} else if (resource === 'estimate') {

				if (operation === 'get') {

					const estimateId = this.getNodeParameter('estimateId', i);
					const endpoint = `/v3/company/${companyId}/estimate/${estimateId}`;
					responseData = await quickBooksApiRequest.call(this, 'GET', endpoint, {}, {});

				} else if (operation === 'getAll') {

					const endpoint = `/v3/company/${companyId}/query`;
					responseData = await handleListing.call(this, i, endpoint, resource);

				}

			}

			Array.isArray(responseData)
				? returnData.push(...responseData)
				: returnData.push(responseData);
			}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
