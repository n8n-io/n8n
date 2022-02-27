import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	ICredentialDataDecryptedObject,
	ICredentialsDecrypted,
	ICredentialTestFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeApiError,
} from 'n8n-workflow';

import {
	sevDeskApiRequest,
	validateCrendetials,
} from './GenericFunctions';

import {
	accountingContactFields,
	accountingContactOperations,
	checkAccountFields,
	checkAccountOperations,
	checkAccountTransactionFields,
	checkAccountTransactionOperations,
	communicationWayFields,
	communicationWayOperations,
	contactAddressFields,
	contactAddressOperations,
	contactFields,
	contactOperations,
	invoiceFields,
	invoiceOperations,
	orderFields,
	orderOperations,
	orderPoFields,
	orderPoOperations,
	partFields,
	partOperations,
	voucherFields,
	voucherOperations,
	voucherPoFields,
	voucherPoOperations,
} from './descriptions';

export class SevDesk implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'sevDesk',
		name: 'sevDesk',
		icon: 'file:sevDesk.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume the sevDesk API',
		defaults: {
			name: 'sevDesk',
			color: '#d80f16',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'sevDeskApi',
				required: true,
				testedBy: 'sevDeskApiCredentialTest',
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
						name: 'AccountingContact',
						value: 'accountingContact',
					},
					{
						name: 'CheckAccount',
						value: 'checkAccount',
					},
					{
						name: 'CheckAccountTransaction',
						value: 'checkAccountTransaction',
					},
					{
						name: 'CommunicationWay',
						value: 'communicationWay',
					},
					{
						name: 'Contact',
						value: 'contact',
					},
					{
						name: 'ContactAddress',
						value: 'contactAddress',
					},
					{
						name: 'Invoice',
						value: 'invoice',
					},
					{
						name: 'Order',
						value: 'order',
					},
					{
						name: 'OrderPo',
						value: 'orderPo',
					},
					{
						name: 'Part',
						value: 'part',
					},
					{
						name: 'Voucher',
						value: 'voucher',
					},
					{
						name: 'VoucherPo',
						value: 'voucherPo',
					},
				],
				default: 'invoice',
				description: 'Resource to consume',
			},
			...accountingContactOperations,
			...accountingContactFields,
			...checkAccountOperations,
			...checkAccountFields,
			...checkAccountTransactionOperations,
			...checkAccountTransactionFields,
			...communicationWayOperations,
			...communicationWayFields,
			...contactOperations,
			...contactFields,
			...contactAddressOperations,
			...contactAddressFields,
			...invoiceOperations,
			...invoiceFields,
			...orderOperations,
			...orderFields,
			...orderPoOperations,
			...orderPoFields,
			...partOperations,
			...partFields,
			...voucherOperations,
			...voucherFields,
			...voucherPoOperations,
			...voucherPoFields,
		],
	};

	methods = {
		credentialTest: {
			// tslint:disable-next-line: no-any
			async sevDeskApiCredentialTest(this: ICredentialTestFunctions, credential: ICredentialsDecrypted): Promise<any> {
				try {
					await validateCrendetials.call(this, credential.data as ICredentialDataDecryptedObject);
				} catch (error) {
					// tslint:disable-next-line: no-any
					if ((error as any).statusCode === 401) {
						return {
							status: 'Error',
							message: 'The API Key included in the request is invalid',
						};
					}
				}

				return {
					status: 'OK',
					message: 'Connection successful!',
				};
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];

		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;

		let responseData;

		for (let i = 0; i < items.length; i++) {
			try {

				if (resource === 'accountingContact') {

					// **********************************************************************
					//                           accountingContact
					// **********************************************************************

					if (operation === 'create') {

						// ----------------------------------------
						//        accountingContact: create
						// ----------------------------------------

						const contact = this.getNodeParameter('contact', i);
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						const body = { contact, ...additionalFields };
						responseData = await sevDeskApiRequest.call(this, 'POST', '/AccountingContact', body);

					}

				} else if (resource === 'checkAccount') {

					// **********************************************************************
					//                              checkAccount
					// **********************************************************************

					if (operation === 'getAll') {

						// ----------------------------------------
						//           checkAccount: getAll
						// ----------------------------------------

						responseData = await sevDeskApiRequest.call(this, 'GET', '/CheckAccount');

					} else if (operation === 'create') {

						// ----------------------------------------
						//           checkAccount: create
						// ----------------------------------------

						// required fields
						const name = this.getNodeParameter('name', i);
						const type = this.getNodeParameter('type', i);
						const currency = this.getNodeParameter('currency', i);
						const status = this.getNodeParameter('status', i);

						// additional fields
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						// fill body
						const body = { name, type, currency, status, ...additionalFields };

						const endpoint = `/CheckAccount`;
						responseData = await sevDeskApiRequest.call(this, 'POST', endpoint, body);

					} else if (operation === 'update') {

						// ----------------------------------------
						//           checkAccount: update
						// ----------------------------------------

						const checkAccountId = this.getNodeParameter('checkAccountId', i);

						// additional fields
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						// fill body
						const body = { ...additionalFields };

						const endpoint = `/CheckAccount/${checkAccountId}`;
						responseData = await sevDeskApiRequest.call(this, 'PUT', endpoint, body);

					}

				} else if (resource === 'checkAccountTransaction') {

					// **********************************************************************
					//                        checkAccountTransaction
					// **********************************************************************

					if (operation === 'bookCollective') {

						// ----------------------------------------
						// checkAccountTransaction: bookCollective
						// ----------------------------------------

						// required fields
						const documents = this.getNodeParameter('documents', i);

						// fill body
						const body = { documents };

						const endpoint = '/CheckAccountTransaction/{id}/bookCollective';
						responseData = await sevDeskApiRequest.call(this, 'PUT', endpoint, body);

					} else if (operation === 'getAll') {

						// ----------------------------------------
						//     checkAccountTransaction: getAll
						// ----------------------------------------
						const endpoint = '/CheckAccountTransaction';

						const filters = this.getNodeParameter('filters', i) as IDataObject;
						const qs = { ...filters } as IDataObject;

						const body = {};
						responseData = await sevDeskApiRequest.call(this, 'GET', endpoint, body, qs);

					} else if (operation === 'create') {

						// ----------------------------------------
						//     checkAccountTransaction: create
						// ----------------------------------------

						// required fields
						const valueDate = this.getNodeParameter('valueDate', i);
						const amount = this.getNodeParameter('amount', i);
						const payeePayerName = this.getNodeParameter('payeePayerName', i);
						const checkAccount = this.getNodeParameter('checkAccount', i);

						// additional fields
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						// fill body
						const body = { valueDate, amount, payeePayerName, checkAccount, ...additionalFields };

						const endpoint = '/CheckAccountTransaction';
						responseData = await sevDeskApiRequest.call(this, 'POST', endpoint, body);

					}

				} else if (resource === 'communicationWay') {

					// **********************************************************************
					//                            communicationWay
					// **********************************************************************

					if (operation === 'delete') {

						// ----------------------------------------
						//         communicationWay: delete
						// ----------------------------------------

						const communicationWayId = this.getNodeParameter('communicationWayId', i);

						const endpoint = `/CommunicationWay/${communicationWayId}/delete`;
						responseData = await sevDeskApiRequest.call(this, 'DELETE', endpoint);

					} else if (operation === 'create') {

						// ----------------------------------------
						//         communicationWay: create
						// ----------------------------------------

						const type = this.getNodeParameter('type', i);
						const value = this.getNodeParameter('value', i);
						const key = this.getNodeParameter('key', i);
						const main = this.getNodeParameter('main', i);

						const body = { type, value, key, main, };

						responseData = await sevDeskApiRequest.call(this, 'GET', '/CommunicationWay', body);

					} else if (operation === 'getAll') {

						// ----------------------------------------
						//         communicationWay: getAll
						// ----------------------------------------
						const endpoint = '/CommunicationWay';

						const filters = this.getNodeParameter('filters', i) as IDataObject;
						const qs = { ...filters } as IDataObject;

						const body = {};
						responseData = await sevDeskApiRequest.call(this, 'GET', endpoint, body, qs);

					}
				} else if (resource === 'contact') {

					// **********************************************************************
					//                                contact
					// **********************************************************************
					if (operation === 'getNextCustomerNumber') {

						// ----------------------------------------
						//      contact: getNextCustomerNumber
						// ----------------------------------------

						const endpoint = '/Contact/Factory/getNextCustomerNumber';
						responseData = await sevDeskApiRequest.call(this, 'GET', endpoint);

					} else if (operation === 'contactCustomerNumberAvailabilityCheck') {

						// ----------------------------------------
						// contact: contactCustomerNumberAvailabilityCheck
						// ----------------------------------------

						const customerNumber = this.getNodeParameter('customerNumber', i);
						const qs = { customerNumber } as IDataObject;

						const endpoint = '/Contact/Mapper/checkCustomerNumberAvailability';
						responseData = await sevDeskApiRequest.call(this, 'GET', endpoint, {}, qs);

					} else if (operation === 'contactGetCommunicationWays') {

						// ----------------------------------------
						//   contact: contactGetCommunicationWays
						// ----------------------------------------

						const contactId = this.getNodeParameter('contactId', i);

						const endpoint = `/Contact/${contactId}/getCommunicationWays`;
						responseData = await sevDeskApiRequest.call(this, 'GET', endpoint);

					} else if (operation === 'create') {

						// ----------------------------------------
						//               contact: create
						// ----------------------------------------

						const category = this.getNodeParameter('category', i);
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						const body = { category, ...additionalFields };
						responseData = await sevDeskApiRequest.call(this, 'GET', `/Contact`, body);

					} else if (operation === 'update') {

						// ----------------------------------------
						//               contact: update
						// ----------------------------------------
						const contactId = this.getNodeParameter('contactId', i);

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						const body = { ...additionalFields };
						responseData = await sevDeskApiRequest.call(this, 'GET', `/Contact/${contactId}`, body);

					} else if (operation === 'get') {

						// ----------------------------------------
						//               contact: get
						// ----------------------------------------

						const contactId = this.getNodeParameter('contactId', i);

						responseData = await sevDeskApiRequest.call(this, 'GET', `/Contact/${contactId}`);

					} else if (operation === 'getAll') {

						// ----------------------------------------
						//             contact: getAll
						// ----------------------------------------
						const endpoint = '/Contact';

						const filters = this.getNodeParameter('filters', i) as IDataObject;
						const qs = { ...filters } as IDataObject;

						const body = {};
						responseData = await sevDeskApiRequest.call(this, 'GET', endpoint, body, qs);

					}

				} else if (resource === 'contactAddress') {

					// **********************************************************************
					//                             contactAddress
					// **********************************************************************

					if (operation === 'create') {

						// ----------------------------------------
						//          contactAddress: create
						// ----------------------------------------

						const contact = this.getNodeParameter('contact', i);
						const country = this.getNodeParameter('country', i);
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						const body = { contact, country, ...additionalFields };

						responseData = await sevDeskApiRequest.call(this, 'POST', '/ContactAddress', body);

					}

				} else if (resource === 'invoice') {

					// **********************************************************************
					//                                invoice
					// **********************************************************************

					if (operation === 'bookInvoice') {

						// ----------------------------------------
						//              invoice: book
						// ----------------------------------------

						const invoiceId = this.getNodeParameter('invoiceId', i);

						// required fields
						const amount = this.getNodeParameter('amount', i);
						const date = this.getNodeParameter('date', i)?.valueOf();
						const type = this.getNodeParameter('type', i);
						const checkAccount = this.getNodeParameter('checkAccount', i);

						// additional fields
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						const body = {
							amount, date, type, checkAccount, ...additionalFields,
						};
						const endpoint = `/Invoice/${invoiceId}/bookAmount`;
						responseData = await sevDeskApiRequest.call(this, 'PUT', endpoint, body);

					} else if (operation === 'cancel') {

						// ----------------------------------------
						//             invoice: cancel
						// ----------------------------------------

						const invoiceId = this.getNodeParameter('invoiceId', i);

						const endpoint = `/Invoice/${invoiceId}/cancelInvoice`;
						responseData = await sevDeskApiRequest.call(this, 'POST', endpoint);

					} else if (operation === 'createByFactory') {

						// ----------------------------------------
						//         invoice: createByFactory
						// ----------------------------------------

						// required fields
						const objectName = this.getNodeParameter('objectName', i);
						const contact = this.getNodeParameter('contact', i);
						const invoiceDate = this.getNodeParameter('invoiceDate', i)?.valueOf();
						const discount = this.getNodeParameter('discount', i);
						const deliveryDate = this.getNodeParameter('deliveryDate', i)?.valueOf();
						const status = this.getNodeParameter('status', i);
						const smallSettlement = this.getNodeParameter('smallSettlement', i);
						const contactPerson = this.getNodeParameter('contactPerson', i);
						const taxRate = this.getNodeParameter('taxRate', i);
						const taxText = this.getNodeParameter('taxText', i);
						const taxType = this.getNodeParameter('taxType', i);
						const invoiceType = this.getNodeParameter('invoiceType', i);
						const currency = this.getNodeParameter('currency', i);
						const mapAll = this.getNodeParameter('mapAll', i);
						const { invoicePosSave, invoicePosDelete } = this.getNodeParameter('invoicePositions', i) as IDataObject;
						const { discountSave, discountDelete } = this.getNodeParameter('discounts', i) as IDataObject;

						// additional fields
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						// fill body
						const body = {
							objectName, contact, invoiceDate, discount, deliveryDate, status, smallSettlement,
							contactPerson, taxRate, taxText, taxType, invoiceType, currency, mapAll,
							invoicePosSave, invoicePosDelete, discountSave, discountDelete,
							...additionalFields,
						};

						const endpoint = '/Invoice/Factory/saveInvoice';
						responseData = await sevDeskApiRequest.call(this, 'POST', endpoint, body);

					} else if (operation === 'delete') {

						// ----------------------------------------
						//             invoice: delete
						// ----------------------------------------

						const invoiceId = this.getNodeParameter('invoiceId', i);

						const endpoint = `/Invoice/${invoiceId}/delete`;
						responseData = await sevDeskApiRequest.call(this, 'DELETE', endpoint);

					} else if (operation === 'get') {

						// ----------------------------------------
						//               invoice: get
						// ----------------------------------------

						const invoiceId = this.getNodeParameter('invoiceId', i);

						const body = {};
						responseData = await sevDeskApiRequest.call(this, 'GET', `/Invoice/${invoiceId}`, body);

					} else if (operation === 'getAll') {

						// ----------------------------------------
						//             invoice: getAll
						// ----------------------------------------
						const endpoint = '/Invoice';

						const filters = this.getNodeParameter('filters', i) as IDataObject;
						const qs = { ...filters } as IDataObject;

						const body = {};
						responseData = await sevDeskApiRequest.call(this, 'GET', endpoint, body, qs);

					} else if (operation === 'getIsInvoicePartiallyPaid') {

						// ----------------------------------------
						//    invoice: getIsInvoicePartiallyPaid
						// ----------------------------------------

						const invoiceId = this.getNodeParameter('invoiceId', i);

						const endpoint = `/Invoice/${invoiceId}/getIsPartiallyPaid`;
						responseData = await sevDeskApiRequest.call(this, 'GET', endpoint);

					} else if (operation === 'invoiceGetPdf') {

						// ----------------------------------------
						//          invoice: invoiceGetPdf
						// ----------------------------------------

						const invoiceId = this.getNodeParameter('invoiceId', i);

						const endpoint = `/Invoice/${invoiceId}/getPdf`;
						responseData = await sevDeskApiRequest.call(this, 'GET', endpoint);

					} else if (operation === 'invoiceRender') {

						// ----------------------------------------
						//          invoice: invoiceRender
						// ----------------------------------------

						const invoiceId = this.getNodeParameter('invoiceId', i);

						const forceReload = this.getNodeParameter('forceReload', i);

						const body = { forceReload };
						responseData = await sevDeskApiRequest.call(this, 'POST', `/Invoice/${invoiceId}/render`, body);

					} else if (operation === 'invoiceSendBy') {

						// ----------------------------------------
						//          invoice: invoiceSendBy
						// ----------------------------------------

						const invoiceId = this.getNodeParameter('invoiceId', i);

						const sendType = this.getNodeParameter('sendType', i);
						const sendDraft = this.getNodeParameter('sendDraft', i);

						const body = { sendType, sendDraft };
						const endpoint = `/Invoice/${invoiceId}/sendBy`;
						responseData = await sevDeskApiRequest.call(this, 'PUT', endpoint, body);

					} else if (operation === 'markAsSent') {

						// ----------------------------------------
						//           invoice: markAsSent
						// ----------------------------------------

						const invoiceId = this.getNodeParameter('invoiceId', i);

						const endpoint = `/Invoice/${invoiceId}/markAsSent`;
						responseData = await sevDeskApiRequest.call(this, 'PUT', endpoint);

					} else if (operation === 'sendViaEMail') {

						// ----------------------------------------
						//          invoice: sendViaEMail
						// ----------------------------------------

						const invoiceId = this.getNodeParameter('invoiceId', i);

						const toEmail = this.getNodeParameter('toEmail', i);
						const subject = this.getNodeParameter('subject', i);
						const text = this.getNodeParameter('text', i);

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						const body = { toEmail, subject, text, ...additionalFields };
						const endpoint = `/Invoice/${invoiceId}/sendViaEmail`;
						responseData = await sevDeskApiRequest.call(this, 'POST', endpoint, body);

					}

				} else if (resource === 'order') {

					// **********************************************************************
					//                                 order
					// **********************************************************************

					if (operation === 'create') {

						// ----------------------------------------
						//              order: create
						// ----------------------------------------

						// required fields
						const orderNumber = this.getNodeParameter('orderNumber', i);
						const contact = this.getNodeParameter('contact', i);
						const orderDate = this.getNodeParameter('orderDate', i)?.valueOf();
						const status = this.getNodeParameter('status', i);
						const smallSettlement = this.getNodeParameter('smallSettlement', i);
						const header = this.getNodeParameter('header', i);
						const version = this.getNodeParameter('version', i);
						const contactPerson = this.getNodeParameter('contactPerson', i);
						const taxText = this.getNodeParameter('taxText', i);
						const taxType = this.getNodeParameter('taxType', i);
						const currency = this.getNodeParameter('currency', i);

						// additional fields
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						// fill body
						const body = {
							orderNumber, contact, orderDate, status, header, smallSettlement,
							version, contactPerson, taxText, taxType, currency,
							...additionalFields,
						};

						const endpoint = `/Order/`;
						responseData = await sevDeskApiRequest.call(this, 'POST', endpoint);

					} else if (operation === 'delete') {

						// ----------------------------------------
						//              order: delete
						// ----------------------------------------

						const orderId = this.getNodeParameter('orderId', i);

						const endpoint = `/Order/${orderId}/delete`;
						responseData = await sevDeskApiRequest.call(this, 'DELETE', endpoint);

					} else if (operation === 'get') {

						// ----------------------------------------
						//                order: get
						// ----------------------------------------

						const orderId = this.getNodeParameter('orderId', i);

						const body = {};
						responseData = await sevDeskApiRequest.call(this, 'GET', `/Order/${orderId}`, body);

					} else if (operation === 'getAll') {

						// ----------------------------------------
						//              order: getAll
						// ----------------------------------------
						const endpoint = '/Order';

						const filters = this.getNodeParameter('filters', i) as IDataObject;
						const qs = { ...filters } as IDataObject;

						const body = {};
						responseData = await sevDeskApiRequest.call(this, 'GET', endpoint, body, qs);

					} else if (operation === 'update') {

						// ----------------------------------------
						//              order: update
						// ----------------------------------------

						const orderId = this.getNodeParameter('orderId', i);

						// additional fields
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						const qs = { ...additionalFields } as IDataObject;

						responseData = await sevDeskApiRequest.call(this, 'GET', `/Order/${orderId}`, {}, qs);

					}

				} else if (resource === 'orderPo') {

					// **********************************************************************
					//                                orderPo
					// **********************************************************************

					if (operation === 'create') {

						// ----------------------------------------
						//             orderPo: create
						// ----------------------------------------

						// required fields
						const order = this.getNodeParameter('order', i);
						const quantity = this.getNodeParameter('quantity', i);
						const unity = this.getNodeParameter('unity', i)?.valueOf();
						const taxRate = this.getNodeParameter('taxRate', i);

						// additional fields
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						// fill body
						const body = { order, quantity, unity, taxRate, ...additionalFields, };

						responseData = await sevDeskApiRequest.call(this, 'POST', '/OrderPos', body);

					} else if (operation === 'getAll') {

						// ----------------------------------------
						//             orderPo: getAll
						// ----------------------------------------
						const endpoint = '/OrderPos';

						const filters = this.getNodeParameter('filters', i) as IDataObject;
						const qs = { ...filters } as IDataObject;

						const body = {};
						responseData = await sevDeskApiRequest.call(this, 'GET', endpoint, body, qs);

					}

				} else if (resource === 'part') {

					// **********************************************************************
					//                                  part
					// **********************************************************************

					if (operation === 'create') {

						// ----------------------------------------
						//                part: create
						// ----------------------------------------


						// required fields
						const name = this.getNodeParameter('name', i);
						const partNumber = this.getNodeParameter('partNumber', i);
						const stock = this.getNodeParameter('stock', i);
						const unity = this.getNodeParameter('unity', i);
						const taxRate = this.getNodeParameter('taxRate', i);

						// additional fields
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						// fill body
						const body = { name, partNumber, stock, unity, taxRate, ...additionalFields };

						responseData = await sevDeskApiRequest.call(this, 'GET', `/Part`, body);

					} else if (operation === 'get') {

						// ----------------------------------------
						//                part: get
						// ----------------------------------------

						const partId = this.getNodeParameter('partId', i);

						responseData = await sevDeskApiRequest.call(this, 'GET', `/Part/${partId}`);

					} else if (operation === 'getAll') {

						// ----------------------------------------
						//               part: getAll
						// ----------------------------------------
						const endpoint = '/Part';

						const filters = this.getNodeParameter('filters', i) as IDataObject;
						const qs = { ...filters } as IDataObject;

						const body = {};
						responseData = await sevDeskApiRequest.call(this, 'GET', endpoint, body, qs);

					} else if (operation === 'partGetStock') {

						// ----------------------------------------
						//            part: partGetStock
						// ----------------------------------------

						const partId = this.getNodeParameter('partId', i);

						const endpoint = `/Part/${partId}/getStock`;
						responseData = await sevDeskApiRequest.call(this, 'GET', endpoint);

					} else if (operation === 'update') {

						// ----------------------------------------
						//            part: update
						// ----------------------------------------

						const partId = this.getNodeParameter('partId', i);

						// additional fields
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						const body = { ...additionalFields };
						const endpoint = `/Part/${partId}`;
						responseData = await sevDeskApiRequest.call(this, 'PUT', endpoint, body);

					}

				} else if (resource === 'voucher') {

					// **********************************************************************
					//                                voucher
					// **********************************************************************

					if (operation === 'bookVoucher') {

						// ----------------------------------------
						//              voucher: book
						// ----------------------------------------

						const voucherId = this.getNodeParameter('voucherId', i);

						// required fields
						const amount = this.getNodeParameter('amount', i);
						const date = this.getNodeParameter('date', i);
						const type = this.getNodeParameter('type', i);
						const collection = this.getNodeParameter('collection', i);

						// additional fields
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						// fill body
						const body = { amount, date, type, collection, ...additionalFields };

						const endpoint = `/Voucher/${voucherId}/bookAmount`;
						responseData = await sevDeskApiRequest.call(this, 'PUT', endpoint, body);

					} else if (operation === 'createByFactory') {

						// ----------------------------------------
						//         voucher: createByFactory
						// ----------------------------------------

						// required fields
						const status = this.getNodeParameter('status', i);
						const taxType = this.getNodeParameter('taxType', i);
						const creditDebit = this.getNodeParameter('creditDebit', i);
						const voucherType = this.getNodeParameter('voucherType', i);
						const voucherPosSave = this.getNodeParameter('voucherPosSave', i);
						const voucherPosDelete = this.getNodeParameter('voucherPosDelete', i);
						const mapAll = this.getNodeParameter('mapAll', i);
						const file = this.getNodeParameter('file', i, null);

						// additional fields
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						// fill body
						const body = { status, taxType, creditDebit, voucherType, voucherPosSave, voucherPosDelete, mapAll, ...additionalFields, file };


						const endpoint = '/Voucher/Factory/saveVoucher';
						responseData = await sevDeskApiRequest.call(this, 'POST', endpoint, body);

					} else if (operation === 'get') {

						// ----------------------------------------
						//               voucher: get
						// ----------------------------------------

						const voucherId = this.getNodeParameter('voucherId', i);

						responseData = await sevDeskApiRequest.call(this, 'GET', `/Voucher/${voucherId}`);

					} else if (operation === 'getAll') {

						// ----------------------------------------
						//             voucher: getAll
						// ----------------------------------------
						const endpoint = '/Voucher';

						const filters = this.getNodeParameter('filters', i) as IDataObject;
						const qs = { ...filters } as IDataObject;

						const body = {};
						responseData = await sevDeskApiRequest.call(this, 'GET', endpoint, body, qs);

					} else if (operation === 'update') {

						// ----------------------------------------
						//        voucher: update
						// ----------------------------------------
						const voucherId = this.getNodeParameter('voucherId', i);

						// additional fields
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						// fill body
						const body = { ...additionalFields };

						const endpoint = `/Voucher/${voucherId}`;
						responseData = await sevDeskApiRequest.call(this, 'POST', endpoint, body);

					} else if (operation === 'voucherUploadFile') {

						// ----------------------------------------
						//        voucher: voucherUploadFile
						// ----------------------------------------

						const file = this.getNodeParameter('file', i) as IDataObject;

						const endpoint = '/Voucher/Factory/uploadTempFile';
						const body = { ...file };
						responseData = await sevDeskApiRequest.call(this, 'POST', endpoint, body);

					}

				} else if (resource === 'voucherPo') {

					// **********************************************************************
					//                               voucherPo
					// **********************************************************************

					if (operation === 'getAll') {

						// ----------------------------------------
						//            voucherPo: getAll
						// ----------------------------------------
						const endpoint = '/VoucherPos';

						const filters = this.getNodeParameter('filters', i) as IDataObject;
						const qs = { ...filters } as IDataObject;

						const body = {};
						responseData = await sevDeskApiRequest.call(this, 'GET', endpoint, body, qs);

					}

				}

				Array.isArray(responseData)
					? returnData.push(...responseData)
					: returnData.push(responseData);
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: (error as NodeApiError).message });
					continue;
				}
				throw error;
			}
		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
