import { IExecuteFunctions } from 'n8n-core';

import {
	IDataObject,
	ILoadOptionsFunctions,
	INodeExecutionData,
	INodeProperties,
	INodePropertyOptions,
} from 'n8n-workflow';

import { invoiceNinjaApiDownloadFile, invoiceNinjaApiRequest, invoiceNinjaApiRequestAllItems } from '../GenericFunctions';

import { clientFields, clientOperations } from './ClientDescription';

import { invoiceFields, invoiceOperations } from './InvoiceDescription';

import { IClient, IClientContact } from './ClientInterface';

import { countryCodes } from './ISOCountryCodes';

import { IInvoice, IItem } from './invoiceInterface';

import { taskFields, taskOperations } from './TaskDescription';

import { ITask } from './TaskInterface';

import { productFields, productOperations } from './ProductDescription';

import { IProduct } from './ProductInterface';

import { paymentFields, paymentOperations } from './PaymentDescription';

import { IPayment } from './PaymentInterface';

import { expenseFields, expenseOperations } from './ExpenseDescription';

import { IExpense } from './ExpenseInterface';

import { quoteFields, quoteOperations } from './QuoteDescription';

import { IQuote } from './QuoteInterface';

import { projectFields, projectOperations } from './ProjectDescription';

import { IProject } from './ProjectInterface';

import { vendorFields, vendorOperations } from './VendorDescription';
import { recurringInvoiceFields, recurringInvoiceOperations } from './RecurringInvoiceDescription';
import { IRecurringInvoice, IRecurringInvoiceItem } from './RecurringInvoiceInterface';
import { recurringExpenseFields, recurringExpenseOperations } from './RecurringExpenseDescription';
import { IRecurringExpense } from './RecurringExpenseInterface';

const headProperties: INodeProperties[] = [{
	displayName: 'Resource (V5)',
	name: 'resource',
	type: 'options',
	noDataExpression: true,
	displayOptions: {
		show: {
			apiVersion: ['v5'],
		},
	},
	description: 'You are using InvoiceNinja V5: <br />Check Swagger documentation for additional fields: <a href="https://app.swaggerhub.com/apis/invoiceninja/invoiceninja/" target="_blank">https://app.swaggerhub.com/apis/invoiceninja/invoiceninja/</a><br /><br />Change your Version at the Node-Settings.',
	options: [
		{
			name: 'Client',
			value: 'client',
		},
		{
			name: 'Vendor',
			value: 'vendor',
		},
		{
			name: 'Invoice',
			value: 'invoice',
		},
		{
			name: 'Expense',
			value: 'expense',
		},
		{
			name: 'Recurring Invoice',
			value: 'recurringInvoice',
		},
		{
			name: 'Recurring Expense',
			value: 'recurringExpense',
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
			name: 'Project',
			value: 'project',
		},
		{
			name: 'Task',
			value: 'task',
		},
		{
			name: 'Product',
			value: 'product',
		},
	],
	default: 'client',
}];

export const InvoiceNinjaV5 = {
	description: {
		properties: [
			...headProperties,
			...clientOperations,
			...clientFields,
			...vendorOperations,
			...vendorFields,
			...invoiceOperations,
			...invoiceFields,
			...recurringInvoiceOperations,
			...recurringInvoiceFields,
			...taskOperations,
			...taskFields,
			...productOperations,
			...productFields,
			...paymentOperations,
			...paymentFields,
			...expenseOperations,
			...expenseFields,
			...recurringExpenseOperations,
			...recurringExpenseFields,
			...projectOperations,
			...projectFields,
			...quoteOperations,
			...quoteFields,
		],
	},

	methods: {
		loadOptions: {
			// Get all the available users to display them to user so that he can
			// select them easily
			async getUsersV5(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const users = await invoiceNinjaApiRequestAllItems.call(this, 'data', 'GET', '/users');
				for (const user of users) {
					const userName = [[user.first_name, user.last_name].join(' '), user.email].filter(e => e).join(' - ') as string;
					const userId = user.id as string;
					returnData.push({
						name: userName,
						value: userId,
					});
				}
				return returnData;
			},
			// Get all the available clients to display them to user so that he can
			// select them easily
			async getClientsV5(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
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
			// Get all the available projects to display them to user so that he can
			// select them easily
			async getProjectsV5(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
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
			// Get all the available designs to display them to user so that he can
			// select them easily
			async getDesignsV5(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				let designs = await invoiceNinjaApiRequestAllItems.call(
					this,
					'data',
					'GET',
					'/designs',
				);
				designs = designs.filter(e => !e.is_deleted);
				for (const design of designs) {
					const designName = design.name as string;
					const designId = design.id as string;
					returnData.push({
						name: designName,
						value: designId,
					});
				}
				return returnData;
			},
			// Get all the available invoices to display them to user so that he can
			// select them easily
			async getInvoicesV5(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const invoices = await invoiceNinjaApiRequestAllItems.call(
					this,
					'data',
					'GET',
					'/invoices',
				);
				for (const invoice of invoices) {
					const invoiceName = invoice.number as string;
					const invoiceId = invoice.id as string;
					returnData.push({
						name: invoiceName,
						value: invoiceId,
					});
				}
				return returnData;
			},
			// Get all the available country codes to display them to user so that he can
			// select them easily
			async getCountryCodesV5(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
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
			async getVendorsV5(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
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
			// Get all the available expense categories to display them to user so that he can
			// select them easily
			async getExpenseCategoriesV5(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				let categories = await invoiceNinjaApiRequestAllItems.call(
					this,
					'data',
					'GET',
					'/expense_categories',
				);
				categories = categories.filter(e => !e.is_deleted);
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
			// Get all the available bank integrations to display them to user so that he can
			// select them easily
			async getBanksV5(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				let banks = await invoiceNinjaApiRequestAllItems.call(
					this,
					'data',
					'GET',
					'/bank_integrations',
				);
				banks = banks.filter(e => !e.is_deleted);
				for (const bank of banks) {
					const providerName = bank.provider_name as string;
					const accountName = bank.bank_account_name as string;
					const bankId = bank.id as string;
					returnData.push({
						name: providerName != accountName ? `${providerName} - ${accountName}` : (accountName || providerName),
						value: bankId,
					});
				}
				return returnData;
			},
			// Get all the available recuring expenses to display them to user so that he can
			// select them easily
			async getRecuringExpensesV5(this: ILoadOptionsFunctions): Promise<INodePropertyOptions[]> {
				const returnData: INodePropertyOptions[] = [];
				const recurringExpenses = await invoiceNinjaApiRequestAllItems.call(
					this,
					'data',
					'GET',
					'/recurring_expenses',
				);
				for (const recurringExpense of recurringExpenses) {
					const recurringExpenseName = recurringExpense.number as string;
					const recurringExpenseAmount = recurringExpense.amount as string;
					const recurringExpenseId = recurringExpense.id as string;
					returnData.push({
						name: recurringExpenseName + recurringExpenseAmount ? ` (${recurringExpenseAmount})` : '',
						value: recurringExpenseId,
					});
				}
				return returnData;
			},
		},
	},

	async execute(that: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = that.getInputData();
		const returnData: INodeExecutionData[] = [];
		const length = items.length;
		const qs: IDataObject = {};

		let responseData;

		const resource = that.getNodeParameter('resource', 0);
		const operation = that.getNodeParameter('operation', 0);

		for (let i = 0; i < length; i++) {
			//Routes: https://github.com/invoiceninja/invoiceninja/blob/v5-stable/routes/api.php or swagger documentation
			try {

				if (resource === 'client') {
					if (operation === 'create') {
						const additionalFields = that.getNodeParameter('additionalFields', i);
						const body: IClient = {};
						if (additionalFields.number) {
							body.number = additionalFields.number as string;
						}
						if (additionalFields.name) {
							body.name = additionalFields.name as string;
						}
						if (additionalFields.userId) {
							body.user_id = additionalFields.userId as string;
						}
						if (additionalFields.assignedUserId) {
							body.assigned_user_id = additionalFields.assignedUserId as string;
						}
						if (additionalFields.vatNumber) {
							body.vat_number = additionalFields.vatNumber as string;
						}
						if (additionalFields.phone) {
							body.phone = additionalFields.phone as string;
						}
						if (additionalFields.website) {
							body.website = additionalFields.website as string;
						}
						if (additionalFields.privateNotes) {
							body.private_notes = additionalFields.privateNotes as string;
						}
						if (additionalFields.publicNotes) {
							body.public_notes = additionalFields.publicNotes as string;
						}
						if (additionalFields.customValue1) {
							body.custom_value1 = additionalFields.customValue1 as string;
						}
						if (additionalFields.customValue2) {
							body.custom_value2 = additionalFields.customValue2 as string;
						}
						if (additionalFields.customValue3) {
							body.custom_value3 = additionalFields.customValue3 as string;
						}
						if (additionalFields.customValue4) {
							body.custom_value4 = additionalFields.customValue4 as string;
						}
						const AddressValue = (
							that.getNodeParameter('addressUi', i) as IDataObject
						).AddressValue as IDataObject;
						if (AddressValue) {
							body.address1 = AddressValue.address1 as string;
							body.address2 = AddressValue.address2 as string;
							body.city = AddressValue.city as string;
							body.state = AddressValue.state as string;
							body.postal_code = AddressValue.postalCode as string;
							body.country_id = AddressValue.countryCode as string;
						}
						const shippingAddressValue = (
							that.getNodeParameter('shippingAddressUi', i) as IDataObject
						).shippingAddressValue as IDataObject;
						if (shippingAddressValue) {
							body.shipping_address1 = shippingAddressValue.address1 as string;
							body.shipping_address2 = shippingAddressValue.address2 as string;
							body.shipping_city = shippingAddressValue.city as string;
							body.shipping_state = shippingAddressValue.state as string;
							body.shipping_postal_code = shippingAddressValue.postalCode as string;
							body.shipping_country_id = shippingAddressValue.countryCode as string;
						}
						const contactsValues = (that.getNodeParameter('contactsUi', i) as IDataObject)
							.contacstValues as IDataObject[];
						if (contactsValues) {
							const contacts: IClientContact[] = [];
							for (const contactValue of contactsValues) {
								const contact: IClientContact = {
									first_name: contactValue.firstName as string,
									last_name: contactValue.lastName as string,
									email: contactValue.email as string,
									phone: contactValue.phone as string,
									custom_value1: contactValue.customValue1 as string,
									custom_value2: contactValue.customValue2 as string,
									custom_value3: contactValue.customValue3 as string,
									custom_value4: contactValue.customValue4 as string,
									send_email: contactValue.sendEmail as boolean,
								};
								contacts.push(contact);
							}
							body.contacts = contacts;
						}
						responseData = await invoiceNinjaApiRequest.call(
							that,
							'POST',
							'/clients',
							body as IDataObject,
						);
						responseData = responseData.data;
					}
					if (operation === 'update') {
						const clientId = that.getNodeParameter('clientId', i) as string;
						const additionalFields = that.getNodeParameter('additionalFields', i);
						const body: IClient = {};
						if (additionalFields.number) {
							body.number = additionalFields.number as string;
						}
						if (additionalFields.name) {
							body.name = additionalFields.name as string;
						}
						if (additionalFields.userId) {
							body.user_id = additionalFields.userId as string;
						}
						if (additionalFields.assignedUserId) {
							body.assigned_user_id = additionalFields.assignedUserId as string;
						}
						if (additionalFields.vatNumber) {
							body.vat_number = additionalFields.vatNumber as string;
						}
						if (additionalFields.phone) {
							body.phone = additionalFields.phone as string;
						}
						if (additionalFields.website) {
							body.website = additionalFields.website as string;
						}
						if (additionalFields.privateNotes) {
							body.private_notes = additionalFields.privateNotes as string;
						}
						if (additionalFields.publicNotes) {
							body.public_notes = additionalFields.publicNotes as string;
						}
						if (additionalFields.customValue1) {
							body.custom_value1 = additionalFields.customValue1 as string;
						}
						if (additionalFields.customValue2) {
							body.custom_value2 = additionalFields.customValue2 as string;
						}
						if (additionalFields.customValue3) {
							body.custom_value3 = additionalFields.customValue3 as string;
						}
						if (additionalFields.customValue4) {
							body.custom_value4 = additionalFields.customValue4 as string;
						}
						const AddressValue = (
							that.getNodeParameter('addressUi', i) as IDataObject
						).AddressValue as IDataObject;
						if (AddressValue) {
							body.address1 = AddressValue.address1 as string;
							body.address2 = AddressValue.address2 as string;
							body.city = AddressValue.city as string;
							body.state = AddressValue.state as string;
							body.postal_code = AddressValue.postalCode as string;
							body.country_id = AddressValue.countryCode as string;
						}
						const shippingAddressValue = (
							that.getNodeParameter('shippingAddressUi', i) as IDataObject
						).shippingAddressValue as IDataObject;
						if (shippingAddressValue) {
							body.shipping_address1 = shippingAddressValue.address1 as string;
							body.shipping_address2 = shippingAddressValue.address2 as string;
							body.shipping_city = shippingAddressValue.city as string;
							body.shipping_state = shippingAddressValue.state as string;
							body.shipping_postal_code = shippingAddressValue.postalCode as string;
							body.shipping_country_id = shippingAddressValue.countryCode as string;
						}
						const contactsValues = (that.getNodeParameter('contactsUi', i) as IDataObject)
							.contacstValues as IDataObject[];
						if (contactsValues) {
							const contacts: IClientContact[] = [];
							for (const contactValue of contactsValues) {
								const contact: IClientContact = {
									first_name: contactValue.firstName as string,
									last_name: contactValue.lastName as string,
									email: contactValue.email as string,
									phone: contactValue.phone as string,
									custom_value1: contactValue.customValue1 as string,
									custom_value2: contactValue.customValue2 as string,
									custom_value3: contactValue.customValue3 as string,
									custom_value4: contactValue.customValue4 as string,
									send_email: contactValue.sendEmail as boolean,
								};
								contacts.push(contact);
							}
							body.contacts = contacts;
						}
						responseData = await invoiceNinjaApiRequest.call(
							that,
							'PUT',
							`/clients/${clientId}`,
							body as IDataObject,
						);
						responseData = responseData.data;
					}
					if (operation === 'get') {
						const clientId = that.getNodeParameter('clientId', i) as string;
						const include = that.getNodeParameter('include', i) as Array<string>;
						if (include.length) {
							qs.include = include.toString() as string;
						}
						responseData = await invoiceNinjaApiRequest.call(
							that,
							'GET',
							`/clients/${clientId}`,
							{},
							qs,
						);
						responseData = responseData.data;
					}
					if (operation === 'getAll') {
						const filters = that.getNodeParameter('filters', i);
						if (filters.filter) {
							qs.filter = filters.filter as string;
						}
						if (filters.clientId) {
							qs.client_id = filters.clientId as string;
						}
						if (filters.number) {
							qs.number = filters.number as string;
						}
						if (filters.name) {
							qs.name = filters.name as string;
						}
						if (filters.email) {
							qs.email = filters.email as string;
						}
						const include = that.getNodeParameter('include', i) as Array<string>;
						if (include.length) {
							qs.include = include.toString() as string;
						}
						const returnAll = that.getNodeParameter('returnAll', i) as boolean;
						if (returnAll) {
							responseData = await invoiceNinjaApiRequestAllItems.call(
								that,
								'data',
								'GET',
								'/clients',
								{},
								qs,
							);
						} else {
							const perPage = that.getNodeParameter('perPage', i) as boolean;
							if (perPage) qs.per_page = perPage;
							responseData = await invoiceNinjaApiRequest.call(that, 'GET', '/clients', {}, qs);
							responseData = responseData.data;
						}
					}
					if (operation === 'delete') {
						const clientId = that.getNodeParameter('clientId', i) as string;
						responseData = await invoiceNinjaApiRequest.call(
							that,
							'DELETE',
							`/clients/${clientId}`,
						);
						responseData = responseData.data;
					}
				}
				if (resource === 'expense') {
					if (operation === 'create') {
						const additionalFields = that.getNodeParameter('additionalFields', i);
						const body: IExpense = {};
						if (additionalFields.userId) {
							body.user_id = additionalFields.userId as string;
						}
						if (additionalFields.assignedUserId) {
							body.assigned_user_id = additionalFields.assignedUserId as string;
						}
						if (additionalFields.vendorId) {
							body.vendor_id = additionalFields.vendorId as string;
						}
						if (additionalFields.invoiceId) {
							body.invoice_id = additionalFields.invoiceId as string;
						}
						if (additionalFields.clientId) {
							body.client_id = additionalFields.clientId as string;
						}
						if (additionalFields.bankId) {
							body.bank_id = additionalFields.bankId as string;
						}
						if (additionalFields.currencyId) {
							body.currency_id = additionalFields.currencyId as string;
						}
						if (additionalFields.categoryId) {
							body.category_id = additionalFields.categoryId as string;
						}
						if (additionalFields.paymentTypeId) {
							body.payment_type_id = additionalFields.paymentTypeId as string;
						}
						if (additionalFields.recurringExpenseId) {
							body.recurring_expense_id = additionalFields.recurringExpenseId as string;
						}
						if (additionalFields.shouldBeInvoiced) {
							body.should_be_invoiced = additionalFields.shouldBeInvoiced as boolean;
						}
						if (additionalFields.amount) {
							body.amount = additionalFields.amount as number;
						}
						if (additionalFields.foreignAmount) {
							body.foreign_amount = additionalFields.foreignAmount as number;
						}
						if (additionalFields.exchangeRate) {
							body.exchange_rate = additionalFields.exchangeRate as number;
						}
						if (additionalFields.taxName1) {
							body.tax_name1 = additionalFields.taxName1 as string;
						}
						if (additionalFields.taxName2) {
							body.tax_name2 = additionalFields.taxName2 as string;
						}
						if (additionalFields.taxName3) {
							body.tax_name3 = additionalFields.taxName3 as string;
						}
						if (additionalFields.taxRate1) {
							body.tax_rate1 = additionalFields.taxRate1 as number;
						}
						if (additionalFields.taxRate2) {
							body.tax_rate2 = additionalFields.taxRate2 as number;
						}
						if (additionalFields.taxRate3) {
							body.tax_rate3 = additionalFields.taxRate3 as number;
						}
						if (additionalFields.taxAmount1) {
							body.tax_amount1 = additionalFields.taxAmount1 as number;
						}
						if (additionalFields.taxAmount2) {
							body.tax_amount2 = additionalFields.taxAmount2 as number;
						}
						if (additionalFields.taxAmount3) {
							body.tax_amount3 = additionalFields.taxAmount3 as number;
						}
						if (additionalFields.publicNotes) {
							body.public_notes = additionalFields.publicNotes as string;
						}
						if (additionalFields.privateNotes) {
							body.private_notes = additionalFields.privateNotes as string;
						}
						if (additionalFields.transactionReference) {
							body.transaction_reference = additionalFields.transactionReference as string;
						}
						if (additionalFields.transactionId) {
							body.transaction_id = additionalFields.transactionId as string;
						}
						if (additionalFields.date) {
							body.date = additionalFields.date as string;
						}
						if (additionalFields.number) {
							body.number = additionalFields.number as string;
						}
						if (additionalFields.customValue1) {
							body.custom_value1 = additionalFields.customValue1 as string;
						}
						if (additionalFields.customValue2) {
							body.custom_value2 = additionalFields.customValue2 as string;
						}
						if (additionalFields.customValue3) {
							body.custom_value3 = additionalFields.customValue3 as string;
						}
						if (additionalFields.customValue4) {
							body.custom_value4 = additionalFields.customValue4 as string;
						}
						if (additionalFields.projectId) {
							body.project_id = additionalFields.projectId as string;
						}
						if (additionalFields.usesInclusiveTaxes) {
							body.uses_inclusive_taxes = additionalFields.usesInclusiveTaxes as boolean;
						}
						if (additionalFields.calculateTaxByAmount) {
							body.calculate_tax_by_amount = additionalFields.calculateTaxByAmount as boolean;
						}
						if (additionalFields.entityType) {
							body.entity_type = additionalFields.entityType as string;
						}
						responseData = await invoiceNinjaApiRequest.call(
							that,
							'POST',
							'/expenses',
							body as IDataObject,
						);
						responseData = responseData.data;
					}
					if (operation === 'update') {
						const expenseId = that.getNodeParameter('expenseId', i) as string;
						const additionalFields = that.getNodeParameter('additionalFields', i);
						const body: IExpense = {};

						if (additionalFields.userId) {
							body.user_id = additionalFields.userId as string;
						}
						if (additionalFields.assignedUserId) {
							body.assigned_user_id = additionalFields.assignedUserId as string;
						}
						if (additionalFields.vendorId) {
							body.vendor_id = additionalFields.vendorId as string;
						}
						if (additionalFields.invoiceId) {
							body.invoice_id = additionalFields.invoiceId as string;
						}
						if (additionalFields.clientId) {
							body.client_id = additionalFields.clientId as string;
						}
						if (additionalFields.bankId) {
							body.bank_id = additionalFields.bankId as string;
						}
						if (additionalFields.currencyId) {
							body.currency_id = additionalFields.currencyId as string;
						}
						if (additionalFields.categoryId) {
							body.category_id = additionalFields.categoryId as string;
						}
						if (additionalFields.paymentTypeId) {
							body.payment_type_id = additionalFields.paymentTypeId as string;
						}
						if (additionalFields.recurringExpenseId) {
							body.recurring_expense_id = additionalFields.recurringExpenseId as string;
						}
						if (additionalFields.shouldBeInvoiced) {
							body.should_be_invoiced = additionalFields.shouldBeInvoiced as boolean;
						}
						if (additionalFields.amount) {
							body.amount = additionalFields.amount as number;
						}
						if (additionalFields.foreignAmount) {
							body.foreign_amount = additionalFields.foreignAmount as number;
						}
						if (additionalFields.exchangeRate) {
							body.exchange_rate = additionalFields.exchangeRate as number;
						}
						if (additionalFields.taxName1) {
							body.tax_name1 = additionalFields.taxName1 as string;
						}
						if (additionalFields.taxName2) {
							body.tax_name2 = additionalFields.taxName2 as string;
						}
						if (additionalFields.taxName3) {
							body.tax_name3 = additionalFields.taxName3 as string;
						}
						if (additionalFields.taxRate1) {
							body.tax_rate1 = additionalFields.taxRate1 as number;
						}
						if (additionalFields.taxRate2) {
							body.tax_rate2 = additionalFields.taxRate2 as number;
						}
						if (additionalFields.taxRate3) {
							body.tax_rate3 = additionalFields.taxRate3 as number;
						}
						if (additionalFields.taxAmount1) {
							body.tax_amount1 = additionalFields.taxAmount1 as number;
						}
						if (additionalFields.taxAmount2) {
							body.tax_amount2 = additionalFields.taxAmount2 as number;
						}
						if (additionalFields.taxAmount3) {
							body.tax_amount3 = additionalFields.taxAmount3 as number;
						}
						if (additionalFields.publicNotes) {
							body.public_notes = additionalFields.publicNotes as string;
						}
						if (additionalFields.privateNotes) {
							body.private_notes = additionalFields.privateNotes as string;
						}
						if (additionalFields.transactionReference) {
							body.transaction_reference = additionalFields.transactionReference as string;
						}
						if (additionalFields.transactionId) {
							body.transaction_id = additionalFields.transactionId as string;
						}
						if (additionalFields.date) {
							body.date = additionalFields.date as string;
						}
						if (additionalFields.number) {
							body.number = additionalFields.number as string;
						}
						if (additionalFields.customValue1) {
							body.custom_value1 = additionalFields.customValue1 as string;
						}
						if (additionalFields.customValue2) {
							body.custom_value2 = additionalFields.customValue2 as string;
						}
						if (additionalFields.customValue3) {
							body.custom_value3 = additionalFields.customValue3 as string;
						}
						if (additionalFields.customValue4) {
							body.custom_value4 = additionalFields.customValue4 as string;
						}
						if (additionalFields.projectId) {
							body.project_id = additionalFields.projectId as string;
						}
						if (additionalFields.usesInclusiveTaxes) {
							body.uses_inclusive_taxes = additionalFields.usesInclusiveTaxes as boolean;
						}
						if (additionalFields.calculateTaxByAmount) {
							body.calculate_tax_by_amount = additionalFields.calculateTaxByAmount as boolean;
						}
						if (additionalFields.entityType) {
							body.entity_type = additionalFields.entityType as string;
						}
						responseData = await invoiceNinjaApiRequest.call(
							that,
							'PUT',
							`/expenses/${expenseId}`,
							body as IDataObject,
						);
						responseData = responseData.data;
					}
					if (operation === 'get') {
						const expenseId = that.getNodeParameter('expenseId', i) as string;
						responseData = await invoiceNinjaApiRequest.call(
							that,
							'GET',
							`/expenses/${expenseId}`,
							{},
							qs,
						);
						responseData = responseData.data;
					}
					if (operation === 'getAll') {
						const filters = that.getNodeParameter('filters', i);
						if (filters.filter) {
							qs.filter = filters.filter as string;
						}
						if (filters.number) {
							qs.number = filters.number as string;
						}
						if (filters.clientId) {
							qs.client_id = filters.clientId as string;
						}
						const include = that.getNodeParameter('include', i) as Array<string>;
						if (include.length) {
							qs.include = include.toString() as string;
						}
						const returnAll = that.getNodeParameter('returnAll', i) as boolean;
						if (returnAll) {
							responseData = await invoiceNinjaApiRequestAllItems.call(
								that,
								'data',
								'GET',
								'/expenses',
								{},
								qs,
							);
						} else {
							const perPage = that.getNodeParameter('perPage', i) as boolean;
							if (perPage) qs.per_page = perPage;
							responseData = await invoiceNinjaApiRequest.call(that, 'GET', '/expenses', {}, qs);
							responseData = responseData.data;
						}
					}
					if (operation === 'delete') {
						const expenseId = that.getNodeParameter('expenseId', i) as string;
						responseData = await invoiceNinjaApiRequest.call(
							that,
							'DELETE',
							`/expenses/${expenseId}`,
						);
						responseData = responseData.data;
					}
				}
				if (resource === 'invoice') {
					if (operation === 'create') {
						const additionalFields = that.getNodeParameter('additionalFields', i);
						const body: IInvoice = {};
						if (additionalFields.userId) {
							body.user_id = additionalFields.userId as string;
						}
						if (additionalFields.projectId) {
							body.project_id = additionalFields.projectId as string;
						}
						if (additionalFields.assignedUserId) {
							body.assigned_user_id = additionalFields.assignedUserId as string;
						}
						if (additionalFields.clientId) {
							body.client_id = additionalFields.clientId as string;
						}
						if (additionalFields.vendorId) {
							body.vendor_id = additionalFields.vendorId as string;
						}
						if (additionalFields.statusId) {
							body.status_id = additionalFields.statusId as string;
						}
						if (additionalFields.designId) {
							body.design_id = additionalFields.designId as string;
						}
						if (additionalFields.recurringId) {
							body.recurring_id = additionalFields.recurringId as string;
						}
						if (additionalFields.number) {
							body.number = additionalFields.number as string;
						}
						if (additionalFields.discount) {
							body.discount = additionalFields.discount as number;
						}
						if (additionalFields.poNumber) {
							body.po_number = additionalFields.poNumber as string;
						}
						if (additionalFields.date) {
							body.date = additionalFields.date as string;
						}
						if (additionalFields.dueDate) {
							body.due_date = additionalFields.dueDate as string;
						}
						if (additionalFields.terms) {
							body.terms = additionalFields.terms as string;
						}
						if (additionalFields.usesInclusiveTaxes) {
							body.uses_inclusive_taxes = additionalFields.usesInclusiveTaxes as boolean;
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
						if (additionalFields.discount) {
							body.discount = additionalFields.discount as number;
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
						if (additionalFields.taxName3) {
							body.tax_name3 = additionalFields.taxName3 as string;
						}
						if (additionalFields.taxRate1) {
							body.tax_rate1 = additionalFields.taxtRate1 as number;
						}
						if (additionalFields.taxRate2) {
							body.tax_rate2 = additionalFields.taxtRate2 as number;
						}
						if (additionalFields.taxRate3) {
							body.tax_rate3 = additionalFields.taxtRate3 as number;
						}
						if (additionalFields.customValue1) {
							body.custom_value1 = additionalFields.customValue1 as string;
						}
						if (additionalFields.customValue2) {
							body.custom_value2 = additionalFields.customValue2 as string;
						}
						if (additionalFields.customValue3) {
							body.custom_value3 = additionalFields.customValue3 as string;
						}
						if (additionalFields.customValue4) {
							body.custom_value4 = additionalFields.customValue4 as string;
						}
						if (additionalFields.autoBillEnabled) {
							body.auto_bill_enabled = additionalFields.autoBillEnabled as boolean;
						}
						const invoceItemsValues = (that.getNodeParameter('invoiceItemsUi', i) as IDataObject)
							.invoiceItemsValues as IDataObject[];
						if (invoceItemsValues) {
							const invoiceItems: IItem[] = [];
							for (const itemValue of invoceItemsValues) {
								const item: IItem = {
									quantity: itemValue.quantity as number,
									cost: itemValue.cost as number,
									product_key: itemValue.service as string,
									notes: itemValue.description as string,
									discount: itemValue.discount as number,
									tax_rate1: itemValue.taxRate1 as number,
									tax_rate2: itemValue.taxRate2 as number,
									tax_rate3: itemValue.taxRate3 as number,
									tax_name1: itemValue.taxName1 as string,
									tax_name2: itemValue.taxName2 as string,
									tax_name3: itemValue.taxName3 as string,
									custom_value1: itemValue.customValue1 as string,
									custom_value2: itemValue.customValue2 as string,
									custom_value3: itemValue.customValue3 as string,
									custom_value4: itemValue.customValue4 as string,
								};
								invoiceItems.push(item);
							}
							body.line_items = invoiceItems;
						}
						responseData = await invoiceNinjaApiRequest.call(
							that,
							'POST',
							'/invoices',
							body as IDataObject,
						);
						responseData = responseData.data;
					}
					if (operation === 'update') {
						const invoiceId = that.getNodeParameter('invoiceId', i) as string;
						const additionalFields = that.getNodeParameter('additionalFields', i);
						const body: IInvoice = {};
						if (additionalFields.userId) {
							body.user_id = additionalFields.userId as string;
						}
						if (additionalFields.projectId) {
							body.project_id = additionalFields.projectId as string;
						}
						if (additionalFields.assignedUserId) {
							body.assigned_user_id = additionalFields.assignedUserId as string;
						}
						if (additionalFields.clientId) {
							body.client_id = additionalFields.clientId as string;
						}
						if (additionalFields.vendorId) {
							body.vendor_id = additionalFields.vendorId as string;
						}
						if (additionalFields.statusId) {
							body.status_id = additionalFields.statusId as string;
						}
						if (additionalFields.designId) {
							body.design_id = additionalFields.designId as string;
						}
						if (additionalFields.recurringId) {
							body.recurring_id = additionalFields.recurringId as string;
						}
						if (additionalFields.number) {
							body.number = additionalFields.number as string;
						}
						if (additionalFields.discount) {
							body.discount = additionalFields.discount as number;
						}
						if (additionalFields.poNumber) {
							body.po_number = additionalFields.poNumber as string;
						}
						if (additionalFields.date) {
							body.date = additionalFields.date as string;
						}
						if (additionalFields.dueDate) {
							body.due_date = additionalFields.dueDate as string;
						}
						if (additionalFields.terms) {
							body.terms = additionalFields.terms as string;
						}
						if (additionalFields.usesInclusiveTaxes) {
							body.uses_inclusive_taxes = additionalFields.usesInclusiveTaxes as boolean;
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
						if (additionalFields.discount) {
							body.discount = additionalFields.discount as number;
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
						if (additionalFields.taxName3) {
							body.tax_name3 = additionalFields.taxName3 as string;
						}
						if (additionalFields.taxRate1) {
							body.tax_rate1 = additionalFields.taxtRate1 as number;
						}
						if (additionalFields.taxRate2) {
							body.tax_rate2 = additionalFields.taxtRate2 as number;
						}
						if (additionalFields.taxRate3) {
							body.tax_rate3 = additionalFields.taxtRate3 as number;
						}
						if (additionalFields.customValue1) {
							body.custom_value1 = additionalFields.customValue1 as string;
						}
						if (additionalFields.customValue2) {
							body.custom_value2 = additionalFields.customValue2 as string;
						}
						if (additionalFields.customValue3) {
							body.custom_value3 = additionalFields.customValue3 as string;
						}
						if (additionalFields.customValue4) {
							body.custom_value4 = additionalFields.customValue4 as string;
						}
						if (additionalFields.autoBillEnabled) {
							body.auto_bill_enabled = additionalFields.autoBillEnabled as boolean;
						}
						const invoceItemsValues = (that.getNodeParameter('invoiceItemsUi', i) as IDataObject)
							.invoiceItemsValues as IDataObject[];
						if (invoceItemsValues) {
							const invoiceItems: IItem[] = [];
							for (const itemValue of invoceItemsValues) {
								const item: IItem = {
									quantity: itemValue.quantity as number,
									cost: itemValue.cost as number,
									product_key: itemValue.service as string,
									notes: itemValue.description as string,
									discount: itemValue.discount as number,
									tax_rate1: itemValue.taxRate1 as number,
									tax_rate2: itemValue.taxRate2 as number,
									tax_rate3: itemValue.taxRate3 as number,
									tax_name1: itemValue.taxName1 as string,
									tax_name2: itemValue.taxName2 as string,
									tax_name3: itemValue.taxName3 as string,
									custom_value1: itemValue.customValue1 as string,
									custom_value2: itemValue.customValue2 as string,
									custom_value3: itemValue.customValue3 as string,
									custom_value4: itemValue.customValue4 as string,
								};
								invoiceItems.push(item);
							}
						}
						responseData = await invoiceNinjaApiRequest.call(
							that,
							'PUT',
							`/invoices/${invoiceId}`,
							body as IDataObject,
						);
						responseData = responseData.data;
					}
					if (operation === 'get') {
						const invoiceId = that.getNodeParameter('invoiceId', i) as string;
						const include = that.getNodeParameter('include', i) as Array<string>;
						if (include.length) {
							qs.include = include.toString() as string;
						}
						responseData = await invoiceNinjaApiRequest.call(
							that,
							'GET',
							`/invoices/${invoiceId}`,
							{},
							qs,
						);
						responseData = responseData.data;
					}
					if (operation === 'getAll') {
						const filters = that.getNodeParameter('filters', i);
						if (filters.filter) {
							qs.filter = filters.filter as string;
						}
						if (filters.number) {
							qs.number = filters.number as string;
						}
						if (filters.withoutDeletedClients) {
							qs.without_deleted_clients = filters.withoutDeletedClients as boolean;
						}
						if (filters.upcomming) {
							qs.upcomming = filters.upcomming as boolean;
						}
						if (filters.overdue) {
							qs.overdue = filters.overdue as boolean;
						}
						const include = that.getNodeParameter('include', i) as Array<string>;
						if (include.length) {
							qs.include = include.toString() as string;
						}
						const returnAll = that.getNodeParameter('returnAll', i) as boolean;
						if (returnAll) {
							responseData = await invoiceNinjaApiRequestAllItems.call(
								that,
								'data',
								'GET',
								'/invoices',
								{},
								qs,
							);
						} else {
							const perPage = that.getNodeParameter('perPage', i) as boolean;
							if (perPage) qs.per_page = perPage;
							responseData = await invoiceNinjaApiRequest.call(that, 'GET', '/invoices', {}, qs);
							responseData = responseData.data;
						}
					}
					if (operation === 'delete') {
						const invoiceId = that.getNodeParameter('invoiceId', i) as string;
						responseData = await invoiceNinjaApiRequest.call(
							that,
							'DELETE',
							`/invoices/${invoiceId}`,
						);
						responseData = responseData.data;
					}
					if (operation === 'download') {
						const inputKey = that.getNodeParameter('inputKey', i) as string;
						try {
							responseData = await invoiceNinjaApiDownloadFile.call(
								that,
								'GET',
								`/invoice/${inputKey}/download`,
							).catch(err => {
								if (err.description == 'no record found') return null; // handle not found
								throw err;
							});
						} catch (er) {
							// fetch invoice by id first to get invitationKey
							let tmpInvoiceData = await invoiceNinjaApiRequest.call(
								that,
								'GET',
								`/invoices/${inputKey}`,
							).catch(err => {
								if (err.description.includes('query results')) return null; // handle not found
								throw err;
							});
							if (!tmpInvoiceData) throw new Error('No invoice found for this key');
							if (!tmpInvoiceData.data.invitations[0].key) throw new Error('No invitation key present at invoice');
							// download it with the fetched key
							responseData = await invoiceNinjaApiDownloadFile.call(
								that,
								'GET',
								`/invoice/${tmpInvoiceData.data.invitations[0].key}/download`,
							);
						}
						returnData.push({
							json: {},
							binary: {
								data: await that.helpers.prepareBinaryData(
									responseData,
									'invoice.pdf',
									'application/pdf'
								),
							},

						});
						continue;
					}
					if (operation === 'action') {
						const invoiceId = that.getNodeParameter('invoiceId', i) as string;
						const action = that.getNodeParameter('action', i) as string;
						responseData = await invoiceNinjaApiRequest.call(
							that,
							'GET',
							`/invoices/${invoiceId}/${action}`,
						);
					}
				}
				if (resource === 'payment') {
					if (operation === 'create') {
						const additionalFields = that.getNodeParameter('additionalFields', i);
						const invoice = that.getNodeParameter('invoice', i) as string;
						const client = (
							await invoiceNinjaApiRequest.call(that, 'GET', `/invoices/${invoice}`, {}, qs)
						).data?.client_id as string;
						const amount = that.getNodeParameter('amount', i) as number;
						const body: IPayment = {
							invoices: [{
								invoice_id: invoice,
							}],
							amount,
							client_id: client,
						};
						if (additionalFields.type_id) {
							body.type_id = additionalFields.type_id as string;
						}
						if (additionalFields.transferReference) {
							body.transaction_reference = additionalFields.transferReference as string;
						}
						if (additionalFields.privateNotes) {
							body.private_notes = additionalFields.privateNotes as string;
						}
						if (additionalFields.customValue1) {
							body.custom_value1 = additionalFields.customValue1 as string;
						}
						if (additionalFields.customValue2) {
							body.custom_value2 = additionalFields.customValue2 as string;
						}
						if (additionalFields.customValue3) {
							body.custom_value3 = additionalFields.customValue3 as string;
						}
						if (additionalFields.customValue4) {
							body.custom_value4 = additionalFields.customValue4 as string;
						}
						responseData = await invoiceNinjaApiRequest.call(
							that,
							'POST',
							'/payments',
							body as IDataObject,
						);
						responseData = responseData.data;
					}
					if (operation === 'update') {
						const paymentId = that.getNodeParameter('paymentId', i) as string;
						const additionalFields = that.getNodeParameter('additionalFields', i);
						const invoice = that.getNodeParameter('invoice', i) as string;
						const client = (
							await invoiceNinjaApiRequest.call(that, 'GET', `/invoices/${invoice}`, {}, qs)
						).data?.client_id as string;
						const amount = that.getNodeParameter('amount', i) as number;
						const body: IPayment = {
							invoices: [{ invoice_id: invoice }],
							amount,
							client_id: client,
						};
						if (additionalFields.type_id) {
							body.type_id = additionalFields.type_id as string;
						}
						if (additionalFields.transferReference) {
							body.transaction_reference = additionalFields.transferReference as string;
						}
						if (additionalFields.privateNotes) {
							body.private_notes = additionalFields.privateNotes as string;
						}
						if (additionalFields.customValue1) {
							body.custom_value1 = additionalFields.customValue1 as string;
						}
						if (additionalFields.customValue2) {
							body.custom_value2 = additionalFields.customValue2 as string;
						}
						if (additionalFields.customValue3) {
							body.custom_value3 = additionalFields.customValue3 as string;
						}
						if (additionalFields.customValue4) {
							body.custom_value4 = additionalFields.customValue4 as string;
						}
						responseData = await invoiceNinjaApiRequest.call(
							that,
							'PUT',
							`/payments/${paymentId}`,
							body as IDataObject,
						);
						responseData = responseData.data;
					}
					if (operation === 'get') {
						const paymentId = that.getNodeParameter('paymentId', i) as string;
						const include = that.getNodeParameter('include', i) as Array<string>;
						if (include.length) {
							qs.include = include.toString() as string;
						}
						responseData = await invoiceNinjaApiRequest.call(
							that,
							'GET',
							`/payments/${paymentId}`,
							{},
							qs,
						);
						responseData = responseData.data;
					}
					if (operation === 'getAll') {
						const filters = that.getNodeParameter('filters', i);
						if (filters.filter) {
							qs.filter = filters.filter as string;
						}
						if (filters.number) {
							qs.number = filters.number as string;
						}
						const include = that.getNodeParameter('include', i) as Array<string>;
						if (include.length) {
							qs.include = include.toString() as string;
						}
						const returnAll = that.getNodeParameter('returnAll', i) as boolean;
						if (returnAll) {
							responseData = await invoiceNinjaApiRequestAllItems.call(
								that,
								'data',
								'GET',
								'/payments',
								{},
								qs,
							);
						} else {
							const perPage = that.getNodeParameter('perPage', i) as boolean;
							if (perPage) qs.per_page = perPage;
							responseData = await invoiceNinjaApiRequest.call(that, 'GET', '/payments', {}, qs);
							responseData = responseData.data;
						}
					}
					if (operation === 'delete') {
						const paymentId = that.getNodeParameter('paymentId', i) as string;
						responseData = await invoiceNinjaApiRequest.call(
							that,
							'DELETE',
							`/payments/${paymentId}`,
						);
						responseData = responseData.data;
					}
				}
				if (resource === 'project') {
					if (operation === 'create') {
						const additionalFields = that.getNodeParameter('additionalFields', i);
						const body: IProject = {};
						if (additionalFields.name) {
							body.name = additionalFields.name as string;
						}
						if (additionalFields.number) {
							body.number = additionalFields.number as string;
						}
						if (additionalFields.client) {
							body.client_id = additionalFields.clientId as string;
						}
						if (additionalFields.assignedUserId) {
							body.assigned_user_id = additionalFields.assignedUserId as string;
						}
						if (additionalFields.userId) {
							body.user_id = additionalFields.userId as string;
						}
						if (additionalFields.taskRate) {
							body.task_rate = additionalFields.taskRate as number;
						}
						if (additionalFields.dueDate) {
							body.due_date = additionalFields.dueDate as string;
						}
						if (additionalFields.privateNotes) {
							body.private_notes = additionalFields.privateNotes as string;
						}
						if (additionalFields.publicNotes) {
							body.public_notes = additionalFields.publicNotes as string;
						}
						if (additionalFields.customValue1) {
							body.custom_value1 = additionalFields.customValue1 as string;
						}
						if (additionalFields.customValue2) {
							body.custom_value2 = additionalFields.customValue2 as string;
						}
						if (additionalFields.customValue3) {
							body.custom_value3 = additionalFields.customValue3 as string;
						}
						if (additionalFields.customValue4) {
							body.custom_value4 = additionalFields.customValue4 as string;
						}
						if (additionalFields.color) {
							body.color = additionalFields.color as string;
						}
						responseData = await invoiceNinjaApiRequest.call(
							that,
							'POST',
							'/projects',
							body as IDataObject,
						);
						responseData = responseData.data;
					}
					if (operation === 'update') {
						const projectId = that.getNodeParameter('projectId', i) as string;
						const additionalFields = that.getNodeParameter('additionalFields', i);
						const body: IProject = {};
						if (additionalFields.name) {
							body.name = additionalFields.name as string;
						}
						if (additionalFields.number) {
							body.number = additionalFields.number as string;
						}
						if (additionalFields.client) {
							body.client_id = additionalFields.clientId as string;
						}
						if (additionalFields.assignedUserId) {
							body.assigned_user_id = additionalFields.assignedUserId as string;
						}
						if (additionalFields.userId) {
							body.user_id = additionalFields.userId as string;
						}
						if (additionalFields.taskRate) {
							body.task_rate = additionalFields.taskRate as number;
						}
						if (additionalFields.dueDate) {
							body.due_date = additionalFields.dueDate as string;
						}
						if (additionalFields.privateNotes) {
							body.private_notes = additionalFields.privateNotes as string;
						}
						if (additionalFields.publicNotes) {
							body.public_notes = additionalFields.publicNotes as string;
						}
						if (additionalFields.customValue1) {
							body.custom_value1 = additionalFields.customValue1 as string;
						}
						if (additionalFields.customValue2) {
							body.custom_value2 = additionalFields.customValue2 as string;
						}
						if (additionalFields.customValue3) {
							body.custom_value3 = additionalFields.customValue3 as string;
						}
						if (additionalFields.customValue4) {
							body.custom_value4 = additionalFields.customValue4 as string;
						}
						if (additionalFields.color) {
							body.color = additionalFields.color as string;
						}
						responseData = await invoiceNinjaApiRequest.call(
							that,
							'PUT',
							`/projects/${projectId}`,
							body as IDataObject,
						);
						responseData = responseData.data;
					}
					if (operation === 'get') {
						const projectId = that.getNodeParameter('projectId', i) as string;
						const include = that.getNodeParameter('include', i) as Array<string>;
						if (include.length) {
							qs.include = include.toString() as string;
						}
						responseData = await invoiceNinjaApiRequest.call(
							that,
							'GET',
							`/projects/${projectId}`,
							{},
							qs,
						);
						responseData = responseData.data;
					}
					if (operation === 'getAll') {
						const filters = that.getNodeParameter('filters', i);
						if (filters.filter) {
							qs.filter = filters.filter as string;
						}
						if (filters.number) {
							qs.number = filters.number as string;
						}
						const include = that.getNodeParameter('include', i) as Array<string>;
						if (include.length) {
							qs.include = include.toString() as string;
						}
						const returnAll = that.getNodeParameter('returnAll', i) as boolean;
						if (returnAll) {
							responseData = await invoiceNinjaApiRequestAllItems.call(
								that,
								'data',
								'GET',
								'/projects',
								{},
								qs,
							);
						} else {
							const perPage = that.getNodeParameter('perPage', i) as boolean;
							if (perPage) qs.per_page = perPage;
							responseData = await invoiceNinjaApiRequest.call(that, 'GET', '/projects', {}, qs);
							responseData = responseData.data;
						}
					}
					if (operation === 'delete') {
						const projectId = that.getNodeParameter('projectId', i) as string;
						responseData = await invoiceNinjaApiRequest.call(that, 'DELETE', `/projects/${projectId}`);
						responseData = responseData.data;
					}
				}
				if (resource === 'quote') {
					if (operation === 'create') {
						const additionalFields = that.getNodeParameter('additionalFields', i);
						const body: IQuote = {};
						if (additionalFields.client) {
							body.client_id = additionalFields.client as string;
						}
						if (additionalFields.auto_bill_enabled) {
							body.auto_bill_enabled = additionalFields.auto_bill_enabled as boolean;
						}
						if (additionalFields.dueDate) {
							body.due_date = additionalFields.dueDate as string;
						}
						if (additionalFields.quouteDate) {
							body.date = additionalFields.quouteDate as string;
						}
						if (additionalFields.quoteNumber) {
							body.number = additionalFields.quoteNumber as string;
						}
						if (additionalFields.status_id) {
							body.status_id = additionalFields.status_id as string;
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
						if (additionalFields.discount) {
							body.discount = additionalFields.discount as number;
						}
						if (additionalFields.privateNotes) {
							body.private_notes = additionalFields.privateNotes as string;
						}
						if (additionalFields.publicNotes) {
							body.public_notes = additionalFields.publicNotes as string;
						}
						if (additionalFields.customValue1) {
							body.custom_value1 = additionalFields.customValue1 as string;
						}
						if (additionalFields.customValue2) {
							body.custom_value2 = additionalFields.customValue2 as string;
						}
						if (additionalFields.customValue3) {
							body.custom_value3 = additionalFields.customValue3 as string;
						}
						if (additionalFields.customValue4) {
							body.custom_value4 = additionalFields.customValue4 as string;
						}
						const invoceItemsValues = (that.getNodeParameter('invoiceItemsUi', i) as IDataObject)
							.invoiceItemsValues as IDataObject[];
						if (invoceItemsValues) {
							const invoiceItems: IItem[] = [];
							for (const itemValue of invoceItemsValues) {
								const item: IItem = {
									cost: itemValue.cost as number,
									notes: itemValue.description as string,
									product_key: itemValue.service as string,
									quantity: itemValue.quantity as number,
									tax_rate1: itemValue.taxRate1 as number,
									tax_rate2: itemValue.taxRate2 as number,
									tax_name1: itemValue.taxName1 as string,
									tax_name2: itemValue.taxName2 as string,
								};
								invoiceItems.push(item);
							}
							body.line_items = invoiceItems;
						}
						responseData = await invoiceNinjaApiRequest.call(
							that,
							'POST',
							'/quotes',
							body as IDataObject,
						);
						responseData = responseData.data;
					}
					if (operation === 'update') {
						const quoteId = that.getNodeParameter('quoteId', i) as string;
						const additionalFields = that.getNodeParameter('additionalFields', i);
						const body: IQuote = {};
						if (additionalFields.client) {
							body.client_id = additionalFields.client as string;
						}
						if (additionalFields.auto_bill_enabled) {
							body.auto_bill_enabled = additionalFields.auto_bill_enabled as boolean;
						}
						if (additionalFields.dueDate) {
							body.due_date = additionalFields.dueDate as string;
						}
						if (additionalFields.quouteDate) {
							body.date = additionalFields.quouteDate as string;
						}
						if (additionalFields.quoteNumber) {
							body.number = additionalFields.quoteNumber as string;
						}
						if (additionalFields.status_id) {
							body.status_id = additionalFields.status_id as string;
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
						if (additionalFields.discount) {
							body.discount = additionalFields.discount as number;
						}
						if (additionalFields.privateNotes) {
							body.private_notes = additionalFields.privateNotes as string;
						}
						if (additionalFields.publicNotes) {
							body.public_notes = additionalFields.publicNotes as string;
						}
						if (additionalFields.customValue1) {
							body.custom_value1 = additionalFields.customValue1 as string;
						}
						if (additionalFields.customValue2) {
							body.custom_value2 = additionalFields.customValue2 as string;
						}
						if (additionalFields.customValue3) {
							body.custom_value3 = additionalFields.customValue3 as string;
						}
						if (additionalFields.customValue4) {
							body.custom_value4 = additionalFields.customValue4 as string;
						}
						const invoceItemsValues = (that.getNodeParameter('invoiceItemsUi', i) as IDataObject)
							.invoiceItemsValues as IDataObject[];
						if (invoceItemsValues) {
							const invoiceItems: IItem[] = [];
							for (const itemValue of invoceItemsValues) {
								const item: IItem = {
									cost: itemValue.cost as number,
									notes: itemValue.description as string,
									product_key: itemValue.service as string,
									quantity: itemValue.quantity as number,
									tax_rate1: itemValue.taxRate1 as number,
									tax_rate2: itemValue.taxRate2 as number,
									tax_name1: itemValue.taxName1 as string,
									tax_name2: itemValue.taxName2 as string,
								};
								invoiceItems.push(item);
							}
							body.line_items = invoiceItems;
						}
						responseData = await invoiceNinjaApiRequest.call(
							that,
							'PUT',
							'/quotes' + `/${quoteId}`,
							body as IDataObject,
						);
						responseData = responseData.data;
					}
					if (operation === 'get') {
						const quoteId = that.getNodeParameter('quoteId', i) as string;
						const include = that.getNodeParameter('include', i) as Array<string>;
						if (include.length) {
							qs.include = include.toString() as string;
						}
						responseData = await invoiceNinjaApiRequest.call(
							that,
							'GET',
							`/quotes/${quoteId}`,
							{},
							qs,
						).catch(err => {
							if (err.description.includes('query results')) throw new Error('Quote was not found.'); // handle not found
							throw err;
						});
						responseData = responseData.data;
					}
					if (operation === 'getAll') {
						const filters = that.getNodeParameter('filters', i);
						if (filters.filter) {
							qs.filter = filters.filter as string;
						}
						if (filters.number) {
							qs.number = filters.number as string;
						}
						const include = that.getNodeParameter('include', i) as Array<string>;
						if (include.length) {
							qs.include = include.toString() as string;
						}
						const returnAll = that.getNodeParameter('returnAll', i) as boolean;
						if (returnAll) {
							responseData = await invoiceNinjaApiRequestAllItems.call(
								that,
								'data',
								'GET',
								'/quotes',
								{},
								qs,
							);
						} else {
							const perPage = that.getNodeParameter('perPage', i) as boolean;
							if (perPage) qs.per_page = perPage;
							responseData = await invoiceNinjaApiRequest.call(that, 'GET', '/invoices', {}, qs);
							responseData = responseData.data;
						}
					}
					if (operation === 'delete') {
						const quoteId = that.getNodeParameter('quoteId', i) as string;
						responseData = await invoiceNinjaApiRequest.call(
							that,
							'DELETE',
							`/quote/${quoteId}`,
						);
						responseData = responseData.data;
					}
					if (operation === 'action') {
						const quoteId = that.getNodeParameter('quoteId', i) as string;
						const action = that.getNodeParameter('action', i) as string;
						responseData = await invoiceNinjaApiRequest.call(
							that,
							'GET',
							`/quotes/${quoteId}/${action}`,
						);
					}
				}
				if (resource === 'recurringExpense') {
					if (operation === 'create') {
						const additionalFields = that.getNodeParameter('additionalFields', i);
						const body: IRecurringExpense = {};
						if (additionalFields.userId) {
							body.user_id = additionalFields.userId as string;
						}
						if (additionalFields.assignedUserId) {
							body.assigned_user_id = additionalFields.assignedUserId as string;
						}
						if (additionalFields.vendorId) {
							body.vendor_id = additionalFields.vendorId as string;
						}
						if (additionalFields.invoiceId) {
							body.invoice_id = additionalFields.invoiceId as string;
						}
						if (additionalFields.clientId) {
							body.client_id = additionalFields.clientId as string;
						}
						if (additionalFields.bankId) {
							body.bank_id = additionalFields.bankId as string;
						}
						if (additionalFields.currencyId) {
							body.currency_id = additionalFields.currencyId as string;
						}
						if (additionalFields.categoryId) {
							body.category_id = additionalFields.categoryId as string;
						}
						if (additionalFields.paymentTypeId) {
							body.payment_type_id = additionalFields.paymentTypeId as string;
						}
						if (additionalFields.shouldBeInvoiced) {
							body.should_be_invoiced = additionalFields.shouldBeInvoiced as boolean;
						}
						if (additionalFields.amount) {
							body.amount = additionalFields.amount as number;
						}
						if (additionalFields.foreignAmount) {
							body.foreign_amount = additionalFields.foreignAmount as number;
						}
						if (additionalFields.exchangeRate) {
							body.exchange_rate = additionalFields.exchangeRate as number;
						}
						if (additionalFields.taxName1) {
							body.tax_name1 = additionalFields.taxName1 as string;
						}
						if (additionalFields.taxName2) {
							body.tax_name2 = additionalFields.taxName2 as string;
						}
						if (additionalFields.taxName3) {
							body.tax_name3 = additionalFields.taxName3 as string;
						}
						if (additionalFields.taxRate1) {
							body.tax_rate1 = additionalFields.taxRate1 as number;
						}
						if (additionalFields.taxRate2) {
							body.tax_rate2 = additionalFields.taxRate2 as number;
						}
						if (additionalFields.taxRate3) {
							body.tax_rate3 = additionalFields.taxRate3 as number;
						}
						if (additionalFields.taxAmount1) {
							body.tax_amount1 = additionalFields.taxAmount1 as number;
						}
						if (additionalFields.taxAmount2) {
							body.tax_amount2 = additionalFields.taxAmount2 as number;
						}
						if (additionalFields.taxAmount3) {
							body.tax_amount3 = additionalFields.taxAmount3 as number;
						}
						if (additionalFields.remainingCycles) {
							body.remaining_cycles = additionalFields.remainingCycles as number;
						}
						if (additionalFields.frequencyId) {
							body.frequency_id = additionalFields.frequencyId as string;
						}
						if (additionalFields.nextSendDate) {
							body.next_send_date = additionalFields.nextSendDate as string;
						}
						if (additionalFields.taxAmount3) {
							body.tax_amount3 = additionalFields.taxAmount3 as number;
						}
						if (additionalFields.publicNotes) {
							body.public_notes = additionalFields.publicNotes as string;
						}
						if (additionalFields.privateNotes) {
							body.private_notes = additionalFields.privateNotes as string;
						}
						if (additionalFields.transactionReference) {
							body.transaction_reference = additionalFields.transactionReference as string;
						}
						if (additionalFields.transactionId) {
							body.transaction_id = additionalFields.transactionId as string;
						}
						if (additionalFields.date) {
							body.date = additionalFields.date as string;
						}
						if (additionalFields.number) {
							body.number = additionalFields.number as string;
						}
						if (additionalFields.customValue1) {
							body.custom_value1 = additionalFields.customValue1 as string;
						}
						if (additionalFields.customValue2) {
							body.custom_value2 = additionalFields.customValue2 as string;
						}
						if (additionalFields.customValue3) {
							body.custom_value3 = additionalFields.customValue3 as string;
						}
						if (additionalFields.customValue4) {
							body.custom_value4 = additionalFields.customValue4 as string;
						}
						if (additionalFields.projectId) {
							body.project_id = additionalFields.projectId as string;
						}
						if (additionalFields.usesInclusiveTaxes) {
							body.uses_inclusive_taxes = additionalFields.usesInclusiveTaxes as boolean;
						}
						if (additionalFields.calculateTaxByAmount) {
							body.calculate_tax_by_amount = additionalFields.calculateTaxByAmount as boolean;
						}
						if (additionalFields.entityType) {
							body.entity_type = additionalFields.entityType as string;
						}
						responseData = await invoiceNinjaApiRequest.call(
							that,
							'POST',
							'/recurring_expenses',
							body as IDataObject,
						);
						responseData = responseData.data;
					}
					if (operation === 'update') {
						const recurringExpenseId = that.getNodeParameter('recurringExpenseId', i) as string;
						const additionalFields = that.getNodeParameter('additionalFields', i);
						const body: IRecurringExpense = {};

						if (additionalFields.userId) {
							body.user_id = additionalFields.userId as string;
						}
						if (additionalFields.assignedUserId) {
							body.assigned_user_id = additionalFields.assignedUserId as string;
						}
						if (additionalFields.vendorId) {
							body.vendor_id = additionalFields.vendorId as string;
						}
						if (additionalFields.invoiceId) {
							body.invoice_id = additionalFields.invoiceId as string;
						}
						if (additionalFields.clientId) {
							body.client_id = additionalFields.clientId as string;
						}
						if (additionalFields.bankId) {
							body.bank_id = additionalFields.bankId as string;
						}
						if (additionalFields.currencyId) {
							body.currency_id = additionalFields.currencyId as string;
						}
						if (additionalFields.categoryId) {
							body.category_id = additionalFields.categoryId as string;
						}
						if (additionalFields.paymentTypeId) {
							body.payment_type_id = additionalFields.paymentTypeId as string;
						}
						if (additionalFields.shouldBeInvoiced) {
							body.should_be_invoiced = additionalFields.shouldBeInvoiced as boolean;
						}
						if (additionalFields.amount) {
							body.amount = additionalFields.amount as number;
						}
						if (additionalFields.foreignAmount) {
							body.foreign_amount = additionalFields.foreignAmount as number;
						}
						if (additionalFields.exchangeRate) {
							body.exchange_rate = additionalFields.exchangeRate as number;
						}
						if (additionalFields.taxName1) {
							body.tax_name1 = additionalFields.taxName1 as string;
						}
						if (additionalFields.taxName2) {
							body.tax_name2 = additionalFields.taxName2 as string;
						}
						if (additionalFields.taxName3) {
							body.tax_name3 = additionalFields.taxName3 as string;
						}
						if (additionalFields.taxRate1) {
							body.tax_rate1 = additionalFields.taxRate1 as number;
						}
						if (additionalFields.taxRate2) {
							body.tax_rate2 = additionalFields.taxRate2 as number;
						}
						if (additionalFields.taxRate3) {
							body.tax_rate3 = additionalFields.taxRate3 as number;
						}
						if (additionalFields.taxAmount1) {
							body.tax_amount1 = additionalFields.taxAmount1 as number;
						}
						if (additionalFields.taxAmount2) {
							body.tax_amount2 = additionalFields.taxAmount2 as number;
						}
						if (additionalFields.taxAmount3) {
							body.tax_amount3 = additionalFields.taxAmount3 as number;
						}
						if (additionalFields.remainingCycles) {
							body.remaining_cycles = additionalFields.remainingCycles as number;
						}
						if (additionalFields.frequencyId) {
							body.frequency_id = additionalFields.frequencyId as string;
						}
						if (additionalFields.nextSendDate) {
							body.next_send_date = additionalFields.nextSendDate as string;
						}
						if (additionalFields.publicNotes) {
							body.public_notes = additionalFields.publicNotes as string;
						}
						if (additionalFields.privateNotes) {
							body.private_notes = additionalFields.privateNotes as string;
						}
						if (additionalFields.transactionReference) {
							body.transaction_reference = additionalFields.transactionReference as string;
						}
						if (additionalFields.transactionId) {
							body.transaction_id = additionalFields.transactionId as string;
						}
						if (additionalFields.date) {
							body.date = additionalFields.date as string;
						}
						if (additionalFields.number) {
							body.number = additionalFields.number as string;
						}
						if (additionalFields.customValue1) {
							body.custom_value1 = additionalFields.customValue1 as string;
						}
						if (additionalFields.customValue2) {
							body.custom_value2 = additionalFields.customValue2 as string;
						}
						if (additionalFields.customValue3) {
							body.custom_value3 = additionalFields.customValue3 as string;
						}
						if (additionalFields.customValue4) {
							body.custom_value4 = additionalFields.customValue4 as string;
						}
						if (additionalFields.projectId) {
							body.project_id = additionalFields.projectId as string;
						}
						if (additionalFields.usesInclusiveTaxes) {
							body.uses_inclusive_taxes = additionalFields.usesInclusiveTaxes as boolean;
						}
						if (additionalFields.calculateTaxByAmount) {
							body.calculate_tax_by_amount = additionalFields.calculateTaxByAmount as boolean;
						}
						if (additionalFields.entityType) {
							body.entity_type = additionalFields.entityType as string;
						}
						responseData = await invoiceNinjaApiRequest.call(
							that,
							'PUT',
							`/recurring_expenses/${recurringExpenseId}`,
							body as IDataObject,
						);
						responseData = responseData.data;
					}
					if (operation === 'get') {
						const recurringExpenseId = that.getNodeParameter('recurringExpenseId', i) as string;
						responseData = await invoiceNinjaApiRequest.call(
							that,
							'GET',
							`/recurring_expenses/${recurringExpenseId}`,
							{},
							qs,
						);
						responseData = responseData.data;
					}
					if (operation === 'getAll') {
						const filters = that.getNodeParameter('filters', i);
						if (filters.filter) {
							qs.filter = filters.filter as string;
						}
						if (filters.number) {
							qs.number = filters.number as string;
						}
						if (filters.clientId) {
							qs.client_id = filters.clientId as string;
						}
						const include = that.getNodeParameter('include', i) as Array<string>;
						if (include.length) {
							qs.include = include.toString() as string;
						}
						const returnAll = that.getNodeParameter('returnAll', i) as boolean;
						if (returnAll) {
							responseData = await invoiceNinjaApiRequestAllItems.call(
								that,
								'data',
								'GET',
								'/recurring_expenses',
								{},
								qs,
							);
						} else {
							const perPage = that.getNodeParameter('perPage', i) as boolean;
							if (perPage) qs.per_page = perPage;
							responseData = await invoiceNinjaApiRequest.call(that, 'GET', '/recurringExpenses', {}, qs);
							responseData = responseData.data;
						}
					}
					if (operation === 'delete') {
						const recurringExpenseId = that.getNodeParameter('recurringExpenseId', i) as string;
						responseData = await invoiceNinjaApiRequest.call(
							that,
							'DELETE',
							`/recurring_expenses/${recurringExpenseId}`,
						);
						responseData = responseData.data;
					}
				}
				if (resource === 'recurringInvoice') {
					if (operation === 'create') {
						const additionalFields = that.getNodeParameter('additionalFields', i);
						const body: IRecurringInvoice = {};
						if (additionalFields.userId) {
							body.user_id = additionalFields.userId as string;
						}
						if (additionalFields.projectId) {
							body.project_id = additionalFields.projectId as string;
						}
						if (additionalFields.assignedUserId) {
							body.assigned_user_id = additionalFields.assignedUserId as string;
						}
						if (additionalFields.clientId) {
							body.client_id = additionalFields.clientId as string;
						}
						if (additionalFields.vendorId) {
							body.vendor_id = additionalFields.vendorId as string;
						}
						if (additionalFields.statusId) {
							body.status_id = additionalFields.statusId as string;
						}
						if (additionalFields.designId) {
							body.design_id = additionalFields.designId as string;
						}
						if (additionalFields.number) {
							body.number = additionalFields.number as string;
						}
						if (additionalFields.discount) {
							body.discount = additionalFields.discount as number;
						}
						if (additionalFields.poNumber) {
							body.po_number = additionalFields.poNumber as string;
						}
						if (additionalFields.date) {
							body.date = additionalFields.date as string;
						}
						if (additionalFields.dueDate) {
							body.due_date = additionalFields.dueDate as string;
						}
						if (additionalFields.terms) {
							body.terms = additionalFields.terms as string;
						}
						if (additionalFields.usesInclusiveTaxes) {
							body.uses_inclusive_taxes = additionalFields.usesInclusiveTaxes as boolean;
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
						if (additionalFields.discount) {
							body.discount = additionalFields.discount as number;
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
						if (additionalFields.taxName3) {
							body.tax_name3 = additionalFields.taxName3 as string;
						}
						if (additionalFields.taxRate1) {
							body.tax_rate1 = additionalFields.taxtRate1 as number;
						}
						if (additionalFields.taxRate2) {
							body.tax_rate2 = additionalFields.taxtRate2 as number;
						}
						if (additionalFields.taxRate3) {
							body.tax_rate3 = additionalFields.taxtRate3 as number;
						}
						if (additionalFields.remainingCycles) {
							body.remaining_cycles = additionalFields.remainingCycles as number;
						}
						if (additionalFields.frequencyId) {
							body.frequency_id = additionalFields.frequencyId as string;
						}
						if (additionalFields.nextSendDate) {
							body.next_send_date = additionalFields.nextSendDate as string;
						}
						if (additionalFields.customValue1) {
							body.custom_value1 = additionalFields.customValue1 as string;
						}
						if (additionalFields.customValue2) {
							body.custom_value2 = additionalFields.customValue2 as string;
						}
						if (additionalFields.customValue3) {
							body.custom_value3 = additionalFields.customValue3 as string;
						}
						if (additionalFields.customValue4) {
							body.custom_value4 = additionalFields.customValue4 as string;
						}
						if (additionalFields.autoBillEnabled) {
							body.auto_bill_enabled = additionalFields.autoBillEnabled as boolean;
						}
						const invoceItemsValues = (that.getNodeParameter('recurringInvoiceItemsUi', i) as IDataObject)
							.recurringInvoiceItemsValues as IDataObject[];
						if (invoceItemsValues) {
							const recurringInvoiceItems: IRecurringInvoiceItem[] = [];
							for (const itemValue of invoceItemsValues) {
								const item: IRecurringInvoiceItem = {
									quantity: itemValue.quantity as number,
									cost: itemValue.cost as number,
									product_key: itemValue.service as string,
									notes: itemValue.description as string,
									discount: itemValue.discount as number,
									tax_rate1: itemValue.taxRate1 as number,
									tax_rate2: itemValue.taxRate2 as number,
									tax_rate3: itemValue.taxRate3 as number,
									tax_name1: itemValue.taxName1 as string,
									tax_name2: itemValue.taxName2 as string,
									tax_name3: itemValue.taxName3 as string,
									custom_value1: itemValue.customValue1 as string,
									custom_value2: itemValue.customValue2 as string,
									custom_value3: itemValue.customValue3 as string,
									custom_value4: itemValue.customValue4 as string,
								};
								recurringInvoiceItems.push(item);
							}
							body.line_items = recurringInvoiceItems;
						}
						responseData = await invoiceNinjaApiRequest.call(
							that,
							'POST',
							'/recurring_invoices',
							body as IDataObject,
						);
						responseData = responseData.data;
					}
					if (operation === 'update') {
						const recurringInvoiceId = that.getNodeParameter('recurringInvoiceId', i) as string;
						const additionalFields = that.getNodeParameter('additionalFields', i);
						const body: IRecurringInvoice = {};
						if (additionalFields.userId) {
							body.user_id = additionalFields.userId as string;
						}
						if (additionalFields.projectId) {
							body.project_id = additionalFields.projectId as string;
						}
						if (additionalFields.assignedUserId) {
							body.assigned_user_id = additionalFields.assignedUserId as string;
						}
						if (additionalFields.clientId) {
							body.client_id = additionalFields.clientId as string;
						}
						if (additionalFields.vendorId) {
							body.vendor_id = additionalFields.vendorId as string;
						}
						if (additionalFields.statusId) {
							body.status_id = additionalFields.statusId as string;
						}
						if (additionalFields.designId) {
							body.design_id = additionalFields.designId as string;
						}
						if (additionalFields.number) {
							body.number = additionalFields.number as string;
						}
						if (additionalFields.discount) {
							body.discount = additionalFields.discount as number;
						}
						if (additionalFields.poNumber) {
							body.po_number = additionalFields.poNumber as string;
						}
						if (additionalFields.date) {
							body.date = additionalFields.date as string;
						}
						if (additionalFields.dueDate) {
							body.due_date = additionalFields.dueDate as string;
						}
						if (additionalFields.terms) {
							body.terms = additionalFields.terms as string;
						}
						if (additionalFields.usesInclusiveTaxes) {
							body.uses_inclusive_taxes = additionalFields.usesInclusiveTaxes as boolean;
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
						if (additionalFields.discount) {
							body.discount = additionalFields.discount as number;
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
						if (additionalFields.taxName3) {
							body.tax_name3 = additionalFields.taxName3 as string;
						}
						if (additionalFields.taxRate1) {
							body.tax_rate1 = additionalFields.taxtRate1 as number;
						}
						if (additionalFields.taxRate2) {
							body.tax_rate2 = additionalFields.taxtRate2 as number;
						}
						if (additionalFields.taxRate3) {
							body.tax_rate3 = additionalFields.taxtRate3 as number;
						}
						if (additionalFields.remainingCycles) {
							body.remaining_cycles = additionalFields.remainingCycles as number;
						}
						if (additionalFields.frequencyId) {
							body.frequency_id = additionalFields.frequencyId as string;
						}
						if (additionalFields.nextSendDate) {
							body.next_send_date = additionalFields.nextSendDate as string;
						}
						if (additionalFields.customValue1) {
							body.custom_value1 = additionalFields.customValue1 as string;
						}
						if (additionalFields.customValue2) {
							body.custom_value2 = additionalFields.customValue2 as string;
						}
						if (additionalFields.customValue3) {
							body.custom_value3 = additionalFields.customValue3 as string;
						}
						if (additionalFields.customValue4) {
							body.custom_value4 = additionalFields.customValue4 as string;
						}
						if (additionalFields.autoBillEnabled) {
							body.auto_bill_enabled = additionalFields.autoBillEnabled as boolean;
						}
						const invoceItemsValues = (that.getNodeParameter('recurringInvoiceItemsUi', i) as IDataObject)
							.recurringInvoiceItemsValues as IDataObject[];
						if (invoceItemsValues) {
							const recurringInvoiceItems: IRecurringInvoiceItem[] = [];
							for (const itemValue of invoceItemsValues) {
								const item: IRecurringInvoiceItem = {
									quantity: itemValue.quantity as number,
									cost: itemValue.cost as number,
									product_key: itemValue.service as string,
									notes: itemValue.description as string,
									discount: itemValue.discount as number,
									tax_rate1: itemValue.taxRate1 as number,
									tax_rate2: itemValue.taxRate2 as number,
									tax_rate3: itemValue.taxRate3 as number,
									tax_name1: itemValue.taxName1 as string,
									tax_name2: itemValue.taxName2 as string,
									tax_name3: itemValue.taxName3 as string,
									custom_value1: itemValue.customValue1 as string,
									custom_value2: itemValue.customValue2 as string,
									custom_value3: itemValue.customValue3 as string,
									custom_value4: itemValue.customValue4 as string,
								};
								recurringInvoiceItems.push(item);
							}
						}
						responseData = await invoiceNinjaApiRequest.call(
							that,
							'PUT',
							`/recurring_invoices/${recurringInvoiceId}`,
							body as IDataObject,
						);
						responseData = responseData.data;
					}
					if (operation === 'get') {
						const recurringInvoiceId = that.getNodeParameter('recurringInvoiceId', i) as string;
						const include = that.getNodeParameter('include', i) as Array<string>;
						if (include.length) {
							qs.include = include.toString() as string;
						}
						responseData = await invoiceNinjaApiRequest.call(
							that,
							'GET',
							`/recurring_invoices/${recurringInvoiceId}`,
							{},
							qs,
						);
						responseData = responseData.data;
					}
					if (operation === 'getAll') {
						const filters = that.getNodeParameter('filters', i);
						if (filters.filter) {
							qs.filter = filters.filter as string;
						}
						if (filters.number) {
							qs.number = filters.number as string;
						}
						if (filters.withoutDeletedClients) {
							qs.without_deleted_clients = filters.withoutDeletedClients as boolean;
						}
						if (filters.upcomming) {
							qs.upcomming = filters.upcomming as boolean;
						}
						if (filters.overdue) {
							qs.overdue = filters.overdue as boolean;
						}
						const include = that.getNodeParameter('include', i) as Array<string>;
						if (include.length) {
							qs.include = include.toString() as string;
						}
						const returnAll = that.getNodeParameter('returnAll', i) as boolean;
						if (returnAll) {
							responseData = await invoiceNinjaApiRequestAllItems.call(
								that,
								'data',
								'GET',
								'/recurring_invoices',
								{},
								qs,
							);
						} else {
							const perPage = that.getNodeParameter('perPage', i) as boolean;
							if (perPage) qs.per_page = perPage;
							responseData = await invoiceNinjaApiRequest.call(that, 'GET', '/recurring_invoices', {}, qs);
							responseData = responseData.data;
						}
					}
					if (operation === 'delete') {
						const recurringInvoiceId = that.getNodeParameter('recurringInvoiceId', i) as string;
						responseData = await invoiceNinjaApiRequest.call(
							that,
							'DELETE',
							`/recurring_invoices/${recurringInvoiceId}`,
						);
						responseData = responseData.data;
					}
					if (operation === 'download') {
						const inputKey = that.getNodeParameter('inputKey', i) as string;
						try {
							responseData = await invoiceNinjaApiDownloadFile.call(
								that,
								'GET',
								`/recurring_invoices/${inputKey}/download`,
							).catch(err => {
								if (err.description == 'no record found') return null; // handle not found
								throw err;
							});
						} catch (er) {
							// fetch recurringInvoice by id first to get invitationKey
							let tmpInvoiceData = await invoiceNinjaApiRequest.call(
								that,
								'GET',
								`/recurring_invoices/${inputKey}`,
							).catch(err => {
								if (err.description.includes('query results')) return null; // handle not found
								throw err;
							});
							if (!tmpInvoiceData) throw new Error('No invoice found for this key');
							if (!tmpInvoiceData.data.invitations[0].key) throw new Error('No invitation key present at invoice');
							// download it with the fetched key
							responseData = await invoiceNinjaApiDownloadFile.call(
								that,
								'GET',
								`/recurring_invoices/${tmpInvoiceData.data.invitations[0].key}/download`,
							);
						}
						returnData.push({
							json: {},
							binary: {
								data: await that.helpers.prepareBinaryData(
									responseData,
									'recurring_invoice.pdf',
									'application/pdf'
								),
							},

						});
						continue;
					}
					if (operation === 'action') {
						const recurringInvoiceId = that.getNodeParameter('recurringInvoiceId', i) as string;
						const action = that.getNodeParameter('action', i) as string;
						responseData = await invoiceNinjaApiRequest.call(
							that,
							'GET',
							`/recurring_invoices/${recurringInvoiceId}/${action}`,
						);
					}
				}
				if (resource === 'task') {
					if (operation === 'create') {
						const additionalFields = that.getNodeParameter('additionalFields', i);
						const body: ITask = {};
						if (additionalFields.client) {
							body.client_id = additionalFields.client as string;
						}
						if (additionalFields.project) {
							body.project_id = additionalFields.project as string;
						}
						if (additionalFields.description) {
							body.description = additionalFields.description as string;
						}
						if (additionalFields.customValue1) {
							body.custom_value1 = additionalFields.customValue1 as string;
						}
						if (additionalFields.customValue2) {
							body.custom_value2 = additionalFields.customValue2 as string;
						}
						if (additionalFields.customValue3) {
							body.custom_value3 = additionalFields.customValue3 as string;
						}
						if (additionalFields.customValue4) {
							body.custom_value4 = additionalFields.customValue4 as string;
						}
						const timeLogsValues = (that.getNodeParameter('timeLogsUi', i) as IDataObject)
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
							that,
							'POST',
							'/tasks',
							body as IDataObject,
						);
						responseData = responseData.data;
					}
					if (operation === 'update') {
						const taskId = that.getNodeParameter('taskId', i) as string;
						const additionalFields = that.getNodeParameter('additionalFields', i);
						const body: ITask = {};
						if (additionalFields.client) {
							body.client_id = additionalFields.client as string;
						}
						if (additionalFields.project) {
							body.project_id = additionalFields.project as string;
						}
						if (additionalFields.description) {
							body.description = additionalFields.description as string;
						}
						if (additionalFields.customValue1) {
							body.custom_value1 = additionalFields.customValue1 as string;
						}
						if (additionalFields.customValue2) {
							body.custom_value2 = additionalFields.customValue2 as string;
						}
						if (additionalFields.customValue3) {
							body.custom_value3 = additionalFields.customValue3 as string;
						}
						if (additionalFields.customValue4) {
							body.custom_value4 = additionalFields.customValue4 as string;
						}
						const timeLogsValues = (that.getNodeParameter('timeLogsUi', i) as IDataObject)
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
							that,
							'PUT',
							`/tasks/${taskId}`,
							body as IDataObject,
						);
						responseData = responseData.data;
					}
					if (operation === 'get') {
						const taskId = that.getNodeParameter('taskId', i) as string;
						const include = that.getNodeParameter('include', i) as Array<string>;
						if (include.length) {
							qs.include = include.toString() as string;
						}
						responseData = await invoiceNinjaApiRequest.call(
							that,
							'GET',
							`/tasks/${taskId}`,
							{},
							qs,
						);
						responseData = responseData.data;
					}
					if (operation === 'getAll') {
						const filters = that.getNodeParameter('filters', i);
						if (filters.filter) {
							qs.filter = filters.filter as string;
						}
						if (filters.number) {
							qs.number = filters.number as string;
						}
						const include = that.getNodeParameter('include', i) as Array<string>;
						if (include.length) {
							qs.include = include.toString() as string;
						}
						const returnAll = that.getNodeParameter('returnAll', i) as boolean;
						if (returnAll) {
							responseData = await invoiceNinjaApiRequestAllItems.call(
								that,
								'data',
								'GET',
								'/tasks',
								{},
								qs,
							);
						} else {
							const perPage = that.getNodeParameter('perPage', i) as boolean;
							if (perPage) qs.per_page = perPage;
							responseData = await invoiceNinjaApiRequest.call(that, 'GET', '/tasks', {}, qs);
							responseData = responseData.data;
						}
					}
					if (operation === 'delete') {
						const taskId = that.getNodeParameter('taskId', i) as string;
						responseData = await invoiceNinjaApiRequest.call(that, 'DELETE', `/tasks/${taskId}`);
						responseData = responseData.data;
					}
				}
				if (resource === 'product') {
					if (operation === 'create') {
						const additionalFields = that.getNodeParameter('additionalFields', i);
						const body: IProduct = {};
						if (additionalFields.userId) {
							body.user_id = additionalFields.userId as string;
						}
						if (additionalFields.assignedUserId) {
							body.assigned_user_id = additionalFields.assignedUserId as string;
						}
						if (additionalFields.productKey) {
							body.product_key = additionalFields.productKey as string;
						}
						if (additionalFields.notes) {
							body.notes = additionalFields.notes as string;
						}
						if (additionalFields.cost) {
							body.cost = additionalFields.cost as number;
						}
						if (additionalFields.price) {
							body.price = additionalFields.price as number;
						}
						if (additionalFields.quantity) {
							body.quantity = additionalFields.quantity as number;
						}
						if (additionalFields.taxName1) {
							body.tax_name1 = additionalFields.taxName1 as string;
						}
						if (additionalFields.taxName2) {
							body.tax_name2 = additionalFields.taxName2 as string;
						}
						if (additionalFields.taxName3) {
							body.tax_name3 = additionalFields.taxName3 as string;
						}
						if (additionalFields.taxtRate1) {
							body.tax_rate1 = additionalFields.taxtRate1 as number;
						}
						if (additionalFields.taxtRate2) {
							body.tax_rate2 = additionalFields.taxtRate2 as number;
						}
						if (additionalFields.taxtRate3) {
							body.tax_rate3 = additionalFields.taxtRate3 as number;
						}
						if (additionalFields.customValue1) {
							body.custom_value1 = additionalFields.customValue1 as string;
						}
						if (additionalFields.customValue2) {
							body.custom_value2 = additionalFields.customValue2 as string;
						}
						if (additionalFields.customValue3) {
							body.custom_value3 = additionalFields.customValue3 as string;
						}
						if (additionalFields.customValue4) {
							body.custom_value4 = additionalFields.customValue4 as string;
						}
						responseData = await invoiceNinjaApiRequest.call(
							that,
							'POST',
							'/products',
							body as IDataObject,
						);
						responseData = responseData.data;
					}
					if (operation === 'update') {
						const productId = that.getNodeParameter('productId', i) as string;
						const additionalFields = that.getNodeParameter('additionalFields', i);
						const body: IProduct = {};
						if (additionalFields.userId) {
							body.user_id = additionalFields.userId as string;
						}
						if (additionalFields.assignedUserId) {
							body.assigned_user_id = additionalFields.assignedUserId as string;
						}
						if (additionalFields.productKey) {
							body.product_key = additionalFields.productKey as string;
						}
						if (additionalFields.notes) {
							body.notes = additionalFields.notes as string;
						}
						if (additionalFields.cost) {
							body.cost = additionalFields.cost as number;
						}
						if (additionalFields.price) {
							body.price = additionalFields.price as number;
						}
						if (additionalFields.quantity) {
							body.quantity = additionalFields.quantity as number;
						}
						if (additionalFields.taxName1) {
							body.tax_name1 = additionalFields.taxName1 as string;
						}
						if (additionalFields.taxName2) {
							body.tax_name2 = additionalFields.taxName2 as string;
						}
						if (additionalFields.taxName3) {
							body.tax_name3 = additionalFields.taxName3 as string;
						}
						if (additionalFields.taxtRate1) {
							body.tax_rate1 = additionalFields.taxtRate1 as number;
						}
						if (additionalFields.taxtRate2) {
							body.tax_rate2 = additionalFields.taxtRate2 as number;
						}
						if (additionalFields.taxtRate3) {
							body.tax_rate3 = additionalFields.taxtRate3 as number;
						}
						if (additionalFields.customValue1) {
							body.custom_value1 = additionalFields.customValue1 as string;
						}
						if (additionalFields.customValue2) {
							body.custom_value2 = additionalFields.customValue2 as string;
						}
						if (additionalFields.customValue3) {
							body.custom_value3 = additionalFields.customValue3 as string;
						}
						if (additionalFields.customValue4) {
							body.custom_value4 = additionalFields.customValue4 as string;
						}
						responseData = await invoiceNinjaApiRequest.call(
							that,
							'PUT',
							`/products/${productId}`,
							body as IDataObject,
						);
						responseData = responseData.data;
					}
					if (operation === 'get') {
						const productId = that.getNodeParameter('productId', i) as string;
						const include = that.getNodeParameter('include', i) as Array<string>;
						if (include.length) {
							qs.include = include.toString() as string;
						}
						responseData = await invoiceNinjaApiRequest.call(
							that,
							'GET',
							`/products/${productId}`,
							{},
							qs,
						);
						responseData = responseData.data;
					}
					if (operation === 'getAll') {
						const filters = that.getNodeParameter('filters', i);
						if (filters.filter) {
							qs.filter = filters.filter as string;
						}
						if (filters.number) {
							qs.number = filters.number as string;
						}
						const include = that.getNodeParameter('include', i) as Array<string>;
						if (include.length) {
							qs.include = include.toString() as string;
						}
						const returnAll = that.getNodeParameter('returnAll', i) as boolean;
						if (returnAll) {
							responseData = await invoiceNinjaApiRequestAllItems.call(
								that,
								'data',
								'GET',
								'/products',
								{},
								qs,
							);
						} else {
							const perPage = that.getNodeParameter('perPage', i) as boolean;
							if (perPage) qs.per_page = perPage;
							responseData = await invoiceNinjaApiRequest.call(that, 'GET', '/products', {}, qs);
							responseData = responseData.data;
						}
					}
					if (operation === 'delete') {
						const productId = that.getNodeParameter('productId', i) as string;
						responseData = await invoiceNinjaApiRequest.call(that, 'DELETE', `/products/${productId}`);
						responseData = responseData.data;
					}
				}
				if (resource === 'vendor') {
					if (operation === 'create') {
						const additionalFields = that.getNodeParameter('additionalFields', i);
						const body: IClient = {};
						if (additionalFields.vendorName) {
							body.name = additionalFields.vendorName as string;
						}
						if (additionalFields.idNumber) {
							body.id_number = additionalFields.idNumber as string;
						}
						if (additionalFields.privateNotes) {
							body.private_notes = additionalFields.privateNotes as string;
						}
						if (additionalFields.publicNotes) {
							body.public_notes = additionalFields.publicNotes as string;
						}
						if (additionalFields.customValue1) {
							body.custom_value1 = additionalFields.customValue1 as string;
						}
						if (additionalFields.customValue2) {
							body.custom_value2 = additionalFields.customValue2 as string;
						}
						if (additionalFields.customValue3) {
							body.custom_value3 = additionalFields.customValue3 as string;
						}
						if (additionalFields.customValue4) {
							body.custom_value4 = additionalFields.customValue4 as string;
						}
						if (additionalFields.vatNumber) {
							body.vat_number = additionalFields.vatNumber as string;
						}
						if (additionalFields.phone) {
							body.phone = additionalFields.phone as string;
						}
						if (additionalFields.website) {
							body.website = additionalFields.website as string;
						}
						const contactsValues = (that.getNodeParameter('contactsUi', i) as IDataObject)
							.contacstValues as IDataObject[];
						if (contactsValues) {
							const contacts: IClientContact[] = [];
							for (const contactValue of contactsValues) {
								const contact: IClientContact = {
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
							that.getNodeParameter('shippingAddressUi', i) as IDataObject
						).shippingAddressValue as IDataObject;
						if (shippingAddressValue) {
							body.shipping_address1 = shippingAddressValue.streetAddress as string;
							body.shipping_address2 = shippingAddressValue.aptSuite as string;
							body.shipping_city = shippingAddressValue.city as string;
							body.shipping_state = shippingAddressValue.state as string;
							body.shipping_postal_code = shippingAddressValue.postalCode as string;
							body.shipping_country_id = shippingAddressValue.countryCode as string;
						}
						const billingAddressValue = (
							that.getNodeParameter('billingAddressUi', i) as IDataObject
						).billingAddressValue as IDataObject;
						if (billingAddressValue) {
							body.address1 = billingAddressValue.streetAddress as string;
							body.address2 = billingAddressValue.aptSuite as string;
							body.city = billingAddressValue.city as string;
							body.state = billingAddressValue.state as string;
							body.postal_code = billingAddressValue.postalCode as string;
							body.country_id = billingAddressValue.countryCode as string;
						}
						responseData = await invoiceNinjaApiRequest.call(
							that,
							'POST',
							'/vendors',
							body as IDataObject,
						);
						responseData = responseData.data;
					}
					if (operation === 'update') {
						const vendorId = that.getNodeParameter('vendorId', i) as string;
						const additionalFields = that.getNodeParameter('additionalFields', i);
						const body: IClient = {};
						if (additionalFields.vendorName) {
							body.name = additionalFields.vendorName as string;
						}
						if (additionalFields.idNumber) {
							body.id_number = additionalFields.idNumber as string;
						}
						if (additionalFields.privateNotes) {
							body.private_notes = additionalFields.privateNotes as string;
						}
						if (additionalFields.publicNotes) {
							body.public_notes = additionalFields.publicNotes as string;
						}
						if (additionalFields.customValue1) {
							body.custom_value1 = additionalFields.customValue1 as string;
						}
						if (additionalFields.customValue2) {
							body.custom_value2 = additionalFields.customValue2 as string;
						}
						if (additionalFields.customValue3) {
							body.custom_value3 = additionalFields.customValue3 as string;
						}
						if (additionalFields.customValue4) {
							body.custom_value4 = additionalFields.customValue4 as string;
						}
						if (additionalFields.vatNumber) {
							body.vat_number = additionalFields.vatNumber as string;
						}
						if (additionalFields.phone) {
							body.phone = additionalFields.phone as string;
						}
						if (additionalFields.website) {
							body.website = additionalFields.website as string;
						}
						const contactsValues = (that.getNodeParameter('contactsUi', i) as IDataObject)
							.contacstValues as IDataObject[];
						if (contactsValues) {
							const contacts: IClientContact[] = [];
							for (const contactValue of contactsValues) {
								const contact: IClientContact = {
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
							that.getNodeParameter('shippingAddressUi', i) as IDataObject
						).shippingAddressValue as IDataObject;
						if (shippingAddressValue) {
							body.shipping_address1 = shippingAddressValue.streetAddress as string;
							body.shipping_address2 = shippingAddressValue.aptSuite as string;
							body.shipping_city = shippingAddressValue.city as string;
							body.shipping_state = shippingAddressValue.state as string;
							body.shipping_postal_code = shippingAddressValue.postalCode as string;
							body.shipping_country_id = shippingAddressValue.countryCode as string;
						}
						const billingAddressValue = (
							that.getNodeParameter('billingAddressUi', i) as IDataObject
						).billingAddressValue as IDataObject;
						if (billingAddressValue) {
							body.address1 = billingAddressValue.streetAddress as string;
							body.address2 = billingAddressValue.aptSuite as string;
							body.city = billingAddressValue.city as string;
							body.state = billingAddressValue.state as string;
							body.postal_code = billingAddressValue.postalCode as string;
							body.country_id = billingAddressValue.countryCode as string;
						}
						responseData = await invoiceNinjaApiRequest.call(
							that,
							'PUT',
							`/vendors/${vendorId}`,
							body as IDataObject,
						);
						responseData = responseData.data;
					}
					if (operation === 'get') {
						const vendorId = that.getNodeParameter('vendorId', i) as string;
						const include = that.getNodeParameter('include', i) as Array<string>;
						if (include.length) {
							qs.include = include.toString() as string;
						}
						responseData = await invoiceNinjaApiRequest.call(
							that,
							'GET',
							`/vendors/${vendorId}`,
							{},
							qs,
						);
						responseData = responseData.data;
					}
					if (operation === 'getAll') {
						const filters = that.getNodeParameter('filters', i);
						if (filters.filter) {
							qs.filter = filters.filter as string;
						}
						if (filters.number) {
							qs.number = filters.number as string;
						}
						const include = that.getNodeParameter('include', i) as Array<string>;
						if (include.length) {
							qs.include = include.toString() as string;
						}
						const returnAll = that.getNodeParameter('returnAll', i) as boolean;
						if (returnAll) {
							responseData = await invoiceNinjaApiRequestAllItems.call(
								that,
								'data',
								'GET',
								'/vendors',
								{},
								qs,
							);
						} else {
							const perPage = that.getNodeParameter('perPage', i) as boolean;
							if (perPage) qs.per_page = perPage;
							responseData = await invoiceNinjaApiRequest.call(that, 'GET', '/vendors', {}, qs);
							responseData = responseData.data;
						}
					}
					if (operation === 'delete') {
						const vendorId = that.getNodeParameter('vendorId', i) as string;
						responseData = await invoiceNinjaApiRequest.call(
							that,
							'DELETE',
							`/vendors/${vendorId}`,
						);
						responseData = responseData.data;
					}
				}

				const executionData = that.helpers.constructExecutionMetaData(
					that.helpers.returnJsonArray(responseData),
					{ itemData: { item: i } },
				);

				returnData.push(...executionData);
			} catch (error) {
				if (that.continueOnFail()) {
					const executionErrorData = that.helpers.constructExecutionMetaData(
						that.helpers.returnJsonArray({ error: error.message }),
						{ itemData: { item: i } },
					);
					returnData.push(...executionErrorData);
					continue;
				}
				throw error;
			}
		}

		return that.prepareOutputData(returnData);
	}
}
