import type {
	IExecuteFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import {
	addGetAllFilterOptions,
	adjustAccountPayload,
	adjustContactPayload,
	adjustDealPayload,
	adjustInvoicePayload,
	adjustInvoicePayloadOnUpdate,
	adjustLeadPayload,
	adjustProductDetails,
	adjustProductPayload,
	adjustPurchaseOrderPayload,
	adjustQuotePayload,
	adjustSalesOrderPayload,
	adjustVendorPayload,
	getFields,
	getPicklistOptions,
	handleListing,
	throwOnEmptyUpdate,
	throwOnMissingProducts,
	toLoadOptions,
	zohoApiRequest,
	zohoApiRequestAllItems,
} from './GenericFunctions';

import type {
	CamelCaseResource,
	GetAllFilterOptions,
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
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		version: 1,
		description: 'Consume Zoho CRM API',
		defaults: {
			name: 'Zoho CRM',
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
				noDataExpression: true,
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
			// ----------------------------------------
			//               resources
			// ----------------------------------------

			async getAccounts(this: ILoadOptionsFunctions) {
				const accounts = (await zohoApiRequestAllItems.call(
					this,
					'GET',
					'/accounts',
				)) as LoadedAccounts;
				return toLoadOptions(accounts, 'Account_Name');
			},

			async getContacts(this: ILoadOptionsFunctions) {
				const contacts = (await zohoApiRequestAllItems.call(
					this,
					'GET',
					'/contacts',
				)) as LoadedContacts;
				return toLoadOptions(contacts, 'Full_Name');
			},

			async getDeals(this: ILoadOptionsFunctions) {
				const deals = (await zohoApiRequestAllItems.call(this, 'GET', '/deals')) as LoadedDeals;
				return toLoadOptions(deals, 'Deal_Name');
			},

			async getProducts(this: ILoadOptionsFunctions) {
				const products = (await zohoApiRequestAllItems.call(
					this,
					'GET',
					'/products',
				)) as LoadedProducts;
				return toLoadOptions(products, 'Product_Name');
			},

			async getVendors(this: ILoadOptionsFunctions) {
				const vendors = (await zohoApiRequestAllItems.call(
					this,
					'GET',
					'/vendors',
				)) as LoadedVendors;
				return toLoadOptions(vendors, 'Vendor_Name');
			},

			// ----------------------------------------
			//             resource fields
			// ----------------------------------------

			// standard fields - called from `makeGetAllFields`

			async getAccountFields(this: ILoadOptionsFunctions) {
				return getFields.call(this, 'account');
			},

			async getContactFields(this: ILoadOptionsFunctions) {
				return getFields.call(this, 'contact');
			},

			async getDealFields(this: ILoadOptionsFunctions) {
				return getFields.call(this, 'deal');
			},

			async getInvoiceFields(this: ILoadOptionsFunctions) {
				return getFields.call(this, 'invoice');
			},

			async getLeadFields(this: ILoadOptionsFunctions) {
				return getFields.call(this, 'lead');
			},

			async getProductFields(this: ILoadOptionsFunctions) {
				return getFields.call(this, 'product');
			},

			async getPurchaseOrderFields(this: ILoadOptionsFunctions) {
				return getFields.call(this, 'purchase_order');
			},

			async getVendorOrderFields(this: ILoadOptionsFunctions) {
				return getFields.call(this, 'vendor');
			},

			async getQuoteFields(this: ILoadOptionsFunctions) {
				return getFields.call(this, 'quote');
			},

			async getSalesOrderFields(this: ILoadOptionsFunctions) {
				return getFields.call(this, 'sales_order');
			},

			async getVendorFields(this: ILoadOptionsFunctions) {
				return getFields.call(this, 'vendor');
			},

			// custom fields

			async getCustomAccountFields(this: ILoadOptionsFunctions) {
				return getFields.call(this, 'account', { onlyCustom: true });
			},

			async getCustomContactFields(this: ILoadOptionsFunctions) {
				return getFields.call(this, 'contact', { onlyCustom: true });
			},

			async getCustomDealFields(this: ILoadOptionsFunctions) {
				return getFields.call(this, 'deal', { onlyCustom: true });
			},

			async getCustomInvoiceFields(this: ILoadOptionsFunctions) {
				return getFields.call(this, 'invoice', { onlyCustom: true });
			},

			async getCustomLeadFields(this: ILoadOptionsFunctions) {
				return getFields.call(this, 'lead', { onlyCustom: true });
			},

			async getCustomProductFields(this: ILoadOptionsFunctions) {
				return getFields.call(this, 'product', { onlyCustom: true });
			},

			async getCustomPurchaseOrderFields(this: ILoadOptionsFunctions) {
				return getFields.call(this, 'purchase_order', { onlyCustom: true });
			},

			async getCustomVendorOrderFields(this: ILoadOptionsFunctions) {
				return getFields.call(this, 'vendor', { onlyCustom: true });
			},

			async getCustomQuoteFields(this: ILoadOptionsFunctions) {
				return getFields.call(this, 'quote', { onlyCustom: true });
			},

			async getCustomSalesOrderFields(this: ILoadOptionsFunctions) {
				return getFields.call(this, 'sales_order', { onlyCustom: true });
			},

			async getCustomVendorFields(this: ILoadOptionsFunctions) {
				return getFields.call(this, 'vendor', { onlyCustom: true });
			},

			// ----------------------------------------
			//        resource picklist options
			// ----------------------------------------

			async getAccountType(this: ILoadOptionsFunctions) {
				return getPicklistOptions.call(this, 'account', 'Account_Type');
			},

			async getDealStage(this: ILoadOptionsFunctions) {
				return getPicklistOptions.call(this, 'deal', 'Stage');
			},

			async getPurchaseOrderStatus(this: ILoadOptionsFunctions) {
				return getPicklistOptions.call(this, 'purchaseOrder', 'Status');
			},

			async getSalesOrderStatus(this: ILoadOptionsFunctions) {
				return getPicklistOptions.call(this, 'salesOrder', 'Status');
			},

			async getQuoteStage(this: ILoadOptionsFunctions) {
				return getPicklistOptions.call(this, 'quote', 'Quote_Stage');
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		const resource = this.getNodeParameter('resource', 0) as CamelCaseResource;
		const operation = this.getNodeParameter('operation', 0);

		let responseData;

		for (let i = 0; i < items.length; i++) {
			// https://www.zoho.com/crm/developer/docs/api/insert-records.html
			// https://www.zoho.com/crm/developer/docs/api/get-records.html
			// https://www.zoho.com/crm/developer/docs/api/update-specific-record.html
			// https://www.zoho.com/crm/developer/docs/api/delete-specific-record.html
			// https://www.zoho.com/crm/developer/docs/api/v2/upsert-records.html

			try {
				if (resource === 'account') {
					// **********************************************************************
					//                                account
					// **********************************************************************

					// https://www.zoho.com/crm/developer/docs/api/v2/accounts-response.html
					// https://help.zoho.com/portal/en/kb/crm/customize-crm-account/customizing-fields/articles/standard-modules-fields#Accounts

					if (operation === 'create') {
						// ----------------------------------------
						//             account: create
						// ----------------------------------------

						const body: IDataObject = {
							Account_Name: this.getNodeParameter('accountName', i),
						};

						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (Object.keys(additionalFields).length) {
							Object.assign(body, adjustAccountPayload(additionalFields));
						}

						responseData = await zohoApiRequest.call(this, 'POST', '/accounts', body);
						responseData = responseData.data[0].details;
					} else if (operation === 'delete') {
						// ----------------------------------------
						//             account: delete
						// ----------------------------------------

						const accountId = this.getNodeParameter('accountId', i);

						const endpoint = `/accounts/${accountId}`;
						responseData = await zohoApiRequest.call(this, 'DELETE', endpoint);
						responseData = responseData.data[0].details;
					} else if (operation === 'get') {
						// ----------------------------------------
						//               account: get
						// ----------------------------------------

						const accountId = this.getNodeParameter('accountId', i);

						const endpoint = `/accounts/${accountId}`;
						responseData = await zohoApiRequest.call(this, 'GET', endpoint);
						responseData = responseData.data;
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//             account: getAll
						// ----------------------------------------

						const qs: IDataObject = {};
						const options = this.getNodeParameter('options', i) as GetAllFilterOptions;

						addGetAllFilterOptions(qs, options);

						responseData = await handleListing.call(this, 'GET', '/accounts', {}, qs);
					} else if (operation === 'update') {
						// ----------------------------------------
						//             account: update
						// ----------------------------------------

						const body: IDataObject = {};
						const updateFields = this.getNodeParameter('updateFields', i);

						if (Object.keys(updateFields).length) {
							Object.assign(body, adjustAccountPayload(updateFields));
						} else {
							throwOnEmptyUpdate.call(this, resource);
						}

						const accountId = this.getNodeParameter('accountId', i);

						const endpoint = `/accounts/${accountId}`;
						responseData = await zohoApiRequest.call(this, 'PUT', endpoint, body);
						responseData = responseData.data[0].details;
					} else if (operation === 'upsert') {
						// ----------------------------------------
						//             account: upsert
						// ----------------------------------------

						const body: IDataObject = {
							Account_Name: this.getNodeParameter('accountName', i),
						};

						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (Object.keys(additionalFields).length) {
							Object.assign(body, adjustAccountPayload(additionalFields));
						}

						responseData = await zohoApiRequest.call(this, 'POST', '/accounts/upsert', body);
						responseData = responseData.data[0].details;
					}
				} else if (resource === 'contact') {
					// **********************************************************************
					//                                contact
					// **********************************************************************

					// https://www.zoho.com/crm/developer/docs/api/v2/contacts-response.html
					// https://help.zoho.com/portal/en/kb/crm/customize-crm-account/customizing-fields/articles/standard-modules-fields#Contacts

					if (operation === 'create') {
						// ----------------------------------------
						//             contact: create
						// ----------------------------------------

						const body: IDataObject = {
							Last_Name: this.getNodeParameter('lastName', i),
						};

						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (Object.keys(additionalFields).length) {
							Object.assign(body, adjustContactPayload(additionalFields));
						}

						responseData = await zohoApiRequest.call(this, 'POST', '/contacts', body);
						responseData = responseData.data[0].details;
					} else if (operation === 'delete') {
						// ----------------------------------------
						//             contact: delete
						// ----------------------------------------

						const contactId = this.getNodeParameter('contactId', i);

						const endpoint = `/contacts/${contactId}`;
						responseData = await zohoApiRequest.call(this, 'DELETE', endpoint);
						responseData = responseData.data[0].details;
					} else if (operation === 'get') {
						// ----------------------------------------
						//               contact: get
						// ----------------------------------------

						const contactId = this.getNodeParameter('contactId', i);

						const endpoint = `/contacts/${contactId}`;
						responseData = await zohoApiRequest.call(this, 'GET', endpoint);
						responseData = responseData.data;
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//             contact: getAll
						// ----------------------------------------

						const qs: IDataObject = {};
						const options = this.getNodeParameter('options', i) as GetAllFilterOptions;

						addGetAllFilterOptions(qs, options);

						responseData = await handleListing.call(this, 'GET', '/contacts', {}, qs);
					} else if (operation === 'update') {
						// ----------------------------------------
						//             contact: update
						// ----------------------------------------

						const body: IDataObject = {};
						const updateFields = this.getNodeParameter('updateFields', i);

						if (Object.keys(updateFields).length) {
							Object.assign(body, adjustContactPayload(updateFields));
						} else {
							throwOnEmptyUpdate.call(this, resource);
						}

						const contactId = this.getNodeParameter('contactId', i);

						const endpoint = `/contacts/${contactId}`;
						responseData = await zohoApiRequest.call(this, 'PUT', endpoint, body);
						responseData = responseData.data[0].details;
					} else if (operation === 'upsert') {
						// ----------------------------------------
						//             contact: upsert
						// ----------------------------------------

						const body: IDataObject = {
							Last_Name: this.getNodeParameter('lastName', i),
						};

						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (Object.keys(additionalFields).length) {
							Object.assign(body, adjustContactPayload(additionalFields));
						}

						responseData = await zohoApiRequest.call(this, 'POST', '/contacts/upsert', body);
						responseData = responseData.data[0].details;
					}
				} else if (resource === 'deal') {
					// **********************************************************************
					//                                deal
					// **********************************************************************

					// https://www.zoho.com/crm/developer/docs/api/v2/deals-response.html
					// https://help.zoho.com/portal/en/kb/crm/customize-crm-account/customizing-fields/articles/standard-modules-fields#Deals

					if (operation === 'create') {
						// ----------------------------------------
						//               deal: create
						// ----------------------------------------

						const body: IDataObject = {
							Deal_Name: this.getNodeParameter('dealName', i),
							Stage: this.getNodeParameter('stage', i),
						};

						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (Object.keys(additionalFields).length) {
							Object.assign(body, adjustDealPayload(additionalFields));
						}

						responseData = await zohoApiRequest.call(this, 'POST', '/deals', body);
						responseData = responseData.data[0].details;
					} else if (operation === 'delete') {
						// ----------------------------------------
						//               deal: delete
						// ----------------------------------------

						const dealId = this.getNodeParameter('dealId', i);

						responseData = await zohoApiRequest.call(this, 'DELETE', `/deals/${dealId}`);
						responseData = responseData.data[0].details;
					} else if (operation === 'get') {
						// ----------------------------------------
						//                deal: get
						// ----------------------------------------

						const dealId = this.getNodeParameter('dealId', i);

						responseData = await zohoApiRequest.call(this, 'GET', `/deals/${dealId}`);
						responseData = responseData.data;
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//               deal: getAll
						// ----------------------------------------

						const qs: IDataObject = {};
						const options = this.getNodeParameter('options', i) as GetAllFilterOptions;

						addGetAllFilterOptions(qs, options);

						responseData = await handleListing.call(this, 'GET', '/deals', {}, qs);
					} else if (operation === 'update') {
						// ----------------------------------------
						//               deal: update
						// ----------------------------------------

						const body: IDataObject = {};
						const updateFields = this.getNodeParameter('updateFields', i);

						if (Object.keys(updateFields).length) {
							Object.assign(body, adjustDealPayload(updateFields));
						} else {
							throwOnEmptyUpdate.call(this, resource);
						}

						const dealId = this.getNodeParameter('dealId', i);

						responseData = await zohoApiRequest.call(this, 'PUT', `/deals/${dealId}`, body);
						responseData = responseData.data[0].details;
					} else if (operation === 'upsert') {
						// ----------------------------------------
						//              deal: upsert
						// ----------------------------------------

						const body: IDataObject = {
							Deal_Name: this.getNodeParameter('dealName', i),
							Stage: this.getNodeParameter('stage', i),
						};

						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (Object.keys(additionalFields).length) {
							Object.assign(body, adjustDealPayload(additionalFields));
						}

						responseData = await zohoApiRequest.call(this, 'POST', '/deals/upsert', body);
						responseData = responseData.data[0].details;
					}
				} else if (resource === 'invoice') {
					// **********************************************************************
					//                                invoice
					// **********************************************************************

					// https://www.zoho.com/crm/developer/docs/api/v2/invoices-response.html
					// https://help.zoho.com/portal/en/kb/crm/customize-crm-account/customizing-fields/articles/standard-modules-fields#Invoices

					if (operation === 'create') {
						// ----------------------------------------
						//             invoice: create
						// ----------------------------------------

						const productDetails = this.getNodeParameter('Product_Details', i) as ProductDetails;

						throwOnMissingProducts.call(this, resource, productDetails);

						const body: IDataObject = {
							Subject: this.getNodeParameter('subject', i),
							Product_Details: adjustProductDetails(productDetails),
						};

						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (Object.keys(additionalFields).length) {
							Object.assign(body, adjustInvoicePayload(additionalFields));
						}

						responseData = await zohoApiRequest.call(this, 'POST', '/invoices', body);
						responseData = responseData.data[0].details;
					} else if (operation === 'delete') {
						// ----------------------------------------
						//             invoice: delete
						// ----------------------------------------

						const invoiceId = this.getNodeParameter('invoiceId', i);

						const endpoint = `/invoices/${invoiceId}`;
						responseData = await zohoApiRequest.call(this, 'DELETE', endpoint);
						responseData = responseData.data[0].details;
					} else if (operation === 'get') {
						// ----------------------------------------
						//               invoice: get
						// ----------------------------------------

						const invoiceId = this.getNodeParameter('invoiceId', i);

						const endpoint = `/invoices/${invoiceId}`;
						responseData = await zohoApiRequest.call(this, 'GET', endpoint);
						responseData = responseData.data;
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//             invoice: getAll
						// ----------------------------------------

						const qs: IDataObject = {};
						const options = this.getNodeParameter('options', i) as GetAllFilterOptions;

						addGetAllFilterOptions(qs, options);

						responseData = await handleListing.call(this, 'GET', '/invoices', {}, qs);
					} else if (operation === 'update') {
						// ----------------------------------------
						//             invoice: update
						// ----------------------------------------

						const body: IDataObject = {};
						const updateFields = this.getNodeParameter('updateFields', i);

						if (Object.keys(updateFields).length) {
							Object.assign(body, adjustInvoicePayloadOnUpdate(updateFields));
						} else {
							throwOnEmptyUpdate.call(this, resource);
						}

						const invoiceId = this.getNodeParameter('invoiceId', i);

						const endpoint = `/invoices/${invoiceId}`;

						responseData = await zohoApiRequest.call(this, 'PUT', endpoint, body);
						responseData = responseData.data[0].details;
					} else if (operation === 'upsert') {
						// ----------------------------------------
						//             invoice: upsert
						// ----------------------------------------

						const productDetails = this.getNodeParameter('Product_Details', i) as ProductDetails;

						const body: IDataObject = {
							Subject: this.getNodeParameter('subject', i),
							Product_Details: adjustProductDetails(productDetails),
						};

						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (Object.keys(additionalFields).length) {
							Object.assign(body, adjustInvoicePayload(additionalFields));
						}

						responseData = await zohoApiRequest.call(this, 'POST', '/invoices/upsert', body);
						responseData = responseData.data[0].details;
					}
				} else if (resource === 'lead') {
					// **********************************************************************
					//                                  lead
					// **********************************************************************

					// https://www.zoho.com/crm/developer/docs/api/v2/leads-response.html
					// https://help.zoho.com/portal/en/kb/crm/customize-crm-account/customizing-fields/articles/standard-modules-fields#Leads

					if (operation === 'create') {
						// ----------------------------------------
						//               lead: create
						// ----------------------------------------

						const body: IDataObject = {
							Company: this.getNodeParameter('Company', i),
							Last_Name: this.getNodeParameter('lastName', i),
						};

						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (Object.keys(additionalFields).length) {
							Object.assign(body, adjustLeadPayload(additionalFields));
						}

						responseData = await zohoApiRequest.call(this, 'POST', '/leads', body);
						responseData = responseData.data[0].details;
					} else if (operation === 'delete') {
						// ----------------------------------------
						//               lead: delete
						// ----------------------------------------

						const leadId = this.getNodeParameter('leadId', i);

						responseData = await zohoApiRequest.call(this, 'DELETE', `/leads/${leadId}`);
						responseData = responseData.data[0].details;
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

						const qs: IDataObject = {};
						const options = this.getNodeParameter('options', i) as GetAllFilterOptions;

						addGetAllFilterOptions(qs, options);

						responseData = await handleListing.call(this, 'GET', '/leads', {}, qs);
					} else if (operation === 'getFields') {
						// ----------------------------------------
						//            lead: getFields
						// ----------------------------------------

						responseData = await zohoApiRequest.call(
							this,
							'GET',
							'/settings/fields',
							{},
							{ module: 'leads' },
						);
						responseData = responseData.fields;
					} else if (operation === 'update') {
						// ----------------------------------------
						//               lead: update
						// ----------------------------------------

						const body: IDataObject = {};
						const updateFields = this.getNodeParameter('updateFields', i);

						if (Object.keys(updateFields).length) {
							Object.assign(body, adjustLeadPayload(updateFields));
						} else {
							throwOnEmptyUpdate.call(this, resource);
						}

						const leadId = this.getNodeParameter('leadId', i);

						responseData = await zohoApiRequest.call(this, 'PUT', `/leads/${leadId}`, body);
						responseData = responseData.data[0].details;
					} else if (operation === 'upsert') {
						// ----------------------------------------
						//              lead: upsert
						// ----------------------------------------

						const body: IDataObject = {
							Company: this.getNodeParameter('Company', i),
							Last_Name: this.getNodeParameter('lastName', i),
						};

						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (Object.keys(additionalFields).length) {
							Object.assign(body, adjustLeadPayload(additionalFields));
						}

						responseData = await zohoApiRequest.call(this, 'POST', '/leads/upsert', body);
						responseData = responseData.data[0].details;
					}
				} else if (resource === 'product') {
					// **********************************************************************
					//                              product
					// **********************************************************************

					// https://www.zoho.com/crm/developer/docs/api/v2/products-response.html
					// https://help.zoho.com/portal/en/kb/crm/customize-crm-account/customizing-fields/articles/standard-modules-fields#Products

					if (operation === 'create') {
						// ----------------------------------------
						//             product: create
						// ----------------------------------------

						const body: IDataObject = {
							Product_Name: this.getNodeParameter('productName', i),
						};

						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (Object.keys(additionalFields).length) {
							Object.assign(body, adjustProductPayload(additionalFields));
						}

						responseData = await zohoApiRequest.call(this, 'POST', '/products', body);
						responseData = responseData.data[0].details;
					} else if (operation === 'delete') {
						// ----------------------------------------
						//            product: delete
						// ----------------------------------------

						const productId = this.getNodeParameter('productId', i);

						const endpoint = `/products/${productId}`;
						responseData = await zohoApiRequest.call(this, 'DELETE', endpoint);
						responseData = responseData.data[0].details;
					} else if (operation === 'get') {
						// ----------------------------------------
						//              product: get
						// ----------------------------------------

						const productId = this.getNodeParameter('productId', i);

						const endpoint = `/products/${productId}`;
						responseData = await zohoApiRequest.call(this, 'GET', endpoint);
						responseData = responseData.data;
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//            product: getAll
						// ----------------------------------------

						const qs: IDataObject = {};
						const options = this.getNodeParameter('options', i) as GetAllFilterOptions;

						addGetAllFilterOptions(qs, options);

						responseData = await handleListing.call(this, 'GET', '/products', {}, qs);
					} else if (operation === 'update') {
						// ----------------------------------------
						//            product: update
						// ----------------------------------------

						const body: IDataObject = {};
						const updateFields = this.getNodeParameter('updateFields', i);

						if (Object.keys(updateFields).length) {
							Object.assign(body, adjustProductPayload(updateFields));
						} else {
							throwOnEmptyUpdate.call(this, resource);
						}

						const productId = this.getNodeParameter('productId', i);

						const endpoint = `/products/${productId}`;
						responseData = await zohoApiRequest.call(this, 'PUT', endpoint, body);
						responseData = responseData.data[0].details;
					} else if (operation === 'upsert') {
						// ----------------------------------------
						//             product: upsert
						// ----------------------------------------

						const body: IDataObject = {
							Product_Name: this.getNodeParameter('productName', i),
						};

						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (Object.keys(additionalFields).length) {
							Object.assign(body, adjustProductPayload(additionalFields));
						}

						responseData = await zohoApiRequest.call(this, 'POST', '/products/upsert', body);
						responseData = responseData.data[0].details;
					}
				} else if (resource === 'purchaseOrder') {
					// **********************************************************************
					//                             purchaseOrder
					// **********************************************************************

					// https://www.zoho.com/crm/developer/docs/api/v2/purchase-orders-response.html
					// https://help.zoho.com/portal/en/kb/crm/customize-crm-account/customizing-fields/articles/standard-modules-fields#Purchase_Order

					if (operation === 'create') {
						// ----------------------------------------
						//          purchaseOrder: create
						// ----------------------------------------

						const productDetails = this.getNodeParameter('Product_Details', i) as ProductDetails;

						throwOnMissingProducts.call(this, resource, productDetails);

						const body: IDataObject = {
							Subject: this.getNodeParameter('subject', i),
							Vendor_Name: { id: this.getNodeParameter('vendorId', i) },
							Product_Details: adjustProductDetails(productDetails),
						};

						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (Object.keys(additionalFields).length) {
							Object.assign(body, adjustPurchaseOrderPayload(additionalFields));
						}

						responseData = await zohoApiRequest.call(this, 'POST', '/purchase_orders', body);
						responseData = responseData.data[0].details;
					} else if (operation === 'delete') {
						// ----------------------------------------
						//          purchaseOrder: delete
						// ----------------------------------------

						const purchaseOrderId = this.getNodeParameter('purchaseOrderId', i);

						const endpoint = `/purchase_orders/${purchaseOrderId}`;
						responseData = await zohoApiRequest.call(this, 'DELETE', endpoint);
						responseData = responseData.data[0].details;
					} else if (operation === 'get') {
						// ----------------------------------------
						//            purchaseOrder: get
						// ----------------------------------------

						const purchaseOrderId = this.getNodeParameter('purchaseOrderId', i);

						const endpoint = `/purchase_orders/${purchaseOrderId}`;
						responseData = await zohoApiRequest.call(this, 'GET', endpoint);
						responseData = responseData.data;
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//          purchaseOrder: getAll
						// ----------------------------------------

						const qs: IDataObject = {};
						const options = this.getNodeParameter('options', i) as GetAllFilterOptions;

						addGetAllFilterOptions(qs, options);

						responseData = await handleListing.call(this, 'GET', '/purchase_orders', {}, qs);
					} else if (operation === 'update') {
						// ----------------------------------------
						//          purchaseOrder: update
						// ----------------------------------------

						const body: IDataObject = {};
						const updateFields = this.getNodeParameter('updateFields', i);

						if (Object.keys(updateFields).length) {
							Object.assign(body, adjustPurchaseOrderPayload(updateFields));
						} else {
							throwOnEmptyUpdate.call(this, resource);
						}

						const purchaseOrderId = this.getNodeParameter('purchaseOrderId', i);

						const endpoint = `/purchase_orders/${purchaseOrderId}`;
						responseData = await zohoApiRequest.call(this, 'PUT', endpoint, body);
						responseData = responseData.data[0].details;
					} else if (operation === 'upsert') {
						// ----------------------------------------
						//          purchaseOrder: upsert
						// ----------------------------------------

						const productDetails = this.getNodeParameter('Product_Details', i) as ProductDetails;

						const body: IDataObject = {
							Subject: this.getNodeParameter('subject', i),
							Vendor_Name: { id: this.getNodeParameter('vendorId', i) },
							Product_Details: adjustProductDetails(productDetails),
						};

						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (Object.keys(additionalFields).length) {
							Object.assign(body, adjustPurchaseOrderPayload(additionalFields));
						}

						responseData = await zohoApiRequest.call(this, 'POST', '/purchase_orders/upsert', body);
						responseData = responseData.data[0].details;
					}
				} else if (resource === 'quote') {
					// **********************************************************************
					//                                 quote
					// **********************************************************************

					// https://www.zoho.com/crm/developer/docs/api/v2/quotes-response.html
					// https://help.zoho.com/portal/en/kb/crm/customize-crm-account/customizing-fields/articles/standard-modules-fields#Quotes

					if (operation === 'create') {
						// ----------------------------------------
						//              quote: create
						// ----------------------------------------

						const productDetails = this.getNodeParameter('Product_Details', i) as ProductDetails;

						throwOnMissingProducts.call(this, resource, productDetails);

						const body: IDataObject = {
							Subject: this.getNodeParameter('subject', i),
							Product_Details: adjustProductDetails(productDetails),
						};

						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (Object.keys(additionalFields).length) {
							Object.assign(body, adjustQuotePayload(additionalFields));
						}

						responseData = await zohoApiRequest.call(this, 'POST', '/quotes', body);
						responseData = responseData.data[0].details;
					} else if (operation === 'delete') {
						// ----------------------------------------
						//              quote: delete
						// ----------------------------------------

						const quoteId = this.getNodeParameter('quoteId', i);

						responseData = await zohoApiRequest.call(this, 'DELETE', `/quotes/${quoteId}`);
						responseData = responseData.data[0].details;
					} else if (operation === 'get') {
						// ----------------------------------------
						//                quote: get
						// ----------------------------------------

						const quoteId = this.getNodeParameter('quoteId', i);

						responseData = await zohoApiRequest.call(this, 'GET', `/quotes/${quoteId}`);
						responseData = responseData.data;
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//              quote: getAll
						// ----------------------------------------

						const qs: IDataObject = {};
						const options = this.getNodeParameter('options', i) as GetAllFilterOptions;

						addGetAllFilterOptions(qs, options);

						responseData = await handleListing.call(this, 'GET', '/quotes', {}, qs);
					} else if (operation === 'update') {
						// ----------------------------------------
						//              quote: update
						// ----------------------------------------

						const body: IDataObject = {};
						const updateFields = this.getNodeParameter('updateFields', i);

						if (Object.keys(updateFields).length) {
							Object.assign(body, adjustQuotePayload(updateFields));
						} else {
							throwOnEmptyUpdate.call(this, resource);
						}

						const quoteId = this.getNodeParameter('quoteId', i);

						responseData = await zohoApiRequest.call(this, 'PUT', `/quotes/${quoteId}`, body);
						responseData = responseData.data[0].details;
					} else if (operation === 'upsert') {
						// ----------------------------------------
						//              quote: upsert
						// ----------------------------------------

						const productDetails = this.getNodeParameter('Product_Details', i) as ProductDetails;

						const body: IDataObject = {
							Subject: this.getNodeParameter('subject', i),
							Product_Details: adjustProductDetails(productDetails),
						};

						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (Object.keys(additionalFields).length) {
							Object.assign(body, adjustQuotePayload(additionalFields));
						}

						responseData = await zohoApiRequest.call(this, 'POST', '/quotes/upsert', body);
						responseData = responseData.data[0].details;
					}
				} else if (resource === 'salesOrder') {
					// **********************************************************************
					//                               salesOrder
					// **********************************************************************

					// https://www.zoho.com/crm/developer/docs/api/v2/sales-orders-response.html
					// https://help.zoho.com/portal/en/kb/crm/customize-crm-account/customizing-fields/articles/standard-modules-fields#Sales_Orders

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

						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (Object.keys(additionalFields).length) {
							Object.assign(body, adjustSalesOrderPayload(additionalFields));
						}

						responseData = await zohoApiRequest.call(this, 'POST', '/sales_orders', body);
						responseData = responseData.data[0].details;
					} else if (operation === 'delete') {
						// ----------------------------------------
						//            salesOrder: delete
						// ----------------------------------------

						const salesOrderId = this.getNodeParameter('salesOrderId', i);

						const endpoint = `/sales_orders/${salesOrderId}`;
						responseData = await zohoApiRequest.call(this, 'DELETE', endpoint);
						responseData = responseData.data[0].details;
					} else if (operation === 'get') {
						// ----------------------------------------
						//             salesOrder: get
						// ----------------------------------------

						const salesOrderId = this.getNodeParameter('salesOrderId', i);

						const endpoint = `/sales_orders/${salesOrderId}`;
						responseData = await zohoApiRequest.call(this, 'GET', endpoint);
						responseData = responseData.data;
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//            salesOrder: getAll
						// ----------------------------------------

						const qs: IDataObject = {};
						const options = this.getNodeParameter('options', i) as GetAllFilterOptions;

						addGetAllFilterOptions(qs, options);

						responseData = await handleListing.call(this, 'GET', '/sales_orders', {}, qs);
					} else if (operation === 'update') {
						// ----------------------------------------
						//            salesOrder: update
						// ----------------------------------------

						const body: IDataObject = {};
						const updateFields = this.getNodeParameter('updateFields', i);

						if (Object.keys(updateFields).length) {
							Object.assign(body, adjustSalesOrderPayload(updateFields));
						} else {
							throwOnEmptyUpdate.call(this, resource);
						}

						const salesOrderId = this.getNodeParameter('salesOrderId', i);

						const endpoint = `/sales_orders/${salesOrderId}`;
						responseData = await zohoApiRequest.call(this, 'PUT', endpoint, body);
						responseData = responseData.data[0].details;
					} else if (operation === 'upsert') {
						// ----------------------------------------
						//           salesOrder: upsert
						// ----------------------------------------

						const productDetails = this.getNodeParameter('Product_Details', i) as ProductDetails;

						const body: IDataObject = {
							Account_Name: { id: this.getNodeParameter('accountId', i) },
							Subject: this.getNodeParameter('subject', i),
							Product_Details: adjustProductDetails(productDetails),
						};

						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (Object.keys(additionalFields).length) {
							Object.assign(body, adjustSalesOrderPayload(additionalFields));
						}

						responseData = await zohoApiRequest.call(this, 'POST', '/sales_orders/upsert', body);
						responseData = responseData.data[0].details;
					}
				} else if (resource === 'vendor') {
					// **********************************************************************
					//                               vendor
					// **********************************************************************

					// https://www.zoho.com/crm/developer/docs/api/v2/vendors-response.html
					// https://help.zoho.com/portal/en/kb/crm/customize-crm-account/customizing-fields/articles/standard-modules-fields#Vendors

					if (operation === 'create') {
						// ----------------------------------------
						//            vendor: create
						// ----------------------------------------

						const body: IDataObject = {
							Vendor_Name: this.getNodeParameter('vendorName', i),
						};

						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (Object.keys(additionalFields).length) {
							Object.assign(body, adjustVendorPayload(additionalFields));
						}

						responseData = await zohoApiRequest.call(this, 'POST', '/vendors', body);
						responseData = responseData.data[0].details;
					} else if (operation === 'delete') {
						// ----------------------------------------
						//            vendor: delete
						// ----------------------------------------

						const vendorId = this.getNodeParameter('vendorId', i);

						const endpoint = `/vendors/${vendorId}`;
						responseData = await zohoApiRequest.call(this, 'DELETE', endpoint);
						responseData = responseData.data[0].details;
					} else if (operation === 'get') {
						// ----------------------------------------
						//             vendor: get
						// ----------------------------------------

						const vendorId = this.getNodeParameter('vendorId', i);

						const endpoint = `/vendors/${vendorId}`;
						responseData = await zohoApiRequest.call(this, 'GET', endpoint);
						responseData = responseData.data;
					} else if (operation === 'getAll') {
						// ----------------------------------------
						//            vendor: getAll
						// ----------------------------------------

						const qs: IDataObject = {};
						const options = this.getNodeParameter('options', i) as GetAllFilterOptions;

						addGetAllFilterOptions(qs, options);

						responseData = await handleListing.call(this, 'GET', '/vendors', {}, qs);
					} else if (operation === 'update') {
						// ----------------------------------------
						//            vendor: update
						// ----------------------------------------

						const body: IDataObject = {};
						const updateFields = this.getNodeParameter('updateFields', i);

						if (Object.keys(updateFields).length) {
							Object.assign(body, adjustVendorPayload(updateFields));
						} else {
							throwOnEmptyUpdate.call(this, resource);
						}

						const vendorId = this.getNodeParameter('vendorId', i);

						const endpoint = `/vendors/${vendorId}`;
						responseData = await zohoApiRequest.call(this, 'PUT', endpoint, body);
						responseData = responseData.data[0].details;
					} else if (operation === 'upsert') {
						// ----------------------------------------
						//             vendor: upsert
						// ----------------------------------------

						const body: IDataObject = {
							Vendor_Name: this.getNodeParameter('vendorName', i),
						};

						const additionalFields = this.getNodeParameter('additionalFields', i);

						if (Object.keys(additionalFields).length) {
							Object.assign(body, adjustVendorPayload(additionalFields));
						}

						responseData = await zohoApiRequest.call(this, 'POST', '/vendors/upsert', body);
						responseData = responseData.data[0].details;
					}
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message, json: {} });
					continue;
				}
				throw error;
			}
			const executionData = this.helpers.constructExecutionMetaData(
				this.helpers.returnJsonArray(responseData as IDataObject),
				{ itemData: { item: i } },
			);
			returnData.push(...executionData);
		}

		return this.prepareOutputData(returnData);
	}
}
