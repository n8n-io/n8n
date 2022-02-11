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
	invoicePoFields,
	invoicePoOperations,
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
						name: 'InvoicePo',
						value: 'invoicePo',
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
			...invoicePoOperations,
			...invoicePoFields,
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

						const body = {};
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

						const body = {};
						responseData = await sevDeskApiRequest.call(this, 'GET', '/CheckAccount', body);

					} else if (operation === 'update') {

						// ----------------------------------------
						//           checkAccount: update
						// ----------------------------------------

						const checkAccountId = this.getNodeParameter('checkAccountId', i);

						const endpoint = `/CheckAccount/${checkAccountId}`;
						const body = {};
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

						const endpoint = '/CheckAccountTransaction/{id}/bookCollective';
						const body = {};
						responseData = await sevDeskApiRequest.call(this, 'PUT', endpoint, body);

					} else if (operation === 'getAll') {

						// ----------------------------------------
						//     checkAccountTransaction: getAll
						// ----------------------------------------

						const qs = {} as IDataObject;
						const filters = this.getNodeParameter('filters', i) as IDataObject;

						if (Object.keys(filters).length) {
							Object.assign(qs, filters);
						}

						const endpoint = '/CheckAccountTransaction';
						const body = {};
						responseData = await sevDeskApiRequest.call(this, 'GET', endpoint, body, qs);

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

					} else if (operation === 'getAll') {

						// ----------------------------------------
						//         communicationWay: getAll
						// ----------------------------------------

						const qs = {} as IDataObject;
						const filters = this.getNodeParameter('filters', i) as IDataObject;

						if (Object.keys(filters).length) {
							Object.assign(qs, filters);
						}

						const body = {};
						responseData = await sevDeskApiRequest.call(this, 'GET', '/CommunicationWay', body, qs);

					}
				} else if (resource === 'contact') {

					// **********************************************************************
					//                                contact
					// **********************************************************************

					if (operation === 'contactAddAddress') {

						// ----------------------------------------
						//        contact: contactAddAddress
						// ----------------------------------------

						const contactId = this.getNodeParameter('contactId', i);

						const endpoint = `/Contact/${contactId}/addAddress`;
						const body = {};
						responseData = await sevDeskApiRequest.call(this, 'POST', endpoint, body);

					} else if (operation === 'contactAddEmail') {

						// ----------------------------------------
						//         contact: contactAddEmail
						// ----------------------------------------

						const contactId = this.getNodeParameter('contactId', i);

						const endpoint = `/Contact/${contactId}/addEmail`;
						const body = {};
						responseData = await sevDeskApiRequest.call(this, 'POST', endpoint, body);

					} else if (operation === 'contactAddPhone') {

						// ----------------------------------------
						//         contact: contactAddPhone
						// ----------------------------------------

						const contactId = this.getNodeParameter('contactId', i);

						const endpoint = `/Contact/${contactId}/addPhone`;
						const body = {};
						responseData = await sevDeskApiRequest.call(this, 'POST', endpoint, body);

					} else if (operation === 'contactCustomerNumberAvailabilityCheck') {

						// ----------------------------------------
						// contact: contactCustomerNumberAvailabilityCheck
						// ----------------------------------------

						const qs = {} as IDataObject;
						const filters = this.getNodeParameter('filters', i) as IDataObject;

						if (Object.keys(filters).length) {
							Object.assign(qs, filters);
						}

						const endpoint = '/Contact/Mapper/checkCustomerNumberAvailability';
						responseData = await sevDeskApiRequest.call(this, 'GET', endpoint, {}, qs);

					} else if (operation === 'contactGetCommunicationWays') {

						// ----------------------------------------
						//   contact: contactGetCommunicationWays
						// ----------------------------------------

						const contactId = this.getNodeParameter('contactId', i);

						const endpoint = `/Contact/${contactId}/getCommunicationWays`;
						responseData = await sevDeskApiRequest.call(this, 'GET', endpoint);

					} else if (operation === 'get') {

						// ----------------------------------------
						//               contact: get
						// ----------------------------------------

						const contactId = this.getNodeParameter('contactId', i);

						const body = {};
						responseData = await sevDeskApiRequest.call(this, 'GET', `/Contact/${contactId}`, body);

					} else if (operation === 'getAll') {

						// ----------------------------------------
						//             contact: getAll
						// ----------------------------------------

						const qs = {} as IDataObject;
						const filters = this.getNodeParameter('filters', i) as IDataObject;

						if (Object.keys(filters).length) {
							Object.assign(qs, filters);
						}

						const body = {};
						responseData = await sevDeskApiRequest.call(this, 'GET', '/Contact', body, qs);

					} else if (operation === 'getNextCustomerNumber') {

						// ----------------------------------------
						//      contact: getNextCustomerNumber
						// ----------------------------------------

						const endpoint = '/Contact/Factory/getNextCustomerNumber';
						responseData = await sevDeskApiRequest.call(this, 'GET', endpoint);

					}

				} else if (resource === 'contactAddress') {

					// **********************************************************************
					//                             contactAddress
					// **********************************************************************

					if (operation === 'create') {

						// ----------------------------------------
						//          contactAddress: create
						// ----------------------------------------

						const body = {};
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

						const endpoint = '/Invoice/Factory/saveInvoice';
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
						const { invoicePosSave, invoicePosDelete } = this.getNodeParameter('invoicePositions', i) as any;
						const { discountSave, discountDelete } = this.getNodeParameter('discounts', i) as any;

						// additional fields
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;


						const body = {
							objectName, contact, invoiceDate, discount, deliveryDate, status, smallSettlement,
							contactPerson, taxRate, taxText, taxType, invoiceType, currency, mapAll,
							invoicePosSave, invoicePosDelete, discountSave, discountDelete,
							...additionalFields,
						};
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

						const qs = {} as IDataObject;
						const filters = this.getNodeParameter('filters', i, []) as IDataObject;

						if (Object.keys(filters).length) {
							Object.assign(qs, filters);
						}

						const body = {};
						responseData = await sevDeskApiRequest.call(this, 'GET', '/Invoice', body, qs);

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

				} else if (resource === 'invoicePo') {

					// **********************************************************************
					//                               invoicePo
					// **********************************************************************

					if (operation === 'creates') {

						// ----------------------------------------
						//            invoicePo: creates
						// ----------------------------------------

						const body = {};
						responseData = await sevDeskApiRequest.call(this, 'POST', '/InvoicePos', body);

					}

				} else if (resource === 'order') {

					// **********************************************************************
					//                                 order
					// **********************************************************************

					if (operation === 'delete') {

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

						const qs = {} as IDataObject;
						const filters = this.getNodeParameter('filters', i) as IDataObject;

						if (Object.keys(filters).length) {
							Object.assign(qs, filters);
						}

						const body = {};
						responseData = await sevDeskApiRequest.call(this, 'GET', '/Order', body, qs);

					}

				} else if (resource === 'orderPo') {

					// **********************************************************************
					//                                orderPo
					// **********************************************************************

					if (operation === 'getAll') {

						// ----------------------------------------
						//             orderPo: getAll
						// ----------------------------------------

						const qs = {} as IDataObject;
						const filters = this.getNodeParameter('filters', i) as IDataObject;

						if (Object.keys(filters).length) {
							Object.assign(qs, filters);
						}

						const body = {};
						responseData = await sevDeskApiRequest.call(this, 'GET', '/OrderPos', body, qs);

					}

				} else if (resource === 'part') {

					// **********************************************************************
					//                                  part
					// **********************************************************************

					if (operation === 'get') {

						// ----------------------------------------
						//                part: get
						// ----------------------------------------

						const partId = this.getNodeParameter('partId', i);

						const body = {};
						responseData = await sevDeskApiRequest.call(this, 'GET', `/Part/${partId}`, body);

					} else if (operation === 'getAll') {

						// ----------------------------------------
						//               part: getAll
						// ----------------------------------------

						const qs = {} as IDataObject;
						const filters = this.getNodeParameter('filters', i) as IDataObject;

						if (Object.keys(filters).length) {
							Object.assign(qs, filters);
						}

						const body = {};
						responseData = await sevDeskApiRequest.call(this, 'GET', '/Part', body, qs);

					} else if (operation === 'partGetStock') {

						// ----------------------------------------
						//            part: partGetStock
						// ----------------------------------------

						const partId = this.getNodeParameter('partId', i);

						const endpoint = `/Part/${partId}/getStock`;
						responseData = await sevDeskApiRequest.call(this, 'GET', endpoint);

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

						const endpoint = `/Voucher/${voucherId}/bookAmount`;
						const body = {};
						responseData = await sevDeskApiRequest.call(this, 'PUT', endpoint, body);

					} else if (operation === 'createByFactory') {

						// ----------------------------------------
						//         voucher: createByFactory
						// ----------------------------------------

						const endpoint = '/Voucher/Factory/saveVoucher';
						const body = {};
						responseData = await sevDeskApiRequest.call(this, 'POST', endpoint, body);

					} else if (operation === 'get') {

						// ----------------------------------------
						//               voucher: get
						// ----------------------------------------

						const voucherId = this.getNodeParameter('voucherId', i);

						const body = {};
						responseData = await sevDeskApiRequest.call(this, 'GET', `/Voucher/${voucherId}`, body);

					} else if (operation === 'getAll') {

						// ----------------------------------------
						//             voucher: getAll
						// ----------------------------------------

						const qs = {} as IDataObject;
						const filters = this.getNodeParameter('filters', i) as IDataObject;

						if (Object.keys(filters).length) {
							Object.assign(qs, filters);
						}

						const body = {};
						responseData = await sevDeskApiRequest.call(this, 'GET', '/Voucher', body, qs);

					} else if (operation === 'voucherUploadFile') {

						// ----------------------------------------
						//        voucher: voucherUploadFile
						// ----------------------------------------

						const endpoint = '/Voucher/Factory/uploadTempFile';
						const body = {};
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

						const qs = {} as IDataObject;
						const filters = this.getNodeParameter('filters', i) as IDataObject;

						if (Object.keys(filters).length) {
							Object.assign(qs, filters);
						}

						responseData = await sevDeskApiRequest.call(this, 'GET', '/VoucherPos', {}, qs);

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
