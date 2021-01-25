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
	billFields,
	billOperations,
} from './descriptions/Bill/BillDescription';

import {
	customerFields,
	customerOperations,
} from './descriptions/Customer/CustomerDescription';

import {
	estimateFields,
	estimateOperations,
} from './descriptions/Estimate/EstimateDescription';

import {
	invoiceFields,
	invoiceOperations,
} from './descriptions/Invoice/InvoiceDescription';

import {
	paymentFields,
	paymentOperations,
} from './descriptions/Payment/PaymentDescription';


import {
	getSyncToken,
	handleBinaryData,
	handleListing,
	quickBooksApiRequest,
	quickBooksApiRequestAllItems,
} from './GenericFunctions';

import {
	isEmpty,
	pickBy,
} from 'lodash';

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
						name: 'Bill',
						value: 'bill',
					},
					{
						name: 'Customer',
						value: 'customer',
					},
					{
						name: 'Estimate',
						value: 'estimate',
					},
					{
						name: 'Invoice',
						value: 'invoice',
					},
					{
						name: 'Payment',
						value: 'payment',
					},
				],
				default: 'customer',
				description: 'Resource to consume',
			},
			...billOperations,
			...billFields,
			...customerOperations,
			...customerFields,
			...estimateOperations,
			...estimateFields,
			...invoiceOperations,
			...invoiceFields,
			...paymentOperations,
			...paymentFields,
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

				const { companyId } = this.getCredentials('quickBooksOAuth2Api') as { companyId: string };
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
		let items = this.getInputData();

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		let responseData;
		const returnData: IDataObject[] = [];

		const { companyId } = this.getCredentials('quickBooksOAuth2Api') as { companyId: string };

		for (let i = 0; i < items.length; i++) {

			if (resource === 'bill')	{

				// ----------------------------------
				//         bill: create
				// ----------------------------------

				if (operation === 'create') {

					// ...

				// ----------------------------------
				//         bill: get
				// ----------------------------------

				} else if (operation === 'get') {

					const billId = this.getNodeParameter('billId', i);
					const endpoint = `/v3/company/${companyId}/${resource}/${billId}`;
					responseData = await quickBooksApiRequest.call(this, 'GET', endpoint, {}, {});

				// ----------------------------------
				//         bill: getAll
				// ----------------------------------

				} else if (operation === 'getAll') {

					const endpoint = `/v3/company/${companyId}/query`;
					responseData = await handleListing.call(this, i, endpoint, resource);

				// ----------------------------------
				//         bill: update
				// ----------------------------------

				} else if (operation === 'update') {

					// ...

				}

			} else if (resource === 'customer') {

				// ----------------------------------
				//         customer: create
				// ----------------------------------

				if (operation === 'create') {

					const endpoint = `/v3/company/${companyId}/${resource}`;

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
					const endpoint = `/v3/company/${companyId}/${resource}/${customerId}`;
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

					const endpoint = `/v3/company/${companyId}/${resource}`;
					const body = {
						Id: this.getNodeParameter('customerId', i),
						SyncToken: await getSyncToken.call(this, i, companyId, resource),
						sparse: true,
					} as IDataObject;

					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

					if (isEmpty(updateFields)) {
						throw new Error('Please enter at least one field to update for the customer.');
					}

					// TODO

					// Object.entries(updateFields).forEach(([key, value]) => {
					// 	if (key === 'PrimaryEmailAddr') {
					// 		body.PrimaryEmailAddr = { Address: value };
					// 	} else if (key === 'BillingAddress') {
					// 		const { details } = value as CustomerBillingAddress;
					// 		body.BillAddr = pickBy(details, d => d !== '');
					// 	} else {
					// 		body[key] = value;
					// 	}
					// });

					responseData = await quickBooksApiRequest.call(this, 'POST', endpoint, {}, body);

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

					const estimateId = this.getNodeParameter('estimateId', i) as string;
					const download = this.getNodeParameter('download', i) as boolean;

					if (download) {

						items = await handleBinaryData.call(this, items, i, companyId, resource, estimateId);
						return this.prepareOutputData(items);

					} else {

						const endpoint = `/v3/company/${companyId}/${resource}/${estimateId}`;
						responseData = await quickBooksApiRequest.call(this, 'GET', endpoint, {}, {});

					}

				// ----------------------------------
				//         estimate: getAll
				// ----------------------------------

				} else if (operation === 'getAll') {

					const endpoint = `/v3/company/${companyId}/query`;
					responseData = await handleListing.call(this, i, endpoint, resource);

				// ----------------------------------
				//         estimate: update
				// ----------------------------------

				} else if (operation === 'update') {

					// ...

				}

			} else if (resource === 'invoice') {

				// ----------------------------------
				//         invoice: create
				// ----------------------------------

				if (operation === 'create') {

					// ...

				// ----------------------------------
				//         invoice: delete
				// ----------------------------------

				} else if (operation === 'delete') {

					const qs = {
						operation: 'delete',
					} as IDataObject;

					const body = {
						Id: this.getNodeParameter('invoiceId', i),
						SyncToken: await getSyncToken.call(this, i, companyId, resource),
					} as IDataObject;

					const endpoint = `/v3/company/${companyId}/${resource}`;
					responseData = await quickBooksApiRequest.call(this, 'POST', endpoint, qs, body);

				// ----------------------------------
				//         invoice: get
				// ----------------------------------

				} else if (operation === 'get') {

					const invoiceId = this.getNodeParameter('invoiceId', i) as string;
					const download = this.getNodeParameter('download', i) as boolean;

					if (download) {

						items = await handleBinaryData.call(this, items, i, companyId, resource, invoiceId);
						return this.prepareOutputData(items);

					} else {

						const endpoint = `/v3/company/${companyId}/${resource}/${invoiceId}`;
						responseData = await quickBooksApiRequest.call(this, 'GET', endpoint, {}, {});

					}

				// ----------------------------------
				//         invoice: getAll
				// ----------------------------------

				} else if (operation === 'getAll') {

					const endpoint = `/v3/company/${companyId}/query`;
					responseData = await handleListing.call(this, i, endpoint, resource);

				// ----------------------------------
				//         invoice: send
				// ----------------------------------

				} else if (operation === 'send') {

					const invoiceId = this.getNodeParameter('invoiceId', i) as string;

					const qs = {
						sendTo: this.getNodeParameter('email', i) as string,
					} as IDataObject;

					const endpoint = `/v3/company/${companyId}/invoice/${invoiceId}/send`;
					responseData = await quickBooksApiRequest.call(this, 'POST', endpoint, qs, {});

				// ----------------------------------
				//         invoice: update
				// ----------------------------------

				} else if (operation === 'update') {

					// ...

				// ----------------------------------
				//         invoice: void
				// ----------------------------------

				} else if (operation === 'void') {

					const qs = {
						Id: this.getNodeParameter('invoiceId', i),
						SyncToken: await getSyncToken.call(this, i, companyId, resource),
						operation: 'void',
					} as IDataObject;

					const endpoint = `/v3/company/${companyId}/invoice`;
					responseData = await quickBooksApiRequest.call(this, 'POST', endpoint, qs, {});

				}

			} else if (resource === 'payment') {

				// ----------------------------------
				//         payment: create
				// ----------------------------------

				if (operation === 'create') {

					// ...

				// ----------------------------------
				//         payment: delete
				// ----------------------------------

				} else if (operation === 'delete') {

					const qs = {
						operation: 'delete',
					} as IDataObject;

					const body = {
						Id: this.getNodeParameter('paymentId', i),
						SyncToken: await getSyncToken.call(this, i, companyId, resource),
					} as IDataObject;

					const endpoint = `/v3/company/${companyId}/${resource}`;
					responseData = await quickBooksApiRequest.call(this, 'POST', endpoint, qs, body);

				// ----------------------------------
				//         payment: get
				// ----------------------------------

				} else if (operation === 'get') {

					const paymentId = this.getNodeParameter('paymentId', i) as string;
					const download = this.getNodeParameter('download', i) as boolean;

					if (download) {

						items = await handleBinaryData.call(this, items, i, companyId, resource, paymentId);
						return this.prepareOutputData(items);

					} else {

						const endpoint = `/v3/company/${companyId}/${resource}/${paymentId}`;
						responseData = await quickBooksApiRequest.call(this, 'GET', endpoint, {}, {});

					}

				// ----------------------------------
				//         payment: getAll
				// ----------------------------------

				} else if (operation === 'getAll') {

					const endpoint = `/v3/company/${companyId}/query`;
					responseData = await handleListing.call(this, i, endpoint, resource);

				// ----------------------------------
				//         payment: send
				// ----------------------------------

				} else if (operation === 'send') {

					const paymentId = this.getNodeParameter('paymentId', i) as string;

					const qs = {
						sendTo: this.getNodeParameter('email', i) as string,
					} as IDataObject;

					const endpoint = `/v3/company/${companyId}/invoice/${paymentId}/send`;
					responseData = await quickBooksApiRequest.call(this, 'POST', endpoint, qs, {});

				// ----------------------------------
				//         payment: update
				// ----------------------------------

				} else if (operation === 'update') {

					// ...

				// ----------------------------------
				//         payment: void
				// ----------------------------------

				} else if (operation === 'void') {

					const qs = {
						Id: this.getNodeParameter('paymentId', i),
						SyncToken: await getSyncToken.call(this, i, companyId, resource),
						operation: 'void',
					} as IDataObject;

					const endpoint = `/v3/company/${companyId}/invoice`;
					responseData = await quickBooksApiRequest.call(this, 'POST', endpoint, qs, {});

				}

			}

			Array.isArray(responseData)
				? returnData.push(...responseData)
				: returnData.push(responseData);

			}

		return [this.helpers.returnJsonArray(returnData)];

	}
}
