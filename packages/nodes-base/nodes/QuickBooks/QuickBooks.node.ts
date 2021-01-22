import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
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
	quickBooksApiRequestAllItems,
} from './GenericFunctions';

import {
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
			...customerOperations,
			...customerFields,
			...estimateOperations,
			...estimateFields,
		],
	};

	methods = {
		loadOptions: {
			async getCustomers(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const resource = 'customer';
				const returnData: INodePropertyOptions[] = [];

				const qs = {
					query: `SELECT * FROM ${resource}`,
				} as IDataObject;

				const { companyId } = this.getCredentials('quickBooksOAuth2Api') as IDataObject;
				const endpoint = `/v3/company/${companyId}/query`;

				const customers = await quickBooksApiRequestAllItems.call(this, 'GET', endpoint, qs, {}, resource);

				customers.forEach((customer: any) => { // tslint:disable-line:no-any
					returnData.push({
						name: customer.DisplayName as string,
						value: customer.DisplayName as string,
					});
				});

				return returnData;
			},
		},
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

				// ----------------------------------
				//         customer: create
				// ----------------------------------

				if (operation === 'create') {

					const endpoint = `/v3/company/${companyId}/customer`;

					const body = {
						DisplayName: this.getNodeParameter('displayName', i),
					} as IDataObject;

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
					Object.keys(additionalFields).forEach(key => body[key] = additionalFields[key]);

					responseData = await quickBooksApiRequest.call(this, 'POST', endpoint, {}, body);

				// ----------------------------------
				//         customer: get
				// ----------------------------------

				} else if (operation === 'get') {

					const customerId = this.getNodeParameter('customerId', i);
					const endpoint = `/v3/company/${companyId}/customer/${customerId}`;
					responseData = await quickBooksApiRequest.call(this, 'GET', endpoint, {}, {});

				// ----------------------------------
				//         customer: getAll
				// ----------------------------------

				} else if (operation === 'getAll') {

					const endpoint = `/v3/company/${companyId}/query`;
					responseData = await handleListing.call(this, i, endpoint, resource);

				// ----------------------------------
				//         customer: update
				// ----------------------------------

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
						} else if (key === 'BillingAddress') {
							const { details } = value as CustomerBillingAddress;
							body.BillAddr = pickBy(details, d => d !== '');
						} else {
							body[key] = value;
						}
					});

					responseData = await quickBooksApiRequest.call(this, 'POST', updateEndpoint, {}, body);

				}

			} else if (resource === 'estimate') {

				// ----------------------------------
				//         estimate: create
				// ----------------------------------

				if (operation === 'create') {

					// ...

				// ----------------------------------
				//         estimate: get
				// ----------------------------------

				} else if (operation === 'get') {

					const estimateId = this.getNodeParameter('estimateId', i);
					const endpoint = `/v3/company/${companyId}/estimate/${estimateId}`;
					responseData = await quickBooksApiRequest.call(this, 'GET', endpoint, {}, {});

				// ----------------------------------
				//         estimate: getAll
				// ----------------------------------

				} else if (operation === 'getAll') {

					const endpoint = `/v3/company/${companyId}/query`;
					responseData = await handleListing.call(this, i, endpoint, resource);

				// ----------------------------------
				//         estimate: getPdf
				// ----------------------------------

				} else if (operation === 'getPdf') {

				const estimateId = this.getNodeParameter('estimateId', i);
				const endpoint = `/v3/company/${companyId}/estimate/${estimateId}/pdf`;
				responseData = await quickBooksApiRequest.call(this, 'GET', endpoint, {}, {});

				// ----------------------------------
				//         estimate: update
				// ----------------------------------

				} else if (operation === 'update') {

					// ...

				}

			}

			Array.isArray(responseData)
				? returnData.push(...responseData)
				: returnData.push(responseData);
			}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
