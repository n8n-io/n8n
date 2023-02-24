/* eslint-disable n8n-nodes-base/node-filename-against-convention */
import type { IExecuteFunctions } from 'n8n-core';

import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeOperationError } from 'n8n-workflow';

import {
	billFields,
	billOperations,
	customerFields,
	customerOperations,
	employeeFields,
	employeeOperations,
	estimateFields,
	estimateOperations,
	invoiceFields,
	invoiceOperations,
	itemFields,
	itemOperations,
	paymentFields,
	paymentOperations,
	purchaseFields,
	purchaseOperations,
	transactionFields,
	transactionOperations,
	vendorFields,
	vendorOperations,
} from './descriptions';

import {
	adjustTransactionDates,
	getRefAndSyncToken,
	getSyncToken,
	handleBinaryData,
	handleListing,
	loadResource,
	populateFields,
	processLines,
	quickBooksApiRequest,
	simplifyTransactionReport,
} from './GenericFunctions';

import { capitalCase } from 'change-case';

import isEmpty from 'lodash.isempty';

import type { QuickBooksOAuth2Credentials, TransactionFields } from './types';

export class QuickBooks implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'QuickBooks Online',
		name: 'quickbooks',
		icon: 'file:quickbooks.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume the QuickBooks Online API',
		defaults: {
			name: 'QuickBooks Online',
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
				noDataExpression: true,
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
						name: 'Employee',
						value: 'employee',
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
						name: 'Item',
						value: 'item',
					},
					{
						name: 'Payment',
						value: 'payment',
					},
					{
						name: 'Purchase',
						value: 'purchase',
					},
					{
						name: 'Transaction',
						value: 'transaction',
					},
					{
						name: 'Vendor',
						value: 'vendor',
					},
				],
				default: 'customer',
			},
			...billOperations,
			...billFields,
			...customerOperations,
			...customerFields,
			...employeeOperations,
			...employeeFields,
			...estimateOperations,
			...estimateFields,
			...invoiceOperations,
			...invoiceFields,
			...itemOperations,
			...itemFields,
			...paymentOperations,
			...paymentFields,
			...purchaseOperations,
			...purchaseFields,
			...transactionOperations,
			...transactionFields,
			...vendorOperations,
			...vendorFields,
		],
	};

	methods = {
		loadOptions: {
			async getCustomers(this: ILoadOptionsFunctions) {
				return loadResource.call(this, 'customer');
			},

			async getCustomFields(this: ILoadOptionsFunctions) {
				return loadResource.call(this, 'preferences');
			},

			async getDepartments(this: ILoadOptionsFunctions) {
				return loadResource.call(this, 'department');
			},

			async getItems(this: ILoadOptionsFunctions) {
				return loadResource.call(this, 'item');
			},

			async getMemos(this: ILoadOptionsFunctions) {
				return loadResource.call(this, 'CreditMemo');
			},

			async getPurchases(this: ILoadOptionsFunctions) {
				return loadResource.call(this, 'purchase');
			},

			async getTaxCodeRefs(this: ILoadOptionsFunctions) {
				return loadResource.call(this, 'TaxCode');
			},

			async getTerms(this: ILoadOptionsFunctions) {
				return loadResource.call(this, 'Term');
			},

			async getVendors(this: ILoadOptionsFunctions) {
				return loadResource.call(this, 'vendor');
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();

		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);

		let responseData;
		const returnData: INodeExecutionData[] = [];

		const { oauthTokenData } = (await this.getCredentials(
			'quickBooksOAuth2Api',
		)) as QuickBooksOAuth2Credentials;
		const companyId = oauthTokenData.callbackQueryString.realmId;

		for (let i = 0; i < items.length; i++) {
			try {
				if (resource === 'bill') {
					// *********************************************************************
					//                            bill
					// *********************************************************************

					// https://developer.intuit.com/app/developer/qbo/docs/api/accounting/most-commonly-used/bill

					if (operation === 'create') {
						// ----------------------------------
						//         bill: create
						// ----------------------------------

						const lines = this.getNodeParameter('Line', i) as IDataObject[];

						if (!lines.length) {
							throw new NodeOperationError(
								this.getNode(),
								`Please enter at least one line for the ${resource}.`,
								{ itemIndex: i },
							);
						}

						if (
							lines.some(
								(line) =>
									line.DetailType === undefined ||
									line.Amount === undefined ||
									line.Description === undefined,
							)
						) {
							throw new NodeOperationError(
								this.getNode(),
								'Please enter detail type, amount and description for every line.',
								{ itemIndex: i },
							);
						}

						lines.forEach((line) => {
							if (
								line.DetailType === 'AccountBasedExpenseLineDetail' &&
								line.accountId === undefined
							) {
								throw new NodeOperationError(
									this.getNode(),
									'Please enter an account ID for the associated line.',
									{ itemIndex: i },
								);
							} else if (
								line.DetailType === 'ItemBasedExpenseLineDetail' &&
								line.itemId === undefined
							) {
								throw new NodeOperationError(
									this.getNode(),
									'Please enter an item ID for the associated line.',
									{ itemIndex: i },
								);
							}
						});

						let body = {
							VendorRef: {
								value: this.getNodeParameter('VendorRef', i),
							},
						} as IDataObject;

						body.Line = processLines.call(this, body, lines, resource);

						const additionalFields = this.getNodeParameter('additionalFields', i);

						body = populateFields.call(this, body, additionalFields, resource);

						const endpoint = `/v3/company/${companyId}/${resource}`;
						responseData = await quickBooksApiRequest.call(this, 'POST', endpoint, {}, body);
						responseData = responseData[capitalCase(resource)];
					} else if (operation === 'delete') {
						// ----------------------------------
						//         bill: delete
						// ----------------------------------

						const qs = {
							operation: 'delete',
						} as IDataObject;

						const body = {
							Id: this.getNodeParameter('billId', i),
							SyncToken: await getSyncToken.call(this, i, companyId, resource),
						} as IDataObject;

						const endpoint = `/v3/company/${companyId}/${resource}`;
						responseData = await quickBooksApiRequest.call(this, 'POST', endpoint, qs, body);
						responseData = responseData[capitalCase(resource)];
					} else if (operation === 'get') {
						// ----------------------------------
						//         bill: get
						// ----------------------------------

						const billId = this.getNodeParameter('billId', i);
						const endpoint = `/v3/company/${companyId}/${resource}/${billId}`;
						responseData = await quickBooksApiRequest.call(this, 'GET', endpoint, {}, {});
						responseData = responseData[capitalCase(resource)];
					} else if (operation === 'getAll') {
						// ----------------------------------
						//         bill: getAll
						// ----------------------------------

						const endpoint = `/v3/company/${companyId}/query`;
						responseData = await handleListing.call(this, i, endpoint, resource);
					} else if (operation === 'update') {
						// ----------------------------------
						//         bill: update
						// ----------------------------------

						const { ref, syncToken } = await getRefAndSyncToken.call(
							this,
							i,
							companyId,
							resource,
							'VendorRef',
						);

						let body = {
							Id: this.getNodeParameter('billId', i),
							SyncToken: syncToken,
							sparse: true,
							VendorRef: {
								name: ref.name,
								value: ref.value,
							},
						} as IDataObject;

						const updateFields = this.getNodeParameter('updateFields', i);

						if (isEmpty(updateFields)) {
							throw new NodeOperationError(
								this.getNode(),
								`Please enter at least one field to update for the ${resource}.`,
								{ itemIndex: i },
							);
						}

						body = populateFields.call(this, body, updateFields, resource);

						const endpoint = `/v3/company/${companyId}/${resource}`;
						responseData = await quickBooksApiRequest.call(this, 'POST', endpoint, {}, body);
						responseData = responseData[capitalCase(resource)];
					}
				} else if (resource === 'customer') {
					// *********************************************************************
					//                            customer
					// *********************************************************************

					// https://developer.intuit.com/app/developer/qbo/docs/api/accounting/most-commonly-used/customer

					if (operation === 'create') {
						// ----------------------------------
						//         customer: create
						// ----------------------------------

						let body = {
							DisplayName: this.getNodeParameter('displayName', i),
						} as IDataObject;

						const additionalFields = this.getNodeParameter('additionalFields', i);

						body = populateFields.call(this, body, additionalFields, resource);

						const endpoint = `/v3/company/${companyId}/${resource}`;
						responseData = await quickBooksApiRequest.call(this, 'POST', endpoint, {}, body);
						responseData = responseData[capitalCase(resource)];
					} else if (operation === 'get') {
						// ----------------------------------
						//         customer: get
						// ----------------------------------

						const customerId = this.getNodeParameter('customerId', i);
						const endpoint = `/v3/company/${companyId}/${resource}/${customerId}`;
						responseData = await quickBooksApiRequest.call(this, 'GET', endpoint, {}, {});
						responseData = responseData[capitalCase(resource)];
					} else if (operation === 'getAll') {
						// ----------------------------------
						//         customer: getAll
						// ----------------------------------

						const endpoint = `/v3/company/${companyId}/query`;
						responseData = await handleListing.call(this, i, endpoint, resource);
					} else if (operation === 'update') {
						// ----------------------------------
						//         customer: update
						// ----------------------------------

						let body = {
							Id: this.getNodeParameter('customerId', i),
							SyncToken: await getSyncToken.call(this, i, companyId, resource),
							sparse: true,
						} as IDataObject;

						const updateFields = this.getNodeParameter('updateFields', i);

						if (isEmpty(updateFields)) {
							throw new NodeOperationError(
								this.getNode(),
								`Please enter at least one field to update for the ${resource}.`,
								{ itemIndex: i },
							);
						}

						body = populateFields.call(this, body, updateFields, resource);

						const endpoint = `/v3/company/${companyId}/${resource}`;
						responseData = await quickBooksApiRequest.call(this, 'POST', endpoint, {}, body);
						responseData = responseData[capitalCase(resource)];
					}
				} else if (resource === 'employee') {
					// *********************************************************************
					//                            employee
					// *********************************************************************

					if (operation === 'create') {
						// ----------------------------------
						//         employee: create
						// ----------------------------------

						let body = {
							FamilyName: this.getNodeParameter('FamilyName', i),
							GivenName: this.getNodeParameter('GivenName', i),
						} as IDataObject;

						const additionalFields = this.getNodeParameter('additionalFields', i);

						body = populateFields.call(this, body, additionalFields, resource);

						const endpoint = `/v3/company/${companyId}/${resource}`;
						responseData = await quickBooksApiRequest.call(this, 'POST', endpoint, {}, body);
						responseData = responseData[capitalCase(resource)];
					} else if (operation === 'get') {
						// ----------------------------------
						//         employee: get
						// ----------------------------------

						const employeeId = this.getNodeParameter('employeeId', i);
						const endpoint = `/v3/company/${companyId}/${resource}/${employeeId}`;
						responseData = await quickBooksApiRequest.call(this, 'GET', endpoint, {}, {});
						responseData = responseData[capitalCase(resource)];
					} else if (operation === 'getAll') {
						// ----------------------------------
						//         employee: getAll
						// ----------------------------------

						const endpoint = `/v3/company/${companyId}/query`;
						responseData = await handleListing.call(this, i, endpoint, resource);
					} else if (operation === 'update') {
						// ----------------------------------
						//         employee: update
						// ----------------------------------

						let body = {
							Id: this.getNodeParameter('employeeId', i),
							SyncToken: await getSyncToken.call(this, i, companyId, resource),
							sparse: true,
						} as IDataObject;

						const updateFields = this.getNodeParameter('updateFields', i);

						if (isEmpty(updateFields)) {
							throw new NodeOperationError(
								this.getNode(),
								`Please enter at least one field to update for the ${resource}.`,
								{ itemIndex: i },
							);
						}

						body = populateFields.call(this, body, updateFields, resource);

						const endpoint = `/v3/company/${companyId}/${resource}`;
						responseData = await quickBooksApiRequest.call(this, 'POST', endpoint, {}, body);
						responseData = responseData[capitalCase(resource)];
					}
				} else if (resource === 'estimate') {
					// *********************************************************************
					//                            estimate
					// *********************************************************************

					// https://developer.intuit.com/app/developer/qbo/docs/api/accounting/most-commonly-used/estimate

					if (operation === 'create') {
						// ----------------------------------
						//         estimate: create
						// ----------------------------------

						const lines = this.getNodeParameter('Line', i) as IDataObject[];

						if (!lines.length) {
							throw new NodeOperationError(
								this.getNode(),
								`Please enter at least one line for the ${resource}.`,
								{ itemIndex: i },
							);
						}

						if (
							lines.some(
								(line) =>
									line.DetailType === undefined ||
									line.Amount === undefined ||
									line.Description === undefined,
							)
						) {
							throw new NodeOperationError(
								this.getNode(),
								'Please enter detail type, amount and description for every line.',
								{ itemIndex: i },
							);
						}

						lines.forEach((line) => {
							if (line.DetailType === 'SalesItemLineDetail' && line.itemId === undefined) {
								throw new NodeOperationError(
									this.getNode(),
									'Please enter an item ID for the associated line.',
									{ itemIndex: i },
								);
							}
						});

						let body = {
							CustomerRef: {
								value: this.getNodeParameter('CustomerRef', i),
							},
						} as IDataObject;

						body.Line = processLines.call(this, body, lines, resource);
						const additionalFields = this.getNodeParameter('additionalFields', i);

						body = populateFields.call(this, body, additionalFields, resource);

						const endpoint = `/v3/company/${companyId}/${resource}`;
						responseData = await quickBooksApiRequest.call(this, 'POST', endpoint, {}, body);
						responseData = responseData[capitalCase(resource)];
					} else if (operation === 'delete') {
						// ----------------------------------
						//         estimate: delete
						// ----------------------------------

						const qs = {
							operation: 'delete',
						} as IDataObject;

						const body = {
							Id: this.getNodeParameter('estimateId', i),
							SyncToken: await getSyncToken.call(this, i, companyId, resource),
						} as IDataObject;

						const endpoint = `/v3/company/${companyId}/${resource}`;
						responseData = await quickBooksApiRequest.call(this, 'POST', endpoint, qs, body);
						responseData = responseData[capitalCase(resource)];
					} else if (operation === 'get') {
						// ----------------------------------
						//         estimate: get
						// ----------------------------------

						const estimateId = this.getNodeParameter('estimateId', i) as string;
						const download = this.getNodeParameter('download', i);

						if (download) {
							responseData = await handleBinaryData.call(
								this,
								items,
								i,
								companyId,
								resource,
								estimateId,
							);
						} else {
							const endpoint = `/v3/company/${companyId}/${resource}/${estimateId}`;
							responseData = await quickBooksApiRequest.call(this, 'GET', endpoint, {}, {});
							responseData = responseData[capitalCase(resource)];
						}
					} else if (operation === 'getAll') {
						// ----------------------------------
						//         estimate: getAll
						// ----------------------------------

						const endpoint = `/v3/company/${companyId}/query`;
						responseData = await handleListing.call(this, i, endpoint, resource);
					} else if (operation === 'send') {
						// ----------------------------------
						//         estimate: send
						// ----------------------------------

						const estimateId = this.getNodeParameter('estimateId', i) as string;

						const qs = {
							sendTo: this.getNodeParameter('email', i) as string,
						} as IDataObject;

						const endpoint = `/v3/company/${companyId}/${resource}/${estimateId}/send`;
						responseData = await quickBooksApiRequest.call(this, 'POST', endpoint, qs, {});
						responseData = responseData[capitalCase(resource)];
					} else if (operation === 'update') {
						// ----------------------------------
						//         estimate: update
						// ----------------------------------

						const { ref, syncToken } = await getRefAndSyncToken.call(
							this,
							i,
							companyId,
							resource,
							'CustomerRef',
						);

						let body = {
							Id: this.getNodeParameter('estimateId', i),
							SyncToken: syncToken,
							sparse: true,
							CustomerRef: {
								name: ref.name,
								value: ref.value,
							},
						} as IDataObject;

						const updateFields = this.getNodeParameter('updateFields', i);

						if (isEmpty(updateFields)) {
							throw new NodeOperationError(
								this.getNode(),
								`Please enter at least one field to update for the ${resource}.`,
								{ itemIndex: i },
							);
						}

						body = populateFields.call(this, body, updateFields, resource);

						const endpoint = `/v3/company/${companyId}/${resource}`;
						responseData = await quickBooksApiRequest.call(this, 'POST', endpoint, {}, body);
						responseData = responseData[capitalCase(resource)];
					}
				} else if (resource === 'invoice') {
					// *********************************************************************
					//                            invoice
					// *********************************************************************

					// https://developer.intuit.com/app/developer/qbo/docs/api/accounting/most-commonly-used/invoice

					if (operation === 'create') {
						// ----------------------------------
						//         invoice: create
						// ----------------------------------

						const lines = this.getNodeParameter('Line', i) as IDataObject[];

						if (!lines.length) {
							throw new NodeOperationError(
								this.getNode(),
								`Please enter at least one line for the ${resource}.`,
								{ itemIndex: i },
							);
						}

						if (
							lines.some(
								(line) =>
									line.DetailType === undefined ||
									line.Amount === undefined ||
									line.Description === undefined,
							)
						) {
							throw new NodeOperationError(
								this.getNode(),
								'Please enter detail type, amount and description for every line.',
								{ itemIndex: i },
							);
						}

						lines.forEach((line) => {
							if (line.DetailType === 'SalesItemLineDetail' && line.itemId === undefined) {
								throw new NodeOperationError(
									this.getNode(),
									'Please enter an item ID for the associated line.',
									{ itemIndex: i },
								);
							}
						});

						let body = {
							CustomerRef: {
								value: this.getNodeParameter('CustomerRef', i),
							},
						} as IDataObject;

						body.Line = processLines.call(this, body, lines, resource);

						const additionalFields = this.getNodeParameter('additionalFields', i);

						body = populateFields.call(this, body, additionalFields, resource);

						const endpoint = `/v3/company/${companyId}/${resource}`;
						responseData = await quickBooksApiRequest.call(this, 'POST', endpoint, {}, body);
						responseData = responseData[capitalCase(resource)];
					} else if (operation === 'delete') {
						// ----------------------------------
						//         invoice: delete
						// ----------------------------------

						const qs = {
							operation: 'delete',
						} as IDataObject;

						const body = {
							Id: this.getNodeParameter('invoiceId', i),
							SyncToken: await getSyncToken.call(this, i, companyId, resource),
						} as IDataObject;

						const endpoint = `/v3/company/${companyId}/${resource}`;
						responseData = await quickBooksApiRequest.call(this, 'POST', endpoint, qs, body);
						responseData = responseData[capitalCase(resource)];
					} else if (operation === 'get') {
						// ----------------------------------
						//         invoice: get
						// ----------------------------------

						const invoiceId = this.getNodeParameter('invoiceId', i) as string;
						const download = this.getNodeParameter('download', i);

						if (download) {
							responseData = await handleBinaryData.call(
								this,
								items,
								i,
								companyId,
								resource,
								invoiceId,
							);
						} else {
							const endpoint = `/v3/company/${companyId}/${resource}/${invoiceId}`;
							responseData = await quickBooksApiRequest.call(this, 'GET', endpoint, {}, {});
							responseData = responseData[capitalCase(resource)];
						}
					} else if (operation === 'getAll') {
						// ----------------------------------
						//         invoice: getAll
						// ----------------------------------

						const endpoint = `/v3/company/${companyId}/query`;
						responseData = await handleListing.call(this, i, endpoint, resource);
					} else if (operation === 'send') {
						// ----------------------------------
						//         invoice: send
						// ----------------------------------

						const invoiceId = this.getNodeParameter('invoiceId', i) as string;

						const qs = {
							sendTo: this.getNodeParameter('email', i) as string,
						} as IDataObject;

						const endpoint = `/v3/company/${companyId}/${resource}/${invoiceId}/send`;
						responseData = await quickBooksApiRequest.call(this, 'POST', endpoint, qs, {});
						responseData = responseData[capitalCase(resource)];
					} else if (operation === 'update') {
						// ----------------------------------
						//         invoice: update
						// ----------------------------------

						const { ref, syncToken } = await getRefAndSyncToken.call(
							this,
							i,
							companyId,
							resource,
							'CustomerRef',
						);

						let body = {
							Id: this.getNodeParameter('invoiceId', i),
							SyncToken: syncToken,
							sparse: true,
							CustomerRef: {
								name: ref.name,
								value: ref.value,
							},
						} as IDataObject;

						const updateFields = this.getNodeParameter('updateFields', i);

						if (isEmpty(updateFields)) {
							throw new NodeOperationError(
								this.getNode(),
								`Please enter at least one field to update for the ${resource}.`,
								{ itemIndex: i },
							);
						}

						body = populateFields.call(this, body, updateFields, resource);

						const endpoint = `/v3/company/${companyId}/${resource}`;
						responseData = await quickBooksApiRequest.call(this, 'POST', endpoint, {}, body);
						responseData = responseData[capitalCase(resource)];
					} else if (operation === 'void') {
						// ----------------------------------
						//         invoice: void
						// ----------------------------------

						const qs = {
							Id: this.getNodeParameter('invoiceId', i),
							SyncToken: await getSyncToken.call(this, i, companyId, resource),
							operation: 'void',
						} as IDataObject;

						const endpoint = `/v3/company/${companyId}/${resource}`;
						responseData = await quickBooksApiRequest.call(this, 'POST', endpoint, qs, {});
						responseData = responseData[capitalCase(resource)];
					}
				} else if (resource === 'item') {
					// *********************************************************************
					//                            item
					// *********************************************************************

					// https://developer.intuit.com/app/developer/qbo/docs/api/accounting/most-commonly-used/item

					if (operation === 'get') {
						// ----------------------------------
						//         item: get
						// ----------------------------------

						const item = this.getNodeParameter('itemId', i);
						const endpoint = `/v3/company/${companyId}/${resource}/${item}`;
						responseData = await quickBooksApiRequest.call(this, 'GET', endpoint, {}, {});
						responseData = responseData[capitalCase(resource)];
					} else if (operation === 'getAll') {
						// ----------------------------------
						//         item: getAll
						// ----------------------------------

						const endpoint = `/v3/company/${companyId}/query`;
						responseData = await handleListing.call(this, i, endpoint, resource);
					}
				} else if (resource === 'payment') {
					// *********************************************************************
					//                            payment
					// *********************************************************************

					// https://developer.intuit.com/app/developer/qbo/docs/api/accounting/most-commonly-used/payment

					if (operation === 'create') {
						// ----------------------------------
						//         payment: create
						// ----------------------------------

						let body = {
							CustomerRef: {
								value: this.getNodeParameter('CustomerRef', i),
							},
							TotalAmt: this.getNodeParameter('TotalAmt', i),
						} as IDataObject;

						const additionalFields = this.getNodeParameter('additionalFields', i);

						body = populateFields.call(this, body, additionalFields, resource);

						const endpoint = `/v3/company/${companyId}/${resource}`;
						responseData = await quickBooksApiRequest.call(this, 'POST', endpoint, {}, body);
						responseData = responseData[capitalCase(resource)];
					} else if (operation === 'delete') {
						// ----------------------------------
						//         payment: delete
						// ----------------------------------

						const qs = {
							operation: 'delete',
						} as IDataObject;

						const body = {
							Id: this.getNodeParameter('paymentId', i),
							SyncToken: await getSyncToken.call(this, i, companyId, resource),
						} as IDataObject;

						const endpoint = `/v3/company/${companyId}/${resource}`;
						responseData = await quickBooksApiRequest.call(this, 'POST', endpoint, qs, body);
						responseData = responseData[capitalCase(resource)];
					} else if (operation === 'get') {
						// ----------------------------------
						//         payment: get
						// ----------------------------------

						const paymentId = this.getNodeParameter('paymentId', i) as string;
						const download = this.getNodeParameter('download', i);

						if (download) {
							responseData = await handleBinaryData.call(
								this,
								items,
								i,
								companyId,
								resource,
								paymentId,
							);
						} else {
							const endpoint = `/v3/company/${companyId}/${resource}/${paymentId}`;
							responseData = await quickBooksApiRequest.call(this, 'GET', endpoint, {}, {});
							responseData = responseData[capitalCase(resource)];
						}
					} else if (operation === 'getAll') {
						// ----------------------------------
						//         payment: getAll
						// ----------------------------------

						const endpoint = `/v3/company/${companyId}/query`;
						responseData = await handleListing.call(this, i, endpoint, resource);
					} else if (operation === 'send') {
						// ----------------------------------
						//         payment: send
						// ----------------------------------

						const paymentId = this.getNodeParameter('paymentId', i) as string;

						const qs = {
							sendTo: this.getNodeParameter('email', i) as string,
						} as IDataObject;

						const endpoint = `/v3/company/${companyId}/${resource}/${paymentId}/send`;
						responseData = await quickBooksApiRequest.call(this, 'POST', endpoint, qs, {});
						responseData = responseData[capitalCase(resource)];
					} else if (operation === 'update') {
						// ----------------------------------
						//         payment: update
						// ----------------------------------

						const { ref, syncToken } = await getRefAndSyncToken.call(
							this,
							i,
							companyId,
							resource,
							'CustomerRef',
						);

						let body = {
							Id: this.getNodeParameter('paymentId', i),
							SyncToken: syncToken,
							sparse: true,
							CustomerRef: {
								name: ref.name,
								value: ref.value,
							},
						} as IDataObject;

						const updateFields = this.getNodeParameter('updateFields', i);

						if (isEmpty(updateFields)) {
							throw new NodeOperationError(
								this.getNode(),
								`Please enter at least one field to update for the ${resource}.`,
								{ itemIndex: i },
							);
						}

						body = populateFields.call(this, body, updateFields, resource);

						const endpoint = `/v3/company/${companyId}/${resource}`;
						responseData = await quickBooksApiRequest.call(this, 'POST', endpoint, {}, body);
						responseData = responseData[capitalCase(resource)];
					} else if (operation === 'void') {
						// ----------------------------------
						//         payment: void
						// ----------------------------------

						const qs = {
							Id: this.getNodeParameter('paymentId', i),
							SyncToken: await getSyncToken.call(this, i, companyId, resource),
							operation: 'void',
						} as IDataObject;

						const endpoint = `/v3/company/${companyId}/${resource}`;
						responseData = await quickBooksApiRequest.call(this, 'POST', endpoint, qs, {});
						responseData = responseData[capitalCase(resource)];
					}
				} else if (resource === 'purchase') {
					// *********************************************************************
					//                            purchase
					// *********************************************************************

					// https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/purchase

					if (operation === 'get') {
						// ----------------------------------
						//         purchase: get
						// ----------------------------------

						const purchaseId = this.getNodeParameter('purchaseId', i);
						const endpoint = `/v3/company/${companyId}/${resource}/${purchaseId}`;
						responseData = await quickBooksApiRequest.call(this, 'GET', endpoint, {}, {});
						responseData = responseData[capitalCase(resource)];
					} else if (operation === 'getAll') {
						// ----------------------------------
						//         purchase: getAll
						// ----------------------------------

						const endpoint = `/v3/company/${companyId}/query`;
						responseData = await handleListing.call(this, i, endpoint, resource);
					}
				} else if (resource === 'transaction') {
					// *********************************************************************
					//                            transaction
					// *********************************************************************

					// https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities/transactionlist

					if (operation === 'getReport') {
						// ----------------------------------
						//        transaction: getReport
						// ----------------------------------

						const { columns, memo, term, customer, vendor, ...rest } = this.getNodeParameter(
							'filters',
							i,
						) as TransactionFields;

						let qs = { ...rest };

						if (columns?.length) {
							qs.columns = columns.join(',');
						}

						if (memo?.length) {
							qs.memo = memo.join(',');
						}

						if (term?.length) {
							qs.term = term.join(',');
						}

						if (customer?.length) {
							qs.customer = customer.join(',');
						}

						if (vendor?.length) {
							qs.vendor = vendor.join(',');
						}

						qs = adjustTransactionDates(qs);

						const endpoint = `/v3/company/${companyId}/reports/TransactionList`;
						responseData = await quickBooksApiRequest.call(this, 'GET', endpoint, qs, {});

						const simplifyResponse = this.getNodeParameter('simple', i, true) as boolean;

						if (!Object.keys(responseData?.Rows).length) {
							responseData = [];
						}

						if (simplifyResponse && !Array.isArray(responseData)) {
							responseData = simplifyTransactionReport(responseData);
						}
					}
				} else if (resource === 'vendor') {
					// *********************************************************************
					//                            vendor
					// *********************************************************************

					// https://developer.intuit.com/app/developer/qbo/docs/api/accounting/most-commonly-used/vendor

					if (operation === 'create') {
						// ----------------------------------
						//         vendor: create
						// ----------------------------------

						let body = {
							DisplayName: this.getNodeParameter('displayName', i),
						} as IDataObject;

						const additionalFields = this.getNodeParameter('additionalFields', i);

						body = populateFields.call(this, body, additionalFields, resource);

						const endpoint = `/v3/company/${companyId}/${resource}`;
						responseData = await quickBooksApiRequest.call(this, 'POST', endpoint, {}, body);
						responseData = responseData[capitalCase(resource)];
					} else if (operation === 'get') {
						// ----------------------------------
						//         vendor: get
						// ----------------------------------

						const vendorId = this.getNodeParameter('vendorId', i);
						const endpoint = `/v3/company/${companyId}/${resource}/${vendorId}`;
						responseData = await quickBooksApiRequest.call(this, 'GET', endpoint, {}, {});
						responseData = responseData[capitalCase(resource)];
					} else if (operation === 'getAll') {
						// ----------------------------------
						//         vendor: getAll
						// ----------------------------------

						const endpoint = `/v3/company/${companyId}/query`;
						responseData = await handleListing.call(this, i, endpoint, resource);
					} else if (operation === 'update') {
						// ----------------------------------
						//         vendor: update
						// ----------------------------------

						let body = {
							Id: this.getNodeParameter('vendorId', i),
							SyncToken: await getSyncToken.call(this, i, companyId, resource),
							sparse: true,
						} as IDataObject;

						const updateFields = this.getNodeParameter('updateFields', i);

						if (isEmpty(updateFields)) {
							throw new NodeOperationError(
								this.getNode(),
								`Please enter at least one field to update for the ${resource}.`,
								{ itemIndex: i },
							);
						}

						body = populateFields.call(this, body, updateFields, resource);

						const endpoint = `/v3/company/${companyId}/${resource}`;
						responseData = await quickBooksApiRequest.call(this, 'POST', endpoint, {}, body);
						responseData = responseData[capitalCase(resource)];
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					const download = this.getNodeParameter('download', 0, false);
					if (
						['invoice', 'estimate', 'payment'].includes(resource) &&
						['get'].includes(operation) &&
						download
					) {
						// in this case responseDate? === items
						if (!responseData) {
							items[i].json = { error: error.message };
							responseData = items;
						} else {
							responseData[i].json = { error: error.message };
						}
					} else {
						const executionErrorData = this.helpers.constructExecutionMetaData(
							this.helpers.returnJsonArray({ error: error.message }),
							{ itemData: { item: i } },
						);
						returnData.push(...executionErrorData);
					}
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

		const download = this.getNodeParameter('download', 0, false);

		if (
			['invoice', 'estimate', 'payment'].includes(resource) &&
			['get'].includes(operation) &&
			download
		) {
			return this.prepareOutputData(responseData);
		} else {
			return this.prepareOutputData(returnData);
		}
	}
}
