import type {
	IExecuteFunctions,
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodePropertyOptions,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes } from 'n8n-workflow';

import { isoCountryCodes } from '@utils/ISOCountryCodes';

import { bankTransactionFields, bankTransactionOperations } from './BankTransactionDescription';
import type { IBankTransaction, IBankTransactions } from './BankTransactionInterface';
import { clientFields, clientOperations } from './ClientDescription';
import type { IClient, IContact } from './ClientInterface';
import { expenseFields, expenseOperations } from './ExpenseDescription';
import type { IExpense } from './ExpenseInterface';
import { invoiceNinjaApiRequest, invoiceNinjaApiRequestAllItems } from './GenericFunctions';
import { invoiceFields, invoiceOperations } from './InvoiceDescription';
import type { IInvoice, IItem } from './invoiceInterface';
import { paymentFields, paymentOperations } from './PaymentDescription';
import type { IPayment } from './PaymentInterface';
import { quoteFields, quoteOperations } from './QuoteDescription';
import type { IQuote } from './QuoteInterface';
import { taskFields, taskOperations } from './TaskDescription';
import type { ITask } from './TaskInterface';

export class InvoiceNinja implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Invoice Ninja',
		name: 'invoiceNinja',
		icon: 'file:invoiceNinja.svg',
		group: ['output'],
		version: [1, 2],
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: 'Consume Invoice Ninja API',
		defaults: {
			name: 'Invoice Ninja',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'invoiceNinjaApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'API Version',
				name: 'apiVersion',
				type: 'options',
				isNodeSetting: true,
				displayOptions: {
					show: {
						'@version': [1],
					},
				},
				options: [
					{
						name: 'Version 4',
						value: 'v4',
					},
					{
						name: 'Version 5',
						value: 'v5',
					},
				],
				default: 'v4',
			},
			{
				displayName: 'API Version',
				name: 'apiVersion',
				type: 'options',
				isNodeSetting: true,
				displayOptions: {
					show: {
						'@version': [2],
					},
				},
				options: [
					{
						name: 'Version 4',
						value: 'v4',
					},
					{
						name: 'Version 5',
						value: 'v5',
					},
				],
				default: 'v5',
			},
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Bank Transaction',
						value: 'bank_transaction',
						displayOptions: {
							show: {
								apiVersion: ['v5'],
							},
						},
					},
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
			...bankTransactionOperations,
			...bankTransactionFields,
		],
	};

	methods = {
		loadOptions: {
			// Get all the available clients to display them to user so that they can
			// select them easily
			async getClients(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const clients = await invoiceNinjaApiRequestAllItems.call(this, 'data', 'GET', '/clients');
				for (const client of clients) {
					const clientName = client.display_name as string;
					const clientId = client.id as string;
					returnData.push({
						name: clientName,
						value: clientId,
					});
				}
				return returnData;
			},
			// Get all the available projects to display them to user so that they can
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
					const projectName = project.name as string;
					const projectId = project.id as string;
					returnData.push({
						name: projectName,
						value: projectId,
					});
				}
				return returnData;
			},
			// Get all the available invoices to display them to user so that they can
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
					const invoiceName = (invoice.invoice_number || invoice.number) as string;
					const invoiceId = invoice.id as string;
					returnData.push({
						name: invoiceName,
						value: invoiceId,
					});
				}
				return returnData;
			},
			// Get all the available country codes to display them to user so that they can
			// select them easily
			async getCountryCodes(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				for (let i = 0; i < isoCountryCodes.length; i++) {
					const countryName = isoCountryCodes[i].name;
					const countryId = isoCountryCodes[i].numeric;
					returnData.push({
						name: countryName,
						value: countryId,
					});
				}
				return returnData;
			},
			// Get all the available vendors to display them to user so that they can
			// select them easily
			async getVendors(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const vendors = await invoiceNinjaApiRequestAllItems.call(this, 'data', 'GET', '/vendors');
				for (const vendor of vendors) {
					const vendorName = vendor.name as string;
					const vendorId = vendor.id as string;
					returnData.push({
						name: vendorName,
						value: vendorId,
					});
				}
				return returnData;
			},
			// Get all the available expense categories to display them to user so that they can
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
					const categoryName = category.name as string;
					const categoryId = category.id as string;
					returnData.push({
						name: categoryName,
						value: categoryId,
					});
				}
				return returnData;
			},
			// Get all the available bank integrations to display them to user so that they can
			// select them easily
			async getBankIntegrations(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				let banks = await invoiceNinjaApiRequestAllItems.call(
					this,
					'data',
					'GET',
					'/bank_integrations',
				);
				banks = banks.filter((e) => !e.is_deleted);
				for (const bank of banks) {
					const providerName = bank.provider_name as string;
					const accountName = bank.bank_account_name as string;
					const bankId = bank.id as string;
					returnData.push({
						name:
							providerName != accountName
								? `${providerName} - ${accountName}`
								: accountName || providerName,
						value: bankId,
					});
				}
				return returnData;
			},
			// Get all the matchable payments to display them to user so that they can
			// select them easily
			async getPayments(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const qs: IDataObject = {};
				// Only select payments that can be matched to transactions
				qs.match_transactions = true;
				const payments = await invoiceNinjaApiRequestAllItems.call(
					this,
					'data',
					'GET',
					'/payments',
					{},
					qs,
				);
				for (const payment of payments) {
					const paymentName = [payment.number, payment.date, payment.amount]
						.filter((e) => e)
						.join(' - ');
					const paymentId = payment.id as string;
					returnData.push({
						name: paymentName,
						value: paymentId,
					});
				}
				return returnData;
			},
			// Get all the currencies to display them to user so that they can
			// select them easily
			async getCurrencies(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];

				const statics = await invoiceNinjaApiRequestAllItems.call(this, 'data', 'GET', '/statics');

				Object.entries(statics)
					.filter(([key]) => key === 'currencies')
					.forEach(([key, value]) => {
						if (key === 'currencies' && Array.isArray(value)) {
							for (const currency of value) {
								const currencyName = [currency.number, currency.code].filter((e) => e).join(' - ');
								const currencyId = currency.id as string;
								returnData.push({
									name: currencyName,
									value: currencyId,
								});
							}
						}
					});
				return returnData;
			},
		},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		const qs: IDataObject = {};

		let responseData;

		const resource = this.getNodeParameter('resource', 0);
		const operation = this.getNodeParameter('operation', 0);
		const apiVersion = this.getNodeParameter('apiVersion', 0) as string;

		for (let i = 0; i < length; i++) {
			//Routes: https://github.com/invoiceninja/invoiceninja/blob/ff455c8ed9fd0c0326956175ecd509efa8bad263/routes/api.php
			try {
				if (resource === 'client') {
					if (operation === 'create') {
						const additionalFields = this.getNodeParameter('additionalFields', i);
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
						responseData = await invoiceNinjaApiRequest.call(
							this,
							'POST',
							'/clients',
							body as IDataObject,
						);
						responseData = responseData.data;
					}
					if (operation === 'get') {
						const clientId = this.getNodeParameter('clientId', i) as string;
						const options = this.getNodeParameter('options', i);
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
						const returnAll = this.getNodeParameter('returnAll', 0);
						const options = this.getNodeParameter('options', i);
						if (options.include) {
							qs.include = options.include as string;
						}
						if (options.status) {
							qs.status = options.status as string;
						}
						if (options.createdAt) {
							qs.created_at = options.createdAt as string;
						}
						if (options.updatedAt) {
							qs.updated_at = options.updatedAt as string;
						}
						if (options.isDeleted) {
							qs.is_deleted = options.isDeleted as boolean;
						}
						if (returnAll) {
							responseData = await invoiceNinjaApiRequestAllItems.call(
								this,
								'data',
								'GET',
								'/clients',
								{},
								qs,
							);
						} else {
							qs.per_page = this.getNodeParameter('limit', 0);
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
						const additionalFields = this.getNodeParameter('additionalFields', i);
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
							if (apiVersion === 'v4') {
								body.invoice_number = additionalFields.invoiceNumber as string;
							} else if (apiVersion === 'v5') {
								body.number = additionalFields.invoiceNumber as string;
							}
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
						if (additionalFields.taxRate1) {
							body.tax_rate1 = additionalFields.taxRate1 as number;
						}
						if (additionalFields.taxRate2) {
							body.tax_rate2 = additionalFields.taxRate2 as number;
						}
						if (additionalFields.discount) {
							body.discount = additionalFields.discount as number;
						}
						if (additionalFields.paid) {
							if (apiVersion === 'v4') {
								body.paid = additionalFields.paid as number;
							} else if (apiVersion === 'v5') {
								qs.amount_paid = additionalFields.paid as number;
							}
						}
						if (additionalFields.emailInvoice) {
							if (apiVersion === 'v4') {
								body.email_invoice = additionalFields.emailInvoice as boolean;
							} else if (apiVersion === 'v5') {
								qs.send_email = additionalFields.emailInvoice as boolean;
							}
						}
						if (additionalFields.markSent) {
							qs.mark_sent = additionalFields.markSent as boolean;
						}
						const invoiceItemsValues = (this.getNodeParameter('invoiceItemsUi', i) as IDataObject)
							.invoiceItemsValues as IDataObject[];
						if (invoiceItemsValues) {
							const invoiceItems: IItem[] = [];
							for (const itemValue of invoiceItemsValues) {
								const item: IItem = {
									cost: itemValue.cost as number,
									notes: itemValue.description as string,
									product_key: itemValue.service as string,
									tax_rate1: itemValue.taxRate1 as number,
									tax_rate2: itemValue.taxRate2 as number,
									tax_name1: itemValue.taxName1 as string,
									tax_name2: itemValue.taxName2 as string,
								};
								if (apiVersion === 'v4') {
									item.qty = itemValue.hours as number;
								}
								if (apiVersion === 'v5') {
									item.quantity = itemValue.hours as number;
								}
								invoiceItems.push(item);
							}
							if (apiVersion === 'v4') {
								body.invoice_items = invoiceItems;
							}
							if (apiVersion === 'v5') {
								body.line_items = invoiceItems;
							}
						}
						responseData = await invoiceNinjaApiRequest.call(
							this,
							'POST',
							'/invoices',
							body as IDataObject,
							qs,
						);
						responseData = responseData.data;
					}
					if (operation === 'email') {
						const invoiceId = this.getNodeParameter('invoiceId', i) as string;
						if (apiVersion === 'v4') {
							responseData = await invoiceNinjaApiRequest.call(this, 'POST', '/email_invoice', {
								id: invoiceId,
							});
						}
						if (apiVersion === 'v5') {
							responseData = await invoiceNinjaApiRequest.call(
								this,
								'GET',
								`/invoices/${invoiceId}/email`,
							);
						}
					}
					if (operation === 'get') {
						const invoiceId = this.getNodeParameter('invoiceId', i) as string;
						const options = this.getNodeParameter('options', i);
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
						const returnAll = this.getNodeParameter('returnAll', 0);
						const options = this.getNodeParameter('options', i);
						if (options.include) {
							qs.include = options.include as string;
						}
						if (options.invoiceNumber) {
							if (apiVersion === 'v4') {
								qs.invoice_number = options.invoiceNumber as string;
							} else if (apiVersion === 'v5') {
								// eslint-disable-next-line id-denylist
								qs.number = options.invoiceNumber as string;
							}
						}
						if (options.status) {
							qs.status = options.status as string;
						}
						if (options.createdAt) {
							qs.created_at = options.createdAt as string;
						}
						if (options.updatedAt) {
							qs.updated_at = options.updatedAt as string;
						}
						if (options.isDeleted) {
							qs.is_deleted = options.isDeleted as boolean;
						}
						if (options.clientStatus) {
							qs.client_status = options.clientStatus as string;
						}
						if (returnAll) {
							responseData = await invoiceNinjaApiRequestAllItems.call(
								this,
								'data',
								'GET',
								'/invoices',
								{},
								qs,
							);
						} else {
							qs.per_page = this.getNodeParameter('limit', 0);
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
						const additionalFields = this.getNodeParameter('additionalFields', i);
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
									from = new Date(logValue.startDate as string).getTime() / 1000;
								}
								if (logValue.endDate) {
									to = new Date(logValue.endDate as string).getTime() / 1000;
								}
								if (logValue.duration) {
									to = from + (logValue.duration as number) * 3600;
								}
								logs.push([from, to as number]);
							}
							body.time_log = JSON.stringify(logs);
						}
						responseData = await invoiceNinjaApiRequest.call(
							this,
							'POST',
							'/tasks',
							body as IDataObject,
						);
						responseData = responseData.data;
					}
					if (operation === 'get') {
						const taskId = this.getNodeParameter('taskId', i) as string;
						const options = this.getNodeParameter('options', i);
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
						const returnAll = this.getNodeParameter('returnAll', 0);
						const options = this.getNodeParameter('options', i);
						if (options.include) {
							qs.include = options.include as string;
						}
						if (returnAll) {
							responseData = await invoiceNinjaApiRequestAllItems.call(
								this,
								'data',
								'GET',
								'/tasks',
								{},
								qs,
							);
						} else {
							qs.per_page = this.getNodeParameter('limit', 0);
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
						const additionalFields = this.getNodeParameter('additionalFields', i);
						const invoice = this.getNodeParameter('invoice', i) as number | string;
						const client = (
							await invoiceNinjaApiRequest.call(this, 'GET', `/invoices/${invoice}`, {}, qs)
						).data?.client_id as string;
						const amount = this.getNodeParameter('amount', i) as number;
						const body: IPayment = {
							amount,
							client_id: client,
						};
						if (apiVersion === 'v4') {
							body.invoice_id = invoice as number;
						} else if (apiVersion === 'v5') {
							body.invoices = [
								{
									invoice_id: invoice as string,
									amount,
								},
							];
						}
						if (additionalFields.paymentType) {
							if (apiVersion === 'v4') {
								body.payment_type_id = additionalFields.paymentType as number;
							} else if (apiVersion == 'v5') {
								body.type_id = additionalFields.paymentType as number;
							}
						}
						if (additionalFields.transferReference) {
							body.transaction_reference = additionalFields.transferReference as string;
						}
						if (additionalFields.privateNotes) {
							body.private_notes = additionalFields.privateNotes as string;
						}
						responseData = await invoiceNinjaApiRequest.call(
							this,
							'POST',
							'/payments',
							body as IDataObject,
						);
						responseData = responseData.data;
					}
					if (operation === 'get') {
						const paymentId = this.getNodeParameter('paymentId', i) as string;
						const options = this.getNodeParameter('options', i);
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
						const returnAll = this.getNodeParameter('returnAll', 0);
						const options = this.getNodeParameter('options', i);
						if (options.include) {
							qs.include = options.include as string;
						}
						if (options.status) {
							qs.status = options.status as string;
						}
						if (options.createdAt) {
							qs.created_at = options.createdAt as string;
						}
						if (options.updatedAt) {
							qs.updated_at = options.updatedAt as string;
						}
						if (options.isDeleted) {
							qs.is_deleted = options.isDeleted as boolean;
						}
						if (returnAll) {
							responseData = await invoiceNinjaApiRequestAllItems.call(
								this,
								'data',
								'GET',
								'/payments',
								{},
								qs,
							);
						} else {
							qs.per_page = this.getNodeParameter('limit', 0);
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
						const additionalFields = this.getNodeParameter('additionalFields', i);
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
						responseData = await invoiceNinjaApiRequest.call(
							this,
							'POST',
							'/expenses',
							body as IDataObject,
						);
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
						const returnAll = this.getNodeParameter('returnAll', 0);
						if (returnAll) {
							responseData = await invoiceNinjaApiRequestAllItems.call(
								this,
								'data',
								'GET',
								'/expenses',
								{},
								qs,
							);
						} else {
							qs.per_page = this.getNodeParameter('limit', 0);
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
				if (resource === 'bank_transaction') {
					const resourceEndpoint = '/bank_transactions';
					if (operation === 'create') {
						const additionalFields = this.getNodeParameter('additionalFields', i);
						const body: IBankTransaction = {};
						if (additionalFields.amount) {
							body.amount = additionalFields.amount as number;
						}
						if (additionalFields.baseType) {
							body.base_type = additionalFields.baseType as string;
						}
						if (additionalFields.bankIntegrationId) {
							body.bank_integration_id = additionalFields.bankIntegrationId as number;
						}
						if (additionalFields.client) {
							body.date = additionalFields.date as string;
						}
						if (additionalFields.currencyId) {
							body.currency_id = additionalFields.currencyId as number;
						}
						if (additionalFields.email) {
							body.description = additionalFields.description as string;
						}
						responseData = await invoiceNinjaApiRequest.call(
							this,
							'POST',
							resourceEndpoint,
							body as IDataObject,
						);
						responseData = responseData.data;
					}
					if (operation === 'get') {
						const bankTransactionId = this.getNodeParameter('bankTransactionId', i) as string;
						const options = this.getNodeParameter('options', i);
						if (options.include) {
							qs.include = options.include as string;
						}
						responseData = await invoiceNinjaApiRequest.call(
							this,
							'GET',
							`${resourceEndpoint}/${bankTransactionId}`,
							{},
							qs,
						);
						responseData = responseData.data;
					}
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', 0);
						const options = this.getNodeParameter('options', i);
						if (options.include) {
							qs.include = options.include as string;
						}
						if (options.invoiceNumber) {
							qs.invoice_number = options.invoiceNumber as string;
						}
						if (returnAll) {
							responseData = await invoiceNinjaApiRequestAllItems.call(
								this,
								'data',
								'GET',
								resourceEndpoint,
								{},
								qs,
							);
						} else {
							qs.per_page = this.getNodeParameter('limit', 0);
							responseData = await invoiceNinjaApiRequest.call(
								this,
								'GET',
								resourceEndpoint,
								{},
								qs,
							);
							responseData = responseData.data;
						}
					}
					if (operation === 'delete') {
						const bankTransactionId = this.getNodeParameter('bankTransactionId', i) as string;
						responseData = await invoiceNinjaApiRequest.call(
							this,
							'DELETE',
							`${resourceEndpoint}/${bankTransactionId}`,
						);
						responseData = responseData.data;
					}
					if (operation === 'matchPayment') {
						const bankTransactionId = this.getNodeParameter('bankTransactionId', i) as string;
						const paymentId = this.getNodeParameter('paymentId', i) as string;
						const body: IBankTransactions = { transactions: [] };
						const bankTransaction: IBankTransaction = {};
						if (bankTransactionId) {
							bankTransaction.id = bankTransactionId;
						}
						if (paymentId) {
							bankTransaction.payment_id = paymentId;
						}
						body.transactions.push(bankTransaction);
						responseData = await invoiceNinjaApiRequest.call(
							this,
							'POST',
							`${resourceEndpoint}/match`,
							body as unknown as IDataObject,
						);
					}
				}
				if (resource === 'quote') {
					const resourceEndpoint = apiVersion === 'v4' ? '/invoices' : '/quotes';
					if (operation === 'create') {
						const additionalFields = this.getNodeParameter('additionalFields', i);
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
						if (additionalFields.quoteDate) {
							body.invoice_date = additionalFields.quoteDate as string;
						}
						if (additionalFields.quoteNumber) {
							if (apiVersion === 'v4') {
								body.invoice_number = additionalFields.quoteNumber as string;
							} else if (apiVersion === 'v5') {
								body.number = additionalFields.quoteNumber as string;
							}
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
						if (additionalFields.taxRate1) {
							body.tax_rate1 = additionalFields.taxRate1 as number;
						}
						if (additionalFields.taxRate2) {
							body.tax_rate2 = additionalFields.taxRate2 as number;
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
						const invoiceItemsValues = (this.getNodeParameter('invoiceItemsUi', i) as IDataObject)
							.invoiceItemsValues as IDataObject[];
						if (invoiceItemsValues) {
							const invoiceItems: IItem[] = [];
							for (const itemValue of invoiceItemsValues) {
								const item: IItem = {
									cost: itemValue.cost as number,
									notes: itemValue.description as string,
									product_key: itemValue.service as string,
									tax_rate1: itemValue.taxRate1 as number,
									tax_rate2: itemValue.taxRate2 as number,
									tax_name1: itemValue.taxName1 as string,
									tax_name2: itemValue.taxName2 as string,
								};
								if (apiVersion === 'v4') {
									item.qty = itemValue.hours as number;
								}
								if (apiVersion === 'v5') {
									item.quantity = itemValue.hours as number;
								}
								invoiceItems.push(item);
							}
							if (apiVersion === 'v4') {
								body.invoice_items = invoiceItems;
							}
							if (apiVersion === 'v5') {
								body.line_items = invoiceItems;
							}
						}
						responseData = await invoiceNinjaApiRequest.call(
							this,
							'POST',
							resourceEndpoint,
							body as IDataObject,
						);
						responseData = responseData.data;
					}
					if (operation === 'email') {
						const quoteId = this.getNodeParameter('quoteId', i) as string;
						if (apiVersion === 'v4') {
							responseData = await invoiceNinjaApiRequest.call(this, 'POST', '/email_invoice', {
								id: quoteId,
							});
						}
						if (apiVersion === 'v5') {
							responseData = await invoiceNinjaApiRequest.call(
								this,
								'GET',
								`${resourceEndpoint}/${quoteId}/email`,
							);
						}
					}
					if (operation === 'get') {
						const quoteId = this.getNodeParameter('quoteId', i) as string;
						const options = this.getNodeParameter('options', i);
						if (options.include) {
							qs.include = options.include as string;
						}
						responseData = await invoiceNinjaApiRequest.call(
							this,
							'GET',
							`${resourceEndpoint}/${quoteId}`,
							{},
							qs,
						);
						responseData = responseData.data;
					}
					if (operation === 'getAll') {
						const returnAll = this.getNodeParameter('returnAll', 0);
						const options = this.getNodeParameter('options', i);
						if (options.include) {
							qs.include = options.include as string;
						}
						if (options.invoiceNumber) {
							qs.invoice_number = options.invoiceNumber as string;
						}
						if (options.status) {
							qs.status = options.status as string;
						}
						if (options.createdAt) {
							qs.created_at = options.createdAt as string;
						}
						if (options.updatedAt) {
							qs.updated_at = options.updatedAt as string;
						}
						if (options.isDeleted) {
							qs.is_deleted = options.isDeleted as boolean;
						}
						if (returnAll) {
							responseData = await invoiceNinjaApiRequestAllItems.call(
								this,
								'data',
								'GET',
								resourceEndpoint,
								{},
								qs,
							);
						} else {
							qs.per_page = this.getNodeParameter('limit', 0);
							responseData = await invoiceNinjaApiRequest.call(
								this,
								'GET',
								resourceEndpoint,
								{},
								qs,
							);
							responseData = responseData.data;
						}
					}
					if (operation === 'delete') {
						const quoteId = this.getNodeParameter('quoteId', i) as string;
						responseData = await invoiceNinjaApiRequest.call(
							this,
							'DELETE',
							`${resourceEndpoint}/${quoteId}`,
						);
						responseData = responseData.data;
					}
				}

				const executionData = this.helpers.constructExecutionMetaData(
					this.helpers.returnJsonArray(responseData as IDataObject[]),
					{ itemData: { item: i } },
				);

				returnData.push(...executionData);
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
		}

		return [returnData];
	}
}
