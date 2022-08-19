import { IExecuteFunctions } from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';

import { invoiceNinjaApiRequest, invoiceNinjaApiRequestAllItems } from './GenericFunctions';

import { clientFields, clientOperations } from './ClientDescription';

import { invoiceFields, invoiceOperations } from './InvoiceDescription';

import { IClient, IContact } from './ClientInterface';

import { countryCodes } from './ISOCountryCodes';

import { IInvoice, IItem } from './invoiceInterface';

import { taskFields, taskOperations } from './TaskDescription';

import { ITask } from './TaskInterface';

import { paymentFields, paymentOperations } from './PaymentDescription';

import { IPayment } from './PaymentInterface';

import { expenseFields, expenseOperations } from './ExpenseDescription';

import { IExpense } from './ExpenseInterface';

import { quoteFields, quoteOperations } from './QuoteDescription';

import { IQuote } from './QuoteInterface';

export class InvoiceNinja implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Invoice Ninja',
		name: 'invoiceNinja',
		icon: 'file:invoiceNinja.svg',
		group: ['output'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Invoice Ninja API',
		defaults: {
			name: 'Invoice Ninja',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: [
			{
				name: 'invoiceNinjaApi',
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
						name: 'Client',
						value: 'client',
					},
					{
						name: 'Expense',
						value: 'expense',
					},
					{
						name: 'Invoice',
						value: 'invoice',
					},
					{
						name: 'Payment',
						value: 'payment',
					},
					{
						name: 'Quote',
						value: 'quote',
					},
					{
						name: 'Task',
						value: 'task',
					},
				],
				default: 'client',
			},
			...clientOperations,
			...clientFields,
			...invoiceOperations,
			...invoiceFields,
			...taskOperations,
			...taskFields,
			...paymentOperations,
			...paymentFields,
			...expenseOperations,
			...expenseFields,
			...quoteOperations,
			...quoteFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the available clients to display them to user so that he can
			// select them easily
			async getClients(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const clients = await invoiceNinjaApiRequestAllItems.call(this, 'data', 'GET', '/clients');
				for (const client of clients) {
					const clientName = client.display_name;
					const clientId = client.id;
					returnData.push({
						name: clientName,
						value: clientId,
					});
				}
				return returnData;
			},
			// Get all the available projects to display them to user so that he can
			// select them easily
			async getProjects(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const projects = await invoiceNinjaApiRequestAllItems.call(
					this,
					'data',
					'GET',
					'/projects',
				);
				for (const project of projects) {
					const projectName = project.name;
					const projectId = project.id;
					returnData.push({
						name: projectName,
						value: projectId,
					});
				}
				return returnData;
			},
			// Get all the available invoices to display them to user so that he can
			// select them easily
			async getInvoices(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const invoices = await invoiceNinjaApiRequestAllItems.call(
					this,
					'data',
					'GET',
					'/invoices',
				);
				for (const invoice of invoices) {
					const invoiceName = invoice.invoice_number;
					const invoiceId = invoice.id;
					returnData.push({
						name: invoiceName,
						value: invoiceId,
					});
				}
				return returnData;
			},
			// Get all the available country codes to display them to user so that he can
			// select them easily
			async getCountryCodes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				for (let i = 0; i < countryCodes.length; i++) {
					const countryName = countryCodes[i].name as string;
					const countryId = countryCodes[i].numeric as string;
					returnData.push({
						name: countryName,
						value: countryId,
					});
				}
				return returnData;
			},
			// Get all the available vendors to display them to user so that he can
			// select them easily
			async getVendors(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const vendors = await invoiceNinjaApiRequestAllItems.call(this, 'data', 'GET', '/vendors');
				for (const vendor of vendors) {
					const vendorName = vendor.name;
					const vendorId = vendor.id;
					returnData.push({
						name: vendorName,
						value: vendorId,
					});
				}
				return returnData;
			},
			// Get all the available expense categories to display them to user so that he can
			// select them easily
			async getExpenseCategories(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const categories = await invoiceNinjaApiRequestAllItems.call(
					this,
					'data',
					'GET',
					'/expense_categories',
				);
				for (const category of categories) {
					const categoryName = category.name;
					const categoryId = category.id;
					returnData.push({
						name: categoryName,
						value: categoryId,
					});
				}
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: IDataObject[] = [];
		const length = items.length;
		let responseData;
		const qs: IDataObject = {};
		const resource = this.getNodeParameter('resource', 0) as string;
		const operation = this.getNodeParameter('operation', 0) as string;
		for (let i = 0; i < length; i++) {
			//Routes: https://github.com/invoiceninja/invoiceninja/blob/ff455c8ed9fd0c0326956175ecd509efa8bad263/routes/api.php
			try {
				if (resource === 'client') {
					if (operation === 'create') {
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						const body: IClient = {};
						if (additionalFields.clientName) {
							body.name = additionalFields.clientName as string;
						}
						if (additionalFields.clientName) {
							body.name = additionalFields.clientName as string;
						}
						if (additionalFields.idNumber) {
							body.id_number = additionalFields.idNumber as string;
						}
						if (additionalFields.idNumber) {
							body.id_number = additionalFields.idNumber as string;
						}
						if (additionalFields.privateNotes) {
							body.private_notes = additionalFields.privateNotes as string;
						}
						if (additionalFields.vatNumber) {
							body.vat_number = additionalFields.vatNumber as string;
						}
						if (additionalFields.workPhone) {
							body.work_phone = additionalFields.workPhone as string;
						}
						if (additionalFields.website) {
							body.website = additionalFields.website as string;
						}
						const contactsValues = (this.getNodeParameter('contactsUi', i) as IDataObject)
							.contacstValues as IDataObject[];
						if (contactsValues) {
							const contacts: IContact[] = [];
							for (const contactValue of contactsValues) {
								const contact: IContact = {
									first_name: contactValue.firstName as string,
									last_name: contactValue.lastName as string,
									email: contactValue.email as string,
									phone: contactValue.phone as string,
								};
								contacts.push(contact);
							}
							body.contacts = contacts;
						}
						const shippingAddressValue = (
							this.getNodeParameter('shippingAddressUi', i) as IDataObject
						).shippingAddressValue as IDataObject;
						if (shippingAddressValue) {
							body.shipping_address1 = shippingAddressValue.streetAddress as string;
							body.shipping_address2 = shippingAddressValue.aptSuite as string;
							body.shipping_city = shippingAddressValue.city as string;
							body.shipping_state = shippingAddressValue.state as string;
							body.shipping_postal_code = shippingAddressValue.postalCode as string;
							body.shipping_country_id = parseInt(shippingAddressValue.countryCode as string, 10);
						}
						const billingAddressValue = (
							this.getNodeParameter('billingAddressUi', i) as IDataObject
						).billingAddressValue as IDataObject;
						if (billingAddressValue) {
							body.address1 = billingAddressValue.streetAddress as string;
							body.address2 = billingAddressValue.aptSuite as string;
							body.city = billingAddressValue.city as string;
							body.state = billingAddressValue.state as string;
							body.postal_code = billingAddressValue.postalCode as string;
							body.country_id = parseInt(billingAddressValue.countryCode as string, 10);
						}
						responseData = await invoiceNinjaApiRequest.call(this, 'POST', '/clients', body);
						responseData = responseData.data;
					}
					if (operation === 'get') {
						const clientId = this.getNodeParameter('clientId', i) as string;
						const options = this.getNodeParameter('options', i) as IDataObject;
						if (options.include) {
							qs.include = options.include as string;
						}
						responseData = await invoiceNinjaApiRequest.call(
							this,
							'GET',
							`/clients/${clientId}`,
							{},
							qs,
						);
						responseData = responseData.data;
					}
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
						const options = this.getNodeParameter('options', i) as IDataObject;
						if (options.include) {
							qs.include = options.include as string;
						}
						if (returnAll === true) {
							responseData = await invoiceNinjaApiRequestAllItems.call(
								this,
								'data',
								'GET',
								'/clients',
								{},
								qs,
							);
						} else {
							qs.per_page = this.getNodeParameter('limit', 0) as number;
							responseData = await invoiceNinjaApiRequest.call(this, 'GET', '/clients', {}, qs);
							responseData = responseData.data;
						}
					}
					if (operation === 'delete') {
						const clientId = this.getNodeParameter('clientId', i) as string;
						responseData = await invoiceNinjaApiRequest.call(
							this,
							'DELETE',
							`/clients/${clientId}`,
						);
						responseData = responseData.data;
					}
				}
				if (resource === 'invoice') {
					if (operation === 'create') {
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						const body: IInvoice = {};
						if (additionalFields.email) {
							body.email = additionalFields.email as string;
						}
						if (additionalFields.client) {
							body.client_id = additionalFields.client as number;
						}
						if (additionalFields.autoBill) {
							body.auto_bill = additionalFields.autoBill as boolean;
						}
						if (additionalFields.customValue1) {
							body.custom_value1 = additionalFields.customValue1 as number;
						}
						if (additionalFields.customValue2) {
							body.custom_value2 = additionalFields.customValue2 as number;
						}
						if (additionalFields.dueDate) {
							body.due_date = additionalFields.dueDate as string;
						}
						if (additionalFields.invoiceDate) {
							body.invoice_date = additionalFields.invoiceDate as string;
						}
						if (additionalFields.invoiceNumber) {
							body.invoice_number = additionalFields.invoiceNumber as string;
						}
						if (additionalFields.invoiceStatus) {
							body.invoice_status_id = additionalFields.invoiceStatus as number;
						}
						if (additionalFields.isAmountDiscount) {
							body.is_amount_discount = additionalFields.isAmountDiscount as boolean;
						}
						if (additionalFields.partial) {
							body.partial = additionalFields.partial as number;
						}
						if (additionalFields.partialDueDate) {
							body.partial_due_date = additionalFields.partialDueDate as string;
						}
						if (additionalFields.poNumber) {
							body.po_number = additionalFields.poNumber as string;
						}
						if (additionalFields.privateNotes) {
							body.private_notes = additionalFields.privateNotes as string;
						}
						if (additionalFields.publicNotes) {
							body.public_notes = additionalFields.publicNotes as string;
						}
						if (additionalFields.taxName1) {
							body.tax_name1 = additionalFields.taxName1 as string;
						}
						if (additionalFields.taxName2) {
							body.tax_name2 = additionalFields.taxName2 as string;
						}
						if (additionalFields.taxtRate1) {
							body.tax_rate1 = additionalFields.taxtRate1 as number;
						}
						if (additionalFields.taxtRate2) {
							body.tax_rate2 = additionalFields.taxtRate2 as number;
						}
						if (additionalFields.discount) {
							body.discount = additionalFields.discount as number;
						}
						if (additionalFields.paid) {
							body.paid = additionalFields.paid as number;
						}
						if (additionalFields.emailInvoice) {
							body.email_invoice = additionalFields.emailInvoice as boolean;
						}
						const invoceItemsValues = (this.getNodeParameter('invoiceItemsUi', i) as IDataObject)
							.invoiceItemsValues as IDataObject[];
						if (invoceItemsValues) {
							const items: IItem[] = [];
							for (const itemValue of invoceItemsValues) {
								const item: IItem = {
									cost: itemValue.cost as number,
									notes: itemValue.description as string,
									product_key: itemValue.service as string,
									qty: itemValue.hours as number,
									tax_rate1: itemValue.taxRate1 as number,
									tax_rate2: itemValue.taxRate2 as number,
									tax_name1: itemValue.taxName1 as string,
									tax_name2: itemValue.taxName2 as string,
								};
								items.push(item);
							}
							body.invoice_items = items;
						}
						responseData = await invoiceNinjaApiRequest.call(this, 'POST', '/invoices', body);
						responseData = responseData.data;
					}
					if (operation === 'email') {
						const invoiceId = this.getNodeParameter('invoiceId', i) as string;
						responseData = await invoiceNinjaApiRequest.call(this, 'POST', '/email_invoice', {
							id: invoiceId,
						});
					}
					if (operation === 'get') {
						const invoiceId = this.getNodeParameter('invoiceId', i) as string;
						const options = this.getNodeParameter('options', i) as IDataObject;
						if (options.include) {
							qs.include = options.include as string;
						}
						responseData = await invoiceNinjaApiRequest.call(
							this,
							'GET',
							`/invoices/${invoiceId}`,
							{},
							qs,
						);
						responseData = responseData.data;
					}
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
						const options = this.getNodeParameter('options', i) as IDataObject;
						if (options.include) {
							qs.include = options.include as string;
						}
						if (options.invoiceNumber) {
							qs.invoice_number = options.invoiceNumber as string;
						}
						if (returnAll === true) {
							responseData = await invoiceNinjaApiRequestAllItems.call(
								this,
								'data',
								'GET',
								'/invoices',
								{},
								qs,
							);
						} else {
							qs.per_page = this.getNodeParameter('limit', 0) as number;
							responseData = await invoiceNinjaApiRequest.call(this, 'GET', '/invoices', {}, qs);
							responseData = responseData.data;
						}
					}
					if (operation === 'delete') {
						const invoiceId = this.getNodeParameter('invoiceId', i) as string;
						responseData = await invoiceNinjaApiRequest.call(
							this,
							'DELETE',
							`/invoices/${invoiceId}`,
						);
						responseData = responseData.data;
					}
				}
				if (resource === 'task') {
					if (operation === 'create') {
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						const body: ITask = {};
						if (additionalFields.client) {
							body.client_id = additionalFields.client as number;
						}
						if (additionalFields.project) {
							body.project_id = additionalFields.project as number;
						}
						if (additionalFields.customValue1) {
							body.custom_value1 = additionalFields.customValue1 as string;
						}
						if (additionalFields.customValue2) {
							body.custom_value2 = additionalFields.customValue2 as string;
						}
						if (additionalFields.description) {
							body.description = additionalFields.description as string;
						}
						const timeLogsValues = (this.getNodeParameter('timeLogsUi', i) as IDataObject)
							.timeLogsValues as IDataObject[];
						if (timeLogsValues) {
							const logs: number[][] = [];
							for (const logValue of timeLogsValues) {
								let from = 0,
									to;
								if (logValue.startDate) {
									from = (new Date(logValue.startDate as string).getTime() / 1000) as number;
								}
								if (logValue.endDate) {
									to = (new Date(logValue.endDate as string).getTime() / 1000) as number;
								}
								if (logValue.duration) {
									to = from + (logValue.duration as number) * 3600;
								}
								logs.push([from as number, to as number]);
							}
							body.time_log = JSON.stringify(logs);
						}
						responseData = await invoiceNinjaApiRequest.call(this, 'POST', '/tasks', body);
						responseData = responseData.data;
					}
					if (operation === 'get') {
						const taskId = this.getNodeParameter('taskId', i) as string;
						const options = this.getNodeParameter('options', i) as IDataObject;
						if (options.include) {
							qs.include = options.include as string;
						}
						responseData = await invoiceNinjaApiRequest.call(
							this,
							'GET',
							`/tasks/${taskId}`,
							{},
							qs,
						);
						responseData = responseData.data;
					}
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
						const options = this.getNodeParameter('options', i) as IDataObject;
						if (options.include) {
							qs.include = options.include as string;
						}
						if (returnAll === true) {
							responseData = await invoiceNinjaApiRequestAllItems.call(
								this,
								'data',
								'GET',
								'/tasks',
								{},
								qs,
							);
						} else {
							qs.per_page = this.getNodeParameter('limit', 0) as number;
							responseData = await invoiceNinjaApiRequest.call(this, 'GET', '/tasks', {}, qs);
							responseData = responseData.data;
						}
					}
					if (operation === 'delete') {
						const taskId = this.getNodeParameter('taskId', i) as string;
						responseData = await invoiceNinjaApiRequest.call(this, 'DELETE', `/tasks/${taskId}`);
						responseData = responseData.data;
					}
				}
				if (resource === 'payment') {
					if (operation === 'create') {
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						const invoice = this.getNodeParameter('invoice', i) as number;
						const amount = this.getNodeParameter('amount', i) as number;
						const body: IPayment = {
							invoice_id: invoice,
							amount,
						};
						if (additionalFields.paymentType) {
							body.payment_type_id = additionalFields.paymentType as number;
						}
						if (additionalFields.transferReference) {
							body.transaction_reference = additionalFields.transferReference as string;
						}
						if (additionalFields.privateNotes) {
							body.private_notes = additionalFields.privateNotes as string;
						}
						responseData = await invoiceNinjaApiRequest.call(this, 'POST', '/payments', body);
						responseData = responseData.data;
					}
					if (operation === 'get') {
						const paymentId = this.getNodeParameter('paymentId', i) as string;
						const options = this.getNodeParameter('options', i) as IDataObject;
						if (options.include) {
							qs.include = options.include as string;
						}
						responseData = await invoiceNinjaApiRequest.call(
							this,
							'GET',
							`/payments/${paymentId}`,
							{},
							qs,
						);
						responseData = responseData.data;
					}
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
						const options = this.getNodeParameter('options', i) as IDataObject;
						if (options.include) {
							qs.include = options.include as string;
						}
						if (returnAll === true) {
							responseData = await invoiceNinjaApiRequestAllItems.call(
								this,
								'data',
								'GET',
								'/payments',
								{},
								qs,
							);
						} else {
							qs.per_page = this.getNodeParameter('limit', 0) as number;
							responseData = await invoiceNinjaApiRequest.call(this, 'GET', '/payments', {}, qs);
							responseData = responseData.data;
						}
					}
					if (operation === 'delete') {
						const paymentId = this.getNodeParameter('paymentId', i) as string;
						responseData = await invoiceNinjaApiRequest.call(
							this,
							'DELETE',
							`/payments/${paymentId}`,
						);
						responseData = responseData.data;
					}
				}
				if (resource === 'expense') {
					if (operation === 'create') {
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						const body: IExpense = {};
						if (additionalFields.amount) {
							body.amount = additionalFields.amount as number;
						}
						if (additionalFields.billable) {
							body.should_be_invoiced = additionalFields.billable as boolean;
						}
						if (additionalFields.client) {
							body.client_id = additionalFields.client as number;
						}
						if (additionalFields.customValue1) {
							body.custom_value1 = additionalFields.customValue1 as string;
						}
						if (additionalFields.customValue2) {
							body.custom_value2 = additionalFields.customValue2 as string;
						}
						if (additionalFields.category) {
							body.expense_category_id = additionalFields.category as number;
						}
						if (additionalFields.expenseDate) {
							body.expense_date = additionalFields.expenseDate as string;
						}
						if (additionalFields.paymentDate) {
							body.payment_date = additionalFields.paymentDate as string;
						}
						if (additionalFields.paymentType) {
							body.payment_type_id = additionalFields.paymentType as number;
						}
						if (additionalFields.publicNotes) {
							body.public_notes = additionalFields.publicNotes as string;
						}
						if (additionalFields.privateNotes) {
							body.private_notes = additionalFields.privateNotes as string;
						}
						if (additionalFields.taxName1) {
							body.tax_name1 = additionalFields.taxName1 as string;
						}
						if (additionalFields.taxName2) {
							body.tax_name2 = additionalFields.taxName2 as string;
						}
						if (additionalFields.taxRate1) {
							body.tax_rate1 = additionalFields.taxRate1 as number;
						}
						if (additionalFields.taxRate2) {
							body.tax_rate2 = additionalFields.taxRate2 as number;
						}
						if (additionalFields.transactionReference) {
							body.transaction_reference = additionalFields.transactionReference as string;
						}
						if (additionalFields.vendor) {
							body.vendor_id = additionalFields.vendor as number;
						}
						responseData = await invoiceNinjaApiRequest.call(this, 'POST', '/expenses', body);
						responseData = responseData.data;
					}
					if (operation === 'get') {
						const expenseId = this.getNodeParameter('expenseId', i) as string;
						responseData = await invoiceNinjaApiRequest.call(
							this,
							'GET',
							`/expenses/${expenseId}`,
							{},
							qs,
						);
						responseData = responseData.data;
					}
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
						if (returnAll === true) {
							responseData = await invoiceNinjaApiRequestAllItems.call(
								this,
								'data',
								'GET',
								'/expenses',
								{},
								qs,
							);
						} else {
							qs.per_page = this.getNodeParameter('limit', 0) as number;
							responseData = await invoiceNinjaApiRequest.call(this, 'GET', '/expenses', {}, qs);
							responseData = responseData.data;
						}
					}
					if (operation === 'delete') {
						const expenseId = this.getNodeParameter('expenseId', i) as string;
						responseData = await invoiceNinjaApiRequest.call(
							this,
							'DELETE',
							`/expenses/${expenseId}`,
						);
						responseData = responseData.data;
					}
				}
				if (resource === 'quote') {
					if (operation === 'create') {
						const additionalFields = this.getNodeParameter('additionalFields', i) as IDataObject;
						const body: IQuote = {
							is_quote: true,
						};
						if (additionalFields.client) {
							body.client_id = additionalFields.client as number;
						}
						if (additionalFields.email) {
							body.email = additionalFields.email as string;
						}
						if (additionalFields.autoBill) {
							body.auto_bill = additionalFields.autoBill as boolean;
						}
						if (additionalFields.customValue1) {
							body.custom_value1 = additionalFields.customValue1 as number;
						}
						if (additionalFields.customValue2) {
							body.custom_value2 = additionalFields.customValue2 as number;
						}
						if (additionalFields.dueDate) {
							body.due_date = additionalFields.dueDate as string;
						}
						if (additionalFields.quouteDate) {
							body.invoice_date = additionalFields.quouteDate as string;
						}
						if (additionalFields.quoteNumber) {
							body.invoice_number = additionalFields.quoteNumber as string;
						}
						if (additionalFields.invoiceStatus) {
							body.invoice_status_id = additionalFields.invoiceStatus as number;
						}
						if (additionalFields.isAmountDiscount) {
							body.is_amount_discount = additionalFields.isAmountDiscount as boolean;
						}
						if (additionalFields.partial) {
							body.partial = additionalFields.partial as number;
						}
						if (additionalFields.partialDueDate) {
							body.partial_due_date = additionalFields.partialDueDate as string;
						}
						if (additionalFields.poNumber) {
							body.po_number = additionalFields.poNumber as string;
						}
						if (additionalFields.privateNotes) {
							body.private_notes = additionalFields.privateNotes as string;
						}
						if (additionalFields.publicNotes) {
							body.public_notes = additionalFields.publicNotes as string;
						}
						if (additionalFields.taxName1) {
							body.tax_name1 = additionalFields.taxName1 as string;
						}
						if (additionalFields.taxName2) {
							body.tax_name2 = additionalFields.taxName2 as string;
						}
						if (additionalFields.taxtRate1) {
							body.tax_rate1 = additionalFields.taxtRate1 as number;
						}
						if (additionalFields.taxtRate2) {
							body.tax_rate2 = additionalFields.taxtRate2 as number;
						}
						if (additionalFields.discount) {
							body.discount = additionalFields.discount as number;
						}
						if (additionalFields.paid) {
							body.paid = additionalFields.paid as number;
						}
						if (additionalFields.emailQuote) {
							body.email_invoice = additionalFields.emailQuote as boolean;
						}
						const invoceItemsValues = (this.getNodeParameter('invoiceItemsUi', i) as IDataObject)
							.invoiceItemsValues as IDataObject[];
						if (invoceItemsValues) {
							const items: IItem[] = [];
							for (const itemValue of invoceItemsValues) {
								const item: IItem = {
									cost: itemValue.cost as number,
									notes: itemValue.description as string,
									product_key: itemValue.service as string,
									qty: itemValue.hours as number,
									tax_rate1: itemValue.taxRate1 as number,
									tax_rate2: itemValue.taxRate2 as number,
									tax_name1: itemValue.taxName1 as string,
									tax_name2: itemValue.taxName2 as string,
								};
								items.push(item);
							}
							body.invoice_items = items;
						}
						responseData = await invoiceNinjaApiRequest.call(this, 'POST', '/invoices', body);
						responseData = responseData.data;
					}
					if (operation === 'email') {
						const quoteId = this.getNodeParameter('quoteId', i) as string;
						responseData = await invoiceNinjaApiRequest.call(this, 'POST', '/email_invoice', {
							id: quoteId,
						});
					}
					if (operation === 'get') {
						const quoteId = this.getNodeParameter('quoteId', i) as string;
						const options = this.getNodeParameter('options', i) as IDataObject;
						if (options.include) {
							qs.include = options.include as string;
						}
						responseData = await invoiceNinjaApiRequest.call(
							this,
							'GET',
							`/invoices/${quoteId}`,
							{},
							qs,
						);
						responseData = responseData.data;
					}
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', 0) as boolean;
						const options = this.getNodeParameter('options', i) as IDataObject;
						if (options.include) {
							qs.include = options.include as string;
						}
						if (options.invoiceNumber) {
							qs.invoice_number = options.invoiceNumber as string;
						}
						if (returnAll === true) {
							responseData = await invoiceNinjaApiRequestAllItems.call(
								this,
								'data',
								'GET',
								'/quotes',
								{},
								qs,
							);
						} else {
							qs.per_page = this.getNodeParameter('limit', 0) as number;
							responseData = await invoiceNinjaApiRequest.call(this, 'GET', '/quotes', {}, qs);
							responseData = responseData.data;
						}
					}
					if (operation === 'delete') {
						const quoteId = this.getNodeParameter('quoteId', i) as string;
						responseData = await invoiceNinjaApiRequest.call(
							this,
							'DELETE',
							`/invoices/${quoteId}`,
						);
						responseData = responseData.data;
					}
				}
				if (Array.isArray(responseData)) {
					returnData.push.apply(returnData, responseData as IDataObject[]);
				} else {
					returnData.push(responseData as IDataObject);
				}
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ error: error.message });
					continue;
				}
				throw error;
			}
		}
		return [this.helpers.returnJsonArray(returnData)];
	}
}
