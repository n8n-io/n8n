import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	isEmpty,
} from 'lodash';

import {
	adjustCustomerFields,
	adjustInvoiceFields,
	loadResource,
	stripeApiRequest,
} from './helpers';

import {
	balanceOperations,
	chargeFields,
	chargeOperations,
	customerFields,
	customerOperations,
	invoiceFields,
	invoiceOperations,
	paymentMethodFields,
	paymentMethodOperations,
	payoutFields,
	payoutOperations,
	priceFields,
	priceOperations,
	productFields,
	productOperations,
	refundFields,
	refundOperations,
	subscriptionFields,
	subscriptionOperations,
} from './descriptions';

export class Stripe implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Stripe',
		name: 'stripe',
		icon: 'file:stripe.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume the Stripe API',
		defaults: {
			name: 'Stripe',
			color: '#6772e5',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'stripeApi',
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
						name: 'Balance',
						value: 'balance',
					},
					{
						name: 'Charge',
						value: 'charge',
					},
					{
						name: 'Customer',
						value: 'customer',
					},
					{
						name: 'Invoice',
						value: 'invoice',
					},
					{
						name: 'PaymentMethod',
						value: 'paymentMethod',
					},
					{
						name: 'Payout',
						value: 'payout',
					},
					{
						name: 'Product',
						value: 'product',
					},
					{
						name: 'Price',
						value: 'price',
					},
					{
						name: 'Refund',
						value: 'refund',
					},
					{
						name: 'Subscription',
						value: 'subscription',
					},
				],
				default: 'balance',
				description: 'Resource to consume',
			},
			...balanceOperations,
			...chargeOperations,
			...chargeFields,
			...customerOperations,
			...customerFields,
			...invoiceOperations,
			...invoiceFields,
			...paymentMethodOperations,
			...paymentMethodFields,
			...payoutOperations,
			...payoutFields,
			...productOperations,
			...productFields,
			...priceOperations,
			...priceFields,
			...refundOperations,
			...refundFields,
			...subscriptionOperations,
			...subscriptionFields,
		],
	};

	methods = {
		loadOptions: {
			async getCustomers(this: ILoadOptionsFunctions) {
				return await loadResource.call(this, 'customer');
			},

			async getInvoices(this: ILoadOptionsFunctions) {
				return await loadResource.call(this, 'invoice');
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		let responseData;
		const returnData: IDataObject[] = [];

		for (let i = 0; i < items.length; i++) {

			if (resource === 'balance') {

				// *********************************************************************
				//                             balance
				// *********************************************************************

				// https://stripe.com/docs/api/balance

				if (operation === 'get') {

					// ----------------------------------
					//       balance: get
					// ----------------------------------

					responseData = await stripeApiRequest.call(this, 'GET', '/balance', {}, {});

				}

			} else if (resource === 'charge') {

				// *********************************************************************
				//                             charge
				// *********************************************************************

				// https://stripe.com/docs/api/charges

				if (operation === 'create') {

					// ----------------------------------
					//       charge: create
					// ----------------------------------

					const body = {
						amount: this.getNodeParameter('amount', i),
						currency: this.getNodeParameter('currency', i),
						customer: this.getNodeParameter('customerId', i),
					} as IDataObject;

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					if (!isEmpty(additionalFields)) {
						Object.assign(body, additionalFields);
					}

					// TODO: adjust and load update fields

					responseData = await stripeApiRequest.call(this, 'POST', '/charges', body, {});

				} else if (operation === 'get') {

					// ----------------------------------
					//        charge: get
					// ----------------------------------

					const chargeId = this.getNodeParameter('chargeId', i);
					responseData = await stripeApiRequest.call(this, 'GET', `/charges/${chargeId}`, {}, {});

				} else if (operation === 'getAll') {

					// ----------------------------------
					//        charge: getAll
					// ----------------------------------

					responseData = await stripeApiRequest.call(this, 'GET', '/charges', {}, {});

					const returnAll = this.getNodeParameter('returnAll', 0) as boolean;

					if (!returnAll) {
						const limit = this.getNodeParameter('limit', 0) as number;
						responseData = responseData.slice(0, limit);
					}

				} else if (operation === 'update') {

					// ----------------------------------
					//        charge: update
					// ----------------------------------

					const body = {} as IDataObject;

					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

					if (isEmpty(updateFields)) {
						throw new Error(`Please enter at least one field to update for the ${resource}.`);
					}

					// TODO: adjust and load update fields

					const chargeId = this.getNodeParameter('chargeId', i);
					responseData = await stripeApiRequest.call(this, 'POST', `/charges/${chargeId}`, body, {});

				}

			} else if (resource === 'customer') {

				// *********************************************************************
				//                             customer
				// *********************************************************************

				// https://stripe.com/docs/api/customers

				if (operation === 'create') {

					// ----------------------------------
					//       customer: create
					// ----------------------------------

					const body = {
						name: this.getNodeParameter('name', i),
					} as IDataObject;

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					if (!isEmpty(additionalFields)) {
						Object.assign(body, adjustCustomerFields(additionalFields));
					}

					responseData = await stripeApiRequest.call(this, 'POST', '/customers', body, {});

				} else if (operation === 'delete') {

					// ----------------------------------
					//        customer: delete
					// ----------------------------------

					const customerId = this.getNodeParameter('customerId', i);
					responseData = await stripeApiRequest.call(this, 'DELETE', `/customers/${customerId}`, {}, {});

				} else if (operation === 'get') {

					// ----------------------------------
					//        customer: get
					// ----------------------------------

					const customerId = this.getNodeParameter('customerId', i);
					responseData = await stripeApiRequest.call(this, 'GET', `/customers/${customerId}`, {}, {});

				} else if (operation === 'getAll') {

					// ----------------------------------
					//        customer: getAll
					// ----------------------------------

					const qs = {} as IDataObject;
					const filters = this.getNodeParameter('filters', i) as IDataObject;

					if (!isEmpty(filters)) {
						qs.email = filters.email;
					}

					responseData = await stripeApiRequest.call(this, 'GET', '/customers', qs, {});
					responseData = responseData.data;

					const returnAll = this.getNodeParameter('returnAll', 0) as boolean;

					if (!returnAll) {
						const limit = this.getNodeParameter('limit', 0) as number;
						responseData = responseData.slice(0, limit);
					}

				} else if (operation === 'update') {

					// ----------------------------------
					//        customer: update
					// ----------------------------------

					const body = {} as IDataObject;

					const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

					if (isEmpty(updateFields)) {
						throw new Error(`Please enter at least one field to update for the ${resource}.`);
					}

					Object.assign(body, adjustCustomerFields(updateFields));

					const customerId = this.getNodeParameter('customerId', i);
					responseData = await stripeApiRequest.call(this, 'POST', `/customers/${customerId}`, body, {});

				}

			} else if (resource === 'invoice') {

				// *********************************************************************
				//                           invoice
				// *********************************************************************

				// https://stripe.com/docs/api/invoices

				if (operation === 'create') {

					// ----------------------------------
					//       invoice: create
					// ----------------------------------

					const body = {
						customer: this.getNodeParameter('customerId', i),
					} as IDataObject;

					const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

					if (!isEmpty(additionalFields)) {
						Object.assign(body, adjustInvoiceFields(additionalFields));
					}

					responseData = await stripeApiRequest.call(this, 'POST', `/invoices`, body, {});

				} else if (operation === 'delete') {

					// ----------------------------------
					//        invoice: delete
					// ----------------------------------

					const invoiceId = this.getNodeParameter('invoiceId', i);
					responseData = await stripeApiRequest.call(this, 'DELETE', `/invoices/${invoiceId}`, {}, {});

				} else if (operation === 'get') {

					// ----------------------------------
					//        invoice: get
					// ----------------------------------

					const invoiceId = this.getNodeParameter('invoiceId', i);
					responseData = await stripeApiRequest.call(this, 'GET', `/invoices/${invoiceId}`, {}, {});

				} else if (operation === 'getAll') {

					// ----------------------------------
					//        invoice: getAll
					// ----------------------------------

					responseData = await stripeApiRequest.call(this, 'GET', '/invoices', {}, {});

				} else if (operation === 'pay') {

					// ----------------------------------
					//        invoice: pay
					// ----------------------------------

					const invoiceId = this.getNodeParameter('invoiceId', i);
					responseData = await stripeApiRequest.call(this, 'POST', `/invoices/${invoiceId}/pay`, {}, {});

				} else if (operation === 'send') {

					// ----------------------------------
					//        invoice: send
					// ----------------------------------

					const invoiceId = this.getNodeParameter('invoiceId', i);
					responseData = await stripeApiRequest.call(this, 'POST', `/invoices/${invoiceId}/send`, {}, {});

				} else if (operation === 'update') {

					// ----------------------------------
					//        invoice: update
					// ----------------------------------

					const invoiceId = this.getNodeParameter('invoiceId', i);
					responseData = await stripeApiRequest.call(this, 'POST', `/invoices/${invoiceId}`, {}, {});

				} else if (operation === 'void') {

					// ----------------------------------
					//        invoice: void
					// ----------------------------------

					const invoiceId = this.getNodeParameter('invoiceId', i);
					responseData = await stripeApiRequest.call(this, 'POST', `/invoices/${invoiceId}/void`, {}, {});

				}

			} else if (resource === 'paymentMethod') {

				// *********************************************************************
				//                           paymentMethod
				// *********************************************************************

				// https://stripe.com/docs/api/paymentMethod

				if (operation === 'create') {

					// ----------------------------------
					//       paymentMethod: create
					// ----------------------------------

					const endpoint = '';
					responseData = await stripeApiRequest.call(this, 'POST', endpoint, {}, {});

				} else if (operation === 'delete') {

					// ----------------------------------
					//        paymentMethod: delete
					// ----------------------------------

					const endpoint = '';
					responseData = await stripeApiRequest.call(this, 'DELETE', endpoint, {}, {});

				} else if (operation === 'get') {

					// ----------------------------------
					//        paymentMethod: get
					// ----------------------------------

					const endpoint = '';
					responseData = await stripeApiRequest.call(this, 'GET', endpoint, {}, {});

				} else if (operation === 'getAll') {

					// ----------------------------------
					//        paymentMethod: getAll
					// ----------------------------------

					const endpoint = '';
					responseData = await stripeApiRequest.call(this, 'GET', endpoint, {}, {});

				} else if (operation === 'update') {

					// ----------------------------------
					//        paymentMethod: update
					// ----------------------------------

					const endpoint = '';
					responseData = await stripeApiRequest.call(this, 'POST', endpoint, {}, {});

				}

			} else if (resource === 'payout') {

				// *********************************************************************
				//                             payout
				// *********************************************************************

				// https://stripe.com/docs/api/payout

				if (operation === 'create') {

					// ----------------------------------
					//       payout: create
					// ----------------------------------

					const endpoint = '';
					responseData = await stripeApiRequest.call(this, 'POST', endpoint, {}, {});

				} else if (operation === 'delete') {

					// ----------------------------------
					//        payout: delete
					// ----------------------------------

					const endpoint = '';
					responseData = await stripeApiRequest.call(this, 'DELETE', endpoint, {}, {});

				} else if (operation === 'get') {

					// ----------------------------------
					//        payout: get
					// ----------------------------------

					const endpoint = '';
					responseData = await stripeApiRequest.call(this, 'GET', endpoint, {}, {});

				} else if (operation === 'getAll') {

					// ----------------------------------
					//        payout: getAll
					// ----------------------------------

					const endpoint = '';
					responseData = await stripeApiRequest.call(this, 'GET', endpoint, {}, {});

				} else if (operation === 'update') {

					// ----------------------------------
					//        payout: update
					// ----------------------------------

					const endpoint = '';
					responseData = await stripeApiRequest.call(this, 'POST', endpoint, {}, {});

				}

			} else if (resource === 'product') {

				// *********************************************************************
				//                             product
				// *********************************************************************

				// https://stripe.com/docs/api/product

				if (operation === 'create') {

					// ----------------------------------
					//       product: create
					// ----------------------------------

					const endpoint = '';
					responseData = await stripeApiRequest.call(this, 'POST', endpoint, {}, {});

				} else if (operation === 'delete') {

					// ----------------------------------
					//        product: delete
					// ----------------------------------

					const endpoint = '';
					responseData = await stripeApiRequest.call(this, 'DELETE', endpoint, {}, {});

				} else if (operation === 'get') {

					// ----------------------------------
					//        product: get
					// ----------------------------------

					const endpoint = '';
					responseData = await stripeApiRequest.call(this, 'GET', endpoint, {}, {});

				} else if (operation === 'getAll') {

					// ----------------------------------
					//        product: getAll
					// ----------------------------------

					const endpoint = '';
					responseData = await stripeApiRequest.call(this, 'GET', endpoint, {}, {});

				} else if (operation === 'update') {

					// ----------------------------------
					//        product: update
					// ----------------------------------

					const endpoint = '';
					responseData = await stripeApiRequest.call(this, 'POST', endpoint, {}, {});

				}

			} else if (resource === 'price') {

				// *********************************************************************
				//                             price
				// *********************************************************************

				// https://stripe.com/docs/api/price

				if (operation === 'create') {

					// ----------------------------------
					//       price: create
					// ----------------------------------

					const endpoint = '';
					responseData = await stripeApiRequest.call(this, 'POST', endpoint, {}, {});

				} else if (operation === 'delete') {

					// ----------------------------------
					//        price: delete
					// ----------------------------------

					const endpoint = '';
					responseData = await stripeApiRequest.call(this, 'DELETE', endpoint, {}, {});

				} else if (operation === 'get') {

					// ----------------------------------
					//        price: get
					// ----------------------------------

					const endpoint = '';
					responseData = await stripeApiRequest.call(this, 'GET', endpoint, {}, {});

				} else if (operation === 'getAll') {

					// ----------------------------------
					//        price: getAll
					// ----------------------------------

					const endpoint = '';
					responseData = await stripeApiRequest.call(this, 'GET', endpoint, {}, {});

				} else if (operation === 'update') {

					// ----------------------------------
					//        price: update
					// ----------------------------------

					const endpoint = '';
					responseData = await stripeApiRequest.call(this, 'POST', endpoint, {}, {});

				}

			} else if (resource === 'refund') {

				// *********************************************************************
				//                             refund
				// *********************************************************************

				// https://stripe.com/docs/api/refund

				if (operation === 'create') {

					// ----------------------------------
					//       refund: create
					// ----------------------------------

					const endpoint = '';
					responseData = await stripeApiRequest.call(this, 'POST', endpoint, {}, {});

				} else if (operation === 'delete') {

					// ----------------------------------
					//        refund: delete
					// ----------------------------------

					const endpoint = '';
					responseData = await stripeApiRequest.call(this, 'DELETE', endpoint, {}, {});

				} else if (operation === 'get') {

					// ----------------------------------
					//        refund: get
					// ----------------------------------

					const endpoint = '';
					responseData = await stripeApiRequest.call(this, 'GET', endpoint, {}, {});

				} else if (operation === 'getAll') {

					// ----------------------------------
					//        refund: getAll
					// ----------------------------------

					const endpoint = '';
					responseData = await stripeApiRequest.call(this, 'GET', endpoint, {}, {});

				} else if (operation === 'update') {

					// ----------------------------------
					//        refund: update
					// ----------------------------------

					const endpoint = '';
					responseData = await stripeApiRequest.call(this, 'POST', endpoint, {}, {});

				}

			} else if (resource === 'subscription') {

				// *********************************************************************
				//                             subscription
				// *********************************************************************

				// https://stripe.com/docs/api/subscription

				if (operation === 'create') {

					// ----------------------------------
					//       subscription: create
					// ----------------------------------

					const endpoint = '';
					responseData = await stripeApiRequest.call(this, 'POST', endpoint, {}, {});

				} else if (operation === 'delete') {

					// ----------------------------------
					//        subscription: delete
					// ----------------------------------

					const endpoint = '';
					responseData = await stripeApiRequest.call(this, 'DELETE', endpoint, {}, {});

				} else if (operation === 'get') {

					// ----------------------------------
					//        subscription: get
					// ----------------------------------

					const endpoint = '';
					responseData = await stripeApiRequest.call(this, 'GEt', endpoint, {}, {});

				} else if (operation === 'getAll') {

					// ----------------------------------
					//        subscription: getAll
					// ----------------------------------

					const endpoint = '';
					responseData = await stripeApiRequest.call(this, 'GET', endpoint, {}, {});

				} else if (operation === 'update') {

					// ----------------------------------
					//        subscription: update
					// ----------------------------------

					const endpoint = '';
					responseData = await stripeApiRequest.call(this, 'POST', endpoint, {}, {});

				}

			}

			Array.isArray(responseData)
				? returnData.push(...responseData)
				: returnData.push(responseData);
		}

		return [this.helpers.returnJsonArray(returnData)];

	}
}
