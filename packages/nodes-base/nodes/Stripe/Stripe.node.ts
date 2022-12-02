import { IExecuteFunctions } from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
	NodeOperationError,
} from 'n8n-workflow';

import { isEmpty } from 'lodash';

import {
	adjustChargeFields,
	adjustCustomerFields,
	adjustMetadata,
	handleListing,
	loadResource,
	stripeApiRequest,
} from './helpers';

import {
	balanceOperations,
	chargeFields,
	chargeOperations,
	couponFields,
	couponOperations,
	customerCardFields,
	customerCardOperations,
	customerFields,
	customerOperations,
	sourceFields,
	sourceOperations,
	tokenFields,
	tokenOperations,
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
				noDataExpression: true,
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
						name: 'Coupon',
						value: 'coupon',
					},
					{
						name: 'Customer',
						value: 'customer',
					},
					{
						name: 'Customer Card',
						value: 'customerCard',
					},
					{
						name: 'Source',
						value: 'source',
					},
					{
						name: 'Token',
						value: 'token',
					},
				],
				default: 'balance',
			},
			...balanceOperations,
			...customerCardOperations,
			...customerCardFields,
			...chargeOperations,
			...chargeFields,
			...couponOperations,
			...couponFields,
			...customerOperations,
			...customerFields,
			...sourceOperations,
			...sourceFields,
			...tokenOperations,
			...tokenFields,
		],
	};

	methods = {
		loadOptions: {
			async getCustomers(this: ILoadOptionsFunctions) {
				return await loadResource.call(this, 'customer');
			},
			async getCurrencies(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const { data } = await stripeApiRequest.call(this, 'GET', '/country_specs', {});
				for (const currency of data[0].supported_payment_currencies) {
					returnData.push({
						name: currency.toUpperCase(),
						value: currency,
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		let responseData;
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
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
				} else if (resource === 'customerCard') {
					// *********************************************************************
					//                           customer card
					// *********************************************************************

					// https://stripe.com/docs/api/cards

					if (operation === 'add') {
						// ----------------------------------
						//         customerCard: add
						// ----------------------------------

						const body = {
							source: this.getNodeParameter('token', i),
						} as IDataObject;

						const customerId = this.getNodeParameter('customerId', i);
						const endpoint = `/customers/${customerId}/sources`;
						responseData = await stripeApiRequest.call(this, 'POST', endpoint, body, {});
					} else if (operation === 'remove') {
						// ----------------------------------
						//       customerCard: remove
						// ----------------------------------

						const customerId = this.getNodeParameter('customerId', i);
						const cardId = this.getNodeParameter('cardId', i);
						const endpoint = `/customers/${customerId}/sources/${cardId}`;
						responseData = await stripeApiRequest.call(this, 'DELETE', endpoint, {}, {});
					} else if (operation === 'get') {
						// ----------------------------------
						//        customerCard: get
						// ----------------------------------

						const customerId = this.getNodeParameter('customerId', i);
						const sourceId = this.getNodeParameter('sourceId', i);
						const endpoint = `/customers/${customerId}/sources/${sourceId}`;
						responseData = await stripeApiRequest.call(this, 'GET', endpoint, {}, {});
					}
				} else if (resource === 'charge') {
					// *********************************************************************
					//                             charge
					// *********************************************************************

					// https://stripe.com/docs/api/charges

					if (operation === 'create') {
						// ----------------------------------
						//          charge: create
						// ----------------------------------

						const body = {
							customer: this.getNodeParameter('customerId', i),
							currency: (this.getNodeParameter('currency', i) as string).toLowerCase(),
							amount: this.getNodeParameter('amount', i),
							source: this.getNodeParameter('source', i),
						} as IDataObject;

						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (!isEmpty(additionalFields)) {
							Object.assign(body, adjustChargeFields(additionalFields));
						}

						responseData = await stripeApiRequest.call(this, 'POST', '/charges', body, {});
					} else if (operation === 'get') {
						// ----------------------------------
						//           charge: get
						// ----------------------------------

						const chargeId = this.getNodeParameter('chargeId', i);
						responseData = await stripeApiRequest.call(this, 'GET', `/charges/${chargeId}`, {}, {});
					} else if (operation === 'getAll') {
						// ----------------------------------
						//          charge: getAll
						// ----------------------------------

						responseData = await handleListing.call(this, resource, i);
					} else if (operation === 'update') {
						// ----------------------------------
						//         charge: update
						// ----------------------------------

						const body = {} as IDataObject;

						const updateFields = this.getNodeParameter('updateFields', i);

						if (isEmpty(updateFields)) {
							throw new NodeOperationError(
								this.getNode(),
								`Please enter at least one field to update for the ${resource}.`,
								{ itemIndex: i },
							);
						}

						Object.assign(body, adjustChargeFields(updateFields));

						const chargeId = this.getNodeParameter('chargeId', i);
						responseData = await stripeApiRequest.call(
							this,
							'POST',
							`/charges/${chargeId}`,
							body,
							{},
						);
					}
				} else if (resource === 'coupon') {
					// *********************************************************************
					//                             coupon
					// *********************************************************************

					// https://stripe.com/docs/api/coupons

					if (operation === 'create') {
						// ----------------------------------
						//          coupon: create
						// ----------------------------------

						const body = {
							duration: this.getNodeParameter('duration', i),
						} as IDataObject;

						const type = this.getNodeParameter('type', i);

						if (type === 'fixedAmount') {
							body.amount_off = this.getNodeParameter('amountOff', i);
							body.currency = this.getNodeParameter('currency', i);
						} else {
							body.percent_off = this.getNodeParameter('percentOff', i);
						}

						responseData = await stripeApiRequest.call(this, 'POST', '/coupons', body, {});
					} else if (operation === 'getAll') {
						// ----------------------------------
						//          coupon: getAll
						// ----------------------------------

						responseData = await handleListing.call(this, resource, i);
					}
				} else if (resource === 'customer') {
					// *********************************************************************
					//                             customer
					// *********************************************************************

					// https://stripe.com/docs/api/customers

					if (operation === 'create') {
						// ----------------------------------
						//         customer: create
						// ----------------------------------

						const body = {
							name: this.getNodeParameter('name', i),
						} as IDataObject;

						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (!isEmpty(additionalFields)) {
							Object.assign(body, adjustCustomerFields(additionalFields));
						}

						responseData = await stripeApiRequest.call(this, 'POST', '/customers', body, {});
					} else if (operation === 'delete') {
						// ----------------------------------
						//         customer: delete
						// ----------------------------------

						const customerId = this.getNodeParameter('customerId', i);
						responseData = await stripeApiRequest.call(
							this,
							'DELETE',
							`/customers/${customerId}`,
							{},
							{},
						);
					} else if (operation === 'get') {
						// ----------------------------------
						//          customer: get
						// ----------------------------------

						const customerId = this.getNodeParameter('customerId', i);
						responseData = await stripeApiRequest.call(
							this,
							'GET',
							`/customers/${customerId}`,
							{},
							{},
						);
					} else if (operation === 'getAll') {
						// ----------------------------------
						//        customer: getAll
						// ----------------------------------

						const qs = {} as IDataObject;
						const filters = this.getNodeParameter('filters', i);

						if (!isEmpty(filters)) {
							qs.email = filters.email;
						}

						responseData = await handleListing.call(this, resource, i, qs);
					} else if (operation === 'update') {
						// ----------------------------------
						//        customer: update
						// ----------------------------------

						const body = {} as IDataObject;

						const updateFields = this.getNodeParameter('updateFields', i);

						if (isEmpty(updateFields)) {
							throw new NodeOperationError(
								this.getNode(),
								`Please enter at least one field to update for the ${resource}.`,
								{ itemIndex: i },
							);
						}

						Object.assign(body, adjustCustomerFields(updateFields));

						const customerId = this.getNodeParameter('customerId', i);
						responseData = await stripeApiRequest.call(
							this,
							'POST',
							`/customers/${customerId}`,
							body,
							{},
						);
					}
				} else if (resource === 'source') {
					// *********************************************************************
					//                             source
					// *********************************************************************

					// https://stripe.com/docs/api/sources

					if (operation === 'create') {
						// ----------------------------------
						//         source: create
						// ----------------------------------

						const customerId = this.getNodeParameter('customerId', i);

						const body = {
							type: this.getNodeParameter('type', i),
							amount: this.getNodeParameter('amount', i),
							currency: this.getNodeParameter('currency', i),
						} as IDataObject;

						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (!isEmpty(additionalFields)) {
							Object.assign(body, adjustMetadata(additionalFields));
						}

						responseData = await stripeApiRequest.call(this, 'POST', '/sources', body, {});

						// attach source to customer
						const endpoint = `/customers/${customerId}/sources`;
						await stripeApiRequest.call(this, 'POST', endpoint, { source: responseData.id }, {});
					} else if (operation === 'delete') {
						// ----------------------------------
						//          source: delete
						// ----------------------------------

						const sourceId = this.getNodeParameter('sourceId', i);
						const customerId = this.getNodeParameter('customerId', i);
						const endpoint = `/customers/${customerId}/sources/${sourceId}`;
						responseData = await stripeApiRequest.call(this, 'DELETE', endpoint, {}, {});
					} else if (operation === 'get') {
						// ----------------------------------
						//          source: get
						// ----------------------------------

						const sourceId = this.getNodeParameter('sourceId', i);
						responseData = await stripeApiRequest.call(this, 'GET', `/sources/${sourceId}`, {}, {});
					}
				} else if (resource === 'token') {
					// *********************************************************************
					//                             token
					// *********************************************************************

					// https://stripe.com/docs/api/tokens

					if (operation === 'create') {
						// ----------------------------------
						//          token: create
						// ----------------------------------

						const type = this.getNodeParameter('type', i);
						const body = {} as IDataObject;

						if (type !== 'cardToken') {
							throw new NodeOperationError(
								this.getNode(),
								'Only card token creation implemented.',
								{ itemIndex: i },
							);
						}

						body.card = {
							number: this.getNodeParameter('number', i),
							exp_month: this.getNodeParameter('expirationMonth', i),
							exp_year: this.getNodeParameter('expirationYear', i),
							cvc: this.getNodeParameter('cvc', i),
						};

						responseData = await stripeApiRequest.call(this, 'POST', '/tokens', body, {});
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					const executionErrorData = this.helpers.constructExecutionMetaData(
						this.helpers.returnJsonArray({ error: error.message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionErrorData);
					continue;
				}

				throw error;
			}

			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(responseData),
				{ itemData: { item: i } },
			);

			returnData.push(...executionData);
		}

		return this.prepareOutputData(returnData);
	}
}
