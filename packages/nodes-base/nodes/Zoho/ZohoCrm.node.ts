import {
	IExecuteFunctions,
} from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	NodeApiError,
	NodeOperationError,
} from 'n8n-workflow';

import {
	adjustAccountPayload,
	adjustContactPayload,
	adjustDealPayload,
	adjustInvoicePayload,
	adjustLeadPayload,
	adjustProductDetails,
	adjustPurchaseOrderPayload,
	adjustQuotePayload,
	adjustSalesOrderPayload,
	adjustVendorPayload,
	handleListing,
	throwOnEmptyUpdate,
	throwOnErrorStatus,
	toLoadOptions,
	zohoApiRequest,
	zohoApiRequestAllItems,
} from './GenericFunctions';

import {
	LoadedAccounts,
	LoadedContacts,
	LoadedDeals,
	LoadedProducts,
	LoadedVendors,
	ProductDetails,
} from './types';

import {
	accountFields,
	accountOperations,
	contactFields,
	contactOperations,
	dealFields,
	dealOperations,
	invoiceFields,
	invoiceOperations,
	leadFields,
	leadOperations,
	productFields,
	productOperations,
	purchaseOrderFields,
	purchaseOrderOperations,
	quoteFields,
	quoteOperations,
	salesOrderFields,
	salesOrderOperations,
	vendorFields,
	vendorOperations,
} from './descriptions';

export class ZohoCrm implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Zoho CRM',
		name: 'zohoCrm',
		icon: 'file:zoho.svg',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume the Zoho API',
		defaults: {
			name: 'Zoho',
			color: '#CE2232',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'zohoOAuth2Api',
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
						name: 'Account',
						value: 'account',
					},
					{
						name: 'Contact',
						value: 'contact',
					},
					{
						name: 'Deal',
						value: 'deal',
					},
					{
						name: 'Invoice',
						value: 'invoice',
					},
					{
						name: 'Lead',
						value: 'lead',
					},
					{
						name: 'Product',
						value: 'product',
					},
					{
						name: 'Purchase Order',
						value: 'purchaseOrder',
					},
					{
						name: 'Quote',
						value: 'quote',
					},
					{
						name: 'Sales Order',
						value: 'salesOrder',
					},
					{
						name: 'Vendor',
						value: 'vendor',
					},
				],
				default: 'account',
				description: 'Resource to consume',
			},
			...accountOperations,
			...accountFields,
			...contactOperations,
			...contactFields,
			...dealOperations,
			...dealFields,
			...invoiceOperations,
			...invoiceFields,
			...leadOperations,
			...leadFields,
			...productOperations,
			...productFields,
			...purchaseOrderOperations,
			...purchaseOrderFields,
			...quoteOperations,
			...quoteFields,
			...salesOrderOperations,
			...salesOrderFields,
			...vendorOperations,
			...vendorFields,
		],
	};

	methods = {
		loadOptions: {
			async getAccounts(this: ILoadOptionsFunctions) {
				const accounts = await zohoApiRequestAllItems.call(this, 'GET', '/accounts') as LoadedAccounts;
				return toLoadOptions(accounts, 'Account_Name');
			},

			async getContacts(this: ILoadOptionsFunctions) {
				const contacts = await zohoApiRequestAllItems.call(this, 'GET', '/contacts') as LoadedContacts;
				return toLoadOptions(contacts, 'Full_Name');
			},

			async getDeals(this: ILoadOptionsFunctions) {
				const deals = await zohoApiRequestAllItems.call(this, 'GET', '/deals') as LoadedDeals;
				return toLoadOptions(deals, 'Deal_Name');
			},

			async getProducts(this: ILoadOptionsFunctions) {
				const products = await zohoApiRequestAllItems.call(this, 'GET', '/products') as LoadedProducts;
				return toLoadOptions(products, 'Product_Name');
			},

			async getVendors(this: ILoadOptionsFunctions) {
				const vendors = await zohoApiRequestAllItems.call(this, 'GET', '/vendors') as LoadedVendors;
				return toLoadOptions(vendors, 'Vendor_Name');
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

			// https://www.zoho.com/crm/developer/docs/api/insert-records.html
			// https://www.zoho.com/crm/developer/docs/api/get-records.html
			// https://www.zoho.com/crm/developer/docs/api/update-specific-record.html
			// https://www.zoho.com/crm/developer/docs/api/delete-specific-record.html

			try {

				if (resource === 'account') {

					// **********************************************************************
					//                                account
					// **********************************************************************

					// https://www.zoho.com/crm/developer/docs/api/v2/accounts-response.html

					if (operation === 'create') {

						// ----------------------------------------
						//             account: create
						// ----------------------------------------

						const body: IDataObject = {
							Account_Name: this.getNodeParameter('accountName', i),
						};

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						if (Object.keys(additionalFields).length) {
							Object.assign(body, adjustAccountPayload(additionalFields));
						}

						responseData = await zohoApiRequest.call(this, 'POST', '/accounts', body);

					} else if (operation === 'delete') {

						// ----------------------------------------
						//             account: delete
						// ----------------------------------------

						const accountId = this.getNodeParameter('accountId', i);

						const endpoint = `/accounts/${accountId}`;
						responseData = await zohoApiRequest.call(this, 'DELETE', endpoint);

					} else if (operation === 'get') {

						// ----------------------------------------
						//               account: get
						// ----------------------------------------

						const accountId = this.getNodeParameter('accountId', i);

						const endpoint = `/accounts/${accountId}`;
						responseData = await zohoApiRequest.call(this, 'GET', endpoint);

					} else if (operation === 'getAll') {

						// ----------------------------------------
						//             account: getAll
						// ----------------------------------------

						responseData = await handleListing.call(this, 'GET', '/accounts');

					} else if (operation === 'update') {

						// ----------------------------------------
						//             account: update
						// ----------------------------------------

						const body: IDataObject = {};
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

						if (Object.keys(updateFields).length) {
							Object.assign(body, adjustAccountPayload(updateFields));
						} else {
							throwOnEmptyUpdate.call(this, resource);
						}

						const accountId = this.getNodeParameter('accountId', i);

						const endpoint = `/accounts/${accountId}`;
						responseData = await zohoApiRequest.call(this, 'PUT', endpoint, body);

					}

				} else if (resource === 'contact') {

					// **********************************************************************
					//                                contact
					// **********************************************************************

					// https://www.zoho.com/crm/developer/docs/api/v2/contacts-response.html

					if (operation === 'create') {

						// ----------------------------------------
						//             contact: create
						// ----------------------------------------

						const body: IDataObject = {
							Last_Name: this.getNodeParameter('lastName', i),
						};

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						if (Object.keys(additionalFields).length) {
							Object.assign(body, adjustContactPayload(additionalFields));
						}

						responseData = await zohoApiRequest.call(this, 'POST', '/contacts', body);

					} else if (operation === 'delete') {

						// ----------------------------------------
						//             contact: delete
						// ----------------------------------------

						const contactId = this.getNodeParameter('contactId', i);

						const endpoint = `/contacts/${contactId}`;
						responseData = await zohoApiRequest.call(this, 'DELETE', endpoint);

					} else if (operation === 'get') {

						// ----------------------------------------
						//               contact: get
						// ----------------------------------------

						const contactId = this.getNodeParameter('contactId', i);

						const endpoint = `/contacts/${contactId}`;
						responseData = await zohoApiRequest.call(this, 'GET', endpoint);

					} else if (operation === 'getAll') {

						// ----------------------------------------
						//             contact: getAll
						// ----------------------------------------

						responseData = await handleListing.call(this, 'GET', '/contacts');

					} else if (operation === 'update') {

						// ----------------------------------------
						//             contact: update
						// ----------------------------------------

						const body: IDataObject = {};
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

						if (Object.keys(updateFields).length) {
							Object.assign(body, adjustContactPayload(updateFields));
						} else {
							throwOnEmptyUpdate.call(this, resource);
						}

						const contactId = this.getNodeParameter('contactId', i);

						const endpoint = `/contacts/${contactId}`;
						responseData = await zohoApiRequest.call(this, 'PUT', endpoint, body);

					}

				} else if (resource === 'deal') {

					// **********************************************************************
					//                                deal
					// **********************************************************************

					// https://www.zoho.com/crm/developer/docs/api/v2/deals-response.html

					if (operation === 'create') {

						// ----------------------------------------
						//               deal: create
						// ----------------------------------------

						const body: IDataObject = {
							Deal_Name: this.getNodeParameter('dealName', i),
							Stage: this.getNodeParameter('stage', i),
						};

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						if (Object.keys(additionalFields).length) {
							Object.assign(body, adjustDealPayload(additionalFields));
						}

						responseData = await zohoApiRequest.call(this, 'POST', '/deals', body);

					} else if (operation === 'delete') {

						// ----------------------------------------
						//               deal: delete
						// ----------------------------------------

						const dealId = this.getNodeParameter('dealId', i);

						responseData = await zohoApiRequest.call(this, 'DELETE', `/deals/${dealId}`);

					} else if (operation === 'get') {

						// ----------------------------------------
						//                deal: get
						// ----------------------------------------

						const dealId = this.getNodeParameter('dealId', i);

						responseData = await zohoApiRequest.call(this, 'GET', `/deals/${dealId}`);

					} else if (operation === 'getAll') {

						// ----------------------------------------
						//               deal: getAll
						// ----------------------------------------

						responseData = await handleListing.call(this, 'GET', '/deals');

					} else if (operation === 'update') {

						// ----------------------------------------
						//               deal: update
						// ----------------------------------------

						const body: IDataObject = {};
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

						if (Object.keys(updateFields).length) {
							Object.assign(body, adjustDealPayload(updateFields));
						} else {
							throwOnEmptyUpdate.call(this, resource);
						}

						const dealId = this.getNodeParameter('dealId', i);

						responseData = await zohoApiRequest.call(this, 'PUT', `/deals/${dealId}`, body);

					}

				} else if (resource === 'invoice') {

					// **********************************************************************
					//                                invoice
					// **********************************************************************

					// https://www.zoho.com/crm/developer/docs/api/v2/invoices-response.html

					if (operation === 'create') {

						// ----------------------------------------
						//             invoice: create
						// ----------------------------------------

						const productDetails = this.getNodeParameter('Product_Details', i) as ProductDetails;

						const body: IDataObject = {
							Subject: this.getNodeParameter('subject', i),
							Product_Details: adjustProductDetails(productDetails),
						};

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						if (Object.keys(additionalFields).length) {
							Object.assign(body, adjustInvoicePayload(additionalFields));
						}

						responseData = await zohoApiRequest.call(this, 'POST', '/invoices', body);

					} else if (operation === 'delete') {

						// ----------------------------------------
						//             invoice: delete
						// ----------------------------------------

						const invoiceId = this.getNodeParameter('invoiceId', i);

						const endpoint = `/invoices/${invoiceId}`;
						responseData = await zohoApiRequest.call(this, 'DELETE', endpoint);

					} else if (operation === 'get') {

						// ----------------------------------------
						//               invoice: get
						// ----------------------------------------

						const invoiceId = this.getNodeParameter('invoiceId', i);

						const endpoint = `/invoices/${invoiceId}`;
						responseData = await zohoApiRequest.call(this, 'GET', endpoint);

					} else if (operation === 'getAll') {

						// ----------------------------------------
						//             invoice: getAll
						// ----------------------------------------

						responseData = await handleListing.call(this, 'GET', '/invoices');

					} else if (operation === 'update') {

						// ----------------------------------------
						//             invoice: update
						// ----------------------------------------

						const body: IDataObject = {};
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

						if (Object.keys(updateFields).length) {
							Object.assign(body, adjustInvoicePayload(updateFields));
						} else {
							throwOnEmptyUpdate.call(this, resource);
						}

						const invoiceId = this.getNodeParameter('invoiceId', i);

						const endpoint = `/invoices/${invoiceId}`;
						responseData = await zohoApiRequest.call(this, 'PUT', endpoint, body);

					}

				} else if (resource === 'lead') {

					// **********************************************************************
					//                                  lead
					// **********************************************************************

					// https://www.zoho.com/crm/developer/docs/api/v2/leads-response.html

					if (operation === 'create') {

						// ----------------------------------------
						//               lead: create
						// ----------------------------------------

						const body: IDataObject = {
							Company: this.getNodeParameter('Company', i),
							Last_Name: this.getNodeParameter('lastName', i),
						};

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						if (Object.keys(additionalFields).length) {
							Object.assign(body, adjustLeadPayload(additionalFields));
						}

						responseData = await zohoApiRequest.call(this, 'POST', '/leads', body);

					} else if (operation === 'delete') {

						// ----------------------------------------
						//               lead: delete
						// ----------------------------------------

						const leadId = this.getNodeParameter('leadId', i);

						responseData = await zohoApiRequest.call(this, 'DELETE', `/leads/${leadId}`);

					} else if (operation === 'get') {

						// ----------------------------------------
						//                lead: get
						// ----------------------------------------

						const leadId = this.getNodeParameter('leadId', i);

						responseData = await zohoApiRequest.call(this, 'GET', `/leads/${leadId}`);

					} else if (operation === 'getAll') {

						// ----------------------------------------
						//               lead: getAll
						// ----------------------------------------

						responseData = await handleListing.call(this, 'GET', '/leads');

					} else if (operation === 'update') {

						// ----------------------------------------
						//               lead: update
						// ----------------------------------------

						const body: IDataObject = {};
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

						if (Object.keys(updateFields).length) {
							Object.assign(body, adjustLeadPayload(updateFields));
						} else {
							throwOnEmptyUpdate.call(this, resource);
						}

						const leadId = this.getNodeParameter('leadId', i);

						responseData = await zohoApiRequest.call(this, 'PUT', `/leads/${leadId}`, body);

					}

				} else if (resource === 'product') {

					// **********************************************************************
					//                              product
					// **********************************************************************

					// https://www.zoho.com/crm/developer/docs/api/v2/products-response.html

					if (operation === 'create') {

						// ----------------------------------------
						//             product: create
						// ----------------------------------------

						const body: IDataObject = {
							Product_Name: this.getNodeParameter('productName', i),
						};

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						if (Object.keys(additionalFields).length) {
							Object.assign(body, additionalFields);
						}

						responseData = await zohoApiRequest.call(this, 'POST', '/products', body);

					} else if (operation === 'delete') {

						// ----------------------------------------
						//            product: delete
						// ----------------------------------------

						const productId = this.getNodeParameter('productId', i);

						const endpoint = `/products/${productId}`;
						responseData = await zohoApiRequest.call(this, 'DELETE', endpoint);

					} else if (operation === 'get') {

						// ----------------------------------------
						//              product: get
						// ----------------------------------------

						const productId = this.getNodeParameter('productId', i);

						const endpoint = `/products/${productId}`;
						responseData = await zohoApiRequest.call(this, 'GET', endpoint);

					} else if (operation === 'getAll') {

						// ----------------------------------------
						//            product: getAll
						// ----------------------------------------

						responseData = await handleListing.call(this, 'GET', '/products');

					} else if (operation === 'update') {

						// ----------------------------------------
						//            product: update
						// ----------------------------------------

						const body: IDataObject = {};
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

						if (Object.keys(updateFields).length) {
							Object.assign(body, updateFields);
						} else {
							throwOnEmptyUpdate.call(this, resource);
						}

						const productId = this.getNodeParameter('productId', i);

						const endpoint = `/products/${productId}`;
						responseData = await zohoApiRequest.call(this, 'PUT', endpoint, body);

					}

				} else if (resource === 'purchaseOrder') {

					// **********************************************************************
					//                             purchaseOrder
					// **********************************************************************

					// https://www.zoho.com/crm/developer/docs/api/v2/purchase-orders-response.html

					if (operation === 'create') {

						// ----------------------------------------
						//          purchaseOrder: create
						// ----------------------------------------

						const productDetails = this.getNodeParameter('Product_Details', i) as ProductDetails;

						const body: IDataObject = {
							Subject: this.getNodeParameter('subject', i),
							Vendor_Name: { id: this.getNodeParameter('vendorId', i) },
							Product_Details: adjustProductDetails(productDetails),
						};

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						if (Object.keys(additionalFields).length) {
							Object.assign(body, adjustPurchaseOrderPayload(additionalFields));
						}

						responseData = await zohoApiRequest.call(this, 'POST', '/purchase_orders', body);

					} else if (operation === 'delete') {

						// ----------------------------------------
						//          purchaseOrder: delete
						// ----------------------------------------

						const purchaseOrderId = this.getNodeParameter('purchaseOrderId', i);

						const endpoint = `/purchase_orders/${purchaseOrderId}`;
						responseData = await zohoApiRequest.call(this, 'DELETE', endpoint);

					} else if (operation === 'get') {

						// ----------------------------------------
						//            purchaseOrder: get
						// ----------------------------------------

						const purchaseOrderId = this.getNodeParameter('purchaseOrderId', i);

						const endpoint = `/purchase_orders/${purchaseOrderId}`;
						responseData = await zohoApiRequest.call(this, 'GET', endpoint);

					} else if (operation === 'getAll') {

						// ----------------------------------------
						//          purchaseOrder: getAll
						// ----------------------------------------

						responseData = await handleListing.call(this, 'GET', '/purchase_orders');

					} else if (operation === 'update') {

						// ----------------------------------------
						//          purchaseOrder: update
						// ----------------------------------------

						const body: IDataObject = {};
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

						if (Object.keys(updateFields).length) {
							Object.assign(body, adjustPurchaseOrderPayload(updateFields));
						} else {
							throwOnEmptyUpdate.call(this, resource);
						}

						const purchaseOrderId = this.getNodeParameter('purchaseOrderId', i);

						const endpoint = `/purchase_orders/${purchaseOrderId}`;
						responseData = await zohoApiRequest.call(this, 'PUT', endpoint, body);

					}

				} else if (resource === 'quote') {

					// **********************************************************************
					//                                 quote
					// **********************************************************************

					// https://www.zoho.com/crm/developer/docs/api/v2/quotes-response.html

					if (operation === 'create') {

						// ----------------------------------------
						//              quote: create
						// ----------------------------------------

						const productDetails = this.getNodeParameter('Product_Details', i) as ProductDetails;

						const body: IDataObject = {
							Subject: this.getNodeParameter('subject', i),
							Product_Details: adjustProductDetails(productDetails),
						};

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						if (Object.keys(additionalFields).length) {
							Object.assign(body, adjustQuotePayload(additionalFields));
						}

						responseData = await zohoApiRequest.call(this, 'POST', '/quotes', body);

					} else if (operation === 'delete') {

						// ----------------------------------------
						//              quote: delete
						// ----------------------------------------

						const quoteId = this.getNodeParameter('quoteId', i);

						responseData = await zohoApiRequest.call(this, 'DELETE', `/quotes/${quoteId}`);

					} else if (operation === 'get') {

						// ----------------------------------------
						//                quote: get
						// ----------------------------------------

						const quoteId = this.getNodeParameter('quoteId', i);

						responseData = await zohoApiRequest.call(this, 'GET', `/quotes/${quoteId}`);

					} else if (operation === 'getAll') {

						// ----------------------------------------
						//              quote: getAll
						// ----------------------------------------

						responseData = await handleListing.call(this, 'GET', '/quotes');

					} else if (operation === 'update') {

						// ----------------------------------------
						//              quote: update
						// ----------------------------------------

						const body: IDataObject = {};
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

						if (Object.keys(updateFields).length) {
							Object.assign(body, adjustQuotePayload(updateFields));
						} else {
							throwOnEmptyUpdate.call(this, resource);
						}

						const quoteId = this.getNodeParameter('quoteId', i);

						responseData = await zohoApiRequest.call(this, 'PUT', `/quotes/${quoteId}`, body);

					}

				} else if (resource === 'salesOrder') {

					// **********************************************************************
					//                               salesOrder
					// **********************************************************************

					// https://www.zoho.com/crm/developer/docs/api/v2/sales-orders-response.html

					if (operation === 'create') {

						// ----------------------------------------
						//            salesOrder: create
						// ----------------------------------------

						const productDetails = this.getNodeParameter('Product_Details', i) as ProductDetails;

						const body: IDataObject = {
							Account_Name: { id: this.getNodeParameter('accountId', i) },
							Subject: this.getNodeParameter('subject', i),
							Product_Details: adjustProductDetails(productDetails),
						};

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						if (Object.keys(additionalFields).length) {
							Object.assign(body, adjustSalesOrderPayload(additionalFields));
						}

						responseData = await zohoApiRequest.call(this, 'POST', '/sales_orders', body);

					} else if (operation === 'delete') {

						// ----------------------------------------
						//            salesOrder: delete
						// ----------------------------------------

						const salesOrderId = this.getNodeParameter('salesOrderId', i);

						const endpoint = `/sales_orders/${salesOrderId}`;
						responseData = await zohoApiRequest.call(this, 'DELETE', endpoint);

					} else if (operation === 'get') {

						// ----------------------------------------
						//             salesOrder: get
						// ----------------------------------------

						const salesOrderId = this.getNodeParameter('salesOrderId', i);

						const endpoint = `/sales_orders/${salesOrderId}`;
						responseData = await zohoApiRequest.call(this, 'GET', endpoint);

					} else if (operation === 'getAll') {

						// ----------------------------------------
						//            salesOrder: getAll
						// ----------------------------------------

						responseData = await handleListing.call(this, 'GET', '/sales_orders');

					} else if (operation === 'update') {

						// ----------------------------------------
						//            salesOrder: update
						// ----------------------------------------

						const body: IDataObject = {};
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

						if (Object.keys(updateFields).length) {
							Object.assign(body, adjustSalesOrderPayload(updateFields));
						} else {
							throwOnEmptyUpdate.call(this, resource);
						}

						const salesOrderId = this.getNodeParameter('salesOrderId', i);

						const endpoint = `/sales_orders/${salesOrderId}`;
						responseData = await zohoApiRequest.call(this, 'PUT', endpoint, body);

					}

				} else if (resource === 'vendor') {

					// **********************************************************************
					//                               vendor
					// **********************************************************************

					// https://www.zoho.com/crm/developer/docs/api/v2/vendors-response.html

					if (operation === 'create') {

						// ----------------------------------------
						//            vendor: create
						// ----------------------------------------

						const body: IDataObject = {
							Vendor_Name: this.getNodeParameter('vendorName', i),
						};

						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;

						if (Object.keys(additionalFields).length) {
							Object.assign(body, adjustVendorPayload(additionalFields));
						}

						responseData = await zohoApiRequest.call(this, 'POST', '/vendors', body);

					} else if (operation === 'delete') {

						// ----------------------------------------
						//            vendor: delete
						// ----------------------------------------

						const vendorId = this.getNodeParameter('vendorId', i);

						const endpoint = `/vendors/${vendorId}`;
						responseData = await zohoApiRequest.call(this, 'DELETE', endpoint);

					} else if (operation === 'get') {

						// ----------------------------------------
						//             vendor: get
						// ----------------------------------------

						const vendorId = this.getNodeParameter('vendorId', i);

						const endpoint = `/vendors/${vendorId}`;
						responseData = await zohoApiRequest.call(this, 'GET', endpoint);

					} else if (operation === 'getAll') {

						// ----------------------------------------
						//            vendor: getAll
						// ----------------------------------------

						responseData = await handleListing.call(this, 'GET', '/vendors');

					} else if (operation === 'update') {

						// ----------------------------------------
						//            vendor: update
						// ----------------------------------------

						const body: IDataObject = {};
						const updateFields = this.getNodeParameter('updateFields', i) as IDataObject;

						if (Object.keys(updateFields).length) {
							Object.assign(body, adjustVendorPayload(updateFields));
						} else {
							throwOnEmptyUpdate.call(this, resource);
						}

						const vendorId = this.getNodeParameter('vendorId', i);

						const endpoint = `/vendors/${vendorId}`;
						responseData = await zohoApiRequest.call(this, 'PUT', endpoint, body);

					}

				}

			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
					continue;
				}

				throw error;
			}

			Array.isArray(responseData)
				? returnData.push(...responseData)
				: returnData.push(responseData);

		}

		return [this.helpers.returnJsonArray(returnData)];
	}
}
